'use client'

// ApprovalReviewView - read-only review surface used by staff on the V2
// submission detail page in place of the editable FormRenderer. Layout is a
// clean Page > Section > Field structure where each field renders as
// `approvalLabel || label` paired with the contractor's value, with inline
// affordances for per-field remarks and comments.
//
// What it is NOT: a form. Reviewers don't need input controls; they need to
// scan answers fast and leave notes. The legacy contractor portal collapsed
// everything into a disabled form which made every field look editable and
// hid the value in an input box. This component flips that: value first,
// label second, actions to the side.
//
// Props are kept narrow on purpose. The host page (v2-approvals/[id]) owns
// the data + the modals; this component only renders and emits events.

import { useMemo, useState } from "react"
import { FieldEditRow } from "@/components/form/FormRenderer"
import { FileFieldValue } from "@/components/form/FileFieldUploader"
import styles from "./ApprovalReviewView.module.css"

interface SchemaField {
    key: string
    type: string
    label: string
    approvalLabel?: string
    helpText?: string
    options?: Array<{ key: string; label: string }>
    allowMultiple?: boolean
    addedFieldLabel?: string
    hasExpiryDate?: boolean
}
interface SchemaSection {
    key: string
    title: string
    description?: string
    fields: SchemaField[]
    allowMultiple?: boolean
    addedSectionLabel?: string
    hideOnApproval?: boolean
}
interface SchemaPage {
    key: string
    title: string
    description?: string
    sections: SchemaSection[]
}
interface FormSchema {
    version: 1
    pages: SchemaPage[]
}

export interface ReviewRemark {
    _id: string
    sectionKey: string
    fieldKey?: string
    text: string
    authorName?: string
    cycleNumber?: number
    status: "active" | "addressed" | "withdrawn"
    createdAt?: string
}

export interface ReviewComment {
    _id: string
    text: string
    authorName?: string
    authorRole?: string
    anchor?: { type?: string; sectionKey?: string; fieldKey?: string }
    createdAt?: string
    editedAt?: string
}

interface Props {
    schema: FormSchema
    answers: Record<string, any>
    remarks: ReviewRemark[]
    comments: ReviewComment[]
    fieldEditsByPath?: Record<string, FieldEditRow>
    cycleNumber: number
    // The reviewer's current stage level (0=B, 1=C, etc). Used together
    // with cycleNumber + sectionApprovals to compute per-section checked
    // state.
    level: number
    // Section-approval checkboxes - composite map keyed
    // "<level>:<cycle>:<sectionKey>".
    sectionApprovals?: Record<string, any>
    // When the current viewer can tick / untick approval boxes.
    canApproveSections?: boolean
    onToggleSectionApproved?: (sectionKey: string, next: boolean) => void
    // EBA edit affordance - same callback shape as FormRenderer so the host
    // can reuse its existing edit modal.
    ebaEditableNow?: boolean
    onEditField?: (args: {
        field: SchemaField
        fieldPath: string
        sectionKey: string
        currentValue: any
    }) => void
    onAddRemark?: (args: { sectionKey: string; fieldKey?: string }) => void
    onAddComment?: (args: { sectionKey: string; fieldKey?: string }) => void
}

// ---- Value formatting -----------------------------------------------------

const isFileLike = (v: any): boolean =>
    !!v && typeof v === "object" && typeof v.url === "string" && typeof v.updateCode === "string"

const formatScalar = (v: any): string => {
    if (v === undefined || v === null || v === "") return "-"
    if (typeof v === "boolean") return v ? "Yes" : "No"
    if (typeof v === "number") return String(v)
    return String(v)
}

