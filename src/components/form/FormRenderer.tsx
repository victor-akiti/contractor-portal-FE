'use client'

// FormRenderer — renders a FormSchema with editable answers (fill mode) or
// read-only (view mode). Used by the contractor form-fill page, the staff
// submission-review page, and the schema preview in the form-builder.
//
// SPEC.md §5 (FormSchema), §6 (field-type registry), §13.1 (props).
//
// Field-type coverage (MVP):
//   shortText, longText, email, phone, number, date           — input
//   dropdown, radioButtons                                     — single-select
//   checkBoxes, multiSelect                                    — multi-select
//   file, certificate                                          — URL input (simplified; full upload widget deferred)
//   textBlock                                                  — display-only
//
// Not yet wired:
//   visibleIf evaluation, allowMultiple (repeated sections), validation rules,
//   on-blur per-field validation, remark/comment side panels.

import { useCallback } from "react"
import styles from "./FormRenderer.module.css"

type AnswerValue = string | number | boolean | string[] | Array<Record<string, any>>

interface Field {
    key: string
    type: string
    label: string
    helpText?: string
    placeholder?: string
    approvalLabel?: string
    required?: boolean
    options?: Array<{ key: string; label: string }>
    validation?: Record<string, any>
    visibleIf?: any
    meta?: Record<string, any>
}

interface Section {
    key: string
    title: string
    description?: string
    layout?: "single" | "double"
    allowMultiple?: boolean
    fields: Field[]
}

interface Page {
    key: string
    title: string
    description?: string
    sections: Section[]
}

interface FormSchema {
    version: 1
    pages: Page[]
}

interface Props {
    schema: FormSchema
    answers: Record<string, AnswerValue>
    onChange?: (changes: Partial<Record<string, AnswerValue>>) => void
    mode?: "fill" | "view"
    errors?: Record<string, string>
    activeRemarksBySection?: Record<string, Array<{ _id: string; text: string; authorName?: string }>>
}

