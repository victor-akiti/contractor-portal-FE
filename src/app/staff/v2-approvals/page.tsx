'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import DataTable, { DataTableColumn } from "@/components/dataTable/DataTable"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Tabs from "@/components/tabs"
import Toast from "@/components/toast"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { BACKEND_BASE_URL } from "@/lib/config"
import { auth } from "@/lib/firebase"
import { staffApi } from "@/redux/apis/staffApi"
import {
    useGetV2InvitesQuery,
    useGetV2SubmissionCountsQuery,
    useGetV2SubmissionsQuery,
    useLazyGetV2SubmissionCertificatesQuery,
    useLazyGetV2SubmissionsQuery,
    useSetV2PriorityMutation,
    useV2SubmissionActionMutation,
} from "@/redux/features/v2Slice"
import { getIdToken } from "firebase/auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import PriorityBadge from "../approvals/ui/PriorityBadge"
import StageLegend from "./StageLegend"
import styles from "./styles/styles.module.css"

// Convert RTK Query mutation result {data?, error?} into the {status,
// data, error} envelope the rest of the component understands. The
// slice's transformErrorResponse already mirrors the FAILED envelope
// onto the error branch, so this is a 1-liner.
const envelopeOf = (r: any): any =>
    r?.data ||
    r?.error ||
    { status: "FAILED", error: { message: "Request failed" } }

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
//  - Tab switching cancels any in-flight requests for the previous tab
//    and clears previous tab's data to prevent cross-tab data leakage.

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
    lastReminderSent?: number | null
}

// V1-parity check: drop the v1-no-email@unknown.local placeholders the
// backfill left behind so the Remind buttons don't fire mail to a
// dead address. Keep in sync with isUsableContractorEmail on the BE.
const PLACEHOLDER_EMAIL_DOMAINS = new Set(["unknown.local"])
const REMINDER_PLACEHOLDER_LOCALS = new Set([
    "v1-no-email",
    "no-email",
    "unknown",
])
const isUsableContractorEmail = (e?: string | null): boolean => {
    if (!e || typeof e !== "string") return false
    const v = e.trim().toLowerCase()
    if (!v) return false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false
    const [local, domain] = v.split("@")
    if (PLACEHOLDER_EMAIL_DOMAINS.has(domain)) return false
    if (REMINDER_PLACEHOLDER_LOCALS.has(local)) return false
    return true
}

