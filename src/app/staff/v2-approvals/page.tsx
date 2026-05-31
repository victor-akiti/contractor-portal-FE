'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Tabs from "@/components/tabs"
import StageLegend from "./StageLegend"
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

const TAB_DEFS: { name: string; label: string; filter: Record<string, string>; stageFiltersEnabled?: boolean }[] = [
    { name: "in-progress", label: "Not Yet Submitted", filter: { status: "draft" } },
    {
        name: "pending-l2",
        label: "Within Amni Review L2",
        filter: { status: "pending" },
        stageFiltersEnabled: true,
    },
    { name: "l3", label: "L3", filter: { approved: "true" } },
    { name: "completed-l2", label: "Completed L2", filter: { status: "parked" } },
    { name: "returned", label: "Returned To Contractor", filter: { status: "returned" } },
    { name: "park-requests", label: "Park Requests", filter: { status: "park requested" } },
    { name: "all", label: "All", filter: {} },
]

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
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [submissions, setSubmissions] = useState<SubmissionV2Row[]>([])
    const [counts, setCounts] = useState<Counts | null>(countsCache?.counts || null)
    const [refreshing, setRefreshing] = useState(false)
    const [initialLoadDone, setInitialLoadDone] = useState(false)
    const [error, setError] = useState("")
    const [togglingPriorityId, setTogglingPriorityId] = useState<string | null>(null)
    const [exporting, setExporting] = useState<"current" | "all" | null>(null)

    const canPriority = ["Admin", "HOD", "Supervisor"].includes(user?.role)

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

    // Client-side search filter over the loaded submissions list.
    const filteredSubmissions = useMemo(() => {
        if (!debouncedSearch) return submissions
        return submissions.filter((s) => {
            const hay = `${s.companyName || ""} ${s.contractorEmail || ""} ${groupLabel(s.groupId)}`.toLowerCase()
            return hay.includes(debouncedSearch)
        })
    }, [submissions, debouncedSearch])

    const togglePriority = async (row: SubmissionV2Row) => {
        if (!canPriority) return
        const nextValue = !row.isPriority
        if (
            !window.confirm(
                nextValue
                    ? `Pin "${row.companyName || row.contractorEmail}" to the top of the queue?`
                    : `Remove "${row.companyName || row.contractorEmail}" from priority?`,
            )
        )
            return
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

            {!showInitialLoading && !error && filteredSubmissions.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>Nothing here</h4>
                    <p>
                        {debouncedSearch
                            ? `No submissions match "${debouncedSearch}" in this tab.`
                            : "No submissions in this tab yet."}
                    </p>
                </div>
            )}

            {!showInitialLoading && !error && filteredSubmissions.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.legacyTable}>
                        <thead>
                            <tr>
                                <th>▲ Contractor Name</th>
                                <th>Approval Stage</th>
                                <th>Action</th>
                                <th>▲ Last Contractor Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubmissions.map((s) => (
                                <tr key={s._id} className={s.isPriority ? styles.rowPriority : ""}>
                                    <td>
                                        <Link href={`/staff/v2-approvals/${s._id}`} className={styles.contractorLink}>
                                            {(s.companyName || "(no name)").toUpperCase()}
                                        </Link>
                                        {s.isPriority && (
                                            <span className={styles.priorityBadge}>★ Priority</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={styles.stagePillLegacy}>Stage {stageForRow(s)}</span>
                                    </td>
                                    <td>
                                        <div className={styles.actionCell}>
                                            {canPriority && (
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default V2ApprovalsPage
