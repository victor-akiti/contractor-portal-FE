// Shared types + small pure helpers for the V2 submission detail page.
// Extracted from page.tsx so split-out components can import them without
// having to re-declare or pull from a 2000-line file.

export interface Certificate {
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

export type ActionKey =
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

export interface Remark {
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

export interface Comment {
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

export interface ApprovalHistoryEntry {
    action?: string
    type?: string
    description?: string
    date?: string | number
    actorName?: string
    actorEmail?: string
    actorRole?: string
    approver?: { name?: string; role?: string; email?: string }
    // Free-form payload set by transitions that carry extra context
    // (e.g. return-for-research reason, park reason, do-not-add reason).
    extraData?: Record<string, any>
}

export interface Submission {
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
    reverts?: any
}

export interface FormVersion {
    _id: string
    versionNumber?: number
    schema?: any
}

// "Can act" predicates for the decision bar. Derived once in page.tsx and
// passed down so child components don't need to know the rules.
export interface CanDecide {
    advance?: boolean
    finalApprove?: boolean
    returnToVendor?: boolean
    requestPark?: boolean
    approvePark?: boolean
    declinePark?: boolean
    releasePark?: boolean
    retrieve?: boolean
    revertFromL3?: boolean
    assignEndUsers?: boolean
    recordServices?: boolean
    returnToE?: boolean
    returnToF?: boolean
    doNotAdd?: boolean
    returnEarlier?: boolean
    returnForEbaCorrection?: boolean
}

// ─── Pure helpers (shared by tabs + modals) ──────────────────────────────

export const stageFromLevel = (level: number): string => {
    if (level == null || level < 0 || level > 5) return "-"
    return String.fromCharCode(66 + level)
}

// Drafts haven't been submitted yet, so by the canonical taxonomy they sit
// at Stage A regardless of internal level.
export const stageForSubmission = (s: {
    status: string
    level: number
    approved: boolean
}): string => {
    if (s.approved) return "L3"
    if (s.status === "draft") return "A"
    return stageFromLevel(s.level)
}

export const stageLongLabel = (s: {
    status: string
    level: number
    approved: boolean
}): string => {
    if (s.approved) return "L3 - Approved Contractor"
    if (s.status === "draft") return "Stage A - Not Yet Submitted"
    return `Stage ${stageFromLevel(s.level)}`
}

export const fieldLabelFromSchema = (
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

export const sectionLabelFromSchema = (schema: any, sectionKey: string): string => {
    if (!schema?.pages || !sectionKey) return sectionKey
    for (const page of schema.pages) {
        for (const section of page.sections || []) {
            if (section.key === sectionKey) return section.title || sectionKey
        }
    }
    return sectionKey
}

export const anchorLabel = (
    schema: any,
    sectionKey?: string | null,
    fieldKey?: string | null,
): string => {
    const parts: string[] = []
    if (sectionKey) parts.push(sectionLabelFromSchema(schema, sectionKey))
    if (fieldKey) parts.push(fieldLabelFromSchema(schema, fieldKey))
    return parts.length ? parts.join(" > ") : "General"
}
