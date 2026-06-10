'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { staffApi } from "@/redux/apis/staffApi"
import {
    useCreateV2InviteMutation,
    useGetStaffAllQuery,
    useGetV2GroupsQuery,
    useGetV2InvitesQuery,
    useLazyFindV2InviteByEmailQuery,
    useLazyFindV2SimilarCompaniesQuery,
    useResubmitV2InviteMutation,
    useV2InviteActionMutation,
} from "@/redux/features/v2Slice"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// Convert an RTK Query mutation result {data?, error?} into the
// {status, data, error} envelope the rest of the component already
// understands. transformErrorResponse on the slice shapes the error
// branch so this is a 1-liner.
const envelopeOf = (r: any): any =>
    r?.data ||
    r?.error ||
    { status: "FAILED", error: { message: "Request failed" } }

// V2 Invites - parallel invite surface (InviteV2).
//
// Flow:
//   1. Staff create an invite against a contractor group (status=pending_hod).
//   2. HOD reviews and approves or rejects from the queue tab.
//   3. On approve, the invite email is sent and the row shows the hash link
//      (useful for testing when email delivery is not set up yet).

type ApprovalStatus =
    | "pending_supervisor"
    | "returned_to_originator"
    | "pending_hod"
    | "approved"
    | "rejected"
    | "used"
    | "expired"
    | "voided"

interface Group {
    _id: string
    name: string
    isActive?: boolean
}

interface InviteV2 {
    _id: string
    fname: string
    lname: string
    name: string
    email: string
    phone?: any
    companyName: string
    groupId?: Group | string | null
    formVersionId?: string | null
    approvalStatus: ApprovalStatus
    hash: string
    expiry?: string
    createdAt?: string
    approvedAt?: string
    rejectedAt?: string
    rejectedReason?: string
    invitedBy?: { name?: string; email?: string }
    approvedBy?: { name?: string; email?: string }
    rejectedBy?: { name?: string; email?: string }
    supervisorReviewedBy?: { name?: string; email?: string }
    supervisorReviewedAt?: string
    supervisorReturnReason?: string
    voidedBy?: { name?: string; email?: string }
    voidedAt?: string
    voidReason?: string
}

// Mirror of V1's invite-form department list. Auto-populated from the
// selected staff member, but kept editable so the originator can override.
const DEPARTMENTS = [
    "Contracts and Procurement",
    "Corporate Communications",
    "Drilling",
    "Finance",
    "Legal",
    "Human Resources",
    "Internal Control and Risk Management",
    "ICT",
    "Insurance",
    "Information Management",
    "Operations",
]

// Staff autocomplete row (used for the Recommended By field).
type StaffMember = {
    _id: string
    name: string
    email: string
    department?: string
    uid: string
}

// The two-step Supervisor -> HOD approval was collapsed into one.
// "pending_hod" is kept off the visible tab strip but stays in the
// ApprovalStatus type so legacy invites that landed in that state before
// the change still show up under the "All" tab and can be approved /
// rejected by Supervisor or HOD.
const STATUS_TABS: { key: ApprovalStatus | "all"; label: string }[] = [
    { key: "pending_supervisor", label: "Pending review" },
    { key: "returned_to_originator", label: "Returned to originator" },
    { key: "approved", label: "Approved" },
    { key: "used", label: "Used" },
    { key: "rejected", label: "Rejected" },
    { key: "voided", label: "Voided" },
    { key: "expired", label: "Expired" },
    { key: "all", label: "All" },
]

