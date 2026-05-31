'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FormRenderer, { FieldEditRow } from "@/components/form/FormRenderer"
import ApprovalReviewView from "./ApprovalReviewView"
import DueDiligencePanel from "./DueDiligencePanel"
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
    | "return-to-previous-stage"
    | "park-at-l2"

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
    selectedEndUsers?: any[]
    selectedServices?: string[]
    jobCategories?: any[]
    siteVisitRequired?: boolean
    dueDiligence?: any
    hodRemarkForEA?: string
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
    if (level == null || level < 0 || level > 5) return "-"
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
    if (submission.approved) return "L3 - Approved Contractor"
    if (submission.status === "draft") return "Stage A - Not Yet Submitted"
    return `Stage ${stageFromLevel(submission.level)}`
}

// Resolve a fieldKey to its human label by walking the form schema. Falls
// back to the key when nothing matches (e.g. orphan certs from older
// schema versions).
const fieldLabelFromSchema = (
    schema: any,
    fieldKey: string,
    preferApprovalLabel = true,
): string => {
    if (!schema?.pages || !fieldKey) return fieldKey
    for (const page of schema.pages) {
        for (const section of page.sections || []) {
            for (const f of section.fields || []) {
                if (f.key === fieldKey) {
                    if (preferApprovalLabel && f.approvalLabel) return f.approvalLabel
                    return f.label || fieldKey
                }
            }
        }
    }
    return fieldKey
}

// Resolve a sectionKey to its human title by walking the form schema.
const sectionLabelFromSchema = (schema: any, sectionKey: string): string => {
    if (!schema?.pages || !sectionKey) return sectionKey
    for (const page of schema.pages) {
        for (const section of page.sections || []) {
            if (section.key === sectionKey) return section.title || sectionKey
        }
    }
    return sectionKey
}

// Build a 'Section name > Field name' breadcrumb for an anchor pair. Used
// by the Comments + Edit Audit tabs so reviewers see human text instead of
// camelCase keys.
const anchorLabel = (
    schema: any,
    sectionKey?: string | null,
    fieldKey?: string | null,
): string => {
    const parts: string[] = []
    if (sectionKey) parts.push(sectionLabelFromSchema(schema, sectionKey))
    if (fieldKey) parts.push(fieldLabelFromSchema(schema, fieldKey))
    return parts.length ? parts.join(" > ") : "General"
}

const StagePill = ({ submission }: { submission: Submission }) => {
    if (submission.approved) return <span className={styles.stagePillL3}>L3</span>
    return <span className={styles.stagePill}>{stageLongLabel(submission)}</span>
}

