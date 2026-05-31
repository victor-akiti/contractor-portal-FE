'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Tabs from "@/components/tabs"
import { getProtected } from "@/requests/get"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// V2 Approvals queue. Layout matches the legacy /staff/approvals page:
// tabs across the top with live counts, a search bar that filters across
// companyName / contractorEmail, and the orange Amni accent throughout.

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

// Tab definition: name maps to the BE filter ("status" / "approved").
// label is what the contractor staff see. Order matches the legacy
// queue so reviewers don't need to relearn their inbox.
const TAB_DEFS: { name: string; label: string; filter: Record<string, string> }[] = [
    { name: "pending", label: "Pending Review", filter: { status: "pending" } },
    { name: "draft", label: "Not Yet Submitted", filter: { status: "draft" } },
    { name: "returned", label: "Returned To Contractor", filter: { status: "returned" } },
    { name: "park_requested", label: "Park Requests", filter: { status: "park requested" } },
    { name: "parked", label: "Parked", filter: { status: "parked" } },
    { name: "approved", label: "L3 Approved", filter: { approved: "true" } },
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

const V2ApprovalsPage = () => {
    const user = useSelector((state: any) => state.user.user)

    const [activeTab, setActiveTab] = useState("pending")
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [submissions, setSubmissions] = useState<SubmissionV2Row[]>([])
    const [counts, setCounts] = useState<Counts | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Debounce search input so we don't hammer the BE on each keystroke.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 250)
        return () => clearTimeout(id)
    }, [search])

    const tabsForTabsComponent = useMemo(() => {
        if (!counts) {
            return TAB_DEFS.map((t) => ({ name: t.name, label: t.label }))
        }
        const countFor = (name: string): number => {
            switch (name) {
                case "draft": return counts.draft
                case "pending": return counts.pending
                case "returned": return counts.returned
                case "park_requested": return counts.park_requested
                case "parked": return counts.parked
                case "approved": return counts.approved
                case "all": return counts.total
                default: return 0
            }
        }
        return TAB_DEFS.map((t) => {
            const c = countFor(t.name)
            return { name: t.name, label: c > 0 ? `${t.label} (${c})` : t.label }
        })
    }, [counts])

    const fetchAll = async () => {
        if (!user?.role) return
        try {
            setLoading(true)
            setError("")
            const tab = TAB_DEFS.find((t) => t.name === activeTab) || TAB_DEFS[0]
            const params = new URLSearchParams()
            Object.entries(tab.filter).forEach(([k, v]) => params.set(k, v))
            if (debouncedSearch) params.set("search", debouncedSearch)
            const qs = params.toString() ? `?${params.toString()}` : ""

            const [list, c] = await Promise.all([
                getProtected(`api/v2/submissions${qs}`, user.role),
                getProtected("api/v2/submissions/counts", user.role),
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
    }, [user?.role, activeTab, debouncedSearch])

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>Approvals</h2>
                    <p className={styles.pageSubtitle}>
                        V2 submissions. Switch tabs to filter by status; use search to find a
                        specific company or contractor email.
                    </p>
                </div>
                <div className={styles.searchWrap}>
                    <input
                        type="search"
                        className={styles.searchInput}
                        placeholder="Search company or contractor email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Tabs
                tabs={tabsForTabsComponent}
                activeTab={activeTab}
                updateActiveTab={(name) => setActiveTab(name)}
            />

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
                                <th>Contractor</th>
                                <th>Group</th>
                                <th>Stage</th>
                                <th>Status</th>
                                <th>Cycle</th>
                                <th>Version</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((s) => (
                                <tr key={s._id}>
                                    <td>
                                        <Link href={`/staff/v2-approvals/${s._id}`} className={styles.rowLink}>
                                            <div className={styles.nameCell}>
                                                <span className={styles.nameText}>{s.companyName || "(no name)"}</span>
                                                <span className={styles.descText}>{s.contractorEmail}</span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td>{groupLabel(s.groupId)}</td>
                                    <td>
                                        <span className={styles.stagePill}>{stageForRow(s)}</span>
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${
                                                styles[`status_${s.status.replace(" ", "_")}`] || ""
                                            }`}
                                        >
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className={styles.dim}>#{s.cycleNumber || 1}</td>
                                    <td className={styles.dim}>{versionLabel(s.formVersionId)}</td>
                                    <td className={styles.dim}>
                                        {s.updatedAt ? new Date(s.updatedAt).toLocaleString("en-NG") : "-"}
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