interface InviteRow {
    _id: string
    companyName?: string
    fname?: string
    lname?: string
    name?: string
    email?: string
    phone?: { number?: string; countryCode?: string } | string
    approvalStatus?:
    | "pending_supervisor"
    | "returned_to_originator"
    | "pending_hod"
    | "approved"
    | "rejected"
    | "used"
    | "expired"
    | "voided"
    invitedBy?: { uid?: string; name?: string; email?: string }
    recommendedBy?: { _id?: string; name?: string; email?: string } | string | null
    recommendedByMeta?: { uid?: string; name?: string; email?: string; department?: string }
    createdAt?: string
    updatedAt?: string
    approvedAt?: string
    expiry?: string
    rejectedReason?: string
    voidReason?: string
    // Legacy compatibility hooks — older code paths used these.
    used?: boolean
    archived?: boolean
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
    // Stage D - any staff role can be picked as an end user. Whether THIS
    // user can act on a specific submission is enforced server-side via
    // the assignedEndUsers list.
    2: ["End User", "Admin", "HOD", "Amni Staff", "C and P Staff", "Insurance Officer"],
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
// RTK Query holds the list and counts caches; mutations invalidate the
// V2SubsList / V2Counts / V2InviteList tags so the shared cache stays
// in sync without the manual module-level Maps the page used before.

const V2ApprovalsPage = () => {
    const user = useSelector((state: any) => state.user.user)
    const router = useRouter()

    const [activeTab, setActiveTab] = useState("pending-l2")
    const [stageFilter, setStageFilter] = useState<string>("All")
    const [l3Filter, setL3Filter] = useState<L3Filter>("All")
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    // V1 parity: BE always sorts companyName asc with isPriority pinned
    // to the top. Column-header clicks on the DataTable re-sort
    // client-side. No FE toggle (V1 doesn't expose one either) - we
    // rely on the BE defaults.
    const [submissions, setSubmissions] = useState<SubmissionV2Row[]>([])
    const [invites, setInvites] = useState<InviteRow[]>([])
    // Per-row L3 certificate health (only populated when the L3 tab is
    // active). Map<submissionId, "healthy" | "expiring" | "expired">.
    const [l3Health, setL3Health] = useState<Record<string, "healthy" | "expiring" | "expired">>({})
    const [counts, setCounts] = useState<Counts | null>(null)
    const [error, setError] = useState("")
    const [togglingPriorityId, setTogglingPriorityId] = useState<string | null>(null)
    const [inlineActingId, setInlineActingId] = useState<string | null>(null)
    const [remindingId, setRemindingId] = useState<string | null>(null)
    const canRemind = ["Admin", "HOD", "Supervisor", "VRM"].includes(user?.role)
    const [exporting, setExporting] = useState<"current" | "all" | null>(null)
    // Top-of-page Quick Search (V1 parity). Cross-tab search across
    // companyName + contractorEmail with a status-scope dropdown.
    // Results render as a dropdown popup with VIEW / Process buttons.
    type QuickFilter = "all" | "draft" | "pending" | "parked" | "returned" | "park requested" | "l3"
    const [quickQuery, setQuickQuery] = useState("")
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
    const [quickResults, setQuickResults] = useState<SubmissionV2Row[]>([])
    const [quickOpen, setQuickOpen] = useState(false)
    const [quickLoading, setQuickLoading] = useState(false)
    const quickResultRef = useRef<HTMLDivElement | null>(null)
    const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirmDialog()

    const canPriority = ["Admin", "HOD", "Supervisor"].includes(user?.role)
    const isEndUser = user?.role === "End User"
    const isVrm = ["Admin", "HOD", "VRM"].includes(user?.role)

    // tabDef is computed further down; recompute the query params here so
    // the RTK Query hooks can react when the user switches tabs. Keeping
    // the lookup inline avoids a hoist - tabDef itself is pure.
    const _tabDef = TAB_DEFS.find((t) => t.name === activeTab) || TAB_DEFS[1]
    const submissionsParams = useMemo(() => {
        const p: Record<string, string> = {}
        Object.entries(_tabDef.filter || {}).forEach(([k, v]) => {
            p[k] = String(v)
        })
        return p
    }, [_tabDef.filter])

    // RTK Query hooks. The cache is keyed by the arg object so switching
    // tabs swaps to a different cache slot - currentData is undefined
    // while the new tab loads, which gives us a clean "no stale rows"
    // transition. V2SubsList / V2Counts / V2InviteList tags fire
    // invalidation from every mutation defined on the slice so the
    // queue and counts always reflect the latest state without manual
    // refetch wiring.
    const submissionsQ = useGetV2SubmissionsQuery(submissionsParams, {
        skip: !user?.role || _tabDef.isInvites,
    })
    const invitesQ = useGetV2InvitesQuery(
        {},
        { skip: !user?.role || !_tabDef.isInvites },
    )
    const countsQ = useGetV2SubmissionCountsQuery(undefined, {
        skip: !user?.role,
    })

    // Refreshing toast = a re-validation pass while we already have data.
    // initialLoadDone toggles once any successful response (or known
    // empty payload) has landed for the current tab.
    const activeQuery = _tabDef.isInvites ? invitesQ : submissionsQ
    const refreshing = activeQuery.isFetching && !!activeQuery.currentData
    const initialLoadDone =
        activeQuery.isSuccess ||
        activeQuery.isError ||
        !!activeQuery.currentData

    const [quickSearchTrigger] = useLazyGetV2SubmissionsQuery()
    const [certsTrigger] = useLazyGetV2SubmissionCertificatesQuery()
    const [submissionActionTrigger] = useV2SubmissionActionMutation()
    const [setPriorityTrigger] = useSetV2PriorityMutation()

    // V1-parity background prefetch. Once the counts payload lands
    // (i.e. on initial mount and again after any mutation invalidates
    // V2Counts), warm every queue tab in the background so subsequent
    // tab clicks resolve instantly from the shared RTK Query cache.
    // The keepUnusedDataFor: 300 on getV2Submissions / getV2Invites
    // keeps these warm caches alive for 5 minutes after they go idle.
    const prefetchSubmissions = staffApi.usePrefetch("getV2Submissions")
    const prefetchInvitesPrefetch = staffApi.usePrefetch("getV2Invites")
    useEffect(() => {
        if (!user?.role || !countsQ.currentData) return
        for (const t of TAB_DEFS) {
            if (t.isInvites) {
                prefetchInvitesPrefetch({}, { force: false })
                continue
            }
            const p: Record<string, string> = {}
            Object.entries(t.filter || {}).forEach(([k, v]) => {
                p[k] = String(v)
            })
            prefetchSubmissions(p, { force: false })
        }
    }, [
        user?.role,
        countsQ.currentData,
        prefetchSubmissions,
        prefetchInvitesPrefetch,
    ])

    // Tab-switch reset MUST run before the mirror effects below so a
    // cache-hit on the new tab wins the final state write. Without
    // this, the mirror would set the prefetched rows and the clear
    // would immediately wipe them.
    useEffect(() => {
        setSubmissions([])
        setInvites([])
        setL3Health({})
        setError("")
        setStageFilter("All")
    }, [activeTab])

    // Mirror RTK Query data into the existing local state so the rest of
    // the page (sorting, search filter, optimistic mutation patches)
    // keeps working unchanged. With background prefetch above, the
    // currentData on a tab switch can already be the prefetched rows
    // for the new tab, giving an instant render.
    useEffect(() => {
        if (_tabDef.isInvites) return
        const rows = submissionsQ.currentData?.data?.submissions
        if (Array.isArray(rows)) setSubmissions(rows)
    }, [submissionsQ.currentData, _tabDef.isInvites])

    useEffect(() => {
        if (!_tabDef.isInvites) return
        const rows = invitesQ.currentData?.data?.invites
        if (Array.isArray(rows)) setInvites(rows)
    }, [invitesQ.currentData, _tabDef.isInvites])

    useEffect(() => {
        const c = countsQ.currentData?.data?.counts
        if (c) setCounts(c)
    }, [countsQ.currentData])

    // Search is debounced *locally* - no BE call. The filter runs against
    // whatever rows are currently in state.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200)
        return () => clearTimeout(id)
    }, [search])

    // Quick Search: V1 parity (debounce 300ms, min 2 chars). Same params
    // as the legacy listSubmissions call; preferCache=true means a
    // repeated search resolves instantly from the RTK cache.
    useEffect(() => {
        const q = quickQuery.trim()
        if (q.length < 2) {
            setQuickResults([])
            return
        }
        const handle = setTimeout(async () => {
            setQuickLoading(true)
            try {
                const params: Record<string, string> = {
                    search: q,
                    limit: "1000",
                }
                if (quickFilter === "l3") params.approved = "true"
                else if (quickFilter !== "all") params.status = quickFilter
                const r = await quickSearchTrigger(params, true)
                const env = r?.data
                if (env?.status === "OK") {
                    setQuickResults(env.data?.submissions || [])
                } else {
                    setQuickResults([])
                }
            } catch {
                setQuickResults([])
            } finally {
                setQuickLoading(false)
            }
        }, 300)
        return () => clearTimeout(handle)
    }, [quickQuery, quickFilter, user?.role, quickSearchTrigger])

    // Click-outside closes the result popup.
    useEffect(() => {
        if (!quickOpen) return
        const onClick = (e: MouseEvent) => {
            if (!quickResultRef.current?.contains(e.target as Node)) {
                setQuickOpen(false)
            }
        }
        window.addEventListener("mousedown", onClick)
        return () => window.removeEventListener("mousedown", onClick)
    }, [quickOpen])

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

    // Surface query errors via the existing error banner so users see
    // the BE message rather than a silent empty state.
    useEffect(() => {
        const fromList = _tabDef.isInvites
            ? (invitesQ.error as any)?.error?.message
            : (submissionsQ.error as any)?.error?.message
        setError(fromList || "")
    }, [submissionsQ.error, invitesQ.error, _tabDef.isInvites])

    // Mutation handlers used to call fetchList/fetchCounts to bust the
    // cache. RTK Query tag invalidation handles both now; refetchList
    // is the manual-retry entry point shown on the error banner.
    const refetchList = () => {
        if (_tabDef.isInvites) invitesQ.refetch()
        else submissionsQ.refetch()
    }

    // L3 cert health fan-out. Lazy hook lets us reuse the certificates
    // query cache - subsequent visits to L3 hit the cache instead of
    // re-fetching every row.
    useEffect(() => {
        if (!_tabDef.l3FiltersEnabled) return
        const rows = submissionsQ.currentData?.data?.submissions || []
        if (rows.length === 0) return
        const now = Date.now()
        const horizon = 30 * 24 * 60 * 60 * 1000
        let cancelled = false
        ;(async () => {
            const updates: Record<string, "healthy" | "expiring" | "expired"> = {}
            await Promise.all(
                rows.map(async (r: SubmissionV2Row) => {
                    if (l3Health[r._id]) return
                    try {
                        const res = await certsTrigger(r._id, true)
                        const env = res?.data
                        if (env?.status !== "OK") return
                        const certs = (env.data?.certificates || []).filter(
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
                    } catch {
                        // best effort
                    }
                }),
            )
            if (!cancelled && Object.keys(updates).length > 0) {
                setL3Health((prev) => ({ ...prev, ...updates }))
            }
        })()
        return () => {
            cancelled = true
        }
    }, [submissionsQ.currentData, _tabDef.l3FiltersEnabled, certsTrigger])

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
                        {s.isPriority && !tabDef.l3FiltersEnabled && (
                            <PriorityBadge />
                        )}
                        {attention && (
                            <span className={styles.attentionBadge}>Action needed</span>
                        )}
                    </>
                )
            },
        })
        // L3 queue is a registry of approved contractors — Approval Stage
        // and Group are not useful there (every row is L3 / same purpose),
        // so trim the columns to Contractor Name + Cert Health + Last
        // Update only. Other tabs keep the full set.
        if (!tabDef.l3FiltersEnabled) {
            cols.push({
                key: "stage",
                label: "Approval Stage",
                sortValue: (s) => stageForRow(s),
                render: (s) => (
                    <span className={styles.stagePillLegacy}>Stage {stageForRow(s)}</span>
                ),
            })
            // cols.push({
            //     key: "group",
            //     label: "Group",
            //     sortValue: (s) => groupLabel(s.groupId),
            //     searchValue: (s) => groupLabel(s.groupId),
            //     render: (s) => <span className={styles.dim}>{groupLabel(s.groupId)}</span>,
            // })
        }
        // V1 parity: End Users by NAME, only when the Supervisor has
        // narrowed the Within Amni Review tab to "Completed Stage C"
        // rows - those are currently at internal Stage D (level 2)
        // where the assigned End Users are doing their review. On any
        // other stage chip the assignment either hasn't happened yet
        // or has already been acted on, so the column would be empty
        // / irrelevant. (Yes, stageFilter "C" → level 2 → Stage D
        // current; the chip label and the filter value disagree by
        // design - see the BE completedStage map.)
        if (activeTab === "pending-l2" && stageFilter === "C") {
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
                                        : u?.name || u?.email || "-"
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
                            className={`${styles.healthBadge} ${h === "healthy"
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
        // L3 queue is registry-style — the row link on the Contractor
        // Name column is enough; no Action column.
        if (!tabDef.l3FiltersEnabled) cols.push({
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
                    {/* Reminder buttons - Returned tab and In Progress
                        (draft) tab. Disabled when the contractor email
                        isn't usable (V1 backfill placeholder, invalid
                        shape) so reviewers don't fire mail to a dead
                        address; the tooltip explains why. */}
                    {canRemind &&
                        (s.status === "returned" || s.status === "draft") &&
                        (() => {
                            const usable = isUsableContractorEmail(s.contractorEmail)
                            const kind: "returned" | "not-submitted" =
                                s.status === "returned" ? "returned" : "not-submitted"
                            return (
                                <button
                                    className={styles.btnInlineRemind}
                                    disabled={remindingId === s._id || !usable}
                                    onClick={() => sendReminder(s, kind)}
                                    title={
                                        usable
                                            ? s.lastReminderSent
                                                ? `Last reminded ${new Date(s.lastReminderSent).toLocaleDateString("en-NG")}`
                                                : "Send a reminder email to this contractor"
                                            : "No usable email on file (V1 placeholder or invalid shape). Update the contact email first."
                                    }
                                >
                                    Remind
                                    {remindingId === s._id && <ButtonLoadingIcon />}
                                </button>
                            )
                        })()}
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

    const inviteColumns: DataTableColumn<InviteRow>[] = useMemo(() => {
        // Mirrors V1's three-column row layout (InvitedContractorRow.tsx):
        //   1. Company (uppercase)
        //   2. Contact: full name, email, phone, Recommended By (name + dept)
        //   3. Status: badge + dates (sent / approved / expiry / voided)
        // V1's Recommended By is sourced from recommendedByMeta (carried
        // forward verbatim by the V1 invite migration) and falls back to
        // a populated recommendedBy User for V2-native invites.
        const formatDate = (v?: string | Date | null) => {
            if (!v) return null
            const d = new Date(v)
            return Number.isFinite(d.getTime())
                ? d.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
                : null
        }
        const recommended = (i: InviteRow) => {
            const meta = i.recommendedByMeta
            if (meta?.name || meta?.email) return meta
            const populated =
                i.recommendedBy && typeof i.recommendedBy === "object"
                    ? (i.recommendedBy as any)
                    : null
            if (populated?.name || populated?.email) {
                return {
                    name: populated.name,
                    email: populated.email,
                    department: populated.department,
                }
            }
            return null
        }
        const phoneStr = (i: InviteRow) => {
            const p = i.phone
            if (!p) return ""
            if (typeof p === "string") return p
            if (p.number) return p.countryCode ? `${p.countryCode} ${p.number}` : p.number
            return ""
        }
        const statusLabel = (s?: InviteRow["approvalStatus"]) => {
            switch (s) {
                case "pending_supervisor":
                    return "Pending Supervisor"
                case "returned_to_originator":
                    return "Returned to Originator"
                case "pending_hod":
                    return "Pending HOD"
                case "approved":
                    return "Approved"
                case "used":
                    return "Used"
                case "rejected":
                    return "Rejected"
                case "voided":
                    return "Voided"
                case "expired":
                    return "Expired"
                default:
                    return s || "-"
            }
        }
        const statusClass = (s?: InviteRow["approvalStatus"]) => {
            if (s === "used") return styles.inviteUsed
            if (s === "voided" || s === "rejected" || s === "expired") return styles.inviteArchived
            return styles.inviteActive
        }
        return [
            {
                key: "company",
                label: "Invited Company",
                sortValue: (i) => i.companyName,
                searchValue: (i) => `${i.companyName || ""} ${i.email || ""}`,
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
                key: "contact",
                label: "Contact",
                sortValue: (i) =>
                    `${i.fname || ""} ${i.lname || ""} ${i.email || ""}`.trim(),
                searchValue: (i) =>
                    `${i.fname || ""} ${i.lname || ""} ${i.email || ""}`,
                render: (i) => {
                    const rec = recommended(i)
                    const fullName =
                        `${i.fname || ""} ${i.lname || ""}`.trim() ||
                        i.name ||
                        ""
                    return (
                        <div className={styles.inviteContactCell}>
                            {fullName && <p className={styles.inviteContactName}>{fullName.toUpperCase()}</p>}
                            {i.email && <p className={styles.inviteContactLine}>{i.email}</p>}
                            {phoneStr(i) && (
                                <p className={styles.inviteContactLine}>{phoneStr(i)}</p>
                            )}
                            {rec && (
                                <p className={styles.inviteContactLine}>
                                    Recommended by: <strong>{rec.name || rec.email || "-"}</strong>
                                    {rec.department ? ` (${rec.department})` : ""}
                                </p>
                            )}
                        </div>
                    )
                },
            },
            {
                key: "invitedBy",
                label: "Invited By",
                sortValue: (i) => i.invitedBy?.name || i.invitedBy?.email,
                searchValue: (i) =>
                    `${i.invitedBy?.name || ""} ${i.invitedBy?.email || ""}`,
                render: (i) => (
                    <span className={styles.dateCell}>
                        {i.invitedBy?.name || i.invitedBy?.email || "-"}
                    </span>
                ),
            },
            {
                key: "status",
                label: "Status",
                sortValue: (i) => i.approvalStatus,
                render: (i) => {
                    const sent = formatDate(i.createdAt)
                    const approvedAt = formatDate(i.approvedAt)
                    const expires = formatDate(i.expiry)
                    return (
                        <div className={styles.inviteStatusCell}>
                            <span
                                className={`${styles.stagePillLegacy} ${statusClass(i.approvalStatus)}`}
                            >
                                {statusLabel(i.approvalStatus)}
                            </span>
                            {sent && (
                                <p className={styles.inviteStatusLine}>Sent: {sent}</p>
                            )}
                            {approvedAt && (
                                <p className={styles.inviteStatusLine}>Approved: {approvedAt}</p>
                            )}
                            {expires && (
                                <p className={styles.inviteStatusLine}>Expires: {expires}</p>
                            )}
                            {i.approvalStatus === "rejected" && i.rejectedReason && (
                                <p className={styles.inviteStatusReason}>
                                    {i.rejectedReason}
                                </p>
                            )}
                            {i.approvalStatus === "voided" && i.voidReason && (
                                <p className={styles.inviteStatusReason}>
                                    Voided: {i.voidReason}
                                </p>
                            )}
                        </div>
                    )
                },
            },
            {
                key: "createdAt",
                label: "Sent",
                sortValue: (i) => (i.createdAt ? new Date(i.createdAt) : 0),
                render: (i) => (
                    <span className={styles.dateCell}>{formatDate(i.createdAt) || "-"}</span>
                ),
            },
        ]
    }, [])


    // V1 parity: the filter input only scopes against company name on
    // every submission tab (returned, parked, etc.). On the invites tab
    // it scopes against company name OR email — matching V1's "Filter by
    // company name or email address" input. No multi-scope dropdown.
    const matchesSearch = <T extends { companyName?: string; email?: string; contractorEmail?: string }>(
        row: T,
        query: string,
        isInvites: boolean,
    ): boolean => {
        if (!query) return true
        const q = query.toLowerCase()
        const name = String(row?.companyName || "").toLowerCase()
        if (name.includes(q)) return true
        if (isInvites) {
            const email = String(row?.email || row?.contractorEmail || "").toLowerCase()
            if (email.includes(q)) return true
        }
        return false
    }

    // Client-side search + L3-health filter over the loaded submissions list.
    // "Can act" predicate: does the current viewer's role appear in
    // STAGE_ACTORS for this row's stage? End Users at Stage D are
    // further narrowed to the ones the Supervisor actually assigned.
    const canActOnRow = (s: SubmissionV2Row): boolean => {
        if (s.status !== "pending") return false
        const allowed = STAGE_ACTORS[s.level] || []
        if (!allowed.includes(user?.role)) return false

        const isEndUser = Boolean(s.selectedEndUsers?.find((u) => u._id === user?._id));

        if (s.level === 2 && !isEndUser) {
            return false
        }
        return true
    }
    // "Action Needed" highlight: lit on Stage D rows the viewer can
    // act on. Drives both the row badge and the sort that pins these
    // rows to the top.
    const needsAttention = (s: SubmissionV2Row): boolean => {
        if (s.level !== 2) return false
        return canActOnRow(s)
    }

    const filteredSubmissions = useMemo(() => {
        // Copy before sorting - RTK Query freezes its cache payloads,
        // so an in-place .sort() on the mirrored array throws
        // "Cannot assign to read only property" in dev.
        let rows = (submissions ? [...submissions] : []).sort((a, b) =>
            needsAttention(a) && needsAttention(b) ? 0 : needsAttention(a) ? -1 : 1,
        )
        if (tabDef.l3FiltersEnabled && l3Filter !== "All") {
            const want = l3Filter.toLowerCase() as "healthy" | "expiring" | "expired"
            rows = rows.filter((s) => l3Health[s._id] === want)
        }
        // V1 parity: the "Completed Stage X" chip filters the pending-l2
        // tab client-side. BE no longer narrows by level, so one fetch
        // serves every chip.
        if (tabDef.stageFiltersEnabled && stageFilter !== "All") {
            const chipToLevel = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 } as Record<string, number>
            const target = chipToLevel[stageFilter]
            if (target !== undefined) rows = rows.filter((s) => s.level === target)
        }
        if (debouncedSearch) {
            rows = rows.filter((s) => matchesSearch(s, debouncedSearch, false))
        }
        // V1 parity sort: needsAttention DESC, then companyName ASC
        // (case-insensitive, locale-aware). The BE returns rows in
        // companyName order already; this pass moves attention-needed
        // rows to the top and keeps the rest alphabetical. Returns a
        // new array so the useMemo stays referentially correct.
        const collator = new Intl.Collator(undefined, {
            sensitivity: "base",
            numeric: true,
        })
        return [...rows].sort((a, b) => {
            const an = needsAttention(a) ? 1 : 0
            const bn = needsAttention(b) ? 1 : 0
            if (an !== bn) return bn - an
            return collator.compare(a.companyName || "", b.companyName || "")
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submissions, debouncedSearch, l3Filter, l3Health, tabDef, stageFilter, user?.role, user?._id])

    // Filtered invites (client-side search). V1 invites tab matches both
    // companyName and email; everything else matches companyName only.
    const filteredInvites = useMemo(() => {
        if (!debouncedSearch) return invites
        return invites.filter((i) => matchesSearch(i, debouncedSearch, true))
    }, [invites, debouncedSearch])

    // canActOnRow + needsAttention now live above filteredSubmissions
    // so the sort can read them directly. See the top of this component.

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
            bodyText: `${isApprove
                ? "Confirms the request - status flips to Parked and movement stops."
                : "Rejects the request - the application goes back to its current stage."
                }`,
            confirmText: verb,
            destructive: false,
        })
        if (!ok) return
        setInlineActingId(row._id)
        try {
            const r = envelopeOf(
                await submissionActionTrigger({ id: row._id, action }),
            )
            // Tag invalidation auto-refetches V2SubsList / V2Counts -
            // no manual refetch required on success.
            if (r?.status !== "OK") {
                setError(r?.error?.message || "Action failed")
            }
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setInlineActingId(null)
        }
    }

    // Inline reminder. kind = "returned" (Returned tab) or
    // "not-submitted" (In Progress tab). Disabled-button path on the
    // row stops the user from firing this if the contractor email
    // is unusable; the BE re-validates and rejects with 409 either way.
    const sendReminder = async (
        row: SubmissionV2Row,
        kind: "returned" | "not-submitted",
    ) => {
        if (!canRemind) return
        if (!isUsableContractorEmail(row.contractorEmail)) {
            setError(
                "This contractor has no usable email on file. Update the contact email before sending a reminder.",
            )
            return
        }
        const ok = await confirmDialog({
            headerText: "Send reminder?",
            bodyText:
                kind === "returned"
                    ? `Email ${row.contractorEmail} the standard returned-application reminder. The active remarks for the current cycle will be listed inline.`
                    : `Email ${row.contractorEmail} a reminder that their registration form has not been submitted yet.`,
            confirmText: "Send reminder",
        })
        if (!ok) return
        try {
            setRemindingId(row._id)
            const r = envelopeOf(
                await submissionActionTrigger({
                    id: row._id,
                    action:
                        kind === "returned"
                            ? "remind-returned"
                            : "remind-not-submitted",
                }),
            )
            if (r?.status !== "OK") {
                setError(r?.error?.message || "Reminder failed")
            }
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setRemindingId(null)
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
            const r = envelopeOf(
                await setPriorityTrigger({
                    id: row._id,
                    isPriority: nextValue,
                }),
            )
            if (r?.status === "OK") {
                // Optimistic local patch so the pinned ordering reflects
                // immediately; V2SubsList tag invalidation reconciles
                // with the BE in the background.
                setSubmissions((rows) =>
                    rows.map((x) => (x._id === row._id ? { ...x, isPriority: nextValue } : x)),
                )
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

            {/* V1 parity: Quick Search at the top — cross-tab search
                across companyName + contractorEmail with a status-scope
                dropdown. Results render as a popup beneath the input
                with VIEW + Process buttons. The per-tab 'Filter by
                company name' input under the stage chips is separate
                and only filters the current tab's rows. */}
            <div className={styles.quickSearchRow}>
                <div className={styles.quickSearch} ref={quickResultRef}>
                    <label className={styles.quickSearchLabel}>Quick Search</label>
                    <div className={styles.quickSearchInputRow}>
                        <input
                            className={styles.quickSearchInput}
                            placeholder="Type Company Name or Email..."
                            value={quickQuery}
                            onFocus={() => setQuickOpen(true)}
                            onChange={(e) => {
                                setQuickQuery(e.target.value)
                                setQuickOpen(true)
                            }}
                        />
                        <select
                            className={styles.quickSearchScope}
                            value={quickFilter}
                            onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
                        >
                            <option value="all">All Registered Contractors</option>
                            <option value="draft">Not Yet Submitted</option>
                            <option value="pending">Within Amni Review L2</option>
                            <option value="parked">Parked Contractors</option>
                            <option value="l3">L3</option>
                            <option value="returned">Returned</option>
                            <option value="park requested">Park Requested</option>
                        </select>
                    </div>
                    {quickQuery.trim().length > 0 && quickOpen && (
                        <div className={styles.quickSearchResults}>
                            {quickQuery.trim().length < 2 ? (
                                <p className={styles.quickSearchEmpty}>Enter a longer query...</p>
                            ) : quickLoading ? (
                                <div className={styles.quickSearchLoading}>
                                    <ButtonLoadingIcon /> Searching...
                                </div>
                            ) : quickResults.length > 0 ? (
                                quickResults.map((row) => {
                                    const stage = stageForRow(row)
                                    const stageLabel =
                                        row.status === "parked"
                                            ? "Parked"
                                            : row.status === "returned"
                                                ? `Stage ${stage} (Returned)`
                                                : `Stage ${stage}`
                                    const canProcess = row.status === "pending"
                                    return (
                                        <div key={row._id} className={styles.quickSearchItem}>
                                            <div className={styles.quickSearchItemMeta}>
                                                <p className={styles.quickSearchItemName}>
                                                    {(row.companyName || "(no name)").toUpperCase()}
                                                </p>
                                                <p className={styles.quickSearchItemStage}>{stageLabel}</p>
                                            </div>
                                            <div className={styles.quickSearchItemActions}>
                                                <Link
                                                    href={`/staff/v2-approvals/${row._id}`}
                                                    onClick={() => setQuickOpen(false)}
                                                >
                                                    <button className={styles.btnLink}>VIEW</button>
                                                </Link>
                                                {canProcess && (
                                                    <Link
                                                        href={`/staff/v2-approvals/${row._id}?mode=approve`}
                                                        onClick={() => setQuickOpen(false)}
                                                    >
                                                        <button className={styles.btnLink}>
                                                            Process Stage {stage}
                                                        </button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className={styles.quickSearchEmpty}>No results found</p>
                            )}
                        </div>
                    )}
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
                        All
                        {stageFilter === "All"
                            ? ` (${filteredSubmissions.length})`
                            : ""}
                    </button>
                    {STAGE_FILTERS.map((s) => (
                        <button
                            key={s}
                            className={`${styles.chip} ${stageFilter === s ? styles.chipActive : ""}`}
                            onClick={() => setStageFilter(s)}
                        >
                            Completed Stage {s}
                            {stageFilter === s
                                ? ` (${filteredSubmissions.length})`
                                : ""}
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

            {!tabDef.stageFiltersEnabled && (
                <div className={styles.filterChips}>
                    <input
                        type="search"
                        className={styles.inlineFilterInput}
                        placeholder={
                            tabDef.isInvites
                                ? "Filter by company name or email address"
                                : "Filter by company name"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Refreshing state now floats as a top-right Toast so the
                table doesn't shift mid-fetch. The Toast component is
                rendered once at the page root below. */}
            <Toast show={refreshing} message="Refreshing…" tone="info" />

            {showInitialLoading && (
                <div className={styles.pageLoaderWrap}>
                    <Loading message="Loading approvals…" />
                </div>
            )}

            {error && !showInitialLoading && (
                <div className={styles.errorBanner}>
                    <ErrorText text={error} />
                    <button className={styles.btnLink} onClick={() => refetchList()}>Retry</button>
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

            {/* Role-gate notice. Matches the V1 behaviour where roles
                without permission to act at any of the relevant stages
                see an explanatory line instead of an empty page. */}
            {!showInitialLoading && user?.role && !["Admin", "HOD", "VRM", "Supervisor", "End User", "CO", "Executive Approver", "Amni Staff", "C and P Staff", "C&P Admin", "Insurance Officer", "DD Officer", "IT Admin"].includes(user.role) && (
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
                    initialSort={{ key: "", dir: "asc" }}
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