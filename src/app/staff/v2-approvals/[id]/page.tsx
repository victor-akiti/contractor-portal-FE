'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FormRenderer, { FieldEditRow } from "@/components/form/FormRenderer"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import {
    useGetV2SubmissionCertificatesQuery,
    useGetV2SubmissionCommentsQuery,
    useGetV2SubmissionEditsQuery,
    useGetV2SubmissionMigrationStatusQuery,
    useGetV2SubmissionQuery,
    useV2SubmissionActionMutation,
} from "@/redux/features/v2Slice"
import { deleteProtected } from "@/requests/delete"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import ApprovalReviewView from "./ApprovalReviewView"
import DueDiligencePanel from "./DueDiligencePanel"
import DecisionBar from "./components/DecisionBar"
import DoNotAddModal from "./components/DoNotAddModal"
import EndUserPickerModal from "./components/EndUserPickerModal"
import HodReturnInbox from "./components/HodReturnInbox"
import RemarksArchive from "./components/RemarksArchive"
import ReturnForResearchModal from "./components/ReturnForResearchModal"
import ReturnToEarlierStageModal from "./components/ReturnToEarlierStageModal"
import RevertFromL3Modal from "./components/RevertFromL3Modal"
import ServicesModal from "./components/ServicesModal"
import StageRoleBriefingCard from "./components/StageRoleBriefingCard"
import styles from "./styles.module.css"

// Same envelope helper used by the list pages. Keeps the {status, data,
// error} shape every existing call site already consumes.
const envelopeOf = (r: any): any =>
    r?.data ||
    r?.error ||
    { status: "FAILED", error: { message: "Request failed" } }

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

// V2 Submission detail - single submission review surface.
//
// Tabs:
//   - Form (FormRenderer in view mode, with active remarks inline)
//   - Comments (staff-only InternalComment list/create/edit)
//   - History (approvalHistory timeline)
//
// Actions sidebar exposes the state-machine transitions filtered by what the
// state machine allows for the current status/level (without re-implementing
// the rules here - we just hide buttons that obviously don't apply).

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
    | "return-to-earlier-stage"
    | "return-for-eba-correction"
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
    extraData?: Record<string, any>
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

