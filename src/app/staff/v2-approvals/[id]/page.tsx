'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FormRenderer, { FieldEditRow } from "@/components/form/FormRenderer"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
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
    // State-machine history uses { action, date, actorName, actorEmail,
    // actorRole }. Older snapshots may still use type/description.
    action?: string
    type?: string
    description?: string
    date?: string | number
    actorName?: string
    actorEmail?: string
    actorRole?: string
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

// Drafts haven't been submitted yet, so by the canonical taxonomy they sit
// at Stage A ("Not Yet Submitted") regardless of internal level. Stage B
// only applies after the contractor has submitted (status flips from draft
// to pending).
const stageForSubmission = (submission: { status: string; level: number; approved: boolean }): string => {
    if (submission.approved) return "L3"
    if (submission.status === "draft") return "A"
    return stageFromLevel(submission.level)
}

const stageLongLabel = (submission: { status: string; level: number; approved: boolean }): string => {
    if (submission.approved) return "L3 — Approved Contractor"
    if (submission.status === "draft") return "Stage A — Not Yet Submitted"
    return `Stage ${stageFromLevel(submission.level)}`
}

const StagePill = ({ submission }: { submission: Submission }) => {
    if (submission.approved) return <span className={styles.stagePillL3}>L3</span>
    return <span className={styles.stagePill}>{stageLongLabel(submission)}</span>
}

