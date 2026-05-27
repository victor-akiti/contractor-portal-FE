'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FormRenderer from "@/components/form/FormRenderer"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles.module.css"

interface Certificate {
    _id: string
    fieldKey: string
    updateCode: string
    url: string
    name?: string
    label?: string
    issueDate?: string
    expiryDate?: string
    certStatus: "pending" | "approved" | "rejected"
    reviewRemarks?: string
    reviewedBy?: { name?: string; email?: string; role?: string }
    reviewedAt?: string
    isReUpload?: boolean
    trackingStatus?: string
    createdAt?: string
}

// V2 Submission detail — single submission review surface.
//
// Tabs:
//   - Form (FormRenderer in view mode, with active remarks inline)
//   - Comments (staff-only InternalComment list/create/edit)
//   - History (approvalHistory timeline)
//
// Actions sidebar exposes the state-machine transitions filtered by what the
// state machine allows for the current status/level (without re-implementing
// the rules here — we just hide buttons that obviously don't apply).

type ActionKey =
    | "advance"
    | "final-approve"
    | "return"
    | "request-park"
    | "approve-park"
    | "decline-park"
    | "release-park"
    | "retrieve"
    | "revert-from-l3"

interface Remark {
    _id: string
    sectionKey: string
    text: string
    authorName?: string
    authorEmail?: string
    authorRole?: string
    cycleNumber: number
    status: "active" | "addressed" | "withdrawn"
    createdAt?: string
    addressedAt?: string
}

interface Comment {
    _id: string
    text: string
    authorName?: string
    authorRole?: string
    authorEmail?: string
    anchor?: { type?: string; sectionKey?: string; fieldKey?: string }
    parentId?: string | null
    cycleNumber?: number
    createdAt?: string
    updatedAt?: string
    editedAt?: string
}

interface ApprovalHistoryEntry {
    type?: string
    description?: string
    date?: string | number
    approver?: { name?: string; role?: string; email?: string }
}

interface Submission {
    _id: string
    contractorEmail: string
    companyName: string
    inviteId?: string
    groupId?: any
    formVersionId?: string
    answers?: Record<string, any>
    pageProgress?: Record<string, any>
    submitted: boolean
    submitTime?: number
    status: string
    level: number
    approved: boolean
    cycleNumber: number
    approvalHistory?: ApprovalHistoryEntry[]
    returnTime?: number
    updateTime?: number
    lastApproved?: number
    park?: any
    selectedEndUsers?: string[]
    jobCategories?: string[]
    siteVisitRequired?: boolean
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}

interface FormVersion {
    _id: string
    versionNumber?: number
    schema?: any
}

const stageFromLevel = (level: number): string => {
    if (level == null || level < 0 || level > 5) return "—"
    return String.fromCharCode(66 + level)
}

const StagePill = ({ submission }: { submission: Submission }) => {
    if (submission.approved) return <span className={styles.stagePillL3}>L3</span>
    return <span className={styles.stagePill}>Stage {stageFromLevel(submission.level)}</span>
}

