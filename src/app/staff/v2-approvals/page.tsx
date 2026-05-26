'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import { getProtected } from "@/requests/get"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// V2 Approvals queue — SubmissionV2 listing with status/stage filtering.
// Stage label is derived from level + B (canonical taxonomy, see SPEC.md §3).

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

const STATUS_OPTIONS = [
    { key: "", label: "Any status" },
    { key: "draft", label: "Draft (with contractor)" },
    { key: "pending", label: "Pending (in pipeline)" },
    { key: "returned", label: "Returned" },
    { key: "park requested", label: "Park requested" },
    { key: "parked", label: "Parked" },
    { key: "approved", label: "Approved (L3)" },
]

const stageFromLevel = (level: number): string => {
    // 0 → B (Vendor submitted), 1 → C, ..., 5 → G (Final approval)
    if (level == null || level < 0 || level > 5) return "—"
    return String.fromCharCode(66 + level)
}

const groupLabel = (g: GroupRef | string | null | undefined) => {
    if (!g) return "—"
    if (typeof g === "string") return g
    return g.name || "—"
}

const versionLabel = (v: VersionRef | string | null | undefined) => {
    if (!v) return "—"
    if (typeof v === "string") return v.slice(-6)
    return v.versionNumber != null ? `v${v.versionNumber}` : "—"
}

const V2ApprovalsPage = () => {
    const user = useSelector((state: any) => state.user.user)

    const [status, setStatus] = useState("")
    const [level, setLevel] = useState<string>("")
    const [submissions, setSubmissions] = useState<SubmissionV2Row[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const fetchSubmissions = async () => {
        try {
            setLoading(true)
            setError("")
            const params = new URLSearchParams()
            if (status) params.set("status", status)
            if (level !== "") params.set("level", level)
            const qs = params.toString() ? `?${params.toString()}` : ""
            const result = await getProtected(`api/v2/submissions${qs}`, user?.role)
            if (result?.status === "OK") {
                setSubmissions(result.data?.submissions || [])
            } else {
                setError(result?.error?.message || "Failed to load submissions")
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.role) fetchSubmissions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, status, level])

    const totals = useMemo(() => {
        const out: Record<string, number> = {}
        submissions.forEach((s) => {
            out[s.status] = (out[s.status] || 0) + 1
        })
        return out
    }, [submissions])

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>V2 Approvals</h2>
                    <p className={styles.pageSubtitle}>
                        Parallel approval queue (SubmissionV2). Each row is a contractor
                        submission moving through stages B → G. Click a row to review,
                        comment, advance, return, park, or final-approve.
                    </p>
                </div>
                <div className={styles.headerMeta}>
                    <span>
                        Showing <strong>{submissions.length}</strong>
                    </span>
                    {Object.entries(totals).map(([k, v]) => (
                        <span key={k} className={styles.miniChip}>{k}: {v}</span>
                    ))}
                </div>
            </div>

            <div className={styles.filtersBar}>
                <label>
                    Status
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Stage / level
                    <select value={level} onChange={(e) => setLevel(e.target.value)}>
                        <option value="">Any stage</option>
                        <option value="0">Stage B (Vendor submitted)</option>
                        <option value="1">Stage C (VRM)</option>
                        <option value="2">Stage D (HOD)</option>
                        <option value="3">Stage E (Due diligence)</option>
                        <option value="4">Stage F (Final due diligence)</option>
                        <option value="5">Stage G (Final approval)</option>
                    </select>
                </label>
                <button className={styles.btnLink} onClick={fetchSubmissions}>Refresh</button>
            </div>

            {loading && (
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading…</p>
                </div>
            )}

            {!loading && error && (
                <div className={styles.errorBanner}>
                    <ErrorText text={error} />
                    <button className={styles.btnLink} onClick={fetchSubmissions}>Retry</button>
                </div>
            )}

            {!loading && !error && submissions.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>No submissions match these filters</h4>
                    <p>Adjust the status/stage filters or invite a contractor to start one.</p>
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
                                        <span className={styles.stagePill}>
                                            {s.approved ? "L3" : stageFromLevel(s.level)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[`status_${s.status.replace(" ", "_")}`] || ""}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className={styles.dim}>#{s.cycleNumber || 1}</td>
                                    <td className={styles.dim}>{versionLabel(s.formVersionId)}</td>
                                    <td className={styles.dim}>
                                        {s.updatedAt ? new Date(s.updatedAt).toLocaleString("en-NG") : "—"}
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
