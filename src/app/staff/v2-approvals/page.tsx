'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Tabs from "@/components/tabs"
import DataTable, { DataTableColumn } from "@/components/dataTable/DataTable"
import SearchBar, { SearchByOption } from "@/components/dataTable/SearchBar"
import StageLegend from "./StageLegend"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
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
    { name: "parked", label: "Parked Contractors", filter: { status: "parked" } },
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
    const [searchBy, setSearchBy] = useState<string>("all")
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
    const [inlineActingId, setInlineActingId] = useState<string | null>(null)
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
                case "parked": return counts.parked
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

    // Columns for the submissions table, built per-tab so the right
    // legacy V1 columns appear in the right tabs. The shared "search
    // by" dropdown is fed from columns marked with a searchValue.
    const submissionColumns: DataTableColumn<SubmissionV2Row>[] = useMemo(() => {
        const cols: DataTableColumn<SubmissionV2Row>[] = []
        cols.push({
            key: "company",
            label: "Contractor Name",
            sortValue: (s) => s.companyName,
            searchValue: (s) => `${s.companyName || ""} ${s.contractorEmail || ""}`,
            render: (s) => {
                const attention = needsAttention(s)
                return (
                    <>
                        <Link
                            href={`/staff/v2-approvals/${s._id}`}
                            className={styles.contractorLink}
                        >
                            {(s.companyName || "(no name)").toUpperCase()}
                        </Link>
{/* Email moved off the row per V1 parity. It still shows on the
                                detail page header. */}
                        {s.isPriority && (
                            <span
                                className={styles.priorityBadge}
                                data-tooltip="This badge indicates that AMNI already works with this contractor."
                                aria-label="Priority contractor - AMNI already works with this contractor"
                                tabIndex={0}
                                role="note"
                            >
                                Priority
                            </span>
                        )}
                        {attention && (
                            <span className={styles.attentionBadge}>Action needed</span>
                        )}
                    </>
                )
            },
        })
        cols.push({
            key: "stage",
            label: "Approval Stage",
            sortValue: (s) => stageForRow(s),
            render: (s) => (
                <span className={styles.stagePillLegacy}>Stage {stageForRow(s)}</span>
            ),
        })
        cols.push({
            key: "group",
            label: "Group",
            sortValue: (s) => groupLabel(s.groupId),
            searchValue: (s) => groupLabel(s.groupId),
            render: (s) => <span className={styles.dim}>{groupLabel(s.groupId)}</span>,
        })
        // V1 parity: End Users by NAME, only when the Supervisor has
        // narrowed the Within Amni Review tab to Stage D rows via the
        // Completed Stage chip. On other stages the assignment hasn't
        // happened yet (or has already been acted on) so the column
        // would always be empty / irrelevant.
        if (activeTab === "pending-l2" && stageFilter === "D") {
            cols.push({
                key: "endUsers",
                label: "End Users",
                sortValue: (s) =>
                    (s.selectedEndUsers || [])
                        .map((u: any) =>
                            typeof u === "string" ? "" : u?.name || u?.email || "",
                        )
                        .join(", "),
                searchValue: (s) =>
                    (s.selectedEndUsers || [])
                        .map((u: any) =>
                            typeof u === "string" ? "" : u?.name || u?.email || "",
                        )
                        .join(" "),
                render: (s) => {
                    const arr = (s.selectedEndUsers || []) as any[]
                    if (arr.length === 0) return <span className={styles.dim}>-</span>
                    return (
                        <div className={styles.endUserNames}>
                            {arr.map((u, i) => {
                                const name =
                                    typeof u === "string"
                                        ? u.slice(-6)
                                        : u?.name || u?.email || "—"
                                return (
                                    <span key={i} className={styles.endUserNamePill}>
                                        {name}
                                    </span>
                                )
                            })}
                        </div>
                    )
                },
            })
        }
        if (activeTab === "park-requests" || activeTab === "parked") {
            cols.push({
                key: "parkReason",
                label: "Park Reason",
                sortValue: (s) => s.hold?.reason,
                searchValue: (s) => s.hold?.reason,
                render: (s) => (
                    <div className={styles.parkReasonCell}>{s.hold?.reason || "-"}</div>
                ),
            })
            cols.push({
                key: "requestedBy",
                label: "Requested By",
                sortValue: (s) => s.hold?.requestedBy?.name || s.hold?.requestedBy?.email,
                searchValue: (s) =>
                    `${s.hold?.requestedBy?.name || ""} ${s.hold?.requestedBy?.email || ""}`,
                render: (s) => (
                    <span className={styles.dim}>
                        {s.hold?.requestedBy?.name ||
                            s.hold?.requestedBy?.email ||
                            "-"}
                    </span>
                ),
            })
        }
        if (tabDef.l3FiltersEnabled) {
            cols.push({
                key: "health",
                label: "Cert Health",
                sortValue: (s) => l3Health[s._id] || "z",
                render: (s) => {
                    const h = l3Health[s._id]
                    if (!h) return <span className={styles.dim}>...</span>
                    return (
                        <span
                            className={`${styles.healthBadge} ${
                                h === "healthy"
                                    ? styles.healthHealthy
                                    : h === "expiring"
                                      ? styles.healthExpiring
                                      : styles.healthExpired
                            }`}
                        >
                            {h}
                        </span>
                    )
                },
            })
        }
        // Cycle moved to the contractor profile on the detail page;
        // it doesn't deserve a column in the queue (per ask #7).
        cols.push({
            key: "action",
            label: "Action",
            inSearchByMenu: false,
            render: (s) => (
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
                    {/* Park requests get inline Approve / Decline /
                        Withdraw decisions so HOD/Supervisor/Admin can
                        clear the queue without opening every row. The
                        requester (any End User who raised the park)
                        gets a Withdraw button if their own request is
                        still pending; everyone else sees the role-
                        appropriate decision. */}
                    {activeTab === "park-requests" && (
                        <>
                            {["Admin", "HOD", "Supervisor"].includes(user?.role) && (
                                <>
                                    <button
                                        className={styles.btnInlineApprove}
                                        disabled={inlineActingId === s._id}
                                        onClick={() => inlineRunAction(s, "approve-park")}
                                    >
                                        Approve
                                        {inlineActingId === s._id && <ButtonLoadingIcon />}
                                    </button>
                                    <button
                                        className={styles.btnInlineDecline}
                                        disabled={inlineActingId === s._id}
                                        onClick={() =>
                                            inlineRunAction(s, "decline-park", { promptReason: false })
                                        }
                                    >
                                        Decline
                                    </button>
                                </>
                            )}
                            {s.hold?.requestedBy?.email === user?.email && (
                                <button
                                    className={styles.btnInlineWithdraw}
                                    disabled={inlineActingId === s._id}
                                    onClick={() => inlineRunAction(s, "decline-park")}
                                    title="Withdraw your own park request - the application goes back to the stage it was on."
                                >
                                    Withdraw
                                </button>
                            )}
                        </>
                    )}
                    {/* Show PROCESS STAGE X only when the viewer's role
                        can actually act at that stage; everyone else
                        gets the VIEW button which opens read-only.
                        Process button deep-links into approval mode so
                        the reviewer doesn't have to flip the toggle. */}
                    {activeTab !== "park-requests" && s.status === "pending" && canActOnRow(s) ? (
                        <button
                            className={styles.btnProcessLegacy}
                            onClick={() =>
                                router.push(
                                    `/staff/v2-approvals/${s._id}?mode=approve`,
                                )
                            }
                        >
                            PROCESS STAGE {stageForRow(s)}
                        </button>
                    ) : activeTab !== "park-requests" &&
                      s.status === "parked" &&
                      ["Admin", "HOD"].includes(user?.role) ? (
                        // Parked rows: HOD / Admin go straight into
                        // approval mode so the Unpark button is one
                        // click away.
                        <button
                            className={styles.btnProcessLegacy}
                            onClick={() =>
                                router.push(
                                    `/staff/v2-approvals/${s._id}?mode=approve`,
                                )
                            }
                        >
                            MANAGE
                        </button>
                    ) : activeTab !== "park-requests" ? (
                        <button
                            className={styles.btnProcessLegacy}
                            onClick={() => router.push(`/staff/v2-approvals/${s._id}`)}
                        >
                            VIEW
                        </button>
                    ) : null}
                </div>
            ),
        })
        cols.push({
            key: "updatedAt",
            label: "Last Update",
            sortValue: (s) => (s.updatedAt ? new Date(s.updatedAt) : 0),
            render: (s) => (
                <span className={styles.dateCell}>
                    {s.updatedAt
                        ? new Date(s.updatedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                          })
                        : "-"}
                </span>
            ),
        })
        return cols
        // needsAttention is a stable closure over user / submission shape;
        // we don't track it in deps to avoid re-creating columns on every
        // render, but tabDef + activeTab + l3Health are real inputs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, tabDef, l3Health, canPriority, togglingPriorityId, stageFilter])

    const inviteColumns: DataTableColumn<InviteRow>[] = useMemo(
        () => [
            {
                key: "company",
                label: "Invited Name",
                sortValue: (i) => i.companyName,
                searchValue: (i) => i.companyName,
                render: (i) => (
                    <Link
                        href={`/staff/v2-invites/${i._id}`}
                        className={styles.contractorLink}
                    >
                        {(i.companyName || "(no name)").toUpperCase()}
                    </Link>
                ),
            },
            {
                key: "email",
                label: "Email",
                sortValue: (i) => i.email,
                searchValue: (i) => i.email,
                render: (i) => <span className={styles.dateCell}>{i.email || "-"}</span>,
            },
            {
                key: "status",
                label: "Status",
                sortValue: (i) => (i.used ? "used" : i.archived ? "archived" : "active"),
                render: (i) => (
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
                ),
            },
            {
                key: "createdAt",
                label: "Sent",
                sortValue: (i) => (i.createdAt ? new Date(i.createdAt) : 0),
                render: (i) => (
                    <span className={styles.dateCell}>
                        {i.createdAt
                            ? new Date(i.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                              })
                            : "-"}
                    </span>
                ),
            },
        ],
        [],
    )

    // Build a "Search by" options list from whichever set of columns is
    // active on the current tab.
    const searchByOptions: SearchByOption[] = useMemo(() => {
        const cols = tabDef.isInvites ? inviteColumns : submissionColumns
        return cols
            .filter((c) => !!c.searchValue && c.inSearchByMenu !== false)
            .map((c) => ({ key: c.key, label: c.label }))
    }, [tabDef.isInvites, submissionColumns, inviteColumns])

    // Reset searchBy when tab changes - the available scopes change too.
    useEffect(() => {
        setSearchBy("all")
    }, [activeTab])

    const matchesSearch = <T,>(
        row: T,
        cols: DataTableColumn<T>[],
        query: string,
        scope: string,
    ): boolean => {
        if (!query) return true
        const q = query.toLowerCase()
        if (scope === "all") {
            for (const c of cols) {
                if (!c.searchValue) continue
                const v = String(c.searchValue(row) || "").toLowerCase()
                if (v.includes(q)) return true
            }
            return false
        }
        const c = cols.find((c) => c.key === scope)
        if (!c?.searchValue) return true
        return String(c.searchValue(row) || "").toLowerCase().includes(q)
    }

    // Client-side search + L3-health filter over the loaded submissions list.
    const filteredSubmissions = useMemo(() => {
        let rows = submissions
        if (tabDef.l3FiltersEnabled && l3Filter !== "All") {
            const want = l3Filter.toLowerCase() as "healthy" | "expiring" | "expired"
            rows = rows.filter((s) => l3Health[s._id] === want)
        }
        if (!debouncedSearch) return rows
        return rows.filter((s) => matchesSearch(s, submissionColumns, debouncedSearch, searchBy))
    }, [submissions, debouncedSearch, l3Filter, l3Health, tabDef, submissionColumns, searchBy])

    // Filtered invites (client-side search).
    const filteredInvites = useMemo(() => {
        if (!debouncedSearch) return invites
        return invites.filter((i) => matchesSearch(i, inviteColumns, debouncedSearch, searchBy))
    }, [invites, debouncedSearch, inviteColumns, searchBy])

    // "Attention needed" predicate per row. Lights up rows where the
    // current viewer can actually take an action (their role appears in
    // STAGE_ACTORS for that stage AND it's pending). This is what the
    // V1 queue used to draw attention to entries you owned.
    const canActOnRow = (s: SubmissionV2Row): boolean => {
        if (s.status !== "pending") return false
        const allowed = STAGE_ACTORS[s.level] || []
        if (!allowed.includes(user?.role)) return false
        // Stage D is owned by the End Users the Supervisor assigned;
        // non-assigned End Users can view but not act.
        if (s.level === 2 && user?.role === "End User") {
            const ids = (s.selectedEndUsers || []).map((u: any) =>
                typeof u === "string" ? u : String(u?._id || u),
            )
            if (!user?._id || !ids.includes(String(user._id))) return false
        }
        return true
    }

    // "Action Needed" highlight is only shown at Stage D (per the
    // ask), and only on rows where the current viewer can act. Other
    // stages already light up via the Process Stage X button and the
    // VRM's normal queue routine.
    const needsAttention = (s: SubmissionV2Row): boolean => {
        if (s.level !== 2) return false
        return canActOnRow(s)
    }

    // Inline action runner for queue rows (currently the Park Request
    // tab: Approve / Decline / Withdraw). Confirms via the shared
    // dialog, posts to the transition endpoint, then re-fetches the
    // list + counts so the row drops out cleanly.
    const inlineRunAction = async (
        row: SubmissionV2Row,
        action: "approve-park" | "decline-park",
        opts: { promptReason?: boolean } = {},
    ) => {
        const isApprove = action === "approve-park"
        const verb = isApprove ? "Approve" : "Decline"
        const ok = await confirmDialog({
            headerText: `${verb} park request?`,
            bodyText: `${
                isApprove
                    ? "Confirms the request - status flips to Parked and movement stops."
                    : "Rejects the request - the application goes back to its current stage."
            }`,
            confirmText: verb,
            destructive: false,
        })
        if (!ok) return
        setInlineActingId(row._id)
        try {
            const r = await postProtected(
                `api/v2/submissions/${row._id}/${action}`,
                {},
                user.role,
            )
            if (r?.status === "OK") {
                listCache.clear()
                countsCache = null
                await Promise.all([fetchList(true), fetchCounts(true)])
            } else {
                setError(r?.error?.message || "Action failed")
            }
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setInlineActingId(null)
        }
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
                <SearchBar
                    label="Quick Search"
                    value={search}
                    onChange={setSearch}
                    searchBy={searchBy}
                    onSearchByChange={setSearchBy}
                    options={searchByOptions}
                    placeholder="Type to filter the current tab"
                />
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

            {/* Invites tab - shared DataTable; detail page lives on
                /staff/v2-invites. */}
            {tabDef.isInvites && !showInitialLoading && !error && (
                <DataTable
                    columns={inviteColumns}
                    rows={filteredInvites}
                    rowKey={(r) => r._id}
                    initialSort={{ key: "createdAt", dir: "desc" }}
                    emptyMessage={
                        <div>
                            <h4>No invites</h4>
                            <p>
                                {debouncedSearch
                                    ? `No invites match "${debouncedSearch}".`
                                    : "No invites have been sent yet."}
                            </p>
                        </div>
                    }
                />
            )}

            {/* Submissions table - shared DataTable, per-tab columns. */}
            {!tabDef.isInvites && !showInitialLoading && !error && (
                <DataTable
                    columns={submissionColumns}
                    rows={filteredSubmissions}
                    rowKey={(r) => r._id}
                    initialSort={{ key: "updatedAt", dir: "desc" }}
                    rowClassName={(s) => {
                        const a = needsAttention(s) ? styles.rowAttention : ""
                        const p = s.isPriority ? styles.rowPriority : ""
                        return [a, p].filter(Boolean).join(" ")
                    }}
                    emptyMessage={
                        <div>
                            <h4>Nothing here</h4>
                            <p>
                                {debouncedSearch
                                    ? `No submissions match "${debouncedSearch}" in this tab.`
                                    : "No submissions in this tab yet."}
                            </p>
                        </div>
                    }
                />
            )}
            {confirmDialogEl}
        </div>
    )
}

export default V2ApprovalsPage