const formatValue = (field: SchemaField, value: any): React.ReactNode => {
    if (value === undefined || value === null || value === "") {
        return <span className={styles.empty}>Not provided</span>
    }

    if (field.type === "currency" && value && typeof value === "object") {
        if (value.amount === "" || value.amount == null) {
            return <span className={styles.empty}>Not provided</span>
        }
        const code = value.currency || "NGN"
        try {
            return new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: code,
                maximumFractionDigits: 2,
            }).format(Number(value.amount))
        } catch {
            return `${code} ${value.amount}`
        }
    }

    if (field.type === "date" && typeof value === "string") {
        const d = new Date(value)
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-NG")
        return value
    }

    if ((field.type === "file" || field.type === "certificate") && Array.isArray(value)) {
        const files = value as FileFieldValue[]
        if (files.length === 0) {
            return <span className={styles.empty}>Not provided</span>
        }
        return (
            <div className={styles.fileList}>
                {files.map((f, i) => (
                    <div key={(f.url || f.updateCode || "") + i} className={styles.fileRow}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                            {f.name || "Open file"}
                        </a>
                        {field.type === "certificate" && (
                            <span className={styles.fileMeta}>
                                {f.issueDate ? `Issued ${new Date(f.issueDate).toLocaleDateString("en-NG")}` : ""}
                                {f.issueDate && f.expiryDate ? " - " : ""}
                                {f.expiryDate
                                    ? `Expires ${new Date(f.expiryDate).toLocaleDateString("en-NG")}`
                                    : ""}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    if (
        (field.type === "checkBoxes" ||
            field.type === "multiSelect" ||
            field.type === "multiSelectFreeText") &&
        Array.isArray(value)
    ) {
        if (value.length === 0) return <span className={styles.empty}>Not provided</span>
        // For options-driven types resolve to the option label; for free text
        // the value is the label itself.
        const optMap = new Map((field.options || []).map((o) => [o.key, o.label]))
        return (
            <div className={styles.chipList}>
                {value.map((v: string, i: number) => (
                    <span key={String(v) + i} className={styles.chip}>
                        {optMap.get(v) || String(v)}
                    </span>
                ))}
            </div>
        )
    }

    if ((field.type === "dropdown" || field.type === "radioButtons") && typeof value === "string") {
        const o = (field.options || []).find((x) => x.key === value)
        return o ? o.label : value
    }

    if (field.type === "longText" && typeof value === "string") {
        return <p className={styles.longText}>{value}</p>
    }

    return formatScalar(value)
}

// ---- Component ------------------------------------------------------------

const ApprovalReviewView = ({
    schema,
    answers,
    remarks,
    comments,
    fieldEditsByPath,
    cycleNumber,
    level,
    sectionApprovals,
    canApproveSections,
    onToggleSectionApproved,
    ebaEditableNow,
    onEditField,
    onAddRemark,
    onAddComment,
}: Props) => {
    // Index remarks + comments by anchor for fast per-field lookup.
    const fieldRemarks = useMemo(() => {
        const out: Record<string, ReviewRemark[]> = {}
        for (const r of remarks) {
            const k = r.fieldKey ? `${r.sectionKey}::${r.fieldKey}` : `${r.sectionKey}::*`
            ;(out[k] = out[k] || []).push(r)
        }
        return out
    }, [remarks])

    const fieldComments = useMemo(() => {
        const out: Record<string, ReviewComment[]> = {}
        for (const c of comments) {
            const sec = c.anchor?.sectionKey || "*"
            const fk = c.anchor?.fieldKey
            const k = fk ? `${sec}::${fk}` : `${sec}::*`
            ;(out[k] = out[k] || []).push(c)
        }
        return out
    }, [comments])

    // Per-field expand state for the inline remarks / comments panel.
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    // Composite-key lookup that matches the BE storage shape.
    const isSectionApproved = (sectionKey: string): boolean => {
        if (!sectionApprovals) return false
        return !!sectionApprovals[`${level}:${cycleNumber}:${sectionKey}`]
    }

    const SectionApprovalCheck = ({ sectionKey }: { sectionKey: string }) => {
        const checked = isSectionApproved(sectionKey)
        const disabled = !canApproveSections || !onToggleSectionApproved
        return (
            <label
                className={`${styles.sectionCheck} ${checked ? styles.sectionCheckOn : ""} ${
                    disabled ? styles.sectionCheckDisabled : ""
                }`}
                title={
                    disabled
                        ? "Read-only - you can't tick sections at this stage"
                        : checked
                          ? "Untick to mark this section as not yet reviewed"
                          : "Tick once you've reviewed this section"
                }
            >
                <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onToggleSectionApproved?.(sectionKey, e.target.checked)}
                />
                <span>{checked ? "Reviewed" : "Mark as reviewed"}</span>
            </label>
        )
    }

    if (!schema?.pages?.length) {
        return (
            <div className={styles.empty}>
                <p>This submission's form schema is empty.</p>
            </div>
        )
    }

    const renderFieldRow = (
        field: SchemaField,
        value: any,
        fieldPath: string,
        sectionKey: string,
    ) => {
        const label = field.approvalLabel || field.label
        const anchor = `${sectionKey}::${field.key}`
        const rs = (fieldRemarks[anchor] || []).filter(
            (r) => r.status === "active" && (!r.cycleNumber || r.cycleNumber === cycleNumber),
        )
        const cs = fieldComments[anchor] || []
        const edit = fieldEditsByPath?.[fieldPath]
        const isOpen = !!expanded[anchor]
        const totalNotes = rs.length + cs.length

        return (
            <div key={fieldPath} className={styles.fieldRow}>
                <div className={styles.fieldHead}>
                    <div className={styles.fieldLabelWrap}>
                        <div className={styles.fieldLabel}>{label}</div>
                        {field.helpText && (
                            <div className={styles.fieldHelp}>{field.helpText}</div>
                        )}
                    </div>
                    <div className={styles.fieldValue}>{formatValue(field, value)}</div>
                    <div className={styles.fieldActions}>
                        {edit && (
                            <span
                                className={`${styles.editBadge} ${
                                    edit.status === "flagged"
                                        ? styles.editBadgeFlagged
                                        : edit.status === "accepted"
                                          ? styles.editBadgeAccepted
                                          : styles.editBadgeActive
                                }`}
                                title={`Edited at Stage ${edit.editedAtStage} by ${
                                    edit.editedBy?.name || "staff"
                                }`}
                            >
                                EBA {edit.status}
                            </span>
                        )}
                        {ebaEditableNow && (field as any).eba && onEditField && (
                            <button
                                type="button"
                                className={styles.actionBtnPrimary}
                                onClick={() =>
                                    onEditField({ field, fieldPath, sectionKey, currentValue: value })
                                }
                            >
                                Edit
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setExpanded((s) => ({ ...s, [anchor]: !s[anchor] }))}
                            aria-expanded={isOpen}
                        >
                            Notes
                            {totalNotes > 0 && (
                                <span className={styles.notesCount}>{totalNotes}</span>
                            )}
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <div className={styles.notesPanel}>
                        <div className={styles.notesCol}>
                            <div className={styles.notesColHead}>
                                Remarks to contractor
                                {onAddRemark && (
                                    <button
                                        type="button"
                                        className={styles.linkBtn}
                                        onClick={() => onAddRemark({ sectionKey, fieldKey: field.key })}
                                    >
                                        + Add remark
                                    </button>
                                )}
                            </div>
                            {rs.length === 0 ? (
                                <p className={styles.dim}>None for this field.</p>
                            ) : (
                                <ul className={styles.notesList}>
                                    {rs.map((r) => (
                                        <li key={r._id}>
                                            <p>{r.text}</p>
                                            <span className={styles.dim}>
                                                {r.authorName || "Reviewer"}
                                                {r.createdAt
                                                    ? ` - ${new Date(r.createdAt).toLocaleString("en-NG")}`
                                                    : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className={styles.notesCol}>
                            <div className={styles.notesColHead}>
                                Internal comments
                                {onAddComment && (
                                    <button
                                        type="button"
                                        className={styles.linkBtn}
                                        onClick={() => onAddComment({ sectionKey, fieldKey: field.key })}
                                    >
                                        + Add comment
                                    </button>
                                )}
                            </div>
                            {cs.length === 0 ? (
                                <p className={styles.dim}>None for this field.</p>
                            ) : (
                                <ul className={styles.notesList}>
                                    {cs.map((c) => (
                                        <li key={c._id}>
                                            <p>{c.text}</p>
                                            <span className={styles.dim}>
                                                {c.authorName || "Staff"}
                                                {c.authorRole ? ` (${c.authorRole})` : ""}
                                                {c.createdAt
                                                    ? ` - ${new Date(c.createdAt).toLocaleString("en-NG")}`
                                                    : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderSectionBody = (
        section: SchemaSection,
        instance: Record<string, any>,
        pathPrefix: string,
    ) => (
        <>
            {section.fields.map((f) => {
                if (f.allowMultiple) {
                    const arr: any[] = Array.isArray(instance?.[f.key]) ? instance[f.key] : []
                    if (arr.length === 0) {
                        return renderFieldRow(f, undefined, `${pathPrefix}${f.key}`, section.key)
                    }
                    return (
                        <div key={f.key} className={styles.multiFieldGroup}>
                            {arr.map((v, i) => (
                                <div key={i} className={styles.multiFieldInstance}>
                                    <div className={styles.multiFieldHead}>
                                        {f.addedFieldLabel
                                            ? f.addedFieldLabel.replace("{n}", String(i + 1))
                                            : `${f.label} #${i + 1}`}
                                    </div>
                                    {renderFieldRow(f, v, `${pathPrefix}${f.key}[${i}]`, section.key)}
                                </div>
                            ))}
                        </div>
                    )
                }
                return renderFieldRow(f, instance?.[f.key], `${pathPrefix}${f.key}`, section.key)
            })}
        </>
    )

    return (
        <div className={styles.reviewView}>
            {schema.pages.map((page) => (
                <section key={page.key} className={styles.pageBlock}>
                    <header className={styles.pageHead}>
                        <h3>{page.title}</h3>
                        {page.description && <p>{page.description}</p>}
                    </header>

                    {page.sections
                        .filter((s) => !s.hideOnApproval)
                        .map((section) => {
                            if (section.allowMultiple) {
                                const instances: Array<Record<string, any>> = Array.isArray(
                                    answers?.[section.key],
                                )
                                    ? answers[section.key]
                                    : []
                                return (
                                    <div key={section.key} className={styles.sectionBlock}>
                                        <div className={styles.sectionHead}>
                                            <div className={styles.sectionHeadMain}>
                                                <h4>{section.title}</h4>
                                                {section.description && (
                                                    <p className={styles.sectionDesc}>{section.description}</p>
                                                )}
                                            </div>
                                            <SectionApprovalCheck sectionKey={section.key} />
                                        </div>
                                        {instances.length === 0 ? (
                                            <p className={styles.empty}>No entries.</p>
                                        ) : (
                                            instances.map((inst, idx) => (
                                                <div key={idx} className={styles.sectionInstance}>
                                                    <div className={styles.sectionInstanceHead}>
                                                        {section.addedSectionLabel
                                                            ? section.addedSectionLabel.replace(
                                                                  "{n}",
                                                                  String(idx + 1),
                                                              )
                                                            : `${section.title} #${idx + 1}`}
                                                    </div>
                                                    {renderSectionBody(
                                                        section,
                                                        inst,
                                                        `${section.key}[${idx}].`,
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )
                            }

                            return (
                                <div key={section.key} className={styles.sectionBlock}>
                                    <div className={styles.sectionHead}>
                                        <div className={styles.sectionHeadMain}>
                                            <h4>{section.title}</h4>
                                            {section.description && (
                                                <p className={styles.sectionDesc}>{section.description}</p>
                                            )}
                                        </div>
                                        <SectionApprovalCheck sectionKey={section.key} />
                                    </div>
                                    {renderSectionBody(section, answers, "")}
                                </div>
                            )
                        })}
                </section>
            ))}
        </div>
    )
}

export default ApprovalReviewView