const V2SubmissionDetailPage = () => {
    const params = useParams<{ id: string }>()
    const id = params?.id
    const user = useSelector((state: any) => state.user.user)

    const [tab, setTab] = useState<"form" | "certificates" | "comments" | "history">("form")
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [certActingId, setCertActingId] = useState<string | null>(null)
    const [certError, setCertError] = useState("")
    const [rejectingCertId, setRejectingCertId] = useState<string | null>(null)
    const [certRejectReason, setCertRejectReason] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [submission, setSubmission] = useState<Submission | null>(null)
    const [formVersion, setFormVersion] = useState<FormVersion | null>(null)
    const [remarks, setRemarks] = useState<Remark[]>([])
    const [comments, setComments] = useState<Comment[]>([])

    // Action state
    const [actionRunning, setActionRunning] = useState<ActionKey | null>(null)
    const [actionError, setActionError] = useState("")
    const [actionSuccess, setActionSuccess] = useState("")

    // Modal forms
    const [returnOpen, setReturnOpen] = useState(false)
    const [returnRemarks, setReturnRemarks] = useState<Array<{ sectionKey: string; text: string }>>([
        { sectionKey: "", text: "" },
    ])
    const [parkRequestOpen, setParkRequestOpen] = useState(false)
    const [parkReason, setParkReason] = useState("")

    // Comment composer
    const [newComment, setNewComment] = useState("")
    const [postingComment, setPostingComment] = useState(false)
    const [commentError, setCommentError] = useState("")
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
    const [editingCommentText, setEditingCommentText] = useState("")

    const role = user?.role

    const fetchAll = async () => {
        if (!id) return
        try {
            setLoading(true)
            setError("")
            const [s, c, cert] = await Promise.all([
                getProtected(`api/v2/submissions/${id}`, role),
                getProtected(`api/v2/submissions/${id}/comments`, role),
                getProtected(`api/v2/submissions/${id}/certificates`, role),
            ])
            if (s?.status === "OK") {
                setSubmission(s.data?.submission || null)
                setFormVersion(s.data?.formVersion || null)
                setRemarks(s.data?.remarks || [])
            } else {
                setError(s?.error?.message || "Failed to load submission")
            }
            if (c?.status === "OK") setComments(c.data?.comments || [])
            if (cert?.status === "OK") setCertificates(cert.data?.certificates || [])
        } catch (e: any) {
            setError(e?.message || "Failed to load")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id && role) fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, role])

    const runAction = async (
        action: ActionKey,
        payload: Record<string, any> = {},
    ): Promise<boolean> => {
        if (!id) return false
        try {
            setActionRunning(action)
            setActionError("")
            setActionSuccess("")
            const result = await postProtected(`api/v2/submissions/${id}/${action}`, payload, role)
            if (result?.status === "OK") {
                setActionSuccess(`Action "${action}" completed.`)
                await fetchAll()
                return true
            }
            setActionError(result?.error?.message || `Action "${action}" failed`)
            return false
        } catch (e: any) {
            setActionError(e?.message || "Unexpected error")
            return false
        } finally {
            setActionRunning(null)
        }
    }

    const submitReturn = async () => {
        const cleaned = returnRemarks
            .map((r) => ({ sectionKey: r.sectionKey.trim(), text: r.text.trim() }))
            .filter((r) => r.sectionKey && r.text)
        if (cleaned.length === 0) {
            setActionError("At least one remark with a section is required to return.")
            return
        }
        const ok = await runAction("return", { remarks: cleaned })
        if (ok) {
            setReturnOpen(false)
            setReturnRemarks([{ sectionKey: "", text: "" }])
        }
    }

    const submitParkRequest = async () => {
        if (!parkReason.trim()) {
            setActionError("A reason is required to request park.")
            return
        }
        const ok = await runAction("request-park", { reason: parkReason.trim() })
        if (ok) {
            setParkRequestOpen(false)
            setParkReason("")
        }
    }

    const postComment = async () => {
        if (!id || !newComment.trim()) return
        try {
            setPostingComment(true)
            setCommentError("")
            const result = await postProtected(
                `api/v2/submissions/${id}/comments`,
                { text: newComment.trim() },
                role,
            )
            if (result?.status === "OK") {
                setNewComment("")
                const c = await getProtected(`api/v2/submissions/${id}/comments`, role)
                if (c?.status === "OK") setComments(c.data?.comments || [])
            } else {
                setCommentError(result?.error?.message || "Failed to post comment")
            }
        } catch (e: any) {
            setCommentError(e?.message || "Unexpected error")
        } finally {
            setPostingComment(false)
        }
    }

    const startEditComment = (c: Comment) => {
        setEditingCommentId(c._id)
        setEditingCommentText(c.text)
    }

    const submitEditComment = async () => {
        if (!editingCommentId || !editingCommentText.trim()) return
        try {
            setPostingComment(true)
            setCommentError("")
            const result = await putProtected(
                `api/v2/comments/${editingCommentId}`,
                { text: editingCommentText.trim() },
                role,
            )
            if (result?.status === "OK") {
                setEditingCommentId(null)
                setEditingCommentText("")
                const c = await getProtected(`api/v2/submissions/${id}/comments`, role)
                if (c?.status === "OK") setComments(c.data?.comments || [])
            } else {
                setCommentError(result?.error?.message || "Failed to edit comment")
            }
        } catch (e: any) {
            setCommentError(e?.message || "Unexpected error")
        } finally {
            setPostingComment(false)
        }
    }

    const approveCertificate = async (certId: string) => {
        try {
            setCertActingId(certId)
            setCertError("")
            const result = await putProtected(
                `api/v2/certificates/${certId}/review`,
                { decision: "approved" },
                role,
            )
            if (result?.status === "OK") {
                await fetchAll()
            } else {
                setCertError(result?.error?.message || "Approve failed")
            }
        } catch (e: any) {
            setCertError(e?.message || "Unexpected error")
        } finally {
            setCertActingId(null)
        }
    }

    const submitRejectCertificate = async () => {
        if (!rejectingCertId) return
        if (!certRejectReason.trim()) {
            setCertError("A reason is required to reject.")
            return
        }
        try {
            setCertActingId(rejectingCertId)
            setCertError("")
            const result = await putProtected(
                `api/v2/certificates/${rejectingCertId}/review`,
                { decision: "rejected", remarks: certRejectReason.trim() },
                role,
            )
            if (result?.status === "OK") {
                setRejectingCertId(null)
                setCertRejectReason("")
                await fetchAll()
            } else {
                setCertError(result?.error?.message || "Reject failed")
            }
        } catch (e: any) {
            setCertError(e?.message || "Unexpected error")
        } finally {
            setCertActingId(null)
        }
    }

    const withdrawRemark = async (remarkId: string) => {
        try {
            const result = await postProtected(`api/v2/remarks/${remarkId}/withdraw`, {}, role)
            if (result?.status === "OK") {
                await fetchAll()
            } else {
                setActionError(result?.error?.message || "Failed to withdraw remark")
            }
        } catch (e: any) {
            setActionError(e?.message || "Unexpected error")
        }
    }

    // Map remarks to FormRenderer's expected shape.
    const activeRemarksBySection = useMemo(() => {
        const out: Record<string, Array<{ _id: string; text: string; authorName?: string }>> = {}
        remarks
            .filter((r) => r.status === "active" && r.cycleNumber === (submission?.cycleNumber || 1))
            .forEach((r) => {
                if (!out[r.sectionKey]) out[r.sectionKey] = []
                out[r.sectionKey].push({ _id: r._id, text: r.text, authorName: r.authorName })
            })
        return out
    }, [remarks, submission?.cycleNumber])

    const answers = useMemo<Record<string, any>>(() => {
        if (!submission?.answers) return {}
        // Mongoose Map may serialize as a plain object — handle both.
        if (submission.answers instanceof Map) return Object.fromEntries(submission.answers as any)
        return submission.answers as Record<string, any>
    }, [submission])

    // Action availability heuristics. The server enforces the real rules.
    const can = useMemo(() => {
        if (!submission) return {}
        const isHod = ["Admin", "HOD"].includes(role)
        const isExec = ["Admin", "Executive Approver"].includes(role)
        const isAdmin = role === "Admin"
        const pending = submission.status === "pending"
        const parkRequested = submission.status === "park requested"
        const parked = submission.status === "parked"
        return {
            advance: pending && submission.level < 5,
            finalApprove: pending && submission.level === 5 && isExec,
            returnToVendor: pending,
            requestPark: pending,
            approvePark: parkRequested && isHod,
            declinePark: parkRequested && isHod,
            releasePark: parked && isHod,
            retrieve: submission.status === "returned",
            revertFromL3: submission.approved && isAdmin,
        }
    }, [submission, role])

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading submission…</p>
                </div>
            </div>
        )
    }

    if (error || !submission) {
        return (
            <div className={styles.page}>
                <div className={styles.errorBanner}>
                    <ErrorText text={error || "Submission not found"} />
                    <Link href="/staff/v2-approvals" className={styles.btnLink}>Back to queue</Link>
                </div>
            </div>
        )
    }

    const groupName = submission.groupId?.name || "—"
    const historyEntries = [...(submission.approvalHistory || [])].reverse()

    return (
        <div className={styles.page}>
            <div className={styles.breadcrumbs}>
                <Link href="/staff/v2-approvals" className={styles.crumbLink}>← V2 Approvals</Link>
            </div>

            <div className={styles.headerCard}>
                <div className={styles.headerMain}>
                    <h2 className={styles.title}>{submission.companyName || "(no name)"}</h2>
                    <p className={styles.subtitle}>{submission.contractorEmail}</p>
                    <div className={styles.chipRow}>
                        <StagePill submission={submission} />
                        <span className={`${styles.statusBadge} ${styles[`status_${submission.status.replace(" ", "_")}`] || ""}`}>
                            {submission.status}
                        </span>
                        <span className={styles.cycle}>Cycle #{submission.cycleNumber || 1}</span>
                        <span className={styles.metaPill}>Group: {groupName}</span>
                        {formVersion?.versionNumber != null && (
                            <span className={styles.metaPill}>Form v{formVersion.versionNumber}</span>
                        )}
                    </div>
                </div>

                <div className={styles.headerActions}>
                    {actionSuccess && <SuccessMessage message={actionSuccess} />}
                    {actionError && <ErrorText text={actionError} />}

                    {can.advance && (
                        <button
                            className={styles.btnPrimary}
                            disabled={!!actionRunning}
                            onClick={() => runAction("advance")}
                        >
                            Advance to Stage {stageFromLevel(submission.level + 1)}
                            {actionRunning === "advance" && <ButtonLoadingIcon />}
                        </button>
                    )}
                    {can.finalApprove && (
                        <button
                            className={styles.btnSuccess}
                            disabled={!!actionRunning}
                            onClick={() => runAction("final-approve")}
                        >
                            Final approve (L3)
                            {actionRunning === "final-approve" && <ButtonLoadingIcon />}
                        </button>
                    )}
                    {can.returnToVendor && (
                        <button
                            className={styles.btnDanger}
                            disabled={!!actionRunning}
                            onClick={() => setReturnOpen(true)}
                        >
                            Return to contractor
                        </button>
                    )}
                    {can.requestPark && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={() => setParkRequestOpen(true)}
                        >
                            Request park
                        </button>
                    )}
                    {can.approvePark && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={() => runAction("approve-park")}
                        >
                            Approve park
                            {actionRunning === "approve-park" && <ButtonLoadingIcon />}
                        </button>
                    )}
                    {can.declinePark && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={() => runAction("decline-park")}
                        >
                            Decline park
                            {actionRunning === "decline-park" && <ButtonLoadingIcon />}
                        </button>
                    )}
                    {can.releasePark && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={() => runAction("release-park")}
                        >
                            Release from park
                            {actionRunning === "release-park" && <ButtonLoadingIcon />}
                        </button>
                    )}
                    {can.retrieve && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={() => runAction("retrieve")}
                        >
                            Retrieve from contractor
                            {actionRunning === "retrieve" && <ButtonLoadingIcon />}
                        </button>
                    )}
                    {can.revertFromL3 && (
                        <button
                            className={styles.btnDanger}
                            disabled={!!actionRunning}
                            onClick={() => runAction("revert-from-l3")}
                        >
                            Revert from L3
                            {actionRunning === "revert-from-l3" && <ButtonLoadingIcon />}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tab === "form" ? styles.tabActive : ""}`}
                    onClick={() => setTab("form")}
                >
                    Form
                </button>
                <button
                    className={`${styles.tab} ${tab === "certificates" ? styles.tabActive : ""}`}
                    onClick={() => setTab("certificates")}
                >
                    Certificates ({certificates.filter((c) => c.trackingStatus !== "untracked - updated").length})
                </button>
                <button
                    className={`${styles.tab} ${tab === "comments" ? styles.tabActive : ""}`}
                    onClick={() => setTab("comments")}
                >
                    Comments ({comments.length})
                </button>
                <button
                    className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
                    onClick={() => setTab("history")}
                >
                    History ({historyEntries.length})
                </button>
            </div>

            {tab === "form" && (
                <div className={styles.tabBody}>
                    {!formVersion?.schema ? (
                        <div className={styles.emptyState}>
                            <p>No form schema attached.</p>
                        </div>
                    ) : (
                        <FormRenderer
                            schema={formVersion.schema}
                            answers={answers}
                            mode="view"
                            activeRemarksBySection={activeRemarksBySection}
                        />
                    )}

                    {remarks.length > 0 && (
                        <div className={styles.remarksPanel}>
                            <h4>Remarks history</h4>
                            <ul>
                                {remarks.map((r) => (
                                    <li key={r._id} className={styles[`remark_${r.status}`]}>
                                        <div className={styles.remarkHead}>
                                            <strong>{r.sectionKey}</strong>
                                            <span className={styles.dim}>cycle #{r.cycleNumber}</span>
                                            <span className={`${styles.remarkStatus} ${styles[`rstat_${r.status}`]}`}>{r.status}</span>
                                            {r.status === "active" && r.authorEmail === user?.email && (
                                                <button className={styles.btnLink} onClick={() => withdrawRemark(r._id)}>
                                                    Withdraw
                                                </button>
                                            )}
                                        </div>
                                        <p className={styles.remarkText}>{r.text}</p>
                                        <div className={styles.remarkFoot}>
                                            <span>{r.authorName}</span>
                                            {r.createdAt && <span>{new Date(r.createdAt).toLocaleString("en-NG")}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {tab === "certificates" && (
                <div className={styles.tabBody}>
                    {certError && <ErrorText text={certError} />}
                    {certificates.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No certificates uploaded for this submission.</p>
                        </div>
                    ) : (
                        <ul className={styles.certList}>
                            {certificates.map((c) => {
                                const isCurrent = c.trackingStatus !== "untracked - updated"
                                const exp = c.expiryDate ? new Date(c.expiryDate) : null
                                const now = new Date()
                                const expStatus =
                                    exp == null
                                        ? null
                                        : exp.getTime() < now.getTime()
                                          ? "expired"
                                          : exp.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
                                            ? "expiring"
                                            : "healthy"
                                return (
                                    <li
                                        key={c._id}
                                        className={`${styles.certItem} ${
                                            !isCurrent ? styles.certSuperseded : ""
                                        }`}
                                    >
                                        <div className={styles.certHead}>
                                            <strong>{c.label || c.fieldKey}</strong>
                                            <span className={styles.dim}>
                                                {c.name} · slot {c.updateCode.slice(-6)}
                                            </span>
                                            {!isCurrent && (
                                                <span className={styles.certBadgeNeutral}>superseded</span>
                                            )}
                                            <span
                                                className={`${styles.certBadge} ${
                                                    styles[`certStatus_${c.certStatus}`] || ""
                                                }`}
                                            >
                                                {c.certStatus}
                                            </span>
                                            {c.isReUpload && (
                                                <span className={styles.certBadgeInfo}>re-upload</span>
                                            )}
                                            {expStatus && (
                                                <span className={`${styles.certBadge} ${styles[`expiry_${expStatus}`]}`}>
                                                    {expStatus}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.certBody}>
                                            <a
                                                href={c.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.btnLink}
                                            >
                                                Open file
                                            </a>
                                            {c.issueDate && (
                                                <span className={styles.dim}>
                                                    Issued {new Date(c.issueDate).toLocaleDateString("en-NG")}
                                                </span>
                                            )}
                                            {c.expiryDate && (
                                                <span className={styles.dim}>
                                                    Expires {new Date(c.expiryDate).toLocaleDateString("en-NG")}
                                                </span>
                                            )}
                                        </div>
                                        {c.reviewRemarks && (
                                            <div className={styles.certRemarks}>
                                                <strong>{c.reviewedBy?.name || "Reviewer"}:</strong>{" "}
                                                {c.reviewRemarks}
                                            </div>
                                        )}
                                        {isCurrent && c.certStatus === "pending" && (
                                            <div className={styles.certActions}>
                                                <button
                                                    className={styles.btnApprove}
                                                    disabled={certActingId === c._id}
                                                    onClick={() => approveCertificate(c._id)}
                                                >
                                                    Approve
                                                    {certActingId === c._id && <ButtonLoadingIcon />}
                                                </button>
                                                <button
                                                    className={styles.btnDanger}
                                                    disabled={certActingId === c._id}
                                                    onClick={() => {
                                                        setRejectingCertId(c._id)
                                                        setCertRejectReason("")
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {rejectingCertId && (
                        <Modal>
                            <div className={styles.modalCard}>
                                <div className={styles.modalHeader}>
                                    <h3>Reject certificate</h3>
                                    <p className={styles.modalSub}>
                                        Tell the contractor why this certificate isn't acceptable. They'll see
                                        the reason inline when they re-upload.
                                    </p>
                                </div>
                                <div className={styles.modalBody}>
                                    <textarea
                                        rows={4}
                                        value={certRejectReason}
                                        onChange={(e) => setCertRejectReason(e.target.value)}
                                        placeholder="e.g. Document is illegible, please re-upload a clearer scan."
                                    />
                                    {certError && <ErrorText text={certError} />}
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        className={styles.btnSecondary}
                                        onClick={() => setRejectingCertId(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={styles.btnDanger}
                                        onClick={submitRejectCertificate}
                                        disabled={!certRejectReason.trim() || certActingId === rejectingCertId}
                                    >
                                        Reject
                                        {certActingId === rejectingCertId && <ButtonLoadingIcon />}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </div>
            )}

            {tab === "comments" && (
                <div className={styles.tabBody}>
                    <div className={styles.commentComposer}>
                        <textarea
                            rows={3}
                            placeholder="Add a staff-only internal comment…"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={postingComment}
                        />
                        <div className={styles.commentActions}>
                            {commentError && <ErrorText text={commentError} />}
                            <button
                                className={styles.btnPrimary}
                                disabled={postingComment || !newComment.trim()}
                                onClick={postComment}
                            >
                                Post comment
                                {postingComment && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>

                    {comments.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No internal comments yet.</p>
                        </div>
                    ) : (
                        <ul className={styles.commentList}>
                            {comments.map((c) => {
                                const isAuthor = c.authorEmail === user?.email
                                const isEditing = editingCommentId === c._id
                                const withinEditWindow = (() => {
                                    if (!c.createdAt) return false
                                    return Date.now() - new Date(c.createdAt).getTime() < 15 * 60 * 1000
                                })()
                                return (
                                    <li key={c._id} className={styles.commentItem}>
                                        <div className={styles.commentHead}>
                                            <strong>{c.authorName || c.authorEmail}</strong>
                                            <span className={styles.dim}>{c.authorRole}</span>
                                            {c.createdAt && (
                                                <span className={styles.dim}>
                                                    {new Date(c.createdAt).toLocaleString("en-NG")}
                                                </span>
                                            )}
                                            {c.editedAt && <span className={styles.dim}>(edited)</span>}
                                            {isAuthor && withinEditWindow && !isEditing && (
                                                <button className={styles.btnLink} onClick={() => startEditComment(c)}>
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                        {isEditing ? (
                                            <div>
                                                <textarea
                                                    rows={3}
                                                    value={editingCommentText}
                                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                                />
                                                <div className={styles.commentActions}>
                                                    <button
                                                        className={styles.btnSecondary}
                                                        onClick={() => setEditingCommentId(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        className={styles.btnPrimary}
                                                        disabled={postingComment || !editingCommentText.trim()}
                                                        onClick={submitEditComment}
                                                    >
                                                        Save
                                                        {postingComment && <ButtonLoadingIcon />}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className={styles.commentText}>{c.text}</p>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}

            {tab === "history" && (
                <div className={styles.tabBody}>
                    {historyEntries.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No history entries yet.</p>
                        </div>
                    ) : (
                        <ul className={styles.historyList}>
                            {historyEntries.map((h, idx) => (
                                <li key={idx} className={styles.historyItem}>
                                    <div className={styles.historyHead}>
                                        <strong>{h.type || h.description}</strong>
                                        {h.date && (
                                            <span className={styles.dim}>
                                                {new Date(h.date).toLocaleString("en-NG")}
                                            </span>
                                        )}
                                    </div>
                                    {h.description && h.type && h.description !== h.type && (
                                        <p className={styles.historyText}>{h.description}</p>
                                    )}
                                    {h.approver?.name && (
                                        <p className={styles.dim}>
                                            {h.approver.name} {h.approver.role && `(${h.approver.role})`}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {returnOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Return to contractor</h3>
                            <p className={styles.modalSub}>
                                Add one or more remarks. Each remark is anchored to a section key from the form
                                (e.g. <code>companyInformation</code>). The contractor will see these inline.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            {returnRemarks.map((r, i) => (
                                <div key={i} className={styles.remarkRow}>
                                    <input
                                        type="text"
                                        placeholder="section key"
                                        value={r.sectionKey}
                                        onChange={(e) => {
                                            const next = [...returnRemarks]
                                            next[i] = { ...next[i], sectionKey: e.target.value }
                                            setReturnRemarks(next)
                                        }}
                                    />
                                    <textarea
                                        rows={2}
                                        placeholder="Remark text"
                                        value={r.text}
                                        onChange={(e) => {
                                            const next = [...returnRemarks]
                                            next[i] = { ...next[i], text: e.target.value }
                                            setReturnRemarks(next)
                                        }}
                                    />
                                    {returnRemarks.length > 1 && (
                                        <button
                                            className={styles.btnLink}
                                            onClick={() => setReturnRemarks(returnRemarks.filter((_, j) => j !== i))}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                className={styles.btnLink}
                                onClick={() => setReturnRemarks([...returnRemarks, { sectionKey: "", text: "" }])}
                            >
                                + Add another remark
                            </button>
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnSecondary} onClick={() => setReturnOpen(false)}>
                                Cancel
                            </button>
                            <button
                                className={styles.btnDanger}
                                onClick={submitReturn}
                                disabled={actionRunning === "return"}
                            >
                                Return
                                {actionRunning === "return" && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {parkRequestOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Request park</h3>
                            <p className={styles.modalSub}>
                                Park requests are reviewed by the HOD. Provide a clear reason.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <textarea
                                rows={4}
                                placeholder="Reason for park request"
                                value={parkReason}
                                onChange={(e) => setParkReason(e.target.value)}
                            />
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnSecondary} onClick={() => setParkRequestOpen(false)}>
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitParkRequest}
                                disabled={actionRunning === "request-park" || !parkReason.trim()}
                            >
                                Submit
                                {actionRunning === "request-park" && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default V2SubmissionDetailPage