// Pretty-print an edit-audit value. For file arrays (certificate
// fields, supporting uploads) we render a compact stack of links +
// issue/expiry summary. For arrays of primitives, join with ", ". For
// plain objects fall back to a key/value list. For everything else
// just print the string. Anything beats the JSON dump the audit was
// showing before.
const renderEditValue = (v: any): React.ReactNode => {
    if (v === undefined || v === null || v === "") {
        return <span className={styles.dim}>-</span>
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return <span>{String(v)}</span>
    }
    if (Array.isArray(v)) {
        if (v.length === 0) return <span className={styles.dim}>(empty)</span>
        // Array of file refs (cert uploads). Detect by url+name pair.
        if (typeof v[0] === "object" && v[0] && ("url" in v[0] || "name" in v[0])) {
            return (
                <ul className={styles.editAuditFiles}>
                    {v.map((f: any, i: number) => (
                        <li key={i}>
                            {f.url ? (
                                <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.editAuditFileLink}
                                >
                                    📎 {f.name || "file"}
                                </a>
                            ) : (
                                <span>{f.name || "file"}</span>
                            )}
                            {(f.issueDate || f.expiryDate) && (
                                <div className={styles.editAuditFileMeta}>
                                    {f.issueDate && (
                                        <span>
                                            Issued{" "}
                                            {new Date(f.issueDate).toLocaleDateString(
                                                "en-NG",
                                            )}
                                        </span>
                                    )}
                                    {f.expiryDate && (
                                        <span>
                                            Expires{" "}
                                            {new Date(f.expiryDate).toLocaleDateString(
                                                "en-NG",
                                            )}
                                        </span>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )
        }
        // Plain primitive array.
        if (v.every((x) => typeof x === "string" || typeof x === "number")) {
            return <span>{v.join(", ")}</span>
        }
        return (
            <ul className={styles.editAuditFiles}>
                {v.map((x, i) => (
                    <li key={i}>{renderEditValue(x)}</li>
                ))}
            </ul>
        )
    }
    if (typeof v === "object") {
        const entries = Object.entries(v).filter(([, val]) => val !== null && val !== "")
        if (entries.length === 0) return <span className={styles.dim}>(empty)</span>
        return (
            <ul className={styles.editAuditObj}>
                {entries.map(([k, val]) => (
                    <li key={k}>
                        <span className={styles.editAuditKey}>{k}:</span>{" "}
                        <span>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                    </li>
                ))}
            </ul>
        )
    }
    return <span>{String(v)}</span>
}

const V2SubmissionDetailPage = () => {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const id = params?.id
    const user = useSelector((state: any) => state.user.user)

    const [tab, setTab] = useState<"form" | "certificates" | "due-diligence" | "edits" | "comments" | "history">("form")
    // Stage G (Executive Approver) modal state for the three decisions.
    const [returnPrevOpen, setReturnPrevOpen] = useState(false)
    const [returnPrevReason, setReturnPrevReason] = useState("")
    const [parkL2Open, setParkL2Open] = useState(false)
    const [parkL2Reason, setParkL2Reason] = useState("")
    // HOD "return to earlier stage" modal - lets HOD pick any prior level
    // and attach a remark for that stage's owner. Action button visible at
    // levels 2-5 to HOD/Admin only.
    const [returnEarlierOpen, setReturnEarlierOpen] = useState(false)
    const [returnEarlierLevel, setReturnEarlierLevel] = useState(0)
    const [returnEarlierReason, setReturnEarlierReason] = useState("")
    // Admin-only: pull a contractor back out of L3 with a reason and an
    // optional target stage (defaults to G / Executive Approver).
    const [revertL3Open, setRevertL3Open] = useState(false)
    const [revertL3Reason, setRevertL3Reason] = useState("")
    const [revertL3Level, setRevertL3Level] = useState(5)
    const [unparkOpen, setUnparkOpen] = useState(false)
    const [unparkReason, setUnparkReason] = useState("")
    const [declineParkOpen, setDeclineParkOpen] = useState(false)
    const [declineParkReason, setDeclineParkReason] = useState("")
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [certActingId, setCertActingId] = useState<string | null>(null)

    // EBA state
    const [fieldEdits, setFieldEdits] = useState<FieldEditRow[]>([])
    // Reviewer's "Return for EBA correction" modal - bounces one stage
    // back to the editor when flagged EBA edits are outstanding.
    const [ebaReturnOpen, setEbaReturnOpen] = useState(false)
    const [ebaReturnReason, setEbaReturnReason] = useState("")
    // HOD-only Change Group modal. Groups are lazy-loaded on open since
    // the list is cosmetic to anyone who can't move contractors.
    const [changeGroupOpen, setChangeGroupOpen] = useState(false)
    const [changeGroupList, setChangeGroupList] = useState<any[]>([])
    const [changeGroupTarget, setChangeGroupTarget] = useState("")
    const [changeGroupReason, setChangeGroupReason] = useState("")
    const [changeGroupActing, setChangeGroupActing] = useState(false)
    const [changeGroupError, setChangeGroupError] = useState("")
    // Editor's "Respond to flag" modal - replies without changing the
    // field value, clears the flag and flips the edit back to active.
    const [respondingToEdit, setRespondingToEdit] = useState<FieldEditRow | null>(null)
    const [respondReason, setRespondReason] = useState("")
    const [respondActing, setRespondActing] = useState(false)
    const [respondError, setRespondError] = useState("")

    // Migration status
    const [migrationStatus, setMigrationStatus] = useState<any>(null)

    // Stage C / Stage D modal toggles. The modal components own their own
    // form state, fetch their own dropdown data and call back to fetchAll
    // on save.
    const [endUserPickerOpen, setEndUserPickerOpen] = useState(false)
    const [servicesOpen, setServicesOpen] = useState(false)
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
    // View / Approval mode. Default is read-only "view": every tab is
    // visible, but no action buttons (Decision bar, section ticks, add
    // remark, add comment, EBA edit, cert approve/reject, DD inputs,
    // Modify Contractor button) are rendered. Clicking "Open in
    // Approval Mode" flips this so the page becomes interactive.
    // Mirrors the V1 affordance where reviewers had to explicitly enter
    // approval mode before any side-effecty button appeared.
    // The initial mode is driven by the ?mode= URL param so the queue
    // can deep-link straight into approval mode (the Process Stage X
    // button) or view mode (clicking the contractor name).
    const searchParams = useSearchParams()
    const initialMode = searchParams.get("mode") === "approve" ? "approve" : "view"
    const [viewMode, setViewMode] = useState<"view" | "approve">(initialMode)
    const inApprovalMode = viewMode === "approve"
    const [submission, setSubmission] = useState<Submission | null>(null)
    const [formVersion, setFormVersion] = useState<FormVersion | null>(null)
    const [remarks, setRemarks] = useState<Remark[]>([])
    const [comments, setComments] = useState<Comment[]>([])
    const [invite, setInvite] = useState<any>(null)
    const [portalAdmin, setPortalAdmin] = useState<any>(null)
    const [inviteDetailsOpen, setInviteDetailsOpen] = useState(false)
    const [replaceAdminEmail, setReplaceAdminEmail] = useState("")
    const [replacingAdmin, setReplacingAdmin] = useState(false)
    const [replaceAdminError, setReplaceAdminError] = useState("")
    const [replaceAdminSuccess, setReplaceAdminSuccess] = useState("")

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
    // Two-step delete: the trash button opens a confirmation modal that
    // pins the comment id (and a snippet of its text for context); the
    // confirm button issues the DELETE. Same 15-minute window as edit.
    const [confirmDeleteComment, setConfirmDeleteComment] = useState<{
        id: string
        preview: string
    } | null>(null)
    const [deletingComment, setDeletingComment] = useState(false)
    // Deactivate-contractor modal (HOD/Admin only). Mandatory reason
    // gates submit; success flips the submission inactive and the page
    // refetches via the v2SubmissionAction tag invalidation.
    const [showDeactivate, setShowDeactivate] = useState(false)
    const [deactivateReason, setDeactivateReason] = useState("")
    const [deactivating, setDeactivating] = useState(false)
    const [deactivateError, setDeactivateError] = useState("")

    const role = user?.role

    // RTK Query: five parallel detail-page reads share the staffApi
    // cache so a back-and-forth visit returns instantly. Tag
    // invalidation from v2SubmissionAction (and the manual dispatch
    // calls in the mutation handlers below for the non-action
    // endpoints) refetches the relevant query without us needing a
    // manual fetchAll() at every call site.
    const submissionQ = useGetV2SubmissionQuery(id as string, { skip: !id })
    const commentsQ = useGetV2SubmissionCommentsQuery(id as string, { skip: !id })
    const certificatesQ = useGetV2SubmissionCertificatesQuery(id as string, {
        skip: !id,
    })
    const editsQ = useGetV2SubmissionEditsQuery(id as string, { skip: !id })
    const migQ = useGetV2SubmissionMigrationStatusQuery(id as string, {
        skip: !id,
    })

    const [submissionActionTrigger] = useV2SubmissionActionMutation()

    // Mirror RTK Query data into the existing local state so every other
    // bit of page logic (which reads `submission`, `comments`, etc.)
    // keeps working unchanged. Anything that mutates one of these via
    // setX still wins until the next refetch lands.
    useEffect(() => {
        const env = submissionQ.currentData
        if (env?.status === "OK") {
            setSubmission(env.data?.submission || null)
            setFormVersion(env.data?.formVersion || null)
            setRemarks(env.data?.remarks || [])
            setInvite(env.data?.invite || null)
            setPortalAdmin(env.data?.portalAdmin || null)
        } else if (env && env.status !== "OK") {
            setError(env?.error?.message || "Failed to load submission")
        }
    }, [submissionQ.currentData])
    useEffect(() => {
        const env = commentsQ.currentData
        if (env?.status === "OK") setComments(env.data?.comments || [])
    }, [commentsQ.currentData])
    useEffect(() => {
        const env = certificatesQ.currentData
        if (env?.status === "OK") setCertificates(env.data?.certificates || [])
    }, [certificatesQ.currentData])
    useEffect(() => {
        const env = editsQ.currentData
        if (env?.status === "OK") setFieldEdits(env.data?.edits || [])
    }, [editsQ.currentData])
    useEffect(() => {
        const env = migQ.currentData
        if (env?.status === "OK") setMigrationStatus(env.data || null)
    }, [migQ.currentData])

    // Initial mount: full-page spinner until the submission GET lands
    // (the other four queries are non-blocking - the page renders as
    // soon as the submission itself is in).
    useEffect(() => {
        if (!id) return
        setLoading(!submissionQ.currentData && submissionQ.isLoading)
    }, [id, submissionQ.currentData, submissionQ.isLoading])

    // fetchAll preserves the legacy API used by ~15 mutation handlers
    // below. It now refetches every query in parallel; tag invalidation
    // from the submission-action mutation triggers the same refetches
    // automatically on its own, so this is mainly used by the smaller
    // mutations that still go through postProtected. background=true
    // keeps the page visible while the refresh is in flight (no
    // full-page spinner).
    const fetchAll = async (background = true) => {
        if (!id) return
        if (!background) setLoading(true)
        try {
            await Promise.all([
                submissionQ.refetch(),
                commentsQ.refetch(),
                certificatesQ.refetch(),
                editsQ.refetch(),
                migQ.refetch(),
            ])
        } finally {
            if (!background) setLoading(false)
        }
    }


    // Transitions that change ownership of the submission (advance,
    // approve, revert from L3, send to an earlier stage, do-not-add)
    // route the user back to the queue afterwards. Mirrors the V1
    // behaviour where clicking Process kicked you back to the inbox so
    // you could move on. Same-stage transitions (request park, return
    // for contractor remarks) stay in place because the submission is
    // still yours.
    const ACTIONS_THAT_LEAVE_THE_PAGE: ActionKey[] = [
        "advance",
        "final-approve",
        "revert-from-l3",
        "return-to-previous-stage",
        "return-to-earlier-stage",
        "park-at-l2",
        "approve-park",
        "decline-park",
        "release-park",
        "retrieve",
    ]

    const runAction = async (
        action: ActionKey,
        payload: Record<string, any> = {},
    ): Promise<boolean> => {
        if (!id) return false
        try {
            setActionRunning(action)
            setActionError("")
            setActionSuccess("")
            const result = envelopeOf(
                await submissionActionTrigger({ id, action, body: payload }),
            )
            if (result?.status === "OK") {
                setActionSuccess(`Action "${action}" completed.`)
                setTimeout(() => setActionSuccess(""), 3000)
                if (ACTIONS_THAT_LEAVE_THE_PAGE.includes(action)) {
                    // Invalidate the queue cache so the new state shows
                    // up immediately, then go back to the list.
                    router.push("/staff/v2-approvals")
                    return true
                }
                // v2SubmissionAction invalidates all detail-page tags
                // (Submission, Comments, Certs, Edits, Remarks,
                // MigStatus) so the mirrored local state refreshes on
                // its own - no manual fetchAll() needed.
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

    const submitDeactivate = async () => {
        if (!id) return
        const reason = deactivateReason.trim()
        if (!reason) {
            setDeactivateError(
                "A reason is required so the audit trail records why this contractor was deactivated.",
            )
            return
        }
        try {
            setDeactivating(true)
            setDeactivateError("")
            const result = envelopeOf(
                await submissionActionTrigger({
                    id,
                    action: "deactivate",
                    body: { reason },
                }),
            )
            if (result?.status === "OK") {
                setShowDeactivate(false)
                setDeactivateReason("")
                // Send the reviewer back to the queue - the row is now
                // hidden from every staff list and counts payload.
                router.push("/staff/v2-approvals")
            } else {
                setDeactivateError(
                    result?.error?.message || "Could not deactivate contractor",
                )
            }
        } catch (e: any) {
            setDeactivateError(e?.message || "Unexpected error")
        } finally {
            setDeactivating(false)
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

    // The Stage C / Stage D modal components own their own data + form
    // state; here the parent only flips them open. The CTA buttons in the
    // briefing card call these handlers, and the modals call fetchAll on
    // save so the page refreshes the parent submission data.
    const openEndUserPicker = () => setEndUserPickerOpen(true)
    const openServicesModal = () => setServicesOpen(true)

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

    const submitReturnEarlier = async () => {
        if (!returnEarlierReason.trim()) {
            setActionError("A reason is required to send back to an earlier stage.")
            return
        }
        const ok = await runAction("return-to-earlier-stage", {
            toLevel: returnEarlierLevel,
            reason: returnEarlierReason.trim(),
        })
        if (ok) {
            setReturnEarlierOpen(false)
            setReturnEarlierReason("")
        }
    }

    const submitRevertL3 = async () => {
        if (!revertL3Reason.trim()) {
            setActionError("A reason is required to revert from L3.")
            return
        }
        const ok = await runAction("revert-from-l3", {
            reason: revertL3Reason.trim(),
            targetLevel: revertL3Level,
        })
        if (ok) {
            setRevertL3Open(false)
            setRevertL3Reason("")
        }
    }

    const sendReplaceAdmin = async () => {
        if (!id) return
        setReplacingAdmin(true)
        setReplaceAdminError("")
        setReplaceAdminSuccess("")
        try {
            const r = await postProtected(
                `api/v2/submissions/${id}/replace-portal-admin`,
                { email: replaceAdminEmail.trim().toLowerCase() },
                role,
            )
            if (r?.status === "OK") {
                setReplaceAdminSuccess(
                    `Invite sent to ${replaceAdminEmail.trim()}. The current admin keeps access until the new one registers.`,
                )
                setReplaceAdminEmail("")
                await fetchAll()
            } else {
                setReplaceAdminError(r?.error?.message || "Could not send invite")
            }
        } catch (e: any) {
            setReplaceAdminError(e?.message || "Unexpected error")
        } finally {
            setReplacingAdmin(false)
        }
    }

    const submitUnpark = async () => {
        if (!unparkReason.trim()) {
            setActionError("A reason is required to unpark.")
            return
        }
        const ok = await runAction("release-park", { reason: unparkReason.trim() })
        if (ok) {
            setUnparkOpen(false)
            setUnparkReason("")
        }
    }

    const submitDeclinePark = async () => {
        // Reason is optional on park decline - the request itself
        // already explains why park was being considered.
        const ok = await runAction("decline-park", {
            reason: declineParkReason.trim() || undefined,
        })
        if (ok) {
            setDeclineParkOpen(false)
            setDeclineParkReason("")
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

    const submitDeleteComment = async () => {
        if (!confirmDeleteComment) return
        try {
            setDeletingComment(true)
            setCommentError("")
            const result = await deleteProtected(
                `api/v2/comments/${confirmDeleteComment.id}`,
                undefined,
                role,
            )
            if (result?.status === "OK") {
                setConfirmDeleteComment(null)
                const c = await getProtected(`api/v2/submissions/${id}/comments`, role)
                if (c?.status === "OK") setComments(c.data?.comments || [])
            } else {
                setCommentError(result?.error?.message || "Failed to delete comment")
            }
        } catch (e: any) {
            setCommentError(e?.message || "Unexpected error")
        } finally {
            setDeletingComment(false)
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
                    : `Migrating from v${migrationStatus?.fromVersion?.versionNumber} to v${migrationStatus?.toVersion?.versionNumber}. No data loss - ${diff?.addedFieldKeys?.length || 0} new field(s) will appear, ${diff?.requiredAddedFieldKeys?.length || 0} of them required.`,
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

    // Editor at B/E replies to a flagged edit without changing the field
    // value. Clears the flag and flips the row back to "active" so the
    // reviewer re-sees it after the next advance.
    const submitRespondToFlag = async () => {
        if (!respondingToEdit || !id) return
        if (!respondReason.trim()) {
            setRespondError("A response is required.")
            return
        }
        setRespondActing(true)
        setRespondError("")
        try {
            const result = await postProtected(
                `api/v2/submissions/${id}/edits/${respondingToEdit._id}/respond`,
                { response: respondReason.trim() },
                role,
            )
            if (result?.status === "OK") {
                setRespondingToEdit(null)
                setRespondReason("")
                await fetchAll()
            } else {
                setRespondError(result?.error?.message || "Respond failed")
            }
        } catch (e: any) {
            setRespondError(e?.message || "Unexpected error")
        } finally {
            setRespondActing(false)
        }
    }

    const openChangeGroup = async () => {
        setChangeGroupError("")
        setChangeGroupReason("")
        setChangeGroupTarget("")
        setChangeGroupOpen(true)
        try {
            const r = await getProtected("api/v2/groups", role)
            if (r?.status === "OK") {
                setChangeGroupList(r.data?.groups || [])
            }
        } catch {
            // Non-fatal - the modal renders an empty picker which the
            // controller will reject; the error surfaces inline.
        }
    }

    const submitChangeGroup = async () => {
        if (!id) return
        if (!changeGroupTarget) {
            setChangeGroupError("Pick a target group.")
            return
        }
        if (!changeGroupReason.trim()) {
            setChangeGroupError("A reason is required.")
            return
        }
        setChangeGroupActing(true)
        setChangeGroupError("")
        try {
            const r = await postProtected(
                `api/v2/submissions/${id}/change-group`,
                { newGroupId: changeGroupTarget, reason: changeGroupReason.trim() },
                role,
            )
            if (r?.status === "OK") {
                setChangeGroupOpen(false)
                if (r.data?.restarted) {
                    // Submission was voided in favour of a fresh invite -
                    // there's nothing left to render here. Drop back to
                    // the queue.
                    window.location.href = "/staff/v2-approvals"
                    return
                }
                await fetchAll()
            } else {
                setChangeGroupError(r?.error?.message || "Change failed")
            }
        } catch (e: any) {
            setChangeGroupError(e?.message || "Unexpected error")
        } finally {
            setChangeGroupActing(false)
        }
    }

    const submitReturnForEbaCorrection = async () => {
        if (!id) return
        if (!ebaReturnReason.trim()) {
            setActionError("A reason is required.")
            return
        }
        await runAction("return-for-eba-correction", { reason: ebaReturnReason.trim() })
        setEbaReturnOpen(false)
        setEbaReturnReason("")
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
        // Mongoose Map may serialize as a plain object - handle both.
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
    // The Reviewed checkbox is only shown at Stages B (VRM) and C
    // (Supervisor) - the two stages where reviewers work through the form
    // section by section. Stage D (End User) reads through; Stages E/F/G
    // act in their own panels (DD tab, approval checkboxes, decision).
    const canActAtCurrentStage = useMemo(() => {
        if (!submission) return false
        if (submission.status !== "pending") return false
        if (![0, 1].includes(submission.level)) return false
        // Amni Staff / C&P Staff are deliberately omitted: they get full
        // view but no approval rights per the C&P access policy.
        return [
            "Admin",
            "HOD",
            "VRM",
            "CO",
            "Supervisor",
            "End User",
            "Executive Approver",
        ].includes(role)
    }, [submission, role])

    // All visible (non-hideOnApproval) sections must be ticked for the
    // current (level, cycle) before the process button is allowed. Pairs
    // with the BE guard in applyTransition.
    //
    // Stages exempt from section-by-section review (legacy parity):
    //   - Stage D (level 2 - End User): just reads through the form
    //   - Stage E (level 3 - Due Diligence): works in the DD tab
    //   - Stage F (level 4 - HOD DD Review): ticks DD approval boxes
    //   - Stage G (level 5 - Executive Approver): three-option decision
    // Only Stage B (level 0 - VRM) and Stage C (level 1 - Supervisor)
    // work through the form section by section.
    const STAGES_REQUIRING_SECTION_REVIEW = [0, 1]
    const allSectionsReviewed = useMemo(() => {
        if (!submission || !formVersion?.schema?.pages) return false
        if (!STAGES_REQUIRING_SECTION_REVIEW.includes(submission.level)) return true
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
        // Active-remark gate only applies at Stage B (level 0) - that's
        // where remarks are the VRM <-> contractor dialog. At later stages
        // remarks are historical context for senior reviewers and do not
        // block forward movement (see BE remark gate in applyTransition).
        const remarkBlocks = submission.level === 0 && hasActiveRemarksThisCycle
        // EBA gate (mirrors BE assertEbaReviewedBeforeAdvance):
        //   - Stage C reviews Stage-B edits, Stage F reviews Stage-E edits.
        //   - Advance is blocked while the reviewer has unreviewed (active)
        //     edits at the editable level below them, and at ANY stage while
        //     any flagged edit is outstanding (flag = go back, not forward).
        const reviewerEditLevel =
            submission.level === 1 ? 0 : submission.level === 4 ? 3 : null
        // Scope to current cycle so prior-cycle leftovers (e.g. flagged
        // edits the contractor already addressed on their own side after a
        // return) don't block the new pass forever.
        const currentCycle = submission.cycleNumber || 1
        const ebaActiveAwaitingReview =
            reviewerEditLevel !== null &&
            fieldEdits.some(
                (e) =>
                    e.status === "active" &&
                    e.editedAtLevel === reviewerEditLevel &&
                    (e.cycleNumber || 1) === currentCycle,
            )
        const ebaFlaggedOutstanding = fieldEdits.some(
            (e) =>
                e.status === "flagged" &&
                (e.cycleNumber || 1) === currentCycle,
        )
        const ebaBlocks = ebaActiveAwaitingReview || ebaFlaggedOutstanding
        return {
            advance:
                pending &&
                submission.level < 5 &&
                !remarkBlocks &&
                !ebaBlocks &&
                allSectionsReviewed &&
                (submission.level !== 2 || canActAtStageD),
            finalApprove:
                pending &&
                submission.level === 5 &&
                isExec &&
                !remarkBlocks &&
                !ebaBlocks &&
                allSectionsReviewed,
            // Stage D End Users cannot return to contractor (legacy parity);
            // only HOD/Admin can. Their only "send away" option at Stage D
            // is Request Park with a mandatory reason.
            returnToVendor:
                pending && (submission.level !== 2),
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
            // Return to Earlier Stage is Admin-only and the natural
            // escape-hatch when an early-stage mistake is caught later.
            // Hidden at Stage F (level 4) and Stage G (level 5): at those
            // seats the canonical send-back is Return for Research, which
            // hops one stage back and forces a note for the receiving
            // reviewer so they have the context they need. Even an Admin
            // account acting as HOD should follow that flow rather than
            // skip stages with the dropdown.
            returnEarlier:
                pending &&
                submission.level >= 1 &&
                submission.level < 4 &&
                isAdmin,
            // Reviewer at C/F bounces back to the editor at B/E so the
            // flagged EBA fields can be resolved. Only surfaces when at
            // least one flagged edit is outstanding at the editor's
            // stage - otherwise it would collapse into a normal one-step
            // back (use Return for Research for that).
            returnForEbaCorrection:
                pending &&
                (submission.level === 1 || submission.level === 4) &&
                (isSupervisor || isHod) &&
                fieldEdits.some(
                    (e) =>
                        e.status === "flagged" &&
                        e.editedAtLevel === (submission.level === 1 ? 0 : 3) &&
                        (e.cycleNumber || 1) === (submission.cycleNumber || 1),
                ),
        }
    }, [submission, role, user, hasActiveRemarksThisCycle, allSectionsReviewed, fieldEdits])

    if (loading) {
        return (
            <div className={styles.pageLoaderWrap}>
                <div className={styles.pageLoader}>
                    <div className={styles.pageLoaderSpinner} />
                    <p className={styles.pageLoaderText}>Loading submission...</p>
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

    const groupName = submission.groupId?.name || "-"
    // History timeline. Newest first, with a synthesised "Invite sent"
    // entry pinned at the bottom (oldest event) so the chain starts
    // where the contractor's journey actually began. Skipped when no
    // invite is linked (V1 backfilled submissions).
    const historyEntries = (() => {
        const raw = [...(submission.approvalHistory || [])].reverse()
        if (!invite) return raw
        const inviteEntry: ApprovalHistoryEntry = {
            action: "Invite sent",
            type: "INVITE_SENT",
            date: invite.createdAt,
            actorName: invite.invitedBy?.name,
            actorEmail: invite.invitedBy?.email,
            actorRole: "Inviter",
            extraData: {
                companyName: invite.companyName,
                inviteeEmail: invite.email,
            },
        }
        return [...raw, inviteEntry]
    })()

    return (
        <div className={styles.page}>
            <div className={styles.breadcrumbs}>
                <Link href="/staff/v2-approvals" className={styles.crumbLink}>← V2 Approvals</Link>
                {/* View / Approval mode toggle. The toggle only shows when
                    the viewer might actually have a reason to enter
                    approval mode - i.e. there is something pending or an
                    L3 contractor an Admin/HOD can modify. End users
                    without action rights still see View Only and can't
                    flip the switch. */}
                {(() => {
                    const STAGE_ACTORS_TOGGLE: Record<number, string[]> = {
                        0: ["Admin", "HOD", "VRM"],
                        1: ["Admin", "HOD", "Supervisor"],
                        // Stage D: any staff role can be picked as an end
                        // user; the BE blocks unassigned users on this
                        // submission.
                        2: ["Admin", "HOD", "End User", "Amni Staff", "C and P Staff", "Insurance Officer"],
                        3: ["Admin", "HOD", "VRM", "CO", "Supervisor"],
                        4: ["Admin", "HOD"],
                        5: ["Admin", "Executive Approver"],
                    }
                    const allowed = STAGE_ACTORS_TOGGLE[submission?.level || 0] || []
                    const canEnter =
                        (submission?.status === "pending" && allowed.includes(role)) ||
                        (submission?.approved && ["Admin", "HOD"].includes(role)) ||
                        (submission?.status === "park requested" &&
                            ["Admin", "HOD"].includes(role)) ||
                        // Parked submissions need approval mode so HOD /
                        // Admin can Unpark them. Without this entry the
                        // toggle stayed View Only and the Unpark button
                        // never rendered.
                        (submission?.status === "parked" &&
                            ["Admin", "HOD"].includes(role)) ||
                        (submission?.status === "returned" &&
                            ["Admin", "HOD", "IT Admin"].includes(role))
                    if (!canEnter) {
                        return (
                            <span className={styles.viewOnlyBadge} title="View Only">
                                View Only
                            </span>
                        )
                    }
                    return (
                        <button
                            type="button"
                            className={
                                inApprovalMode
                                    ? styles.viewModeBtnActive
                                    : styles.viewModeBtn
                            }
                            onClick={() => setViewMode(inApprovalMode ? "view" : "approve")}
                            title={
                                inApprovalMode
                                    ? "Drop back to read-only view"
                                    : "Reveal the approval / action controls"
                            }
                        >
                            {inApprovalMode
                                ? "Close Approval Mode"
                                : "Open in Approval Mode"}
                        </button>
                    )
                })()}
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
                        <span className={styles.metaPill}>Group: {groupName}</span>
                        {formVersion?.versionNumber != null && (
                            <span className={styles.metaPill}>Form v{formVersion.versionNumber}</span>
                        )}
                        {["Admin", "HOD"].includes(role) &&
                            submission.status !== "approved" &&
                            submission.isActive !== false && (
                                <button
                                    type="button"
                                    className={styles.btnLink}
                                    onClick={openChangeGroup}
                                    title="Move this contractor to a different group. Same form template = reclassify; different form template = void + re-invite."
                                >
                                    Change group
                                </button>
                            )}
                        {["Admin", "HOD"].includes(role) &&
                            submission.isActive !== false && (
                                <button
                                    type="button"
                                    className={styles.deactivateBtn}
                                    onClick={() => {
                                        setDeactivateReason("")
                                        setDeactivateError("")
                                        setShowDeactivate(true)
                                    }}
                                    title="Soft-delete this contractor. The row drops out of every staff queue. Audit trail records who deactivated and why."
                                >
                                    Deactivate contractor
                                </button>
                            )}
                    </div>
                    {/* Park reason readout - visible whenever a hold reason
                        is recorded (request-park, parked, do-not-add at L2).
                        Saves reviewers having to dig through history just to
                        see why a submission was paused. */}
                    {(submission as any).hold?.reason &&
                        ["park requested", "parked"].includes(submission.status) && (
                            <div className={styles.holdReadout}>
                                <strong>Park reason:</strong>{" "}
                                {(submission as any).hold.reason}
                                {(submission as any).hold.requestedBy?.name && (
                                    <span className={styles.dim}>
                                        {" - "}
                                        {(submission as any).hold.requestedBy.name}
                                        {(submission as any).hold.requestedBy.date &&
                                            ` on ${new Date(
                                                (submission as any).hold.requestedBy.date,
                                            ).toLocaleDateString("en-NG")}`}
                                    </span>
                                )}
                            </div>
                        )}
                    {/* Lifecycle timestamps. Ordered the way the
                        application actually unfolds: Started ->
                        Submitted -> Last returned (if any), and a
                        Cycle pill (no longer in the queue table). */}
                    {["Admin", "HOD", "VRM"].includes(role) && (
                        <div className={styles.inviteReadout}>
                            {submission.createdAt && (
                                <span>
                                    <strong>Started:</strong>{" "}
                                    {new Date(submission.createdAt).toLocaleString("en-NG")}
                                </span>
                            )}
                            {submission.submitTime && (
                                <span>
                                    <strong>Submitted:</strong>{" "}
                                    {new Date(submission.submitTime).toLocaleString("en-NG")}
                                </span>
                            )}
                            {submission.returnTime && (
                                <span>
                                    <strong>Last returned:</strong>{" "}
                                    {new Date(submission.returnTime).toLocaleString("en-NG")}
                                </span>
                            )}
                            <button
                                type="button"
                                className={styles.btnLink}
                                onClick={() => setInviteDetailsOpen(true)}
                            >
                                View invite & portal admin
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Modify Contractor panel - legacy parity for L3 approved
                contractors. Admin / HOD can rotate End Users and (via
                the Revert from L3 action in the Decision bar) pull the
                contractor back into a pending stage if a deeper change
                is needed. */}
            {submission.approved && ["Admin", "HOD"].includes(role) && inApprovalMode && (
                <div className={styles.modifyPanel}>
                    <div>
                        <h4>Modify Contractor</h4>
                        <p>
                            This contractor is L3 approved. You can rotate
                            the assigned End Users without a revert. Bigger
                            changes - reopening the form, re-running Due
                            Diligence - need a Revert from L3 below.
                        </p>
                    </div>
                    <button
                        className={styles.btnSecondary}
                        onClick={openEndUserPicker}
                    >
                        Change End Users
                        {Array.isArray(submission.selectedEndUsers) &&
                            submission.selectedEndUsers.length > 0 &&
                            ` (${submission.selectedEndUsers.length})`}
                    </button>
                </div>
            )}

            {/* Stage role-permission notice. Same idea as the V1 "you do
                not have permission to act at this stage" line - shows
                only when the submission is pending and the current
                user's role is NOT in the actor set for the current
                stage. Stops reviewers wondering why no buttons appear. */}
            {submission.status === "pending" && (() => {
                const STAGE_ACTORS_DETAIL: Record<number, string[]> = {
                    0: ["Admin", "HOD", "VRM"],
                    1: ["Admin", "HOD", "Supervisor"],
                    // Stage D: any staff role can be picked as an end
                    // user. Whether THIS user can act on THIS submission
                    // is enforced server-side from the assigned list.
                    2: ["Admin", "HOD", "End User", "Amni Staff", "C and P Staff", "Insurance Officer"],
                    3: ["Admin", "HOD", "VRM", "CO", "Supervisor"],
                    4: ["Admin", "HOD"],
                    5: ["Admin", "Executive Approver"],
                }
                const allowed = STAGE_ACTORS_DETAIL[submission.level] || []
                if (allowed.includes(role)) return null
                const owner = allowed.filter((r) => r !== "Admin" && r !== "HOD").join(" / ") || "C&P team"
                return (
                    <div className={styles.permissionGate}>
                        This submission is pending action by the <strong>{owner}</strong>{" "}
                        at Stage {stageFromLevel(submission.level)}. You can view
                        the details but cannot take action from your role.
                    </div>
                )
            })()}

            <StageRoleBriefingCard
                submission={submission}
                role={role}
                user={user}
                /* In view-only mode the briefing card still renders
                   ("here's what your stage is"), but its CTA button is
                   suppressed by passing no-op handlers - the CTA is the
                   only interactive bit and it makes no sense without
                   approval mode.  */
                openEndUserPicker={inApprovalMode ? openEndUserPicker : (() => { }) as any}
                openServicesModal={inApprovalMode ? openServicesModal : (() => { }) as any}
                openDueDiligenceTab={() => setTab("due-diligence")}
                hideCta={!inApprovalMode}
            />
            <HodReturnInbox submission={submission} />

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
                                : " · unsafe - review impact before migrating"}
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

            {/* End Users (level 2) get a stripped-down tab set: just Form
                and Certificates. They sit outside C&P, so internal-staff
                tabs (Edit Audit / Comments / History / Due Diligence) are
                hidden. Admin / HOD always see everything. */}
            {(() => {
                // End Users sit outside C&P and are not part of the
                // review chain - they only ever see Form + Certificates,
                // regardless of which stage the submission has moved
                // to. Admin / HOD always see every tab.
                const isEndUserOnly =
                    role === "End User" && !["Admin", "HOD"].includes(role)
                return (
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
                        {!isEndUserOnly && (submission.level >= 3 || submission.dueDiligence) && (
                            <button
                                className={`${styles.tab} ${tab === "due-diligence" ? styles.tabActive : ""}`}
                                onClick={() => setTab("due-diligence")}
                            >
                                Due Diligence
                            </button>
                        )}
                        {!isEndUserOnly && (
                            <>
                                <button
                                    className={`${styles.tab} ${tab === "edits" ? styles.tabActive : ""}`}
                                    onClick={() => setTab("edits")}
                                >
                                    Edit Audit ({fieldEdits.length})
                                    {fieldEdits.some((e) => {
                                        if ((e.cycleNumber || 1) !== (submission.cycleNumber || 1)) return false
                                        // Reviewer seat (C / F): unreviewed (active) OR still-flagged
                                        // edits from the editor below count as "needs attention".
                                        if (submission.level === 1 && e.editedAtLevel === 0) {
                                            return e.status === "active" || e.status === "flagged"
                                        }
                                        if (submission.level === 4 && e.editedAtLevel === 3) {
                                            return e.status === "active" || e.status === "flagged"
                                        }
                                        // Editor seat (B / E): only flagged rows are work-to-do.
                                        // Once the editor edits or responds, the row flips back to
                                        // active and the badge drops.
                                        if (submission.level === 0 && e.editedAtLevel === 0) {
                                            return e.status === "flagged"
                                        }
                                        if (submission.level === 3 && e.editedAtLevel === 3) {
                                            return e.status === "flagged"
                                        }
                                        return false
                                    }) && (
                                            <span className={styles.tabBadge} aria-label="EBA review needed">
                                                !
                                            </span>
                                        )}
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
                            </>
                        )}
                    </div>
                )
            })()}

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
                            /* Inline remark annotations only at Stage B
                               (level 0) - that's where remarks are the
                               VRM<->contractor dialog. At later stages
                               remarks live in the Comments tab archive. */
                            remarks={submission.level === 0 ? (remarks as any) : []}
                            comments={comments as any}
                            fieldEditsByPath={fieldEditsByPath}
                            cycleNumber={submission.cycleNumber || 1}
                            level={submission.level}
                            sectionApprovals={(submission as any).sectionApprovals || {}}
                            canApproveSections={canActAtCurrentStage && inApprovalMode}
                            showSectionApproval={inApprovalMode && [0, 1].includes(submission.level)}
                            onToggleSectionApproved={toggleSectionApproval}
                            ebaEditableNow={ebaEditableNow && inApprovalMode}
                            onEditField={inApprovalMode ? openEditField : undefined as any}
                            onAddRemark={
                                inApprovalMode && submission.level === 0
                                    ? (args) => openInlineRemark(args)
                                    : undefined
                            }
                            onAddComment={
                                inApprovalMode ? (args) => openInlineComment(args) : undefined
                            }
                        />
                    )}

                    {/* Remarks history on the Form tab only at Stage B
                        where the VRM is actively working with them. */}
                    {submission.level === 0 && remarks.length > 0 && (
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
                                // End User view at Stage D: hide
                                // expiry / issue dates and the
                                // superseded/expiry health badges. They
                                // sit outside C&P and are only meant to
                                // confirm the contractor uploaded the
                                // right document, not to manage its
                                // lifecycle.
                                const isEndUserOnly =
                                    role === "End User" && !["Admin", "HOD"].includes(role)
                                const showDates = !isEndUserOnly
                                const showHealth = !isEndUserOnly
                                return (
                                    <li
                                        key={c._id}
                                        className={`${styles.certItem} ${!isCurrent ? styles.certSuperseded : ""
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
                                            {!isCurrent && showHealth && (
                                                <span className={styles.certBadgeNeutral}>superseded</span>
                                            )}
                                            <span
                                                className={`${styles.certBadge} ${styles[`certStatus_${c.certStatus}`] || ""
                                                    }`}
                                            >
                                                {c.certStatus}
                                            </span>
                                            {c.isReUpload && showHealth && (
                                                <span className={styles.certBadgeInfo}>re-upload</span>
                                            )}
                                            {expStatus && showHealth && (
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
                                            {showDates && c.issueDate && (
                                                <span className={styles.dim}>
                                                    Issued {new Date(c.issueDate).toLocaleDateString("en-NG")}
                                                </span>
                                            )}
                                            {showDates && c.expiryDate && (
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
                                        {inApprovalMode && isCurrent && c.certStatus === "pending" && submission.status !== "draft" && (
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
                                        Tell the contractor why this certificate isn&apos;t acceptable. They&apos;ll see
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
                    readOnly={!inApprovalMode}
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
                                            className={`${styles.certBadge} ${e.status === "active"
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
                                        <div className={styles.editAuditDiff}>
                                            <div className={styles.editAuditDiffSide}>
                                                <span className={styles.editAuditDiffLabel}>From</span>
                                                <div>{renderEditValue(e.previousValue)}</div>
                                            </div>
                                            <div className={styles.editAuditDiffSide}>
                                                <span className={styles.editAuditDiffLabel}>To</span>
                                                <div>{renderEditValue(e.newValue)}</div>
                                            </div>
                                        </div>
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
                                    {(e as any).flagResolution?.previousFlag?.flaggedReason && (
                                        <div className={styles.certRemarks}>
                                            <strong>
                                                Previously flagged
                                                {(e as any).flagResolution.previousFlag.flaggedAtStage
                                                    ? ` at Stage ${(e as any).flagResolution.previousFlag.flaggedAtStage}`
                                                    : ""}
                                                :
                                            </strong>{" "}
                                            {(e as any).flagResolution.previousFlag.flaggedReason}
                                            {(e as any).flagResolution.response && (
                                                <div>
                                                    <strong>
                                                        {(e as any).flagResolution.resolvedBy?.name || "Editor"}{" "}
                                                        responded:
                                                    </strong>{" "}
                                                    {(e as any).flagResolution.response}
                                                </div>
                                            )}
                                            {(e as any).flagResolution.resolutionType === "edited" && (
                                                <div className={styles.dim}>
                                                    Resolved by editing the field above.
                                                </div>
                                            )}
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
                                    {e.status === "flagged" &&
                                        ebaEditableNow &&
                                        e.editedAtLevel === submission.level && (
                                            <div className={styles.certActions}>
                                                <button
                                                    className={styles.btnSecondary}
                                                    onClick={() => {
                                                        setRespondingToEdit(e)
                                                        setRespondReason("")
                                                        setRespondError("")
                                                    }}
                                                    title="Reply without changing the field. Clears the flag so the reviewer re-sees the edit on the next pass."
                                                >
                                                    Respond to flag
                                                </button>
                                                <span className={styles.dim}>
                                                    Or edit the field on the form tab - that also clears the flag.
                                                </span>
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
                    <RemarksArchive
                        remarks={remarks as any}
                        role={role}
                        schema={formVersion?.schema}
                        currentLevel={submission.level}
                    />
                    {inApprovalMode && <div className={styles.commentComposer}>
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
                    </div>}

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
                                                <>
                                                    <button className={styles.btnLink} onClick={() => startEditComment(c)}>
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={styles.btnLinkDanger}
                                                        onClick={() =>
                                                            setConfirmDeleteComment({
                                                                id: c._id,
                                                                preview: c.text.slice(0, 140),
                                                            })
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </>
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
                                // Surface the structured reason / context
                                // carried by return-for-research, return-to-
                                // earlier-stage, request-park, park-at-L2,
                                // etc. Falls back to scanning any string-
                                // valued extraData field so future actions
                                // that carry context automatically show.
                                const reason =
                                    (h as any).extraData?.reason ||
                                    (h as any).extraData?.message ||
                                    (h as any).extraData?.note
                                const otherExtras: Array<[string, any]> = (h as any).extraData
                                    ? Object.entries((h as any).extraData).filter(
                                        ([k, v]) =>
                                            !["reason", "message", "note"].includes(k) &&
                                            (typeof v === "string" || typeof v === "number") &&
                                            String(v).length > 0,
                                    )
                                    : []
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
                                                By {actorName || "-"}{actorRole ? ` (${actorRole})` : ""}
                                            </p>
                                        )}
                                        {reason && (
                                            <blockquote className={styles.historyReason}>
                                                "{reason}"
                                            </blockquote>
                                        )}
                                        {otherExtras.length > 0 && (
                                            <ul className={styles.historyExtras}>
                                                {otherExtras.filter(([k, v]) => k?.toLocaleLowerCase() !== "source").map(([k, v]) => (
                                                    <li key={k}>
                                                        <span>{k}:</span> {String(v)}
                                                    </li>
                                                ))}
                                            </ul>
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
                                contractor. Every active remark you&apos;ve left on
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
                            <h3>Request Park</h3>
                            <p className={styles.modalSub}>
                                Parking pauses this application without
                                rejecting it. The HOD reviews your request
                                and either Approves (status flips to Parked
                                and no one can advance it) or Declines (it
                                stays at this stage). A reason is required.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.modalLabel}>
                                Reason (required)
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Explain why this application should be paused."
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

            {/* EBA edit modal - renders a single-field FormRenderer instance
                in fill mode so the VRM can update the value using the right
                input type for the field. */}
            {editingField && formVersion && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Edit field (EBA)</h3>
                            <p className={styles.modalSub}>
                                Editing <code>{editingField.field.key}</code>. The contractor&apos;s
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

            {inApprovalMode && <DecisionBar
                submission={submission}
                role={role}
                user={user}
                can={can}
                actionRunning={actionRunning}
                actionSuccess={actionSuccess}
                actionError={actionError}
                hasActiveRemarksThisCycle={hasActiveRemarksThisCycle}
                allSectionsReviewed={allSectionsReviewed}
                ebaActiveAwaitingReview={
                    (submission.level === 1 || submission.level === 4) &&
                    fieldEdits.some(
                        (e) =>
                            e.status === "active" &&
                            e.editedAtLevel === (submission.level === 1 ? 0 : 3) &&
                            (e.cycleNumber || 1) === (submission.cycleNumber || 1),
                    )
                }
                ebaFlaggedOutstanding={fieldEdits.some(
                    (e) =>
                        e.status === "flagged" &&
                        (e.cycleNumber || 1) === (submission.cycleNumber || 1),
                )}
                runAction={runAction}
                openEndUserPicker={openEndUserPicker}
                openServicesModal={openServicesModal}
                openReturnModal={() => setReturnOpen(true)}
                openParkRequestModal={() => setParkRequestOpen(true)}
                openReturnPrevModal={() => { setReturnPrevReason(""); setReturnPrevOpen(true) }}
                openReturnEarlierModal={() => { setReturnEarlierLevel(0); setReturnEarlierReason(""); setReturnEarlierOpen(true) }}
                openEbaReturnModal={() => { setEbaReturnReason(""); setEbaReturnOpen(true) }}
                openParkL2Modal={() => { setParkL2Reason(""); setParkL2Open(true) }}
                openRevertL3Modal={() => { setRevertL3Reason(""); setRevertL3Level(5); setRevertL3Open(true) }}
                openUnparkModal={() => { setUnparkReason(""); setUnparkOpen(true) }}
                openDeclineParkModal={() => { setDeclineParkReason(""); setDeclineParkOpen(true) }}
            />}

            {endUserPickerOpen && (
                <EndUserPickerModal
                    submissionId={String(id)}
                    role={role}
                    submission={submission}
                    onSaved={fetchAll}
                    onClose={() => setEndUserPickerOpen(false)}
                />
            )}

            {servicesOpen && (
                <ServicesModal
                    submissionId={String(id)}
                    role={role}
                    submission={submission}
                    onSaved={fetchAll}
                    onClose={() => setServicesOpen(false)}
                />
            )}

            {returnPrevOpen && (
                <ReturnForResearchModal
                    level={submission.level}
                    reason={returnPrevReason}
                    setReason={setReturnPrevReason}
                    actionRunning={actionRunning}
                    actionError={actionError}
                    onSubmit={submitReturnPrev}
                    onClose={() => setReturnPrevOpen(false)}
                />
            )}

            {returnEarlierOpen && (
                <ReturnToEarlierStageModal
                    currentLevel={submission.level}
                    targetLevel={returnEarlierLevel}
                    setTargetLevel={setReturnEarlierLevel}
                    reason={returnEarlierReason}
                    setReason={setReturnEarlierReason}
                    actionRunning={actionRunning}
                    actionError={actionError}
                    onSubmit={submitReturnEarlier}
                    onClose={() => setReturnEarlierOpen(false)}
                />
            )}

            {changeGroupOpen && (() => {
                const currentGroupId = String(
                    (submission.groupId as any)?._id || submission.groupId || "",
                )
                const target = changeGroupList.find(
                    (g: any) => g._id === changeGroupTarget,
                )
                const current = changeGroupList.find(
                    (g: any) => g._id === currentGroupId,
                )
                // listGroups populates formTemplateId so we may receive either
                // a raw ObjectId or a sub-document with _id. Normalise.
                const tplId = (g: any) =>
                    String(g?.formTemplateId?._id || g?.formTemplateId || "")
                const sameTemplate =
                    !!target && !!current && tplId(target) === tplId(current)
                return (
                    <Modal>
                        <div className={styles.modalCard}>
                            <div className={styles.modalHeader}>
                                <h3>Change group</h3>
                                <p className={styles.modalSub}>
                                    Pick the group this contractor should sit in. If the
                                    new group is bound to the same form template, this is
                                    a pure reclassification and the contractor's progress
                                    is preserved. If it points at a different form
                                    template, the current submission is voided and a
                                    fresh invite is issued - the contractor will have to
                                    start over.
                                </p>
                            </div>
                            <div className={styles.modalBody}>
                                <label className={styles.modalLabel}>Target group</label>
                                <select
                                    value={changeGroupTarget}
                                    onChange={(e) => setChangeGroupTarget(e.target.value)}
                                    disabled={changeGroupActing}
                                >
                                    <option value="">Pick a group…</option>
                                    {changeGroupList
                                        .filter((g: any) => g._id !== currentGroupId)
                                        .map((g: any) => (
                                            <option key={g._id} value={g._id}>
                                                {g.name}
                                            </option>
                                        ))}
                                </select>
                                {target && (
                                    <p className={styles.helpText}>
                                        {sameTemplate
                                            ? "Same form template - contractor keeps their submission."
                                            : "Different form template - current submission will be voided and a fresh invite will be issued to the same email."}
                                    </p>
                                )}
                                <label
                                    className={styles.modalLabel}
                                    style={{ marginTop: 12 }}
                                >
                                    Reason
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Logged on the submission's history."
                                    value={changeGroupReason}
                                    onChange={(e) => setChangeGroupReason(e.target.value)}
                                    disabled={changeGroupActing}
                                />
                                {changeGroupError && <ErrorText text={changeGroupError} />}
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.btnSecondary}
                                    onClick={() => setChangeGroupOpen(false)}
                                    disabled={changeGroupActing}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={
                                        target && !sameTemplate
                                            ? styles.btnDanger
                                            : styles.btnPrimary
                                    }
                                    onClick={submitChangeGroup}
                                    disabled={
                                        changeGroupActing ||
                                        !changeGroupTarget ||
                                        !changeGroupReason.trim()
                                    }
                                >
                                    {target && !sameTemplate
                                        ? "Void & re-invite"
                                        : "Reclassify"}
                                    {changeGroupActing && <ButtonLoadingIcon />}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            })()}

            {ebaReturnOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Return for EBA Correction</h3>
                            <p className={styles.modalSub}>
                                Sends this submission back to Stage{" "}
                                {String.fromCharCode(66 + submission.level - 1)} so the
                                editor can resolve every flagged EBA field. Stays on the
                                staff side - the contractor is not notified.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.modalLabel}>
                                Reason for the editor
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Summarise what the editor must address."
                                value={ebaReturnReason}
                                onChange={(e) => setEbaReturnReason(e.target.value)}
                            />
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setEbaReturnOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitReturnForEbaCorrection}
                                disabled={
                                    actionRunning === "return-for-eba-correction" ||
                                    !ebaReturnReason.trim()
                                }
                            >
                                Return for EBA Correction
                                {actionRunning === "return-for-eba-correction" && (
                                    <ButtonLoadingIcon />
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {respondingToEdit && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Respond to flag</h3>
                            <p className={styles.modalSub}>
                                Reply to {respondingToEdit.flaggedBy?.name || "the reviewer"}'s
                                concern on{" "}
                                <strong>
                                    {fieldLabelFromSchema(
                                        formVersion?.schema,
                                        respondingToEdit.fieldKey,
                                    )}
                                </strong>
                                . The flag clears and the edit becomes active again so the
                                reviewer re-sees it after the next advance. If you'd rather
                                change the field value, edit it on the form tab instead -
                                that also clears the flag.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.certRemarks}>
                                <strong>Flag:</strong> {respondingToEdit.flaggedReason}
                            </div>
                            <label className={styles.modalLabel}>Your response</label>
                            <textarea
                                rows={4}
                                placeholder="Explain why the original value stands."
                                value={respondReason}
                                onChange={(e) => setRespondReason(e.target.value)}
                                disabled={respondActing}
                            />
                            {respondError && <ErrorText text={respondError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setRespondingToEdit(null)}
                                disabled={respondActing}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitRespondToFlag}
                                disabled={respondActing || !respondReason.trim()}
                            >
                                Send response
                                {respondActing && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {parkL2Open && (
                <DoNotAddModal
                    reason={parkL2Reason}
                    setReason={setParkL2Reason}
                    actionRunning={actionRunning}
                    actionError={actionError}
                    onSubmit={submitParkL2}
                    onClose={() => setParkL2Open(false)}
                />
            )}

            {unparkOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Unpark Contractor</h3>
                            <p className={styles.modalSub}>
                                Resumes the application at the stage it was
                                parked at. A reason is required and shows in
                                the audit trail.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.formLabel}>
                                Reason
                                <span className={styles.formReq}>required</span>
                            </label>
                            <textarea
                                className={styles.formTextarea}
                                rows={4}
                                placeholder="Why is this contractor being unparked?"
                                value={unparkReason}
                                onChange={(e) => setUnparkReason(e.target.value)}
                            />
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setUnparkOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitUnpark}
                                disabled={
                                    actionRunning === "release-park" ||
                                    !unparkReason.trim()
                                }
                            >
                                Confirm unpark
                                {actionRunning === "release-park" && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {declineParkOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Decline Park Request</h3>
                            <p className={styles.modalSub}>
                                The submission goes back to pending at its
                                current stage. A reason is optional; if
                                provided it will appear in the audit trail.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.formLabel}>Reason (optional)</label>
                            <textarea
                                className={styles.formTextarea}
                                rows={4}
                                placeholder="Why is the park request being declined?"
                                value={declineParkReason}
                                onChange={(e) => setDeclineParkReason(e.target.value)}
                            />
                            {actionError && <ErrorText text={actionError} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setDeclineParkOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitDeclinePark}
                                disabled={actionRunning === "decline-park"}
                            >
                                Decline
                                {actionRunning === "decline-park" && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {revertL3Open && (
                <RevertFromL3Modal
                    reason={revertL3Reason}
                    setReason={setRevertL3Reason}
                    targetLevel={revertL3Level}
                    setTargetLevel={setRevertL3Level}
                    actionRunning={actionRunning}
                    actionError={actionError}
                    onSubmit={submitRevertL3}
                    onClose={() => setRevertL3Open(false)}
                />
            )}

            {inviteDetailsOpen && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Contractor Invite & Portal Admin</h3>
                            <p className={styles.modalSub}>
                                Who invited the contractor, when, and which
                                user is the registered Portal Administrator
                                for this submission.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Mirror V1's two-section layout: Original
                                Invitation Details + Contractor Portal
                                Administrator. Only the fields V1
                                actually shows. recommendedBy renders
                                only when populated, same as V1. */}
                            <section className={styles.inviteSection}>
                                <h4>Original Invitation Details</h4>
                                {invite ? (
                                    <dl className={styles.inviteDl}>
                                        <div>
                                            <dt>Invited Company Name</dt>
                                            <dd>{invite.companyName || "-"}</dd>
                                        </div>
                                        <div>
                                            <dt>Invited By</dt>
                                            <dd>
                                                {invite.invitedBy?.name ||
                                                    invite.invitedBy?.email ||
                                                    "-"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>Invited At</dt>
                                            <dd>
                                                {invite.createdAt
                                                    ? new Date(invite.createdAt).toLocaleString("en-GB")
                                                    : "-"}
                                            </dd>
                                        </div>
                                        {(() => {
                                            // V2-native invites populate recommendedBy as a
                                            // User doc; V1-backfilled invites store the V1
                                            // sub-doc on recommendedByMeta because V1's
                                            // recommendedBy carries extra fields V2's User
                                            // schema does not. Read meta first, then fall
                                            // back to the populated User.
                                            const meta =
                                                (invite as any).recommendedByMeta ||
                                                (invite.recommendedBy &&
                                                    typeof invite.recommendedBy === "object" &&
                                                    "name" in invite.recommendedBy
                                                    ? invite.recommendedBy
                                                    : null)
                                            if (!meta?.name && !meta?.email) return null
                                            return (
                                                <>
                                                    <div>
                                                        <dt>Recommended By</dt>
                                                        <dd>
                                                            {meta.name || meta.email || "-"}
                                                        </dd>
                                                    </div>
                                                    {meta.department && (
                                                        <div>
                                                            <dt>Recommender&apos;s Department</dt>
                                                            <dd>{meta.department}</dd>
                                                        </div>
                                                    )}
                                                    {meta.email && meta.name && (
                                                        <div>
                                                            <dt>Recommender&apos;s Email</dt>
                                                            <dd>{meta.email}</dd>
                                                        </div>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </dl>
                                ) : (
                                    <p className={styles.dim}>
                                        No V2 invite linked. This contractor was
                                        backfilled from V1.
                                    </p>
                                )}
                            </section>

                            <section className={styles.inviteSection}>
                                <h4>Contractor Portal Administrator</h4>
                                {portalAdmin ? (
                                    <dl className={styles.inviteDl}>
                                        <div>
                                            <dt>Name</dt>
                                            <dd>{portalAdmin.name || "-"}</dd>
                                        </div>
                                        <div>
                                            <dt>Email</dt>
                                            <dd>{portalAdmin.email || "-"}</dd>
                                        </div>
                                        <div>
                                            <dt>Phone</dt>
                                            <dd>
                                                {typeof portalAdmin.phone === "string"
                                                    ? portalAdmin.phone
                                                    : portalAdmin.phone?.internationalNumber ||
                                                    portalAdmin.phone?.number ||
                                                    "-"}
                                            </dd>
                                        </div>
                                    </dl>
                                ) : (
                                    <p className={styles.dim}>
                                        No portal administrator registered yet.
                                    </p>
                                )}
                                {["Admin", "HOD"].includes(role) && (
                                    <div className={styles.replaceAdminBlock}>
                                        <p className={styles.dim}>
                                            Send an invite to a new Portal
                                            Administrator. The current admin is
                                            archived for audit; the new admin
                                            takes over when they register.
                                        </p>
                                        <div className={styles.replaceAdminRow}>
                                            <input
                                                type="email"
                                                className={styles.formInput}
                                                placeholder="new.admin@example.com"
                                                value={replaceAdminEmail}
                                                onChange={(e) =>
                                                    setReplaceAdminEmail(e.target.value)
                                                }
                                                disabled={replacingAdmin}
                                            />
                                            <button
                                                className={styles.btnPrimary}
                                                onClick={sendReplaceAdmin}
                                                disabled={
                                                    replacingAdmin ||
                                                    !replaceAdminEmail.includes("@")
                                                }
                                            >
                                                Send Invite
                                                {replacingAdmin && <ButtonLoadingIcon />}
                                            </button>
                                        </div>
                                        {replaceAdminError && (
                                            <ErrorText text={replaceAdminError} />
                                        )}
                                        {replaceAdminSuccess && (
                                            <SuccessMessage message={replaceAdminSuccess} />
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setInviteDetailsOpen(false)}
                            >
                                Close
                            </button>
                            {invite && (
                                <Link
                                    href={`/staff/v2-invites/${invite._id}`}
                                    className={styles.btnPrimary}
                                >
                                    Open invite page
                                </Link>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {showDeactivate && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Deactivate contractor</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.helpText}>
                                <strong>{submission?.companyName || "This contractor"}</strong> will be
                                removed from every staff queue and counts payload. The
                                submission record stays in the database with isActive=false
                                so it can be restored from MongoDB if needed. The audit
                                trail will record who deactivated and why.
                            </p>
                            <div className={styles.formRow}>
                                <label>Reason <span className={styles.required}>*</span></label>
                                <textarea
                                    rows={4}
                                    value={deactivateReason}
                                    onChange={(e) => setDeactivateReason(e.target.value)}
                                    placeholder="e.g. Duplicate of XYZ Ltd; contractor confirmed they registered under a different name."
                                    disabled={deactivating}
                                />
                            </div>
                            {deactivateError && (
                                <div className={styles.modalError}>
                                    <ErrorText text={deactivateError} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setShowDeactivate(false)}
                                disabled={deactivating}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.deactivateBtn}
                                onClick={submitDeactivate}
                                disabled={deactivating || !deactivateReason.trim()}
                            >
                                Deactivate contractor
                                {deactivating && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmDeleteComment && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Delete comment</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.helpText}>
                                This will permanently delete your comment and any direct
                                replies. This cannot be undone.
                            </p>
                            {confirmDeleteComment.preview && (
                                <blockquote className={styles.deletePreview}>
                                    {confirmDeleteComment.preview}
                                    {confirmDeleteComment.preview.length >= 140 && "…"}
                                </blockquote>
                            )}
                            {commentError && (
                                <div className={styles.modalError}>
                                    <ErrorText text={commentError} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setConfirmDeleteComment(null)}
                                disabled={deletingComment}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnReject}
                                onClick={submitDeleteComment}
                                disabled={deletingComment}
                            >
                                Delete comment
                                {deletingComment && <ButtonLoadingIcon />}
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