const V2InvitesPage = () => {
    const user = useSelector((state: any) => state.user.user)

    const [activeTab, setActiveTab] = useState<ApprovalStatus | "all">(
        ["HOD", "Supervisor"].includes(user?.role)
            ? "pending_supervisor"
            : user.role === "Admin"
                ? "approved"
                : "all",
    )
    // RTK Query: the invite list / groups / staff directory share one
    // staffApi cache so navigating away and back is instant. Tag-based
    // invalidation (V2InviteList) fires from every mutation below so
    // the queue always reflects the latest state without a manual
    // refetch.
    const invitesQ = useGetV2InvitesQuery(
        { status: activeTab === "all" ? undefined : activeTab },
        { skip: !user?.role },
    )
    const groupsQ = useGetV2GroupsQuery(undefined, { skip: !user?.role })
    const staffQ = useGetStaffAllQuery(undefined, { skip: !user?.role })
    const invites: InviteV2[] = invitesQ.currentData?.data?.invites || []
    const groups: Group[] = groupsQ.currentData?.data?.groups || []
    const allStaff: StaffMember[] = staffQ.currentData?.data || []
    const loading = invitesQ.isLoading || (invitesQ.isFetching && !invitesQ.currentData)
    const loadingStaff = staffQ.isLoading || (staffQ.isFetching && !staffQ.currentData)
    const fetchError =
        (invitesQ.error as any)?.error?.message ||
        (typeof (invitesQ.error as any) === "string" ? (invitesQ.error as any) : "") ||
        (invitesQ.currentData?.status === "Failed"
            ? invitesQ.currentData?.error?.message
            : "")

    // Create modal
    const [showCreate, setShowCreate] = useState(false)
    const [cFname, setCFname] = useState("")
    const [cLname, setCLname] = useState("")
    const [cEmail, setCEmail] = useState("")
    const [cPhone, setCPhone] = useState("")
    const [cCompany, setCCompany] = useState("")
    const [cGroupId, setCGroupId] = useState("")
    // Recommended-by (V1 parity): staff autocomplete fills uid/email/department,
    // department is also a free dropdown so it can be edited or set without
    // picking a staff member.
    const [cRecommendedByName, setCRecommendedByName] = useState("")
    const [cRecommendedByDepartment, setCRecommendedByDepartment] = useState("")
    const [cRecommendedByEmail, setCRecommendedByEmail] = useState("")
    const [cRecommendedByUid, setCRecommendedByUid] = useState("")
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState("")
    const [createSuccess, setCreateSuccess] = useState("")
    // Similar-companies side panel state + ack checkbox.
    type SimilarMatch = {
        type: "invite" | "submission"
        companyName: string
        email?: string
        status?: string
        level?: number
    }
    const [similarMatches, setSimilarMatches] = useState<SimilarMatch[]>([])
    const [similarLoading, setSimilarLoading] = useState(false)
    const [ackUnique, setAckUnique] = useState(false)
    const similarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const similarSeq = useRef(0)
    // Email check runs on blur (not as the user types) and only ever
    // surfaces exact matches. A non-null value blocks submit.
    const [emailMatch, setEmailMatch] = useState<SimilarMatch | null>(null)
    const [emailChecking, setEmailChecking] = useState(false)

    // allStaff is provided by useGetStaffAllQuery higher up; filteredStaff
    // is the locally-narrowed list rendered in the autocomplete dropdown.
    const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([])
    const [showStaffDropdown, setShowStaffDropdown] = useState(false)
    const staffDropdownRef = useRef<HTMLDivElement | null>(null)

    // An EXACT name match (case-insensitive, whitespace-collapsed) cannot
    // be acknowledged-away - that company definitively already exists on
    // the portal or has been invited, and the originator must use that
    // record rather than create a new one.
    const exactMatch = useMemo(() => {
        const t = cCompany.trim().replace(/\s+/g, " ").toLowerCase()
        if (!t) return null
        return (
            similarMatches.find(
                (m) =>
                    String(m.companyName || "")
                        .trim()
                        .replace(/\s+/g, " ")
                        .toLowerCase() === t,
            ) || null
        )
    }, [cCompany, similarMatches])

    // Approve / reject state
    const [actingId, setActingId] = useState<string | null>(null)
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    // Invite-raising is open to the full C&P / Amni surface so any staff
    // member fielding a new contractor request can raise an invite. The
    // approval still belongs to Supervisor / HOD downstream.
    const INVITE_AUTHORIZED_ROLES = [
        "Admin",
        "HOD",
        "Supervisor",
        "VRM",
        "C and P Staff",
        "C&P Admin",
        "Amni Staff",
        "Insurance Officer",
    ]
    const canCreate = INVITE_AUTHORIZED_ROLES.includes(user?.role)
    // Supervisor + HOD gate the actual review (approve / return / reject).
    const canReview = ["Admin", "HOD", "Supervisor"].includes(user?.role)
    const canResend = INVITE_AUTHORIZED_ROLES.includes(user?.role)
    const canVoid = ["Admin", "HOD", "Supervisor"].includes(user?.role)
    const canResubmit = INVITE_AUTHORIZED_ROLES.includes(user?.role)

    // RTK Query mutations - the cache invalidation tags wired on the
    // slice (V2InviteList, V2Counts) refetch the queue automatically
    // after every successful action, so no manual fetchInvites() is
    // required at call sites.
    const [createInviteTrigger] = useCreateV2InviteMutation()
    const [inviteActionTrigger] = useV2InviteActionMutation()
    const [resubmitInviteTrigger] = useResubmitV2InviteMutation()
    const [triggerSimilar] = useLazyFindV2SimilarCompaniesQuery()
    const [triggerFindByEmail] = useLazyFindV2InviteByEmailQuery()

    // V1-parity background prefetch: as soon as we have a role, warm
    // every STATUS_TABS slot so a tab click is an instant cache hit.
    // Re-runs whenever the active tab's payload arrives (which also
    // happens after every mutation invalidates V2InviteList), so the
    // background tabs stay fresh in sync with the active one.
    const prefetchInvites = staffApi.usePrefetch("getV2Invites")
    useEffect(() => {
        if (!user?.role) return
        for (const t of STATUS_TABS) {
            const arg = t.key === "all" ? {} : { status: t.key as string }
            prefetchInvites(arg, { force: false })
        }
    }, [user?.role, invitesQ.currentData, prefetchInvites])

    // Close the staff autocomplete when the user clicks anywhere outside it.
    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (
                staffDropdownRef.current &&
                !staffDropdownRef.current.contains(event.target as Node)
            ) {
                setShowStaffDropdown(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const filterStaff = (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 2) {
            setFilteredStaff([])
            setShowStaffDropdown(false)
            return
        }
        const t = searchTerm.toLowerCase()
        const filtered = allStaff
            .filter(
                (s) =>
                    (s.name && s.name.toLowerCase().includes(t)) ||
                    (s.email && s.email.toLowerCase().includes(t)) ||
                    (s.department && s.department.toLowerCase().includes(t)),
            )
            .slice(0, 10)
        setFilteredStaff(filtered)
        setShowStaffDropdown(filtered.length > 0)
    }

    const onRecommendedByNameChange = (value: string) => {
        setCRecommendedByName(value)
        // Editing the name detaches the previously-selected staff member.
        setCRecommendedByEmail("")
        setCRecommendedByUid("")
        filterStaff(value)
    }

    const selectStaffMember = (staff: StaffMember) => {
        setCRecommendedByName(staff.name)
        setCRecommendedByDepartment(staff.department || "")
        setCRecommendedByEmail(staff.email || "")
        setCRecommendedByUid(staff.uid || "")
        setShowStaffDropdown(false)
        setFilteredStaff([])
    }

    const openCreate = () => {
        setCFname("")
        setCLname("")
        setCEmail("")
        setCPhone("")
        setCCompany("")
        setCGroupId(groups[0]?._id || "")
        setCRecommendedByName("")
        setCRecommendedByDepartment("")
        setCRecommendedByEmail("")
        setCRecommendedByUid("")
        setFilteredStaff([])
        setShowStaffDropdown(false)
        setCreateError("")
        setCreateSuccess("")
        setSimilarMatches([])
        setSimilarLoading(false)
        setAckUnique(false)
        setEmailMatch(null)
        setEmailChecking(false)
        setShowCreate(true)
    }

    // Naive but strict enough for a check-on-blur - matches typical address
    // shape; the BE re-validates.
    const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

    const onEmailBlur = async () => {
        const e = cEmail.trim().toLowerCase()
        if (!e || !looksLikeEmail(e)) {
            setEmailMatch(null)
            return
        }
        setEmailChecking(true)
        try {
            // triggerFindByEmail returns a promise that resolves to the
            // RTK Query result; preferCacheValue=true means a still-warm
            // cache hit returns instantly with no network round-trip.
            const r = await triggerFindByEmail(e, true)
            const env = r?.data
            if (env?.status === "OK") {
                setEmailMatch(env.data?.match || null)
            } else {
                setEmailMatch(null)
            }
        } catch {
            setEmailMatch(null)
        } finally {
            setEmailChecking(false)
        }
    }

    // Debounced "similar companies" search wired to the company-name input.
    // Each keystroke schedules a 500ms-deferred lookup; in-flight responses
    // are dropped when a newer query starts so stale lists don't flash in.
    const onCompanyChange = (next: string) => {
        setCCompany(next)
        // Any edit invalidates the prior acknowledgement - the user has to
        // re-confirm against the new list before the create button unlocks.
        setAckUnique(false)
        if (similarTimer.current) clearTimeout(similarTimer.current)
        const trimmed = next.trim()
        if (trimmed.length < 3) {
            setSimilarMatches([])
            setSimilarLoading(false)
            return
        }
        setSimilarLoading(true)
        const mySeq = ++similarSeq.current
        similarTimer.current = setTimeout(async () => {
            try {
                // Same shape as the legacy getProtected call - preferCache
                // means a repeated lookup on the same trimmed query
                // resolves instantly from the RTK cache.
                const r = await triggerSimilar(trimmed, true)
                if (mySeq !== similarSeq.current) return
                const env = r?.data
                if (env?.status === "OK") {
                    setSimilarMatches(env.data?.matches || [])
                } else {
                    setSimilarMatches([])
                }
            } catch {
                if (mySeq !== similarSeq.current) return
                setSimilarMatches([])
            } finally {
                if (mySeq === similarSeq.current) setSimilarLoading(false)
            }
        }, 500)
    }

    const submitCreate = async () => {
        if (!cFname.trim() || !cLname.trim() || !cEmail.trim() || !cCompany.trim() || !cGroupId) {
            setCreateError("First name, last name, email, company, and group are all required.")
            return
        }
        try {
            setCreating(true)
            setCreateError("")
            const payload: any = {
                fname: cFname.trim(),
                lname: cLname.trim(),
                email: cEmail.trim(),
                companyName: cCompany.trim(),
                groupId: cGroupId,
            }
            if (cPhone.trim()) payload.phone = { number: cPhone.trim() }
            // V1-parity: only send recommendedBy if a name was typed. The
            // backend persists this as recommendedByMeta on the InviteV2 doc
            // so we don't lose the sub-doc fields (V2-native invites can
            // also resolve a User ObjectId via recommendedBy, but the V1
            // flow uses the sub-doc verbatim).
            if (cRecommendedByName.trim()) {
                payload.recommendedByMeta = {
                    name: cRecommendedByName.trim(),
                    department: cRecommendedByDepartment.trim() || undefined,
                    email: cRecommendedByEmail.trim() || undefined,
                    uid: cRecommendedByUid || undefined,
                }
            }
            // The user has explicitly confirmed via the side-panel checkbox
            // that this company is not a duplicate, so pass through the
            // BE's similar-name gate. The BE also re-runs the check as a
            // safety net.
            payload.acknowledgeSimilar = true
            const result = envelopeOf(await createInviteTrigger(payload))
            if (result?.status === "OK") {
                setCreateSuccess(`Invite created for ${cEmail.trim()} - waiting for Supervisor / HOD review.`)
                // V2InviteList tag invalidation triggers an automatic
                // refetch - no manual fetchInvites here.
                setTimeout(() => setShowCreate(false), 900)
            } else {
                setCreateError(result?.error?.message || "Create failed")
            }
        } catch (e: any) {
            setCreateError(e?.message || "Unexpected error")
        } finally {
            setCreating(false)
        }
    }

    const approve = async (id: string) => {
        try {
            setActingId(id)
            setRowError(null)
            const result = envelopeOf(await inviteActionTrigger({ id, action: "approve" }))
            if (result?.status !== "OK") {
                setRowError({ id, message: result?.error?.message || "Approve failed" })
            }
        } catch (e: any) {
            setRowError({ id, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    const supervisorApprove = async (id: string) => {
        try {
            setActingId(id)
            setRowError(null)
            const result = envelopeOf(
                await inviteActionTrigger({ id, action: "supervisor-approve" }),
            )
            if (result?.status !== "OK") {
                setRowError({ id, message: result?.error?.message || "Supervisor approve failed" })
            }
        } catch (e: any) {
            setRowError({ id, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    const openReject = (id: string) => {
        setRejectingId(id)
        setRejectReason("")
        setRowError(null)
    }

    // Supervisor return-to-originator modal state
    const [returningId, setReturningId] = useState<string | null>(null)
    const [returnReason, setReturnReason] = useState("")
    const openSupervisorReturn = (id: string) => {
        setReturningId(id)
        setReturnReason("")
        setRowError(null)
    }
    const submitSupervisorReturn = async () => {
        if (!returningId) return
        if (!returnReason.trim()) {
            setRowError({ id: returningId, message: "A reason is required." })
            return
        }
        try {
            setActingId(returningId)
            const result = envelopeOf(
                await inviteActionTrigger({
                    id: returningId,
                    action: "supervisor-return",
                    body: { reason: returnReason.trim() },
                }),
            )
            if (result?.status === "OK") {
                setReturningId(null)
                setReturnReason("")
            } else {
                setRowError({
                    id: returningId,
                    message: result?.error?.message || "Return failed",
                })
            }
        } catch (e: any) {
            setRowError({ id: returningId, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    // Void / restart-registration modal state
    const [voidingId, setVoidingId] = useState<string | null>(null)
    const [voidReason, setVoidReason] = useState("")
    const openVoid = (id: string) => {
        setVoidingId(id)
        setVoidReason("")
        setRowError(null)
    }
    const submitVoid = async () => {
        if (!voidingId) return
        if (!voidReason.trim()) {
            setRowError({ id: voidingId, message: "A reason is required." })
            return
        }
        try {
            setActingId(voidingId)
            const result = envelopeOf(
                await inviteActionTrigger({
                    id: voidingId,
                    action: "void",
                    body: { reason: voidReason.trim() },
                }),
            )
            if (result?.status === "OK") {
                setVoidingId(null)
                setVoidReason("")
            } else {
                setRowError({ id: voidingId, message: result?.error?.message || "Void failed" })
            }
        } catch (e: any) {
            setRowError({ id: voidingId, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    // Originator resubmit modal state. After a Supervisor return the
    // originator can correct ANY field on the invite (name, email, phone,
    // company, category) and resubmit for re-review. BE patches whichever
    // fields land in the body; we send everything the modal exposes.
    const [resubmittingId, setResubmittingId] = useState<string | null>(null)
    const [resubmitGroupId, setResubmitGroupId] = useState("")
    const [resubmitFname, setResubmitFname] = useState("")
    const [resubmitLname, setResubmitLname] = useState("")
    const [resubmitEmail, setResubmitEmail] = useState("")
    const [resubmitPhone, setResubmitPhone] = useState("")
    const [resubmitCompanyName, setResubmitCompanyName] = useState("")
    const openResubmit = (inv: InviteV2) => {
        setResubmittingId(inv._id)
        setResubmitGroupId(
            typeof inv.groupId === "string"
                ? inv.groupId
                : (inv.groupId as Group)?._id || "",
        )
        setResubmitFname(inv.fname || "")
        setResubmitLname(inv.lname || "")
        setResubmitEmail(inv.email || "")
        setResubmitPhone(
            typeof (inv as any).phone === "object"
                ? (inv as any).phone?.number || ""
                : (inv as any).phone || "",
        )
        setResubmitCompanyName(inv.companyName || "")
        setRowError(null)
    }
    const submitResubmit = async () => {
        if (!resubmittingId) return
        if (!resubmitGroupId) {
            setRowError({ id: resubmittingId, message: "Pick a category." })
            return
        }
        if (!resubmitFname.trim() || !resubmitLname.trim() || !resubmitEmail.trim() || !resubmitCompanyName.trim()) {
            setRowError({
                id: resubmittingId,
                message: "First name, last name, email and company name are required.",
            })
            return
        }
        try {
            setActingId(resubmittingId)
            const body: Record<string, any> = {
                groupId: resubmitGroupId,
                fname: resubmitFname.trim(),
                lname: resubmitLname.trim(),
                email: resubmitEmail.trim().toLowerCase(),
                companyName: resubmitCompanyName.trim(),
            }
            if (resubmitPhone.trim()) body.phone = { number: resubmitPhone.trim() }
            const result = envelopeOf(
                await resubmitInviteTrigger({
                    id: resubmittingId,
                    body,
                }),
            )
            if (result?.status === "OK") {
                setResubmittingId(null)
            } else {
                setRowError({
                    id: resubmittingId,
                    message: result?.error?.message || "Resubmit failed",
                })
            }
        } catch (e: any) {
            setRowError({ id: resubmittingId, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    const submitReject = async () => {
        if (!rejectingId) return
        if (!rejectReason.trim()) {
            setRowError({ id: rejectingId, message: "A reason is required to reject." })
            return
        }
        try {
            setActingId(rejectingId)
            const result = envelopeOf(
                await inviteActionTrigger({
                    id: rejectingId,
                    action: "reject",
                    body: { reason: rejectReason.trim() },
                }),
            )
            if (result?.status === "OK") {
                setRejectingId(null)
                setRejectReason("")
            } else {
                setRowError({ id: rejectingId, message: result?.error?.message || "Reject failed" })
            }
        } catch (e: any) {
            setRowError({ id: rejectingId, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    const resend = async (id: string) => {
        try {
            setActingId(id)
            setRowError(null)
            const result = envelopeOf(
                await inviteActionTrigger({ id, action: "resend" }),
            )
            if (result?.status !== "OK") {
                setRowError({ id, message: result?.error?.message || "Resend failed" })
            }
        } catch (e: any) {
            setRowError({ id, message: e?.message || "Unexpected error" })
        } finally {
            setActingId(null)
        }
    }

    const copyLink = async (hash: string) => {
        const link = `${window.location.origin}/contractor/v2/form/${hash}`
        try {
            await navigator.clipboard.writeText(link)
            setCopied(hash)
            setTimeout(() => setCopied(null), 1500)
        } catch {
            // Older browsers - fall back to selection
            window.prompt("Copy this link:", link)
        }
    }

    const groupName = (g: Group | string | null | undefined): string => {
        if (!g) return "-"
        if (typeof g === "string") return g
        return g.name || "-"
    }

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        invites.forEach((i) => { counts[i.approvalStatus] = (counts[i.approvalStatus] || 0) + 1 })
        return counts
    }, [invites])

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.pageTitle}>V2 Invites</h2>
                    <p className={styles.pageSubtitle}>
                        Parallel invite surface. Staff create invites against a contractor
                        group; the Supervisor (or HOD) approves before the email goes out.
                        The form attached to the invite is determined by the group's current
                        published template.
                    </p>
                </div>
                {canCreate && (
                    <button className={styles.btnPrimary} onClick={openCreate}>
                        + New invite
                    </button>
                )}
            </div>

            <div className={styles.tabs}>
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.key}
                        className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className={styles.emptyState}>
                    <ButtonLoadingIcon />
                    <p>Loading invites…</p>
                </div>
            )}

            {!loading && fetchError && (
                <div className={styles.errorBanner}>
                    <ErrorText text={fetchError} />
                    <button className={styles.btnLink} onClick={() => invitesQ.refetch()}>Retry</button>
                </div>
            )}

            {!loading && !fetchError && invites.length === 0 && (
                <div className={styles.emptyState}>
                    <h4>No invites in this view</h4>
                    <p>
                        {activeTab === "pending_supervisor"
                            ? "No invites are currently awaiting review."
                            : `No invites here.`}
                    </p>
                </div>
            )}

            {!loading && !fetchError && invites.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Contractor</th>
                                <th>Email</th>
                                <th>Group</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th className={styles.actionCol}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map((inv) => (
                                <tr key={inv._id}>
                                    <td>
                                        <div className={styles.nameCell}>
                                            <span className={styles.nameText}>{inv.name}</span>
                                            <span className={styles.descText}>{inv.companyName}</span>
                                        </div>
                                    </td>
                                    <td>{inv.email}</td>
                                    <td>{groupName(inv.groupId)}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[`status_${inv.approvalStatus}`]}`}>
                                            {inv.approvalStatus.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className={styles.dim}>
                                        {inv.createdAt
                                            ? new Date(inv.createdAt).toLocaleDateString("en-NG")
                                            : "-"}
                                    </td>
                                    <td className={styles.actionCol}>
                                        <div className={styles.actionsRow}>
                                            {(inv.approvalStatus === "pending_supervisor" ||
                                                inv.approvalStatus === "pending_hod") &&
                                                canReview && (
                                                <>
                                                    <button
                                                        className={styles.btnApprove}
                                                        disabled={actingId === inv._id}
                                                        onClick={() => supervisorApprove(inv._id)}
                                                    >
                                                        Approve & send
                                                        {actingId === inv._id && <ButtonLoadingIcon />}
                                                    </button>
                                                    <button
                                                        className={styles.btnReject}
                                                        disabled={actingId === inv._id}
                                                        onClick={() => openSupervisorReturn(inv._id)}
                                                    >
                                                        Return for correction
                                                    </button>
                                                    <button
                                                        className={styles.btnSecondary}
                                                        disabled={actingId === inv._id}
                                                        onClick={() => openReject(inv._id)}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            {inv.approvalStatus === "returned_to_originator" && (
                                                <>
                                                    {inv.supervisorReturnReason && (
                                                        <span className={styles.rejectReason} title={inv.supervisorReturnReason}>
                                                            {inv.supervisorReturnReason}
                                                        </span>
                                                    )}
                                                    {canResubmit && (
                                                        <button
                                                            className={styles.btnApprove}
                                                            disabled={actingId === inv._id}
                                                            onClick={() => openResubmit(inv)}
                                                        >
                                                            Fix & resubmit
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {(inv.approvalStatus === "approved" || inv.approvalStatus === "used") && (
                                                <>
                                                    <button
                                                        className={styles.btnLink}
                                                        onClick={() => copyLink(inv.hash)}
                                                    >
                                                        {copied === inv.hash ? "Copied" : "Copy link"}
                                                    </button>
                                                    {inv.approvalStatus === "approved" && canResend && (
                                                        <button
                                                            className={styles.btnSecondary}
                                                            disabled={actingId === inv._id}
                                                            onClick={() => resend(inv._id)}
                                                        >
                                                            Resend
                                                            {actingId === inv._id && <ButtonLoadingIcon />}
                                                        </button>
                                                    )}
                                                    {canVoid && (
                                                        <button
                                                            className={styles.btnReject}
                                                            disabled={actingId === inv._id}
                                                            onClick={() => openVoid(inv._id)}
                                                            title="Change category - voids this invite. Create a new one with the correct category."
                                                        >
                                                            Change category
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {inv.approvalStatus === "rejected" && inv.rejectedReason && (
                                                <span className={styles.rejectReason} title={inv.rejectedReason}>
                                                    {inv.rejectedReason}
                                                </span>
                                            )}
                                            {inv.approvalStatus === "voided" && inv.voidReason && (
                                                <span className={styles.rejectReason} title={inv.voidReason}>
                                                    Voided: {inv.voidReason}
                                                </span>
                                            )}
                                        </div>
                                        {rowError?.id === inv._id && (
                                            <div className={styles.rowError}>
                                                <ErrorText text={rowError.message} />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate && (
                <Modal>
                    <div className={`${styles.modalCard} ${styles.modalCardWide}`}>
                        <div className={styles.modalHeader}>
                            <h3>New invite</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.createGrid}>
                                <div className={styles.createFormCol}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formRow}>
                                            <label>First name <span className={styles.required}>*</span></label>
                                            <input value={cFname} onChange={(e) => setCFname(e.target.value)} disabled={creating} />
                                        </div>
                                        <div className={styles.formRow}>
                                            <label>Last name <span className={styles.required}>*</span></label>
                                            <input value={cLname} onChange={(e) => setCLname(e.target.value)} disabled={creating} />
                                        </div>
                                    </div>
                                    <div className={styles.formRow}>
                                        <label>Email <span className={styles.required}>*</span></label>
                                        <input
                                            type="email"
                                            value={cEmail}
                                            onChange={(e) => {
                                                setCEmail(e.target.value)
                                                // Stale matches must not stick when the user keeps typing.
                                                if (emailMatch) setEmailMatch(null)
                                            }}
                                            onBlur={onEmailBlur}
                                            disabled={creating}
                                        />
                                        {emailChecking && (
                                            <p className={styles.helpText}>Checking email…</p>
                                        )}
                                        {emailMatch && (
                                            <div className={styles.modalError}>
                                                <ErrorText
                                                    text={
                                                        emailMatch.type === "submission"
                                                            ? `${cEmail.trim()} is already registered as a contractor on the portal (${emailMatch.companyName}${emailMatch.status ? `, status: ${emailMatch.status}` : ""}). You cannot invite this email again.`
                                                            : `${cEmail.trim()} has an active invite (${emailMatch.companyName}${emailMatch.status ? `, status: ${emailMatch.status}` : ""}). Void it first if you need to re-issue.`
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.formRow}>
                                        <label>Phone</label>
                                        <input value={cPhone} onChange={(e) => setCPhone(e.target.value)} disabled={creating} />
                                    </div>
                                    <div className={styles.formRow}>
                                        <label>Company name <span className={styles.required}>*</span></label>
                                        <input
                                            value={cCompany}
                                            onChange={(e) => onCompanyChange(e.target.value)}
                                            disabled={creating}
                                            placeholder="Start typing to see similar companies"
                                        />
                                    </div>
                                    <div className={styles.formRow}>
                                        <label>Group <span className={styles.required}>*</span></label>
                                        {groups.length === 0 ? (
                                            <div className={styles.inlineWarning}>
                                                No contractor groups defined. Create a group first.
                                            </div>
                                        ) : (
                                            <select value={cGroupId} onChange={(e) => setCGroupId(e.target.value)} disabled={creating}>
                                                <option value="">Select a group…</option>
                                                {groups.map((g) => (
                                                    <option key={g._id} value={g._id}>{g.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        <p className={styles.helpText}>
                                            The form attached to the invite is the group's current published template version,
                                            stamped at the moment the Supervisor / HOD approves.
                                        </p>
                                    </div>

                                    {/* Recommended By (V1 parity). Optional. The name input is a
                                        staff autocomplete - selecting an entry auto-fills the
                                        department, email, and uid which are sent through as
                                        recommendedByMeta on the InviteV2 doc. */}
                                    <div className={styles.formDivider}>
                                        <span>Recommendation Details (Optional)</span>
                                    </div>
                                    <div className={styles.formGrid}>
                                        <div
                                            className={styles.formRow}
                                            ref={staffDropdownRef}
                                            style={{ position: "relative" }}
                                        >
                                            <label htmlFor="recommendedByName">Recommended By</label>
                                            <input
                                                id="recommendedByName"
                                                placeholder="Type to search staff or enter name"
                                                value={cRecommendedByName}
                                                onChange={(e) => onRecommendedByNameChange(e.target.value)}
                                                onFocus={() => {
                                                    if (cRecommendedByName.length >= 2 && filteredStaff.length > 0) {
                                                        setShowStaffDropdown(true)
                                                    }
                                                }}
                                                disabled={creating}
                                                autoComplete="off"
                                            />
                                            {loadingStaff && (
                                                <p className={styles.helpText}>Loading staff…</p>
                                            )}
                                            {showStaffDropdown && filteredStaff.length > 0 && (
                                                <div className={styles.autocompleteDropdown}>
                                                    {filteredStaff.map((staff) => (
                                                        <div
                                                            key={staff._id}
                                                            className={styles.autocompleteItem}
                                                            onClick={() => selectStaffMember(staff)}
                                                        >
                                                            <div className={styles.staffName}>{staff.name}</div>
                                                            <div className={styles.staffDetails}>
                                                                {staff.department && <span>{staff.department}</span>}
                                                                {staff.department && staff.email && <span> • </span>}
                                                                {staff.email && (
                                                                    <span className={styles.staffEmail}>{staff.email}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.formRow}>
                                            <label htmlFor="recommendedByDepartment">Department</label>
                                            <select
                                                id="recommendedByDepartment"
                                                value={cRecommendedByDepartment}
                                                onChange={(e) => setCRecommendedByDepartment(e.target.value)}
                                                disabled={creating}
                                            >
                                                <option value="">Select or auto-filled from staff</option>
                                                {DEPARTMENTS.map((d) => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <aside className={styles.sidePanel}>
                                    <div className={styles.sidePanelHeader}>
                                        <span>Similar Registered Companies</span>
                                        {similarLoading && <ButtonLoadingIcon />}
                                    </div>
                                    {cCompany.trim().length < 3 ? (
                                        <p className={styles.sidePanelHint}>
                                            Start typing a company name (at least 3 characters) to see matches already on the portal or invited.
                                        </p>
                                    ) : similarMatches.length === 0 ? (
                                        <p className={styles.sidePanelHint}>
                                            {similarLoading
                                                ? "Searching…"
                                                : "No similar companies found."}
                                        </p>
                                    ) : (
                                        <div className={styles.sideMatchList}>
                                            {similarMatches.map((m, i) => (
                                                <div key={`${m.type}-${m.companyName}-${i}`} className={styles.sideMatchItem}>
                                                    <div>
                                                        <span
                                                            className={`${styles.sideMatchType} ${m.type === "submission" ? styles.submission : ""}`}
                                                        >
                                                            {m.type === "submission" ? "On portal" : "Invited"}
                                                        </span>
                                                        <span className={styles.sideMatchName}>{m.companyName}</span>
                                                    </div>
                                                    <div className={styles.sideMatchMeta}>
                                                        {m.status && <>Status: {m.status}</>}
                                                        {m.email && <> · {m.email}</>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </aside>
                            </div>

                            {exactMatch ? (
                                <div className={styles.modalError}>
                                    <ErrorText
                                        text={`"${exactMatch.companyName}" is already ${exactMatch.type === "submission" ? "on the portal" : "invited"
                                            }${exactMatch.status ? ` (status: ${exactMatch.status})` : ""}. You cannot create a new invite under the same name.`}
                                    />
                                </div>
                            ) : (
                                <div className={styles.ackRow}>
                                    <input
                                        id="ackUnique"
                                        type="checkbox"
                                        checked={ackUnique}
                                        onChange={(e) => setAckUnique(e.target.checked)}
                                        disabled={creating || cCompany.trim().length < 3}
                                    />
                                    <label htmlFor="ackUnique">
                                        I have reviewed the list and confirm <strong>{cCompany.trim() || "this company"}</strong> is not already on the portal or invited.
                                    </label>
                                </div>
                            )}

                            {createError && <div className={styles.modalError}><ErrorText text={createError} /></div>}
                            {createSuccess && <div className={styles.modalSuccess}><SuccessMessage message={createSuccess} /></div>}
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnSecondary} onClick={() => setShowCreate(false)} disabled={creating}>
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitCreate}
                                disabled={
                                    creating ||
                                    groups.length === 0 ||
                                    !ackUnique ||
                                    similarLoading ||
                                    emailChecking ||
                                    !!exactMatch ||
                                    !!emailMatch
                                }
                                title={
                                    emailMatch
                                        ? `${cEmail.trim()} is already in use.`
                                        : exactMatch
                                            ? `"${exactMatch.companyName}" already exists on the portal.`
                                            : !ackUnique
                                                ? "Tick the confirmation that this company is not a duplicate."
                                                : similarLoading || emailChecking
                                                    ? "Waiting for duplicate-check to finish."
                                                    : undefined
                                }
                            >
                                Create invite
                                {creating && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {rejectingId && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Reject invite</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formRow}>
                                <label>Reason <span className={styles.required}>*</span></label>
                                <textarea
                                    rows={4}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Tell the team that created this invite why it cannot proceed."
                                    disabled={actingId === rejectingId}
                                />
                            </div>
                            {rowError?.id === rejectingId && (
                                <div className={styles.modalError}>
                                    <ErrorText text={rowError.message} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setRejectingId(null)}
                                disabled={actingId === rejectingId}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnReject}
                                onClick={submitReject}
                                disabled={actingId === rejectingId || !rejectReason.trim()}
                            >
                                Reject
                                {actingId === rejectingId && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {returningId && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Return invite to originator</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.helpText}>
                                Tell the person who created this invite what's wrong with the
                                category choice. They'll be able to fix and resubmit.
                            </p>
                            <div className={styles.formRow}>
                                <label>Reason <span className={styles.required}>*</span></label>
                                <textarea
                                    rows={4}
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    placeholder="e.g. Wrong category - this vendor offers offshore services, not legal."
                                    disabled={actingId === returningId}
                                />
                            </div>
                            {rowError?.id === returningId && (
                                <div className={styles.modalError}>
                                    <ErrorText text={rowError.message} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setReturningId(null)}
                                disabled={actingId === returningId}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnReject}
                                onClick={submitSupervisorReturn}
                                disabled={actingId === returningId || !returnReason.trim()}
                            >
                                Return for correction
                                {actingId === returningId && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {voidingId && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Change category - void this invite</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.helpText}>
                                Per policy, changing a vendor's category requires restarting
                                the registration process. Voiding this invite cancels the
                                current registration so you can issue a fresh invite with
                                the correct category. The vendor's prior submission (if any)
                                will be marked inactive and disappear from approval queues -
                                the audit trail is preserved.
                            </p>
                            <div className={styles.formRow}>
                                <label>Reason <span className={styles.required}>*</span></label>
                                <textarea
                                    rows={4}
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    placeholder="e.g. Vendor was placed in Simple but should be in Non-Offshore."
                                    disabled={actingId === voidingId}
                                />
                            </div>
                            {rowError?.id === voidingId && (
                                <div className={styles.modalError}>
                                    <ErrorText text={rowError.message} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setVoidingId(null)}
                                disabled={actingId === voidingId}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnReject}
                                onClick={submitVoid}
                                disabled={actingId === voidingId || !voidReason.trim()}
                            >
                                Void invite
                                {actingId === voidingId && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {resubmittingId && (
                <Modal>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>Fix & resubmit</h3>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.helpText}>
                                Correct anything the reviewer flagged and resubmit
                                for Supervisor / HOD review.
                            </p>
                            <div className={styles.formRow}>
                                <label>First name <span className={styles.required}>*</span></label>
                                <input
                                    value={resubmitFname}
                                    onChange={(e) => setResubmitFname(e.target.value)}
                                    disabled={actingId === resubmittingId}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Last name <span className={styles.required}>*</span></label>
                                <input
                                    value={resubmitLname}
                                    onChange={(e) => setResubmitLname(e.target.value)}
                                    disabled={actingId === resubmittingId}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Email <span className={styles.required}>*</span></label>
                                <input
                                    type="email"
                                    value={resubmitEmail}
                                    onChange={(e) => setResubmitEmail(e.target.value)}
                                    disabled={actingId === resubmittingId}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Phone</label>
                                <input
                                    value={resubmitPhone}
                                    onChange={(e) => setResubmitPhone(e.target.value)}
                                    disabled={actingId === resubmittingId}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Company name <span className={styles.required}>*</span></label>
                                <input
                                    value={resubmitCompanyName}
                                    onChange={(e) => setResubmitCompanyName(e.target.value)}
                                    disabled={actingId === resubmittingId}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>Category <span className={styles.required}>*</span></label>
                                {groups.length === 0 ? (
                                    <div className={styles.inlineWarning}>
                                        No categories available. Create one first.
                                    </div>
                                ) : (
                                    <select
                                        value={resubmitGroupId}
                                        onChange={(e) => setResubmitGroupId(e.target.value)}
                                        disabled={actingId === resubmittingId}
                                    >
                                        <option value="">Select a category…</option>
                                        {groups.map((g) => (
                                            <option key={g._id} value={g._id}>{g.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {rowError?.id === resubmittingId && (
                                <div className={styles.modalError}>
                                    <ErrorText text={rowError.message} />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setResubmittingId(null)}
                                disabled={actingId === resubmittingId}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={submitResubmit}
                                disabled={actingId === resubmittingId || !resubmitGroupId}
                            >
                                Resubmit
                                {actingId === resubmittingId && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default V2InvitesPage