const V2SubmissionDetailPage = () => {
    const params = useParams<{ id: string }>()
    const id = params?.id
    const user = useSelector((state: any) => state.user.user)

    const [tab, setTab] = useState<"form" | "certificates" | "edits" | "comments" | "history">("form")
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [certActingId, setCertActingId] = useState<string | null>(null)

    // EBA state
    const [fieldEdits, setFieldEdits] = useState<FieldEditRow[]>([])

    // Migration status
    const [migrationStatus, setMigrationStatus] = useState<any>(null)
    const [migrating, setMigrating] = useState(false)
    const [migrationError, setMigrationError] = useState("")
    const [editingField, setEditingField] = useState<{
        field: any
        fieldPath: string
        sectionKey: string
        currentValue: any
        newValue: any
        saving: boolean
        error: string
    } | null>(null)
    const [flaggingEdit, setFlaggingEdit] = useState<FieldEditRow | null>(null)
    const [flagReason, setFlagReason] = useState("")
    const [editActing, setEditActing] = useState(false)
    const [editError, setEditError] = useState("")
    const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirmDialog()
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
            const [s, c, cert, ed, mig] = await Promise.all([
                getProtected(`api/v2/submissions/${id}`, role),
                getProtected(`api/v2/submissions/${id}/comments`, role),
                getProtected(`api/v2/submissions/${id}/certificates`, role),
                getProtected(`api/v2/submissions/${id}/edits`, role),
                getProtected(`api/v2/submissions/${id}/migration-status`, role),
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
            if (ed?.status === "OK") setFieldEdits(ed.data?.edits || [])
            if (mig?.status === "OK") setMigrationStatus(mig.data || null)
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

    // ── EBA edit handlers ───────────────────────────────────────────────
    const ebaEditableNow = useMemo(() => {
        if (!submission) return false
        if (submission.status !== "pending") return false
        const isEditor = ["Admin", "VRM"].includes(role)
        const atEditableLevel = submission.level === 0 || submission.level === 3
        return isEditor && atEditableLevel
    }, [submission, role])

    const editReviewerNow = useMemo(() => {
        if (!submission) return false
        if (submission.status !== "pending") return false
        const isReviewer = ["Admin", "Supervisor", "HOD"].includes(role)
        const atReviewerLevel = submission.level === 1 || submission.level === 4
        return isReviewer && atReviewerLevel
    }, [submission, role])

    const fieldEditsByPath = useMemo<Record<string, FieldEditRow>>(() => {
        const out: Record<string, FieldEditRow> = {}
        // Show only the most-recent non-reverted edit per path. Older are in
        // the Edit Audit tab.
        const sorted = [...fieldEdits].sort((a, b) =>
            (b.createdAt || "").localeCompare(a.createdAt || ""),
        )
        for (const e of sorted) {
            if (e.status === "reverted") continue
            if (!out[e.fieldPath]) out[e.fieldPath] = e
        }
        return out
    }, [fieldEdits])

    const openEditField: NonNullable<React.ComponentProps<typeof FormRenderer>["onEditField"]> = (args) => {
        setEditingField({
            field: args.field,
            fieldPath: args.fieldPath,
            sectionKey: args.sectionKey,
            currentValue: args.currentValue,
            newValue: args.currentValue,
            saving: false,
            error: "",
        })
    }

    const saveFieldEdit = async () => {
        if (!editingField || !id) return
        if (JSON.stringify(editingField.newValue) === JSON.stringify(editingField.currentValue)) {
            setEditingField({ ...editingField, error: "Change the value before saving." })
            return
        }
        setEditingField({ ...editingField, saving: true, error: "" })
        try {
            const result = await postProtected(
                `api/v2/submissions/${id}/edit-field`,
                {
                    fieldKey: editingField.field.key,
                    fieldPath: editingField.fieldPath,
                    newValue: editingField.newValue,
                    sectionKey: editingField.sectionKey,
                },
                role,
            )
            if (result?.status === "OK") {
                setEditingField(null)
                await fetchAll()
            } else {
                setEditingField({
                    ...editingField,
                    saving: false,
                    error: result?.error?.message || "Edit failed",
                })
            }
        } catch (e: any) {
            setEditingField({
                ...editingField,
                saving: false,
                error: e?.message || "Unexpected error",
            })
        }
    }

    const openFlagEdit = (edit: FieldEditRow) => {
        setFlaggingEdit(edit)
        setFlagReason("")
        setEditError("")
    }

    const submitFlagEdit = async () => {
        if (!flaggingEdit || !id) return
        if (!flagReason.trim()) {
            setEditError("A reason is required.")
            return
        }
        setEditActing(true)
        setEditError("")
        try {
            const result = await postProtected(
                `api/v2/submissions/${id}/edits/${flaggingEdit._id}/flag`,
                { reason: flagReason.trim() },
                role,
            )
            if (result?.status === "OK") {
                setFlaggingEdit(null)
                setFlagReason("")
                await fetchAll()
            } else {
                setEditError(result?.error?.message || "Flag failed")
            }
        } catch (e: any) {
            setEditError(e?.message || "Unexpected error")
        } finally {
            setEditActing(false)
        }
    }

    const runMigrate = async (confirmUnsafe = false) => {
        if (!id) return
        const diff = migrationStatus?.diff
        const unsafe = diff && !diff.isSafe
        const ok = await confirmDialog({
            headerText: `Migrate to v${migrationStatus?.toVersion?.versionNumber}?`,
            bodyText:
                unsafe
                    ? `This migration removes ${diff.removedFieldKeys.length} field(s) and changes the type of ${diff.changedTypeFieldKeys.length} field(s). The removed answers will be stashed under __migration_dropped_v${migrationStatus?.fromVersion?.versionNumber} on the submission so they're recoverable, but they won't appear on the form. Continue?`
                    : `Migrating from v${migrationStatus?.fromVersion?.versionNumber} to v${migrationStatus?.toVersion?.versionNumber}. No data loss — ${diff?.addedFieldKeys?.length || 0} new field(s) will appear, ${diff?.requiredAddedFieldKeys?.length || 0} of them required.`,
            confirmText: "Migrate",
            destructive: !!unsafe,
        })
        if (!ok) return
        setMigrating(true)
        setMigrationError("")
        try {
            const result = await postProtected(
                `api/v2/submissions/${id}/migrate`,
                unsafe ? { confirmUnsafe: true } : {},
                role,
            )
            if (result?.status === "OK") {
                if (result.data?.requiresConfirmation && !confirmUnsafe) {
                    // Server signalled unsafe; loop back with confirm.
                    setMigrating(false)
                    return runMigrate(true)
                }
                await fetchAll()
            } else {
                setMigrationError(result?.error?.message || "Migration failed")
            }
        } catch (e: any) {
            setMigrationError(e?.message || "Unexpected error")
        } finally {
            setMigrating(false)
        }
    }

    const acceptEdit = async (edit: FieldEditRow) => {
        if (!id) return
        const ok = await confirmDialog({
            headerText: "Accept this edit?",
            bodyText: `Accept ${edit.editedBy?.name || "the VRM"}'s edit of "${edit.fieldKey}"? You can also let it be auto-accepted by advancing the submission.`,
            confirmText: "Accept edit",
        })
        if (!ok) return
        try {
            const result = await postProtected(
                `api/v2/submissions/${id}/edits/${edit._id}/accept`,
                {},
                role,
            )
            if (result?.status === "OK") {
                await fetchAll()
            } else {
                setEditError(result?.error?.message || "Accept failed")
            }
        } catch (e: any) {
            setEditError(e?.message || "Unexpected error")
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

            {migrationStatus?.available && (
                <div className={styles.migrationBanner}>
                    <div className={styles.migrationBannerMain}>
                        <strong>
                            Form template has a newer version (v{migrationStatus.fromVersion?.versionNumber}{" "}
                            → v{migrationStatus.toVersion?.versionNumber}).
                        </strong>
                        <p className={styles.migrationDiff}>
                            {migrationStatus.diff?.addedFieldKeys?.length || 0} added
                            {migrationStatus.diff?.requiredAddedFieldKeys?.length
                                ? ` (${migrationStatus.diff.requiredAddedFieldKeys.length} required)`
                                : ""}
                            {" · "}
                            {migrationStatus.diff?.removedFieldKeys?.length || 0} removed
                            {" · "}
                            {migrationStatus.diff?.changedTypeFieldKeys?.length || 0} type-changed
                            {migrationStatus.diff?.isSafe
                                ? " · safe migration"
                                : " · unsafe — review impact before migrating"}
                        </p>
                        {migrationError && <p className={styles.migrationErr}>{migrationError}</p>}
                    </div>
                    {["Admin", "HOD"].includes(role) && (
                        <button
                            className={styles.btnPrimary}
                            onClick={() => runMigrate()}
                            disabled={migrating}
                        >
                            {migrating ? "Migrating…" : "Migrate to latest"}
                        </button>
                    )}
                </div>
            )}

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
                    className={`${styles.tab} ${tab === "edits" ? styles.tabActive : ""}`}
                    onClick={() => setTab("edits")}
                >
                    Edit Audit ({fieldEdits.length})
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
                            mode="approval"
                            activeRemarksBySection={activeRemarksBySection}
                            ebaEditableNow={ebaEditableNow}
                            editReviewerNow={editReviewerNow}
                            fieldEditsByPath={fieldEditsByPath}
                            onEditField={openEditField}
                            onFlagEdit={openFlagEdit}
                            onAcceptEdit={acceptEdit}
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
                                        {isCurrent && c.certStatus === "pending" && submission.status !== "draft" && (
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

            {tab === "edits" && (
                <div className={styles.tabBody}>
                    {editError && <ErrorText text={editError} />}
                    {fieldEdits.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No staff edits on this submission yet.</p>
                        </div>
                    ) : (
                        <ul className={styles.certList}>
                            {fieldEdits.map((e) => (
                                <li key={e._id} className={styles.certItem}>
                                    <div className={styles.certHead}>
                                        <strong>{e.fieldKey}</strong>
                                        <span className={styles.dim}>{e.fieldPath}</span>
                                        <span
                                            className={`${styles.certBadge} ${
                                                e.status === "active"
                                                    ? styles.certStatus_pending
                                                    : e.status === "accepted"
                                                      ? styles.certStatus_approved
                                                      : e.status === "flagged"
                                                        ? styles.certStatus_rejected
                                                        : styles.certBadgeNeutral
                                            }`}
                                        >
                                            {e.status}
                                        </span>
                                        <span className={styles.certBadgeInfo}>
                                            Stage {e.editedAtStage} · cycle #{e.cycleNumber}
                                        </span>
                                    </div>
                                    <div className={styles.certBody}>
                                        <span className={styles.dim}>
                                            <strong>From:</strong>{" "}
                                            <code>
                                                {e.previousValue === undefined || e.previousValue === null
                                                    ? "—"
                                                    : typeof e.previousValue === "string"
                                                      ? e.previousValue
                                                      : JSON.stringify(e.previousValue)}
                                            </code>
                                        </span>
                                        <span className={styles.dim}>
                                            <strong>To:</strong>{" "}
                                            <code>
                                                {e.newValue === undefined || e.newValue === null
                                                    ? "—"
                                                    : typeof e.newValue === "string"
                                                      ? e.newValue
                                                      : JSON.stringify(e.newValue)}
                                            </code>
                                        </span>
                                        <span className={styles.dim}>
                                            by {e.editedBy?.name || e.editedBy?.role || "staff"}
                                            {e.createdAt
                                                ? ` · ${new Date(e.createdAt).toLocaleString("en-NG")}`
                                                : ""}
                                        </span>
                                    </div>
                                    {e.status === "flagged" && e.flaggedReason && (
                                        <div className={styles.certRemarks}>
                                            <strong>
                                                Flagged by {e.flaggedBy?.name || "Reviewer"} at Stage{" "}
                                                {e.flaggedAtStage}:
                                            </strong>{" "}
                                            {e.flaggedReason}
                                        </div>
                                    )}
                                    {e.status === "active" && editReviewerNow && (
                                        <div className={styles.certActions}>
                                            <button
                                                className={styles.btnApprove}
                                                onClick={() => acceptEdit(e)}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className={styles.btnDanger}
                                                onClick={() => openFlagEdit(e)}
                                            >
                                                Flag
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
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
                            {historyEntries.map((h, idx) => {
                                const headline = h.action || h.type || h.description || "Event"
                                const actorName = h.actorName || h.approver?.name
                                const actorRole = h.actorRole || h.approver?.role
                                return (
                                <li key={idx} className={styles.historyItem}>
                                    <div className={styles.historyHead}>
                                        <strong>{headline}</strong>
                                        {h.date && (
                                            <span className={styles.dim}>
                                                {new Date(h.date).toLocaleString("en-NG")}
                                            </span>
                                        )}
                                    </div>
                                    {(actorName || actorRole) && (
                                        <p className={styles.historyText}>
                                            By {actorName || "—"}{actorRole ? ` (${actorRole})` : ""}
                                        </p>
                                    )}
                                </li>
                                )
                            })}
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

            {/* EBA edit modal — renders a single-field FormRenderer instance
                in fill mode so the VRM can update the value using the right
                input type for the field. */}
            {editingField && formVersion && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Edit field (EBA)</h3>
                            <p className={styles.modalSub}>
                                Editing <code>{editingField.field.key}</code>. The contractor's
                                previous value is preserved in the audit trail and downstream
                                reviewers can flag this edit.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <FormRenderer
                                schema={{
                                    version: 1,
                                    pages: [
                                        {
                                            key: "ebaEditPage",
                                            title: "",
                                            sections: [
                                                {
                                                    key: "ebaEditSection",
                                                    title: "",
                                                    layout: "single",
                                                    fields: [editingField.field],
                                                },
                                            ],
                                        },
                                    ],
                                }}
                                answers={{ [editingField.field.key]: editingField.newValue }}
                                mode="fill"
                                onChange={(c) =>
                                    setEditingField({
                                        ...editingField,
                                        newValue: c[editingField.field.key],
                                        error: "",
                                    })
                                }
                            />
                            {editingField.error && <ErrorText text={editingField.error} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setEditingField(null)}
                                disabled={editingField.saving}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={saveFieldEdit}
                                disabled={editingField.saving}
                            >
                                Save edit
                                {editingField.saving && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Flag-edit modal */}
            {flaggingEdit && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Flag edit as wrong</h3>
                            <p className={styles.modalSub}>
                                Flagging an edit returns the field to the VRM for correction.
                                State the reason clearly so they can fix it.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <textarea
                                rows={4}
                                value={flagReason}
                                onChange={(e) => setFlagReason(e.target.value)}
                                placeholder="e.g. RC number doesn't match CAC certificate."
                            />
                            {editError && <ErrorText text={editError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setFlaggingEdit(null)}
                                disabled={editActing}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnDanger}
                                onClick={submitFlagEdit}
                                disabled={editActing || !flagReason.trim()}
                            >
                                Flag
                                {editActing && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmDialogEl}
        </div>
    )
}

export default V2SubmissionDetailPage
