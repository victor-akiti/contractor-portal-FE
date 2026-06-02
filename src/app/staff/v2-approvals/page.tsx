'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Tabs from "@/components/tabs"
import StageLegend from "./StageLegend"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { getProtected } from "@/requests/get"
import { putProtected } from "@/requests/put"
import { BACKEND_BASE_URL } from "@/lib/config"
import { auth } from "@/lib/firebase"
import { getIdToken } from "firebase/auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// V2 Approvals queue. Layout mirrors legacy /staff/approvals so reviewers
// see what they're used to.
//
// Behaviour notes:
//  - Tab + chip switches show cached rows immediately (no blank flash) and
//    refetch only if the cache for that key is older than CACHE_TTL_MS.
//  - Search is client-side over the loaded list, debounced via local
//    state. No BE round-trip on each keystroke (matches legacy
//    filterCompaniesByName / filterInvitedCompaniesByNameOrEmail).
//  - Counts fetched once and cached; refreshed only after a mutation.

interface GroupRef { _id: string; name: string }
interface VersionRef { _id: string; versionNumber?: number }

interface SubmissionV2Row {
    _id: string
    contractorEmail: string
    companyName: string
    groupId?: GroupRef | string | null
    formVersionId?: VersionRef | string | null
    submitted: boolean
    status: string
    approved: boolean
    level: number
    cycleNumber: number
    isPriority?: boolean
    submitTime?: number
    updateTime?: number
    returnTime?: number
    createdAt?: string
    updatedAt?: string
    hold?: {
        reason?: string
        requestedBy?: { name?: string; email?: string; date?: string }
    }
    selectedEndUsers?: any[]
    reverts?: any
}

interface InviteRow {
    _id: string
    companyName?: string
    email?: string
    used?: boolean
    archived?: boolean
    createdAt?: string
    updatedAt?: string
    expiresAt?: string
}

// Stage -> set of role names that can ACT (advance / return / hold) on
// that stage. Used to (a) decide which queue tabs are meaningful to the
// current viewer and (b) decide whether to show a "you have no actions
// at this stage" notice on detail pages. Mirrors the legacy approvals
// stage-to-role lookup.
const STAGE_ACTORS: Record<number, string[]> = {
    0: ["Admin", "HOD", "VRM"],
    1: ["Admin", "HOD", "Supervisor"],
    2: ["Admin", "HOD", "End User"],
    3: ["Admin", "HOD", "VRM", "CO", "Supervisor"],
    4: ["Admin", "HOD"],
    5: ["Admin", "Executive Approver"],
}

interface Counts {
    draft: number
    pending: number
    returned: number
    park_requested: number
    parked: number
    approved: number
    total: number
}

const TAB_DEFS: { name: string; label: string; filter: Record<string, string>; stageFiltersEnabled?: boolean; isInvites?: boolean; l3FiltersEnabled?: boolean }[] = [
    { name: "invited", label: "Invited", filter: {}, isInvites: true },
    { name: "in-progress", label: "Not Yet Submitted", filter: { status: "draft" } },
    {
        name: "pending-l2",
        label: "Within Amni Review L2",
        filter: { status: "pending" },
        stageFiltersEnabled: true,
    },
    { name: "l3", label: "L3", filter: { approved: "true" }, l3FiltersEnabled: true },
    { name: "completed-l2", label: "Completed L2", filter: { status: "parked" } },
    { name: "returned", label: "Returned To Contractor", filter: { status: "returned" } },
    { name: "park-requests", label: "Park Requests", filter: { status: "park requested" } },
    { name: "all", label: "All", filter: {} },
]

const L3_FILTERS = ["All", "Healthy", "Expiring", "Expired"] as const
type L3Filter = (typeof L3_FILTERS)[number]

const stageFromLevel = (level: number): string => {
    if (level == null || level < 0 || level > 5) return "-"
    return String.fromCharCode(66 + level)
}

const stageForRow = (s: { status: string; level: number; approved: boolean }): string => {
    if (s.approved) return "L3"
    if (s.status === "draft") return "A"
    return stageFromLevel(s.level)
}

const groupLabel = (g: GroupRef | string | null | undefined) => {
    if (!g) return "-"
    if (typeof g === "string") return g
    return g.name || "-"
}