const V2SubmissionDetailPage = () => {
    const params = useParams<{ id: string }>()
    const id = params?.id
    const user = useSelector((state: any) => state.user.user)

    const [tab, setTab] = useState<"form" | "certificates" | "due-diligence" | "edits" | "comments" | "history">("form")
    // Stage G (Executive Approver) modal state for the three decisions.
    const [returnPrevOpen, setReturnPrevOpen] = useState(false)
    const [returnPrevReason, setReturnPrevReason] = useState("")
    const [parkL2Open, setParkL2Open] = useState(false)
    const [parkL2Reason, setParkL2Reason] = useState("")
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [certActingId, setCertActingId] = useState<string | null>(null)

    // EBA state
    const [fieldEdits, setFieldEdits] = useState<FieldEditRow[]>([])

    // Migration status
    const [migrationStatus, setMigrationStatus] = useState<any>(null)

    // Stage C: end-user assignment.
    const [endUserPickerOpen, setEndUserPickerOpen] = useState(false)
    const [endUserCandidates, setEndUserCandidates] = useState<Array<{ _id: string; name: string; email: string; role: string }>>([])
    const [pickedEndUserIds, setPickedEndUserIds] = useState<string[]>([])
    const [savingEndUsers, setSavingEndUsers] = useState(false)
    const [endUserError, setEndUserError] = useState("")

    // Stage D: services + site visit recording.
    const [servicesOpen, setServicesOpen] = useState(false)
    const [pickedServices, setPickedServices] = useState<string[]>([])
    const [siteVisit, setSiteVisit] = useState(false)
    const [serviceDraft, setServiceDraft] = useState("")
    const [savingServices, setSavingServices] = useState(false)
    const [servicesError, setServicesError] = useState("")
    const [migrating, setMigrating] = useState(false)
    const [migrationError, setMigrationError] = useState("")
    // Per-field inline remark / comment modal state. Pre-fills the
    // sectionKey + fieldKey so reviewers don't have to type it.
    const [inlineRemark, setInlineRemark] = useState<{
        sectionKey: string
        fieldKey?: string
        text: string
        saving: boolean
        error: string
    } | null>(null)
    const [inlineComment, setInlineComment] = useState<{
        sectionKey: string
        fieldKey?: string
        text: string
        saving: boolean
        error: string
    } | null>(null)

    const openInlineRemark = (args: { sectionKey: string; fieldKey?: string }) => {
        if (submission?.status === "draft") {
            setActionError(
                "Cannot leave remarks while the application is still a draft.",
            )
            return
        }
        setInlineRemark({ ...args, text: "", saving: false, error: "" })
    }
    const openInlineComment = (args: { sectionKey: string; fieldKey?: string }) => {
        setInlineComment({ ...args, text: "", saving: false, error: "" })
    }

    const submitInlineRemark = async () => {
        if (!inlineRemark || !id) return
        if (!inlineRemark.text.trim()) {
            setInlineRemark({ ...inlineRemark, error: "Remark text is required." })
            return
        }
        setInlineRemark({ ...inlineRemark, saving: true, error: "" })
        try {
            const r = await postProtected(
                `api/v2/submissions/${id}/remarks`,
                {
                    sectionKey: inlineRemark.sectionKey,
                    fieldKey: inlineRemark.fieldKey,
                    text: inlineRemark.text.trim(),
                },
                role,
            )
            if (r?.status === "OK") {
                setInlineRemark(null)
                await fetchAll()
            } else {
                setInlineRemark({
                    ...inlineRemark,
                    saving: false,
                    error: r?.error?.message || "Could not save remark.",
                })
            }
        } catch (e: any) {
            setInlineRemark({
                ...inlineRemark,
                saving: false,
                error: e?.message || "Unexpected error.",
            })
        }
    }

    const submitInlineComment = async () => {
        if (!inlineComment || !id) return
        if (!inlineComment.text.trim()) {
            setInlineComment({ ...inlineComment, error: "Comment text is required." })
            return
        }
        setInlineComment({ ...inlineComment, saving: true, error: "" })
        try {
            const r = await postProtected(
                `api/v2/submissions/${id}/comments`,
                {
                    text: inlineComment.text.trim(),
                    anchor: {
                        type: inlineComment.fieldKey ? "field" : "section",
                        sectionKey: inlineComment.sectionKey,
                        fieldKey: inlineComment.fieldKey,
                    },
                },
                role,
            )
            if (r?.status === "OK") {
                setInlineComment(null)
                const c = await getProtected(`api/v2/submissions/${id}/comments`, role)
                if (c?.status === "OK") setComments(c.data?.comments || [])
            } else {
                setInlineComment({
                    ...inlineComment,
                    saving: false,
                    error: r?.error?.message || "Could not save comment.",
                })
            }
        } catch (e: any) {
            setInlineComment({
                ...inlineComment,
                saving: false,
                error: e?.message || "Unexpected error.",
            })
        }
    }

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
    // returnRemarks is unused now (remarks are authored inline) but kept
    // declared to minimise churn; can be removed in a follow-up sweep.
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

    // Return action - remarks are now authored inline on each section /
    // field via the ApprovalReviewView Notes panel before clicking Return.
    // The modal is a plain confirmation; we just ship whichever active
    // remarks exist on the current cycle through the BE return path.
    const submitReturn = async () => {
        const activeRemarksThisCycle = (remarks || []).filter(
            (r: any) =>
                r.status === "active" &&
                (!r.cycleNumber || r.cycleNumber === (submission?.cycleNumber || 1)),
        )
        if (activeRemarksThisCycle.length === 0) {
            setActionError(
                "Add at least one section or field remark before returning. Use the Notes panel on the section or field that needs the contractor's attention.",
            )
            return
        }
        const ok = await runAction("return", {})
        if (ok) setReturnOpen(false)
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

    // Stage C: open the end-user picker. Loads candidate list lazily then
    // seeds the picker with whatever the supervisor already chose so they
    // can amend instead of starting over.
    const openEndUserPicker = async () => {
        if (!id) return
        setEndUserError("")
        setEndUserPickerOpen(true)
        setPickedEndUserIds(
            Array.isArray(submission?.selectedEndUsers)
                ? submission!.selectedEndUsers!.map((u: any) =>
                      typeof u === "string" ? u : String(u?._id || u),
                  )
                : [],
        )
        if (endUserCandidates.length === 0) {
            try {
                const r = await getProtected("api/v2/staff/end-user-candidates", role)
                if (r?.status === "OK") {
                    setEndUserCandidates(r.data?.users || [])
                } else {
                    setEndUserError(r?.error?.message || "Could not load end users")
                }
            } catch (e: any) {
                setEndUserError(e?.message || "Could not load end users")
            }
        }
    }

    const saveEndUsers = async () => {
        if (!id) return
        if (pickedEndUserIds.length === 0) {
            setEndUserError("Pick at least one end user before saving.")
            return
        }
        setSavingEndUsers(true)
        setEndUserError("")
        try {
            const r = await putProtected(
                `api/v2/submissions/${id}/end-users`,
                { userIds: pickedEndUserIds },
                role,
            )
            if (r?.status === "OK") {
                setEndUserPickerOpen(false)
                await fetchAll()
            } else {
                setEndUserError(r?.error?.message || "Could not save end users")
            }
        } catch (e: any) {
            setEndUserError(e?.message || "Unexpected error")
        } finally {
            setSavingEndUsers(false)
        }
    }

    // Stage D: open the services + site-visit recorder for assigned end
    // users. Seeds with prior selection so re-opening shows current state.
    const openServicesModal = () => {
        setServicesError("")
        setPickedServices(
            Array.isArray((submission as any)?.selectedServices)
                ? [...(submission as any).selectedServices]
                : Array.isArray(submission?.jobCategories)
                  ? [...(submission as any).jobCategories]
                  : [],
        )
        setSiteVisit(!!submission?.siteVisitRequired)
        setServiceDraft("")
        setServicesOpen(true)
    }

    const addServiceChip = () => {
        const v = serviceDraft.trim()
        if (!v) return
        if (pickedServices.includes(v)) {
            setServiceDraft("")
            return
        }
        setPickedServices([...pickedServices, v])
        setServiceDraft("")
    }

    const removeServiceChip = (s: string) => {
        setPickedServices(pickedServices.filter((x) => x !== s))
    }

    // Stage F/G internal-return: HOD sends back to E or Executive Approver
    // sends back to F. Re-uses the state-machine return-to-previous-stage
    // action which decides the destination level from the current level.
    const submitReturnPrev = async () => {
        if (!returnPrevReason.trim()) {
            setActionError("A reason is required to return for research.")
            return
        }
        const ok = await runAction("return-to-previous-stage", { reason: returnPrevReason.trim() })
        if (ok) {
            setReturnPrevOpen(false)
            setReturnPrevReason("")
        }
    }

    const submitParkL2 = async () => {
        if (!parkL2Reason.trim()) {
            setActionError("A reason is required to mark Do Not Add.")
            return
        }
        const ok = await runAction("park-at-l2", { reason: parkL2Reason.trim() })
        if (ok) {
            setParkL2Open(false)
            setParkL2Reason("")
        }
    }

    const saveServices = async () => {
        if (!id) return
        if (pickedServices.length === 0) {
            setServicesError("Add at least one service before saving.")
            return
        }
        setSavingServices(true)
        setServicesError("")
        try {
            const r = await postProtected(
                `api/v2/submissions/${id}/services`,
                { selectedServices: pickedServices, siteVisitRequired: siteVisit },
                role,
            )
            if (r?.status === "OK") {
                setServicesOpen(false)
                await fetchAll()
            } else {
                setServicesError(r?.error?.message || "Could not save services")
            }
        } catch (e: any) {
            setServicesError(e?.message || "Unexpected error")
        } finally {
            setSavingServices(false)
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
    // Active remarks on the current cycle block the process button. Per the
    // C&P ticket: once a reviewer has left ANY remark for the contractor in
    // the current cycle, the application can only be returned (sending those
    // remarks to the contractor) or recommended for hold (park request).
    // Advance / final-approve are gated off.
    // Which roles can tick section-review checkboxes at the current stage.
    // Mirrors STAGE_ADVANCERS on the BE so the FE and the route gate agree.
    const canActAtCurrentStage = useMemo(() => {
        if (!submission) return false
        if (submission.status !== "pending") return false
        return [
            "Admin",
            "HOD",
            "VRM",
            "CO",
            "Supervisor",
            "End User",
            "Amni Staff",
            "Executive Approver",
        ].includes(role)
    }, [submission, role])

    // All visible (non-hideOnApproval) sections must be ticked for the
    // current (level, cycle) before the process button is allowed. Pairs
    // with the BE guard in applyTransition.
    const allSectionsReviewed = useMemo(() => {
        if (!submission || !formVersion?.schema?.pages) return false
        const approvals: Record<string, any> =
            (submission as any).sectionApprovals || {}
        const level = submission.level
        const cycle = submission.cycleNumber || 1
        const required: string[] = []
        for (const p of formVersion.schema.pages) {
            for (const s of p.sections || []) {
                if (!s?.hideOnApproval && s?.key) required.push(s.key)
            }
        }
        if (required.length === 0) return true
        return required.every((sk) => !!approvals[`${level}:${cycle}:${sk}`])
    }, [submission, formVersion])

    const toggleSectionApproval = async (sectionKey: string, next: boolean) => {
        if (!id) return
        try {
            const r = await postProtected(
                `api/v2/submissions/${id}/section-approvals`,
                { sectionKey, approved: next },
                role,
            )
            if (r?.status === "OK") {
                // Local update to keep the UI snappy without a full refetch.
                setSubmission((prev: any) =>
                    prev ? { ...prev, sectionApprovals: r.data.submission.sectionApprovals } : prev,
                )
            } else {
                setActionError(r?.error?.message || "Could not save section approval.")
            }
        } catch (e: any) {
            setActionError(e?.message || "Unexpected error.")
        }
    }

    const hasActiveRemarksThisCycle = useMemo(() => {
        const c = submission?.cycleNumber || 1
        return (remarks || []).some(
            (r: any) => r.status === "active" && (!r.cycleNumber || r.cycleNumber === c),
        )
    }, [remarks, submission?.cycleNumber])

    const can = useMemo(() => {
        if (!submission) return {}
        const isHod = ["Admin", "HOD"].includes(role)
        const isExec = ["Admin", "Executive Approver"].includes(role)
        const isAdmin = role === "Admin"
        const isSupervisor = ["Admin", "HOD", "Supervisor"].includes(role)
        const pending = submission.status === "pending"
        const parkRequested = submission.status === "park requested"
        const parked = submission.status === "parked"
        // At Stage D, only the assigned end users (plus Admin/HOD) can act.
        const assignedIds = (submission.selectedEndUsers || []).map((u: any) =>
            typeof u === "string" ? u : String(u?._id || u),
        )
        const isAssignedEndUser =
            !!user?._id && assignedIds.includes(String(user._id))
        const canActAtStageD = isHod || isAssignedEndUser
        return {
            advance:
                pending &&
                submission.level < 5 &&
                !hasActiveRemarksThisCycle &&
                allSectionsReviewed &&
                (submission.level !== 2 || canActAtStageD),
            finalApprove:
                pending &&
                submission.level === 5 &&
                isExec &&
                !hasActiveRemarksThisCycle &&
                allSectionsReviewed,
            returnToVendor: pending && (submission.level !== 2 || canActAtStageD),
            requestPark: pending && (submission.level !== 2 || canActAtStageD),
            approvePark: parkRequested && isHod,
            declinePark: parkRequested && isHod,
            releasePark: parked && isHod,
            retrieve: submission.status === "returned",
            revertFromL3: submission.approved && isAdmin,
            // Stage C assignment - supervisor (or HOD/Admin) picks end users
            // before advancing to Stage D.
            assignEndUsers: pending && submission.level === 1 && isSupervisor,
            // Stage D recording - assigned end user (or HOD/Admin) records
            // the applicable services + site-visit flag before advancing.
            recordServices: pending && submission.level === 2 && canActAtStageD,
            // Stage F: HOD can return to E for more DD research.
            returnToE: pending && submission.level === 4 && isHod,
            // Stage G: Executive Approver decisions - return to F for research,
            // or "do not add" (park at L2).
            returnToF: pending && submission.level === 5 && isExec,
            doNotAdd: pending && submission.level === 5 && isExec,
        }
    }, [submission, role, user, hasActiveRemarksThisCycle, allSectionsReviewed])

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
                    {submission.status === "pending" && hasActiveRemarksThisCycle && (
                        <div className={styles.remarkGate}>
                            Active remarks block the process button. Return to
                            contractor or request hold to continue.
                        </div>
                    )}
                    {submission.status === "pending" &&
                        !hasActiveRemarksThisCycle &&
                        !allSectionsReviewed && (
                            <div className={styles.remarkGate}>
                                Tick the Reviewed checkbox on each section
                                before processing forward.
                            </div>
                        )}

                    {can.assignEndUsers && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={openEndUserPicker}
                        >
                            {Array.isArray(submission.selectedEndUsers) && submission.selectedEndUsers.length > 0
                                ? `End Users (${submission.selectedEndUsers.length})`
                                : "Assign End Users"}
                        </button>
                    )}
                    {can.recordServices && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={openServicesModal}
                        >
                            {Array.isArray((submission as any).selectedServices) && (submission as any).selectedServices.length > 0
                                ? `Services (${(submission as any).selectedServices.length})`
                                : "Record Services"}
                        </button>
                    )}
                    {submission.status === "pending" && submission.level === 2 &&
                        !["Admin", "HOD"].includes(role) &&
                        !(user?._id && (submission.selectedEndUsers || []).some(
                            (u: any) => String(typeof u === "string" ? u : u?._id || u) === String(user._id),
                        )) && (
                            <div className={styles.remarkGate}>
                                At Stage D only the End Users assigned by the
                                Supervisor can advance, return or hold this
                                application.
                            </div>
                        )}
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
                    {(can.returnToE || can.returnToF) && (
                        <button
                            className={styles.btnSecondary}
                            disabled={!!actionRunning}
                            onClick={() => {
                                setReturnPrevReason("")
                                setReturnPrevOpen(true)
                            }}
                        >
                            Return for Research
                        </button>
                    )}
                    {can.doNotAdd && (
                        <button
                            className={styles.btnDanger}
                            disabled={!!actionRunning}
                            onClick={() => {
                                setParkL2Reason("")
                                setParkL2Open(true)
                            }}
                        >
                            Do Not Add (Park at L2)
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
                {(submission.level >= 3 || submission.dueDiligence) && (
                    <button
                        className={`${styles.tab} ${tab === "due-diligence" ? styles.tabActive : ""}`}
                        onClick={() => setTab("due-diligence")}
                    >
                        Due Diligence
                    </button>
                )}
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
                        <ApprovalReviewView
                            schema={formVersion.schema}
                            answers={answers}
                            remarks={remarks as any}
                            comments={comments as any}
                            fieldEditsByPath={fieldEditsByPath}
                            cycleNumber={submission.cycleNumber || 1}
                            level={submission.level}
                            sectionApprovals={(submission as any).sectionApprovals || {}}
                            canApproveSections={canActAtCurrentStage}
                            onToggleSectionApproved={toggleSectionApproval}
                            ebaEditableNow={ebaEditableNow}
                            onEditField={openEditField}
                            onAddRemark={(args) => openInlineRemark(args)}
                            onAddComment={(args) => openInlineComment(args)}
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
                                            <strong>
                                                {c.label ||
                                                    fieldLabelFromSchema(formVersion?.schema, c.fieldKey)}
                                            </strong>
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

            {tab === "due-diligence" && (
                <DueDiligencePanel
                    submissionId={String(id)}
                    role={role}
                    level={submission.level}
                    status={submission.status}
                    dueDiligence={(submission as any).dueDiligence || null}
                    hodRemarkForEA={(submission as any).hodRemarkForEA || ""}
                    onReload={fetchAll}
                />
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
                                        <strong>
                                            {fieldLabelFromSchema(formVersion?.schema, e.fieldKey)}
                                        </strong>
                                        <span className={styles.dim} title={e.fieldPath}>
                                            {e.sectionKey
                                                ? sectionLabelFromSchema(formVersion?.schema, e.sectionKey)
                                                : "General"}
                                        </span>
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
                                        <div className={styles.commentAnchorPill}>
                                            On: {anchorLabel(
                                                formVersion?.schema,
                                                c.anchor?.sectionKey,
                                                c.anchor?.fieldKey,
                                            )}
                                        </div>
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
                                Confirm sending this application back to the
                                contractor. Every active remark you've left on
                                this cycle becomes visible to them inline.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            {(() => {
                                const cycle = submission?.cycleNumber || 1
                                const active = (remarks || []).filter(
                                    (r: any) =>
                                        r.status === "active" &&
                                        (!r.cycleNumber || r.cycleNumber === cycle),
                                )
                                if (active.length === 0) {
                                    return (
                                        <div className={styles.inlineWarning}>
                                            No active remarks on this cycle yet.
                                            Add at least one section or field
                                            remark using the Notes panel before
                                            returning.
                                        </div>
                                    )
                                }
                                return (
                                    <ul className={styles.remarkSummary}>
                                        {active.map((r: any) => (
                                            <li key={r._id}>
                                                <strong>
                                                    {anchorLabel(
                                                        formVersion?.schema,
                                                        r.sectionKey,
                                                        r.fieldKey,
                                                    )}
                                                </strong>
                                                <p>{r.text}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )
                            })()}
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

            {/* Inline remark modal - opened from the per-field Notes panel
                on the review view. */}
            {inlineRemark && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Leave a remark for the contractor</h3>
                            <p className={styles.modalSub}>
                                On <strong>{anchorLabel(
                                    formVersion?.schema,
                                    inlineRemark.sectionKey,
                                    inlineRemark.fieldKey,
                                )}</strong>. The contractor sees this inline when
                                they next open the form. Active remarks block the
                                process button until you return the application.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <textarea
                                rows={4}
                                value={inlineRemark.text}
                                onChange={(e) =>
                                    setInlineRemark({
                                        ...inlineRemark,
                                        text: e.target.value,
                                        error: "",
                                    })
                                }
                                placeholder="What does the contractor need to fix?"
                                disabled={inlineRemark.saving}
                            />
                            {inlineRemark.error && <ErrorText text={inlineRemark.error} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setInlineRemark(null)}
                                disabled={inlineRemark.saving}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitInlineRemark}
                                disabled={inlineRemark.saving || !inlineRemark.text.trim()}
                            >
                                Save remark
                                {inlineRemark.saving && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Inline comment modal - staff-only internal comment anchored to
                the same section or field as the trigger. */}
            {inlineComment && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Add an internal comment</h3>
                            <p className={styles.modalSub}>
                                On <strong>{anchorLabel(
                                    formVersion?.schema,
                                    inlineComment.sectionKey,
                                    inlineComment.fieldKey,
                                )}</strong>. Visible only to staff.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <textarea
                                rows={4}
                                value={inlineComment.text}
                                onChange={(e) =>
                                    setInlineComment({
                                        ...inlineComment,
                                        text: e.target.value,
                                        error: "",
                                    })
                                }
                                placeholder="Add context for other reviewers."
                                disabled={inlineComment.saving}
                            />
                            {inlineComment.error && <ErrorText text={inlineComment.error} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setInlineComment(null)}
                                disabled={inlineComment.saving}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitInlineComment}
                                disabled={inlineComment.saving || !inlineComment.text.trim()}
                            >
                                Save comment
                                {inlineComment.saving && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Stage C - end-user picker. Supervisor (or HOD/Admin) selects
                one or more end users who will see the submission at Stage D.
                Mirrors the legacy stageB selectedEndUsers flow. */}
            {endUserPickerOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Assign End Users</h3>
                            <p className={styles.modalSub}>
                                Pick the specialist staff who should see this
                                application at Stage D. They are the only
                                non-HOD staff who will be able to advance,
                                return or hold it once it moves forward.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            {endUserCandidates.length === 0 && !endUserError && (
                                <p className={styles.modalSub}>Loading...</p>
                            )}
                            {endUserCandidates.length > 0 && (
                                <div className={styles.endUserList}>
                                    {endUserCandidates.map((u) => {
                                        const checked = pickedEndUserIds.includes(u._id)
                                        return (
                                            <label key={u._id} className={styles.endUserRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={savingEndUsers}
                                                    onChange={() =>
                                                        setPickedEndUserIds(
                                                            checked
                                                                ? pickedEndUserIds.filter((x) => x !== u._id)
                                                                : [...pickedEndUserIds, u._id],
                                                        )
                                                    }
                                                />
                                                <span className={styles.endUserName}>{u.name}</span>
                                                <span className={styles.endUserRole}>{u.role}</span>
                                                <span className={styles.endUserEmail}>{u.email}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                            {endUserError && <ErrorText text={endUserError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setEndUserPickerOpen(false)}
                                disabled={savingEndUsers}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={saveEndUsers}
                                disabled={savingEndUsers || pickedEndUserIds.length === 0}
                            >
                                Save selection
                                {savingEndUsers && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Stage D - assigned end user records the services that apply
                to this contractor + whether a site visit is needed before
                the application can advance to Stage E. */}
            {servicesOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Record Services & Site Visit</h3>
                            <p className={styles.modalSub}>
                                Record the services this contractor is being
                                evaluated for. Stage D cannot advance to Stage
                                E until at least one service is recorded.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.modalLabel}>Services</label>
                            <div className={styles.chipRow}>
                                {pickedServices.map((s) => (
                                    <span key={s} className={styles.serviceChip}>
                                        {s}
                                        <button
                                            type="button"
                                            className={styles.chipX}
                                            onClick={() => removeServiceChip(s)}
                                            disabled={savingServices}
                                            aria-label={`Remove ${s}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className={styles.chipInputRow}>
                                <input
                                    type="text"
                                    value={serviceDraft}
                                    onChange={(e) => setServiceDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            addServiceChip()
                                        }
                                    }}
                                    placeholder="Type a service and press Enter"
                                    disabled={savingServices}
                                />
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={addServiceChip}
                                    disabled={savingServices || !serviceDraft.trim()}
                                >
                                    Add
                                </button>
                            </div>

                            <label className={styles.modalLabel} style={{ marginTop: 16 }}>
                                <input
                                    type="checkbox"
                                    checked={siteVisit}
                                    disabled={savingServices}
                                    onChange={(e) => setSiteVisit(e.target.checked)}
                                />
                                <span style={{ marginLeft: 8 }}>
                                    Site visit required before approval
                                </span>
                            </label>

                            {servicesError && <ErrorText text={servicesError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setServicesOpen(false)}
                                disabled={savingServices}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={saveServices}
                                disabled={savingServices || pickedServices.length === 0}
                            >
                                Save
                                {savingServices && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Stage F/G "Return for Research" - bounces one stage back
                (E from F, F from G) without leaving the staff side. */}
            {returnPrevOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Return for Research</h3>
                            <p className={styles.modalSub}>
                                {submission.level === 5
                                    ? "Sends the application back to the HOD at Stage F with a research request. The contractor is not notified."
                                    : "Sends the application back to the Due Diligence officer at Stage E. The contractor is not notified."}
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <textarea
                                rows={4}
                                placeholder="State what additional research is needed."
                                value={returnPrevReason}
                                onChange={(e) => setReturnPrevReason(e.target.value)}
                            />
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setReturnPrevOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitReturnPrev}
                                disabled={
                                    actionRunning === "return-to-previous-stage" ||
                                    !returnPrevReason.trim()
                                }
                            >
                                Submit
                                {actionRunning === "return-to-previous-stage" && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Stage G "Do Not Add" - parks the submission at L2 without
                approving. Final Executive Approver decision. */}
            {parkL2Open && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Do Not Add (Park at L2)</h3>
                            <p className={styles.modalSub}>
                                The contractor will be parked at L2 and will
                                not be added to the approved list. Provide a
                                clear reason - this is the final Executive
                                Approver decision and shows in the audit
                                trail.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <textarea
                                rows={4}
                                placeholder="Reason for not adding the contractor."
                                value={parkL2Reason}
                                onChange={(e) => setParkL2Reason(e.target.value)}
                            />
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setParkL2Open(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnDanger}
                                onClick={submitParkL2}
                                disabled={
                                    actionRunning === "park-at-l2" || !parkL2Reason.trim()
                                }
                            >
                                Confirm Do Not Add
                                {actionRunning === "park-at-l2" && <ButtonLoadingIcon />}
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