const FormRenderer = ({
    schema,
    answers,
    onChange,
    mode = "fill",
    errors,
    activeRemarksBySection,
}: Props) => {
    const handleChange = useCallback(
        (fieldKey: string, value: AnswerValue) => {
            if (onChange) onChange({ [fieldKey]: value })
        },
        [onChange]
    )

    if (!schema || !Array.isArray(schema.pages)) {
        return (
            <div className={styles.emptyState}>
                <p>No form schema to render.</p>
            </div>
        )
    }

    const readOnly = mode === "view"

    const renderField = (field: Field) => {
        const value = answers?.[field.key]
        const error = errors?.[field.key]
        const labelEl = (
            <label htmlFor={`field-${field.key}`} className={styles.fieldLabel}>
                {field.label}
                {field.required && <span className={styles.required}>*</span>}
            </label>
        )
        const helpEl = field.helpText ? <p className={styles.fieldHelp}>{field.helpText}</p> : null
        const errorEl = error ? <p className={styles.fieldError}>{error}</p> : null

        switch (field.type) {
            case "shortText":
            case "email":
            case "phone":
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${field.key}`}
                            type={field.type === "email" ? "email" : "text"}
                            placeholder={field.placeholder || ""}
                            value={typeof value === "string" ? value : ""}
                            disabled={readOnly}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "longText":
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <textarea
                            id={`field-${field.key}`}
                            rows={4}
                            placeholder={field.placeholder || ""}
                            value={typeof value === "string" ? value : ""}
                            disabled={readOnly}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "number":
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${field.key}`}
                            type="number"
                            placeholder={field.placeholder || ""}
                            value={value === undefined || value === null ? "" : (value as number)}
                            disabled={readOnly}
                            onChange={(e) =>
                                handleChange(
                                    field.key,
                                    e.target.value === "" ? "" : Number(e.target.value)
                                )
                            }
                        />
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "date":
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${field.key}`}
                            type="date"
                            value={typeof value === "string" ? value : ""}
                            disabled={readOnly}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "dropdown":
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <select
                            id={`field-${field.key}`}
                            value={typeof value === "string" ? value : ""}
                            disabled={readOnly}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        >
                            <option value="">Select…</option>
                            {(field.options || []).map((o) => (
                                <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                        </select>
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "radioButtons":
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.optionsGroup}>
                            {(field.options || []).map((o) => (
                                <label key={o.key} className={styles.optionLabel}>
                                    <input
                                        type="radio"
                                        name={field.key}
                                        value={o.key}
                                        checked={value === o.key}
                                        disabled={readOnly}
                                        onChange={() => handleChange(field.key, o.key)}
                                    />
                                    <span>{o.label}</span>
                                </label>
                            ))}
                        </div>
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "checkBoxes":
            case "multiSelect": {
                const arr: string[] = Array.isArray(value) ? (value as string[]) : []
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.optionsGroup}>
                            {(field.options || []).map((o) => (
                                <label key={o.key} className={styles.optionLabel}>
                                    <input
                                        type="checkbox"
                                        checked={arr.includes(o.key)}
                                        disabled={readOnly}
                                        onChange={(e) => {
                                            const next = e.target.checked
                                                ? [...arr, o.key]
                                                : arr.filter((k) => k !== o.key)
                                            handleChange(field.key, next)
                                        }}
                                    />
                                    <span>{o.label}</span>
                                </label>
                            ))}
                        </div>
                        {helpEl}
                        {errorEl}
                    </div>
                )
            }

            case "file":
            case "certificate":
                // Simplified — full uploader is a follow-up. For now we accept a
                // raw URL so the lifecycle can be tested end-to-end.
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${field.key}`}
                            type="url"
                            placeholder="https://… (paste a link for now; upload widget pending)"
                            value={typeof value === "string" ? value : ""}
                            disabled={readOnly}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        {helpEl}
                        {errorEl}
                    </div>
                )

            case "textBlock":
                return (
                    <div key={field.key} className={styles.textBlock}>
                        <p>{field.label}</p>
                        {field.helpText && <p className={styles.fieldHelp}>{field.helpText}</p>}
                    </div>
                )

            default:
                return (
                    <div key={field.key} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.unsupported}>
                            Field type "{field.type}" is not yet supported in this renderer.
                        </div>
                        {helpEl}
                    </div>
                )
        }
    }

    return (
        <div className={styles.renderer}>
            {schema.pages.map((page) => (
                <section key={page.key} className={styles.page}>
                    <h3 className={styles.pageTitle}>{page.title}</h3>
                    {page.description && <p className={styles.pageDesc}>{page.description}</p>}

                    {page.sections.map((section) => {
                        const remarks = activeRemarksBySection?.[section.key]
                        return (
                            <div key={section.key} className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h4 className={styles.sectionTitle}>{section.title}</h4>
                                    {section.description && (
                                        <p className={styles.sectionDesc}>{section.description}</p>
                                    )}
                                </div>

                                {/* Active remarks bubbled up from staff returns */}
                                {remarks && remarks.length > 0 && (
                                    <div className={styles.remarksPanel}>
                                        <div className={styles.remarksHeader}>
                                            Reviewer notes — please address before resubmitting
                                        </div>
                                        <ul>
                                            {remarks.map((r) => (
                                                <li key={r._id}>
                                                    <span>{r.text}</span>
                                                    {r.authorName && (
                                                        <em className={styles.remarkAuthor}>— {r.authorName}</em>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div
                                    className={
                                        section.layout === "double"
                                            ? styles.sectionFieldsDouble
                                            : styles.sectionFields
                                    }
                                >
                                    {section.fields.map((f) => renderField(f))}
                                </div>
                            </div>
                        )
                    })}
                </section>
            ))}
        </div>
    )
}

export default FormRenderer