const versionLabel = (v: VersionRef | string | null | undefined) => {
    if (!v) return "-"
    if (typeof v === "string") return v.slice(-6)
    return v.versionNumber != null ? `v${v.versionNumber}` : "-"
}

const STAGE_FILTERS = ["A", "B", "C", "D", "E", "F"]
const CACHE_TTL_MS = 60_000 // 60s stale-while-revalidate window

// Module-level cache so navigating away + back doesn't refetch. Keyed by
// "<role>|<status>|<approved>|<completedStage>".
const listCache = new Map<string, { rows: SubmissionV2Row[]; fetchedAt: number }>()
let countsCache: { counts: Counts; fetchedAt: number } | null = null

const cacheKey = (role: string, tabName: string, completedStage: string): string =>
    `${role}|${tabName}|${completedStage}`

const V2ApprovalsPage = () => {
    const user = useSelector((state: any) => state.user.user)
    const router = useRouter()

    const [activeTab, setActiveTab] = useState("pending-l2")
    const [stageFilter, setStageFilter] = useState<string>("All")
    const [l3Filter, setL3Filter] = useState<L3Filter>("All")
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [submissions, setSubmissions] = useState<SubmissionV2Row[]>([])
    const [invites, setInvites] = useState<InviteRow[]>([])
    // Per-row L3 certificate health (only populated when the L3 tab is
    // active). Map<submissionId, "healthy" | "expiring" | "expired">.
    const [l3Health, setL3Health] = useState<Record<string, "healthy" | "expiring" | "expired">>({})
    const [counts, setCounts] = useState<Counts | null>(countsCache?.counts || null)
    const [refreshing, setRefreshing] = useState(false)
    const [initialLoadDone, setInitialLoadDone] = useState(false)
    const [error, setError] = useState("")
    const [togglingPriorityId, setTogglingPriorityId] = useState<string | null>(null)
    const [exporting, setExporting] = useState<"current" | "all" | null>(null)
    const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirmDialog()

    const canPriority = ["Admin", "HOD", "Supervisor"].includes(user?.role)
    const isEndUser = user?.role === "End User"
    const isVrm = ["Admin", "HOD", "VRM"].includes(user?.role)

    // Search is debounced *locally* - no BE call. The filter runs against
    // whatever rows are currently in state.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200)
        return () => clearTimeout(id)
    }, [search])

    // Reset stage chip when switching tabs.
    useEffect(() => {
        setStageFilter("All")
    }, [activeTab])

    const tabsForTabsComponent = useMemo(() => {
        if (!counts) return TAB_DEFS.map((t) => ({ name: t.name, label: t.label }))
        const countFor = (name: string): number => {
            switch (name) {
                case "in-progress": return counts.draft
                case "pending-l2": return counts.pending
                case "l3": return counts.approved
                case "completed-l2": return counts.parked
                case "returned": return counts.returned
                case "park-requests": return counts.park_requested
                case "all": return counts.total
                default: return 0
            }
        }
        return TAB_DEFS.map((t) => {
            const c = countFor(t.name)
            return { name: t.name, label: c > 0 ? `${t.label} (${c})` : t.label }
        })
    }, [counts])

    const tabDef = TAB_DEFS.find((t) => t.name === activeTab) || TAB_DEFS[1]

    // fetchList: stale-while-revalidate. Shows cached rows immediately,
    // then fetches in the background if cache is missing or older than the
    // TTL. force=true bypasses the TTL (used after mutations).
    const fetchList = async (force = false) => {
        if (!user?.role) return
        // Invites tab uses /api/v2/invites and a different row shape.
        if (tabDef.isInvites) {
            try {
                setRefreshing(true)
                setError("")
                const r = await getProtected("api/v2/invites", user.role)
                if (r?.status === "OK") setInvites(r.data?.invites || [])
                else setError(r?.error?.message || "Failed to load invites")
            } catch (e: any) {
                setError(e?.message || "Failed to load")
            } finally {
                setRefreshing(false)
                setInitialLoadDone(true)
            }
            return
        }
        const key = cacheKey(user.role, activeTab, stageFilter)
        const cached = listCache.get(key)
        const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS
        if (cached) {
            setSubmissions(cached.rows)
            setInitialLoadDone(true)
        }
        if (fresh && !force) return
        try {
            setRefreshing(true)
            setError("")
            const params = new URLSearchParams()
            Object.entries(tabDef.filter).forEach(([k, v]) => params.set(k, v))
            if (tabDef.stageFiltersEnabled && stageFilter !== "All") {
                params.set("completedStage", stageFilter)
            }
            const qs = params.toString() ? `?${params.toString()}` : ""
            const list = await getProtected(`api/v2/submissions${qs}`, user.role)
            if (list?.status === "OK") {
                const rows = list.data?.submissions || []
                listCache.set(key, { rows, fetchedAt: Date.now() })
                setSubmissions(rows)
                // For L3 rows, fan out certificate fetches in the background
                // so we can colour each row by cert health (healthy /
                // expiring / expired). Best-effort; the page renders
                // immediately without waiting.
                if (tabDef.l3FiltersEnabled) loadL3Health(rows)
            } else {
                setError(list?.error?.message || "Failed to load submissions")
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load")
        } finally {
            setRefreshing(false)
            setInitialLoadDone(true)
        }
    }

    // Per-row L3 cert health. Healthy = every cert has expiry > 30 days
    // away (or no expiry tracked). Expiring = any cert expires within 30
    // days. Expired = any cert past its expiry date. Cached at the row
    // level so flipping the chip doesn't refetch.
    const loadL3Health = async (rows: SubmissionV2Row[]) => {
        const now = Date.now()
        const horizon = 30 * 24 * 60 * 60 * 1000
        const updates: Record<string, "healthy" | "expiring" | "expired"> = {}
        await Promise.all(
            rows.map(async (r) => {
                if (l3Health[r._id]) return
                try {
                    const cr = await getProtected(
                        `api/v2/submissions/${r._id}/certificates`,
                        user.role,
                    )
                    if (cr?.status === "OK") {
                        const certs = (cr.data?.certificates || []).filter(
                            (c: any) => c.trackingStatus !== "untracked - updated",
                        )
                        let worst: "healthy" | "expiring" | "expired" = "healthy"
                        for (const c of certs) {
                            if (!c.expiryDate) continue
                            const exp = new Date(c.expiryDate).getTime()
                            if (exp < now) {
                                worst = "expired"
                                break
                            }
                            if (exp - now < horizon) worst = "expiring"
                        }
                        updates[r._id] = worst
                    }
                } catch {
                    // best effort
                }
            }),
        )
        if (Object.keys(updates).length > 0) {
            setL3Health((prev) => ({ ...prev, ...updates }))
        }
    }

    const fetchCounts = async (force = false) => {
        if (!user?.role) return
        if (countsCache && !force && Date.now() - countsCache.fetchedAt < CACHE_TTL_MS) {
            setCounts(countsCache.counts)
            return
        }
        try {
            const c = await getProtected("api/v2/submission-counts", user.role)
            if (c?.status === "OK" && c.data?.counts) {
                countsCache = { counts: c.data.counts, fetchedAt: Date.now() }
                setCounts(c.data.counts)
            }
        } catch {
            // counts failure is non-fatal; the tabs just show without the chips
        }
    }

    useEffect(() => {
        fetchList()
        fetchCounts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, activeTab, stageFilter])

    // Client-side search + L3-health filter over the loaded submissions list.
    const filteredSubmissions = useMemo(() => {
        let rows = submissions
        if (tabDef.l3FiltersEnabled && l3Filter !== "All") {
            const want = l3Filter.toLowerCase() as "healthy" | "expiring" | "expired"
            rows = rows.filter((s) => l3Health[s._id] === want)
        }
        if (!debouncedSearch) return rows
        return rows.filter((s) => {
            const hay = `${s.companyName || ""} ${s.contractorEmail || ""} ${groupLabel(s.groupId)}`.toLowerCase()
            return hay.includes(debouncedSearch)
        })
    }, [submissions, debouncedSearch, l3Filter, l3Health, tabDef])

    // Filtered invites (client-side search).
    const filteredInvites = useMemo(() => {
        if (!debouncedSearch) return invites
        return invites.filter((i) => {
            const hay = `${i.companyName || ""} ${i.email || ""}`.toLowerCase()
            return hay.includes(debouncedSearch)
        })
    }, [invites, debouncedSearch])

    // "Attention needed" predicate per row. Lights up rows where the
    // current viewer can actually take an action (their role appears in
    // STAGE_ACTORS for that stage AND it's pending). This is what the
    // V1 queue used to draw attention to entries you owned.
    const needsAttention = (s: SubmissionV2Row): boolean => {
        if (s.status !== "pending") return false
        const allowed = STAGE_ACTORS[s.level] || []
        if (!allowed.includes(user?.role)) return false
        // Stage D: only assigned end users actually "own" it.
        if (s.level === 2 && user?.role === "End User") {
            const ids = (s.selectedEndUsers || []).map((u: any) =>
                typeof u === "string" ? u : String(u?._id || u),
            )
            if (!user?._id || !ids.includes(String(user._id))) return false
        }
        return true
    }

    const togglePriority = async (row: SubmissionV2Row) => {
        if (!canPriority) return
        const nextValue = !row.isPriority
        const name = row.companyName || row.contractorEmail
        const ok = await confirmDialog({
            headerText: nextValue ? "Pin to top?" : "Remove priority?",
            bodyText: nextValue
                ? `Pin "${name}" to the top of the queue.`
                : `Remove "${name}" from priority.`,
            confirmText: nextValue ? "Pin to top" : "Remove",
        })
        if (!ok) return
        try {
            setTogglingPriorityId(row._id)
            const r = await putProtected(
                `api/v2/submissions/${row._id}/priority`,
                { isPriority: nextValue },
                user.role,
            )
            if (r?.status === "OK") {
                // Optimistic local patch + invalidate cache so a real refetch
                // picks up the new ordering.
                listCache.clear()
                setSubmissions((rows) =>
                    rows.map((x) => (x._id === row._id ? { ...x, isPriority: nextValue } : x)),
                )
                fetchList(true)
            } else {
                setError(r?.error?.message || "Could not update priority")
            }
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setTogglingPriorityId(null)
        }
    }

    const downloadCsv = async (scope: "current" | "all") => {
        try {
            setExporting(scope)
            const params = new URLSearchParams()
            if (scope === "current") {
                Object.entries(tabDef.filter).forEach(([k, v]) => params.set(k, v))
            }
            const u = auth.currentUser
            const token = u ? await getIdToken(u) : null
            const url = `${BACKEND_BASE_URL}/api/v2/submissions-export${params.toString() ? `?${params}` : ""}`
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: "include",
            })
            if (!res.ok) throw new Error(`Export failed (${res.status})`)
            const blob = await res.blob()
            const a = document.createElement("a")
            const dlUrl = URL.createObjectURL(blob)
            a.href = dlUrl
            a.download = `v2-${scope === "current" ? tabDef.name : "all"}-${Date.now()}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(dlUrl)
        } catch (e: any) {
            setError(e?.message || "Export failed")
        } finally {
            setExporting(null)
        }
    }

    // First-load spinner only - subsequent fetches refresh quietly.
    const showInitialLoading = !initialLoadDone && submissions.length === 0

    return (
        <div className={styles.page}>
            <h2 className={styles.pageTitle}>Registration Approvals</h2>

            <div className={styles.searchRow}>
                <div className={styles.searchWrap}>
                    <label className={styles.searchLabel}>Quick Search</label>
                    <input
                        type="search"
                        className={styles.searchInput}
                        placeholder="Type Company Name or Email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className={styles.exportButtons}>
                    <button
                        className={styles.exportSecondary}
                        onClick={() => downloadCsv("current")}
                        disabled={exporting !== null}
                    >
                        <span className={styles.dlIcon}>↓</span> Export Current Tab
                        {exporting === "current" && <ButtonLoadingIcon />}
                    </button>
                    <button
                        className={styles.exportPrimary}
                        onClick={() => downloadCsv("all")}
                        disabled={exporting !== null}
                    >
                        <span className={styles.dlIcon}>↓</span> Export All Data
                        {exporting === "all" && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>

            <Tabs
                tabs={tabsForTabsComponent}
                activeTab={activeTab}
                updateActiveTab={(name) => setActiveTab(name)}
            />

            {tabDef.stageFiltersEnabled && <StageLegend />}

            {tabDef.stageFiltersEnabled && (
                <div className={styles.filterChips}>
                    <span className={styles.filterLabel}>Filter:</span>
                    <button
                        className={`${styles.chip} ${stageFilter === "All" ? styles.chipActive : ""}`}
                        onClick={() => setStageFilter("All")}
                    >
                        All{counts ? ` (${counts.pending})` : ""}
                    </button>
                    {STAGE_FILTERS.map((s) => (
                        <button
                            key={s}
                            className={`${styles.chip} ${stageFilter === s ? styles.chipActive : ""}`}
                            onClick={() => setStageFilter(s)}
                        >
                            Completed Stage {s}
                        </button>
                    ))}
                    <input
                        type="search"
                        className={styles.inlineFilterInput}
                        placeholder="Filter by company name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {refreshing && (
                <div className={styles.refreshingHint}>
                    <ButtonLoadingIcon /> Refreshing...
                </div>
            )}

            {showInitialLoading && (
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading...</p>
                </div>
            )}

            {error && !showInitialLoading && (
                <div className={styles.errorBanner}>
                    <ErrorText text={error} />
                    <button className={styles.btnLink} onClick={() => fetchList(true)}>Retry</button>
                </div>
            )}

            {/* L3 health chips - only on the L3 tab. "Healthy" means all
                certificates still have time on the clock; "Expiring"
                catches certs within 30 days of expiry; "Expired" is past
                due. Healthy ratio counts only the rows we've already
                resolved cert health for. */}
            {tabDef.l3FiltersEnabled && submissions.length > 0 && (
                <div className={styles.filterChips}>
                    <span className={styles.filterLabel}>L3 Filter:</span>
                    {L3_FILTERS.map((f) => (
                        <button
                            key={f}
                            className={`${styles.chip} ${l3Filter === f ? styles.chipActive : ""}`}
                            onClick={() => setL3Filter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}

            {refreshing && (
                <div className={styles.refreshingHint}>
                    <ButtonLoadingIcon /> Refreshing...
                </div>
            )}

            {/* Role-gate notice. Matches the V1 behaviour where roles
                without permission to act at any of the relevant stages
                see an explanatory line instead of an empty page. */}
            {!showInitialLoading && user?.role && !["Admin", "HOD", "VRM", "Supervisor", "End User", "CO", "Executive Approver", "Amni Staff", "IT Admin"].includes(user.role) && (
                <div className={styles.emptyState}>
                    <h4>No access</h4>
                    <p>
                        Your role ({user.role}) doesn't include any review
                        responsibilities on V2 approvals. Contact an
                        administrator if you believe you should have access.
                    </p>
                </div>
            )}

            {/* Invites tab - simple listing, deeper detail lives on
                /staff/v2-invites. */}
            {tabDef.isInvites && !showInitialLoading && !error && (
                filteredInvites.length === 0 ? (
                    <div className={styles.emptyState}>
                        <h4>No invites</h4>
                        <p>
                            {debouncedSearch
                                ? `No invites match "${debouncedSearch}".`
                                : "No invites have been sent yet."}
                        </p>
                    </div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.legacyTable}>
                            <thead>
                                <tr>
                                    <th>Invited Name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Sent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvites.map((i, idx) => (
                                    <tr
                                        key={i._id}
                                        className={`${idx % 2 === 1 ? styles.rowShade : ""}`}
                                    >
                                        <td>
                                            <Link href={`/staff/v2-invites/${i._id}`} className={styles.contractorLink}>
                                                {(i.companyName || "(no name)").toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className={styles.dateCell}>{i.email || "-"}</td>
                                        <td>
                                            <span
                                                className={`${styles.stagePillLegacy} ${
                                                    i.used
                                                        ? styles.inviteUsed
                                                        : i.archived
                                                          ? styles.inviteArchived
                                                          : styles.inviteActive
                                                }`}
                                            >
                                                {i.used ? "Used" : i.archived ? "Archived" : "Active"}
                                            </span>
                                        </td>
                                        <td className={styles.dateCell}>
                                            {i.createdAt
                                                ? new Date(i.createdAt).toLocaleDateString("en-US", {
                                                      year: "numeric",
                                                      month: "long",
                                                      day: "numeric",
                                                  })
                                                : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {!tabDef.isInvites && !showInitialLoading && !error && filteredSubmissions.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>Nothing here</h4>
                    <p>
                        {debouncedSearch
                            ? `No submissions match "${debouncedSearch}" in this tab.`
                            : "No submissions in this tab yet."}
                    </p>
                </div>
            )}

            {!tabDef.isInvites && !showInitialLoading && !error && filteredSubmissions.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.legacyTable}>
                        <thead>
                            <tr>
                                <th>▲ Contractor Name</th>
                                {!tabDef.isInvites && <th>Approval Stage</th>}
                                {(activeTab === "park-requests" || activeTab === "completed-l2") && (
                                    <>
                                        <th>Park Reason</th>
                                        <th>Requested By</th>
                                    </>
                                )}
                                {tabDef.l3FiltersEnabled && <th>Cert Health</th>}
                                <th>Action</th>
                                <th>▲ Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubmissions.map((s, idx) => {
                                const attention = needsAttention(s)
                                const shadeCls = idx % 2 === 1 ? styles.rowShade : ""
                                const attentionCls = attention ? styles.rowAttention : ""
                                const priorityCls = s.isPriority ? styles.rowPriority : ""
                                const rowClass = [shadeCls, attentionCls, priorityCls]
                                    .filter(Boolean)
                                    .join(" ")
                                const health = l3Health[s._id]
                                return (
                                    <tr key={s._id} className={rowClass}>
                                        <td>
                                            <Link href={`/staff/v2-approvals/${s._id}`} className={styles.contractorLink}>
                                                {(s.companyName || "(no name)").toUpperCase()}
                                            </Link>
                                            {s.isPriority && (
                                                <span className={styles.priorityBadge}>★ Priority</span>
                                            )}
                                            {attention && (
                                                <span className={styles.attentionBadge}>Action needed</span>
                                            )}
                                        </td>
                                        {!tabDef.isInvites && (
                                            <td>
                                                <span className={styles.stagePillLegacy}>
                                                    Stage {stageForRow(s)}
                                                </span>
                                            </td>
                                        )}
                                        {(activeTab === "park-requests" || activeTab === "completed-l2") && (
                                            <>
                                                <td className={styles.parkReasonCell}>
                                                    {s.hold?.reason || "-"}
                                                </td>
                                                <td className={styles.dateCell}>
                                                    {s.hold?.requestedBy?.name ||
                                                        s.hold?.requestedBy?.email ||
                                                        "-"}
                                                </td>
                                            </>
                                        )}
                                        {tabDef.l3FiltersEnabled && (
                                            <td>
                                                {health ? (
                                                    <span
                                                        className={`${styles.healthBadge} ${
                                                            health === "healthy"
                                                                ? styles.healthHealthy
                                                                : health === "expiring"
                                                                  ? styles.healthExpiring
                                                                  : styles.healthExpired
                                                        }`}
                                                    >
                                                        {health}
                                                    </span>
                                                ) : (
                                                    <span className={styles.dim}>...</span>
                                                )}
                                            </td>
                                        )}
                                        <td>
                                            <div className={styles.actionCell}>
                                                {canPriority && s.status === "pending" && !s.approved && (
                                                    <button
                                                        className={styles.btnDeprioritise}
                                                        onClick={() => togglePriority(s)}
                                                        disabled={togglingPriorityId === s._id}
                                                    >
                                                        {s.isPriority ? "▼ Deprioritise" : "▲ Prioritise"}
                                                        {togglingPriorityId === s._id && <ButtonLoadingIcon />}
                                                    </button>
                                                )}
                                                {s.status === "pending" && (
                                                    <button
                                                        className={styles.btnProcessLegacy}
                                                        onClick={() => router.push(`/staff/v2-approvals/${s._id}`)}
                                                    >
                                                        PROCESS STAGE {stageForRow(s)}
                                                    </button>
                                                )}
                                                {s.status !== "pending" && (
                                                    <button
                                                        className={styles.btnProcessLegacy}
                                                        onClick={() => router.push(`/staff/v2-approvals/${s._id}`)}
                                                    >
                                                        VIEW
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.dateCell}>
                                            {s.updatedAt
                                                ? new Date(s.updatedAt).toLocaleDateString("en-US", {
                                                      year: "numeric",
                                                      month: "long",
                                                      day: "numeric",
                                                  })
                                                : "-"}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {confirmDialogEl}
        </div>
    )
}

export default V2ApprovalsPage
