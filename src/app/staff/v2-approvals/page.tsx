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
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// V2 Approvals queue. This page is intentionally a close mirror of the
// legacy /staff/approvals queue so reviewers don't need to relearn the
// inbox. Differences are only where V2 adds new capability (Cycle column,
// Form Version column). Tab names, filter chips, Stage Legend, Priority +
// Deprioritise, Process Stage button and the Export buttons all match
// legacy layout.

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

// Tab definition: name maps to the BE filter. Labels mirror legacy queue.
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

const V2ApprovalsPage = () => {
    const user = useSelector((state: any) => state.user.user)
    const router = useRouter()

    const [activeTab, setActiveTab] = useState("pending-l2")
    const [stageFilter, setStageFilter] = useState<string>("All")
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [submissions, setSubmissions] = useState<SubmissionV2Row[]>([])
    const [counts, setCounts] = useState<Counts | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [togglingPriorityId, setTogglingPriorityId] = useState<string | null>(null)
    const [exporting, setExporting] = useState<"current" | "all" | null>(null)

    const canPriority = ["Admin", "HOD", "Supervisor"].includes(user?.role)

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 250)
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

    const fetchAll = async () => {
        if (!user?.role) return
        try {
            setLoading(true)
            setError("")
            const params = new URLSearchParams()
            Object.entries(tabDef.filter).forEach(([k, v]) => params.set(k, v))
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (tabDef.stageFiltersEnabled && stageFilter !== "All") {
                params.set("completedStage", stageFilter)
            }
            const qs = params.toString() ? `?${params.toString()}` : ""

            const [list, c] = await Promise.all([
                getProtected(`api/v2/submissions${qs}`, user.role),
                getProtected("api/v2/submission-counts", user.role),
            ])
            if (list?.status === "OK") setSubmissions(list.data?.submissions || [])
            else setError(list?.error?.message || "Failed to load submissions")
            if (c?.status === "OK") setCounts(c.data?.counts || null)
        } catch (e: any) {
            setError(e?.message || "Failed to load")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, activeTab, debouncedSearch, stageFilter])

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
            if (r?.status === "OK") await fetchAll()
            else setError(r?.error?.message || "Could not update priority")
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setTogglingPriorityId(null)
        }
    }

    // Export current tab / all data via the BE CSV endpoint.
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

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>Registration Approvals</h2>
                    <p className={styles.pageSubtitle}>
                        V2 submissions. Switch tabs to filter by status; use search to find a
                        specific company or contractor email.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.searchWrap}>
                        <input
                            type="search"
                            className={styles.searchInput}
                            placeholder="Type Company Name or Email"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className={styles.exportSecondary}
                        onClick={() => downloadCsv("current")}
                        disabled={exporting !== null}
                    >
                        Export Current Tab
                        {exporting === "current" && <ButtonLoadingIcon />}
                    </button>
                    <button
                        className={styles.exportPrimary}
                        onClick={() => downloadCsv("all")}
                        disabled={exporting !== null}
                    >
                        Export All Data
                        {exporting === "all" && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>

            <Tabs
                tabs={tabsForTabsComponent}
                activeTab={activeTab}
                updateActiveTab={(name) => setActiveTab(name)}
            />

            {/* Stage Legend - mirrors legacy collapsible card; only relevant
                inside the Within Amni Review tab where stages A-G are the
                axis users sort by. */}
            {tabDef.stageFiltersEnabled && <StageLegend />}

            {/* Filter chips: All / Completed Stage A-F. Hidden outside the
                pending tab to match legacy behaviour. */}
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
                </div>
            )}

            {loading && (
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading...</p>
                </div>
            )}

            {!loading && error && (
                <div className={styles.errorBanner}>
                    <ErrorText text={error} />
                    <button className={styles.btnLink} onClick={fetchAll}>Retry</button>
                </div>
            )}

            {!loading && !error && submissions.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>Nothing here</h4>
                    <p>
                        {debouncedSearch
                            ? `No submissions match "${debouncedSearch}" in this tab.`
                            : "No submissions in this tab yet."}
                    </p>
                </div>
            )}

            {!loading && !error && submissions.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Contractor Name</th>
                                <th>Approval Stage</th>
                                <th>Action</th>
                                <th>Cycle</th>
                                <th>Version</th>
                                <th>Last Contractor Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((s) => (
                                <tr key={s._id} className={s.isPriority ? styles.rowPriority : ""}>
                                    <td>
                                        <Link href={`/staff/v2-approvals/${s._id}`} className={styles.rowLink}>
                                            <div className={styles.nameCell}>
                                                <span className={styles.nameText}>
                                                    {(s.companyName || "(no name)").toUpperCase()}
                                                </span>
                                                {s.isPriority && (
                                                    <span className={styles.priorityBadge}>★ Priority</span>
                                                )}
                                                <span className={styles.descText}>{s.contractorEmail}</span>
                                                <span className={styles.descText}>{groupLabel(s.groupId)}</span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td>
                                        <span className={styles.stagePill}>Stage {stageForRow(s)}</span>
                                        <span
                                            className={`${styles.statusBadge} ${
                                                styles[`status_${s.status.replace(" ", "_")}`] || ""
                                            }`}
                                        >
                                            {s.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionCell}>
                                            {canPriority && (
                                                <button
                                                    className={styles.btnGhost}
                                                    onClick={() => togglePriority(s)}
                                                    disabled={togglingPriorityId === s._id}
                                                    title={s.isPriority ? "Remove from priority" : "Pin to top"}
                                                >
                                                    {s.isPriority ? "▼ Deprioritise" : "▲ Prioritise"}
                                                    {togglingPriorityId === s._id && <ButtonLoadingIcon />}
                                                </button>
                                            )}
                                            {s.status === "pending" && (
                                                <button
                                                    className={styles.btnProcess}
                                                    onClick={() => router.push(`/staff/v2-approvals/${s._id}`)}
                                                >
                                                    PROCESS STAGE {stageForRow(s)}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.dim}>#{s.cycleNumber || 1}</td>
                                    <td className={styles.dim}>{versionLabel(s.formVersionId)}</td>
                                    <td className={styles.dim}>
                                        {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : "-"}
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
