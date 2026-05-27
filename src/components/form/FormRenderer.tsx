'use client'

// FormRenderer — renders a FormSchema, handles every field-type the
// FormBuilder can produce, evaluates conditional visibility, supports
// repeated fields & sections, and exposes a `validateSchema` helper so
// the host page can block submission until the answers satisfy the
// builder's validation rules.
//
// Field-type coverage:
//   shortText, longText, email, phone, number (with isCurrency), date  — input
//   dropdown, radioButtons                                              — single-select
//   checkBoxes, multiSelect                                             — multi-select
//   file, certificate                                                   — upload widget
//   textBlock                                                           — display-only
//
// Modes:
//   fill      — contractor editing
//   view      — read-only display for the contractor / generic view
//   approval  — read-only display for staff approval (honors hideOnApproval)
//
// allowMultiple:
//   - Field-level: answers[fieldKey] is an array of values; UI lets the
//     contractor add / remove instances.
//   - Section-level: answers[sectionKey] is an array of instance objects,
//     each shaped { [fieldKey]: value }. UI lets the contractor add /
//     remove section instances.
//
// hideOnApproval / hideOnView:
//   - Section flags honored only in matching modes ("approval" / "view").
//
// enabled=false:
//   - Field renders as disabled with a small "disabled" hint; value is
//     preserved but cannot be edited.

import { useCallback } from "react"
import FileFieldUploader, { FileFieldValue } from "./FileFieldUploader"
import styles from "./FormRenderer.module.css"

// ── Types ───────────────────────────────────────────────────────────────────
type Primitive = string | number | boolean | null
export type AnswerValue =
    | Primitive
    | Primitive[]
    | FileFieldValue[]
    | Array<Record<string, any>>

interface Validation {
    minLength?: number
    maxLength?: number
    pattern?: string
    patternMessage?: string
    min?: number
    max?: number
}

interface VisibleIf {
    field: string
    op: "eq" | "neq"
    value: string
}

interface Field {
    key: string
    type: string
    label: string
    approvalLabel?: string
    defaultValue?: string
    helpText?: string
    placeholder?: string
    required?: boolean
    enabled?: boolean
    options?: Array<{ key: string; label: string }>
    validation?: Validation
    visibleIf?: VisibleIf | null
    allowMultiple?: boolean
    addFieldText?: string
    addedFieldLabel?: string
    // Currency-specific (only when type === "currency")
    currencyOptions?: string[]
    defaultCurrency?: string
    allowCurrencyChange?: boolean
    maxAllowedFiles?: number
    allowedFormats?: string[]
    allowSelectPreviouslyUploadedFile?: boolean
    hasExpiryDate?: boolean
    text?: string
}

interface Section {
    key: string
    title: string
    description?: string
    layout?: "single" | "double"
    fields: Field[]
    allowMultiple?: boolean
    addSectionText?: string
    addedSectionLabel?: string
    hideOnApproval?: boolean
    hideOnView?: boolean
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

export type FormMode = "fill" | "view" | "approval"

interface Props {
    schema: FormSchema
    answers: Record<string, any>
    onChange?: (changes: Record<string, any>) => void
    mode?: FormMode
    errors?: Record<string, string>
    activeRemarksBySection?: Record<
        string,
        Array<{ _id: string; text: string; authorName?: string }>
    >
    // Hash used by the FileFieldUploader to talk to the V2 upload endpoint.
    uploadAuthHash?: string
    // Previously-uploaded files (per field key) for the "re-use" picker.
    previousFilesByField?: Record<string, FileFieldValue[]>
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const VISIBILITY_FALLBACK = true

const fieldLabelForMode = (field: Field, mode: FormMode): string =>
    mode === "approval" && field.approvalLabel ? field.approvalLabel : field.label

// Evaluate visibleIf against a flat answer scope. `scope` is the relevant
// view of answers — for a top-level field that's the full answers map; for a
// field inside a section instance that's the instance's own object.
const isFieldVisible = (field: Field, scope: Record<string, any>): boolean => {
    if (!field.visibleIf) return VISIBILITY_FALLBACK
    const { field: depKey, op, value } = field.visibleIf
    if (!depKey) return VISIBILITY_FALLBACK
    const depVal = scope?.[depKey]
    const depStr =
        depVal === undefined || depVal === null
            ? ""
            : Array.isArray(depVal)
              ? depVal.map(String).join(",")
              : String(depVal)
    if (op === "eq") return depStr === String(value)
    if (op === "neq") return depStr !== String(value)
    return VISIBILITY_FALLBACK
}

const isSectionVisible = (section: Section, mode: FormMode): boolean => {
    if (mode === "approval" && section.hideOnApproval) return false
    if (mode === "view" && section.hideOnView) return false
    return true
}

const formatNumberGrouped = (n: number | string): string => {
    if (n === "" || n === null || n === undefined) return ""
    const num = typeof n === "number" ? n : Number(String(n).replace(/,/g, ""))
    if (Number.isNaN(num)) return String(n)
    return num.toLocaleString("en-NG", { maximumFractionDigits: 2 })
}

// Format an amount with the ISO currency code. Falls back to "<code> <amount>"
// when the code isn't supported by Intl on the host runtime.
const formatCurrencyValue = (amount: number | string, currency?: string): string => {
    if (amount === "" || amount === null || amount === undefined) return ""
    const num = typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, ""))
    if (Number.isNaN(num)) return String(amount)
    if (!currency) return formatNumberGrouped(num)
    try {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(num)
    } catch {
        return `${currency} ${formatNumberGrouped(num)}`
    }
}

// ── Validation ──────────────────────────────────────────────────────────────
// validateSchema walks every visible enabled non-hidden field and applies
// the per-field validation rules. Returns a flat { [errorKey]: message } map.
// Errors for repeated fields/sections are keyed with bracket paths so the
// caller can show them next to the right instance (we surface only the
// first instance error per field for inline display).
export function validateSchema(
    schema: FormSchema,
    answers: Record<string, any>,
    mode: FormMode = "fill",
): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!schema?.pages) return errors

    const validateField = (field: Field, value: any, scope: Record<string, any>, errKey: string) => {
        if (field.enabled === false) return
        if (!isFieldVisible(field, scope)) return
        if (field.type === "textBlock") return

        const required = !!field.required
        const v = value

        // Required check
        if (required) {
            const empty =
                v === undefined ||
                v === null ||
                v === "" ||
                (Array.isArray(v) && v.length === 0)
            if (empty) {
                errors[errKey] = `${field.label} is required`
                return
            }
        }

        // Skip further checks when empty + not required
        const isEmpty =
            v === undefined ||
            v === null ||
            v === "" ||
            (Array.isArray(v) && v.length === 0)
        if (isEmpty) return

        // Per-type validation
        if (
            ["shortText", "longText", "email", "phone"].includes(field.type) &&
            field.validation
        ) {
            const s = String(v)
            const { minLength, maxLength, pattern, patternMessage } = field.validation
            if (minLength != null && s.length < minLength) {
                errors[errKey] = `${field.label} must be at least ${minLength} characters`
                return
            }
            if (maxLength != null && s.length > maxLength) {
                errors[errKey] = `${field.label} must be at most ${maxLength} characters`
                return
            }
            if (pattern) {
                try {
                    const re = new RegExp(pattern)
                    if (!re.test(s)) {
                        errors[errKey] = patternMessage || `${field.label} is not in the expected format`
                        return
                    }
                } catch {
                    /* invalid regex — let it pass; the builder should warn */
                }
            }
        }

        if (field.type === "email") {
            const s = String(v).trim()
            if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
                errors[errKey] = `${field.label} must be a valid email address`
                return
            }
        }

        if (field.type === "number" && field.validation) {
            const num = typeof v === "number" ? v : Number(v)
            if (Number.isNaN(num)) {
                errors[errKey] = `${field.label} must be a number`
                return
            }
            const { min, max } = field.validation
            if (min != null && num < min) {
                errors[errKey] = `${field.label} must be at least ${min}`
                return
            }
            if (max != null && num > max) {
                errors[errKey] = `${field.label} must be at most ${max}`
                return
            }
        }

        if (field.type === "currency") {
            const obj = (v && typeof v === "object" && !Array.isArray(v)) ? v : null
            const amount = obj?.amount
            const currency = obj?.currency
            if (amount === undefined || amount === null || amount === "") {
                if (required) errors[errKey] = `${field.label} amount is required`
                return
            }
            const num = typeof amount === "number" ? amount : Number(amount)
            if (Number.isNaN(num)) {
                errors[errKey] = `${field.label} amount must be a number`
                return
            }
            if (!currency) {
                errors[errKey] = `${field.label} currency is required`
                return
            }
            const { min, max } = field.validation || {}
            if (min != null && num < min) {
                errors[errKey] = `${field.label} must be at least ${min}`
                return
            }
            if (max != null && num > max) {
                errors[errKey] = `${field.label} must be at most ${max}`
                return
            }
        }

        // Certificate / file: must have at least 1 file when required + expiry
        // dates when hasExpiryDate.
        if (field.type === "certificate" && Array.isArray(v) && v.length > 0) {
            for (const f of v as FileFieldValue[]) {
                if (!f.url) {
                    errors[errKey] = `${field.label}: each upload needs a file`
                    return
                }
                if (field.hasExpiryDate && !f.expiryDate) {
                    errors[errKey] = `${field.label}: each certificate needs an expiry date`
                    return
                }
            }
        }
    }

    for (const page of schema.pages) {
        for (const section of page.sections) {
            if (!isSectionVisible(section, mode)) continue

            if (section.allowMultiple) {
                const instances: Array<Record<string, any>> = Array.isArray(answers?.[section.key])
                    ? answers[section.key]
                    : []
                instances.forEach((instance, idx) => {
                    for (const field of section.fields) {
                        if (field.allowMultiple) {
                            const arr: any[] = Array.isArray(instance?.[field.key])
                                ? instance[field.key]
                                : []
                            arr.forEach((val, i) => {
                                validateField(
                                    field, val, instance,
                                    `${section.key}[${idx}].${field.key}[${i}]`,
                                )
                            })
                            // If field is required and array is empty:
                            if (field.required && arr.length === 0) {
                                errors[`${section.key}[${idx}].${field.key}`] =
                                    `${field.label} is required`
                            }
                        } else {
                            validateField(
                                field, instance?.[field.key], instance,
                                `${section.key}[${idx}].${field.key}`,
                            )
                        }
                    }
                })
            } else {
                for (const field of section.fields) {
                    if (field.allowMultiple) {
                        const arr: any[] = Array.isArray(answers?.[field.key]) ? answers[field.key] : []
                        arr.forEach((val, i) => {
                            validateField(field, val, answers, `${field.key}[${i}]`)
                        })
                        if (field.required && arr.length === 0) {
                            errors[field.key] = `${field.label} is required`
                        }
                    } else {
                        validateField(field, answers?.[field.key], answers, field.key)
                    }
                }
            }
        }
    }

    return errors
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════
const FormRenderer = ({
    schema,
    answers,
    onChange,
    mode = "fill",
    errors,
    activeRemarksBySection,
    uploadAuthHash,
    previousFilesByField,
}: Props) => {
    const readOnly = mode !== "fill"

    const setAnswer = useCallback(
        (key: string, value: any) => { if (onChange) onChange({ [key]: value }) },
        [onChange],
    )

    if (!schema || !Array.isArray(schema.pages)) {
        return (
            <div className={styles.emptyState}>
                <p>No form schema to render.</p>
            </div>
        )
    }

    // ── Single-field renderer (works for both top-level and instance scope) ──
    const renderField = (
        field: Field,
        value: any,
        onValueChange: (v: any) => void,
        errKey: string,
        scope: Record<string, any>,
    ) => {
        if (field.enabled === false && mode === "fill") {
            // Disabled in fill mode: still show as disabled so the user knows
            // it exists but can't be touched.
        }
        if (!isFieldVisible(field, scope)) return null

        const label = fieldLabelForMode(field, mode)
        const disabled = readOnly || field.enabled === false
        const fieldErr = errors?.[errKey]

        const labelEl = (
            <label htmlFor={`field-${errKey}`} className={styles.fieldLabel}>
                {label}
                {field.required && <span className={styles.required}>*</span>}
                {field.enabled === false && <span className={styles.disabledTag}>disabled</span>}
            </label>
        )
        const helpEl = field.helpText ? <p className={styles.fieldHelp}>{field.helpText}</p> : null
        const errEl = fieldErr ? <p className={styles.fieldError}>{fieldErr}</p> : null

        // Apply defaultValue when value is undefined (only matters in fill mode).
        const effectiveValue =
            value === undefined && field.defaultValue !== undefined && mode === "fill"
                ? field.defaultValue
                : value

        switch (field.type) {
            case "shortText":
            case "email":
            case "phone":
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${errKey}`}
                            type={field.type === "email" ? "email" : "text"}
                            placeholder={field.placeholder || ""}
                            value={typeof effectiveValue === "string" ? effectiveValue : ""}
                            disabled={disabled}
                            onChange={(e) => onValueChange(e.target.value)}
                        />
                        {helpEl}
                        {errEl}
                    </div>
                )

            case "longText":
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <textarea
                            id={`field-${errKey}`}
                            rows={4}
                            placeholder={field.placeholder || ""}
                            value={typeof effectiveValue === "string" ? effectiveValue : ""}
                            disabled={disabled}
                            onChange={(e) => onValueChange(e.target.value)}
                        />
                        {helpEl}
                        {errEl}
                    </div>
                )

            case "number":
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${errKey}`}
                            type="number"
                            placeholder={field.placeholder || ""}
                            value={
                                effectiveValue === undefined || effectiveValue === null
                                    ? ""
                                    : (effectiveValue as number)
                            }
                            disabled={disabled}
                            onChange={(e) =>
                                onValueChange(e.target.value === "" ? "" : Number(e.target.value))
                            }
                        />
                        {helpEl}
                        {errEl}
                    </div>
                )

            case "currency": {
                const obj = (effectiveValue && typeof effectiveValue === "object" && !Array.isArray(effectiveValue))
                    ? (effectiveValue as { amount?: any; currency?: string })
                    : null
                const currencyChoices =
                    field.currencyOptions && field.currencyOptions.length > 0
                        ? field.currencyOptions
                        : ["NGN"]
                const currentCurrency =
                    obj?.currency || field.defaultCurrency || currencyChoices[0]
                const currentAmount =
                    obj?.amount === undefined || obj?.amount === null ? "" : obj.amount

                if (readOnly) {
                    return (
                        <div key={errKey} className={styles.fieldRow}>
                            {labelEl}
                            <div className={styles.readonlyValue}>
                                {currentAmount === "" ? (
                                    <span className={styles.placeholderText}>—</span>
                                ) : (
                                    formatCurrencyValue(currentAmount, currentCurrency)
                                )}
                            </div>
                            {helpEl}
                        </div>
                    )
                }

                const emit = (next: { amount?: any; currency?: string }) => {
                    onValueChange({
                        amount: next.amount !== undefined ? next.amount : currentAmount,
                        currency: next.currency !== undefined ? next.currency : currentCurrency,
                    })
                }

                const canChangeCurrency =
                    field.allowCurrencyChange !== false && currencyChoices.length > 1
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.currencyInputRow}>
                            <select
                                aria-label="currency"
                                className={styles.currencySelect}
                                value={currentCurrency}
                                disabled={disabled || !canChangeCurrency}
                                onChange={(e) => emit({ currency: e.target.value })}
                            >
                                {currencyChoices.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <input
                                id={`field-${errKey}`}
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder={field.placeholder || "0.00"}
                                value={currentAmount === "" ? "" : (currentAmount as number)}
                                disabled={disabled}
                                onChange={(e) =>
                                    emit({ amount: e.target.value === "" ? "" : Number(e.target.value) })
                                }
                                className={styles.currencyAmount}
                            />
                        </div>
                        {currentAmount !== "" && (
                            <p className={styles.fieldHelp}>
                                Displays as {formatCurrencyValue(currentAmount, currentCurrency)}
                            </p>
                        )}
                        {helpEl}
                        {errEl}
                    </div>
                )
            }

            case "date":
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <input
                            id={`field-${errKey}`}
                            type="date"
                            value={typeof effectiveValue === "string" ? effectiveValue : ""}
                            disabled={disabled}
                            onChange={(e) => onValueChange(e.target.value)}
                        />
                        {helpEl}
                        {errEl}
                    </div>
                )

            case "dropdown":
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <select
                            id={`field-${errKey}`}
                            value={typeof effectiveValue === "string" ? effectiveValue : ""}
                            disabled={disabled}
                            onChange={(e) => onValueChange(e.target.value)}
                        >
                            <option value="">Select…</option>
                            {(field.options || []).map((o) => (
                                <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                        </select>
                        {helpEl}
                        {errEl}
                    </div>
                )

            case "radioButtons":
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.optionsGroup}>
                            {(field.options || []).map((o) => (
                                <label key={o.key} className={styles.optionLabel}>
                                    <input
                                        type="radio"
                                        name={errKey}
                                        value={o.key}
                                        checked={effectiveValue === o.key}
                                        disabled={disabled}
                                        onChange={() => onValueChange(o.key)}
                                    />
                                    <span>{o.label}</span>
                                </label>
                            ))}
                        </div>
                        {helpEl}
                        {errEl}
                    </div>
                )

            case "checkBoxes":
            case "multiSelect": {
                const arr: string[] = Array.isArray(effectiveValue) ? (effectiveValue as string[]) : []
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.optionsGroup}>
                            {(field.options || []).map((o) => (
                                <label key={o.key} className={styles.optionLabel}>
                                    <input
                                        type="checkbox"
                                        checked={arr.includes(o.key)}
                                        disabled={disabled}
                                        onChange={(e) => {
                                            const next = e.target.checked
                                                ? [...arr, o.key]
                                                : arr.filter((k) => k !== o.key)
                                            onValueChange(next)
                                        }}
                                    />
                                    <span>{o.label}</span>
                                </label>
                            ))}
                        </div>
                        {helpEl}
                        {errEl}
                    </div>
                )
            }

            case "file":
            case "certificate": {
                const files: FileFieldValue[] = Array.isArray(effectiveValue)
                    ? (effectiveValue as FileFieldValue[])
                    : []
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <FileFieldUploader
                            value={files}
                            onChange={onValueChange}
                            isCertificate={field.type === "certificate"}
                            hasExpiryDate={!!field.hasExpiryDate}
                            maxAllowedFiles={field.maxAllowedFiles || 1}
                            allowedFormats={field.allowedFormats || []}
                            allowSelectPreviouslyUploadedFile={!!field.allowSelectPreviouslyUploadedFile}
                            previousUploads={previousFilesByField?.[field.key] || []}
                            uploadAuthHash={uploadAuthHash}
                            disabled={disabled}
                            fieldKey={field.key}
                        />
                        {helpEl}
                        {errEl}
                    </div>
                )
            }

            case "textBlock":
                return (
                    <div key={errKey} className={styles.textBlock}>
                        {field.label && <p className={styles.textBlockTitle}>{field.label}</p>}
                        {field.text && (
                            <div
                                className={styles.textBlockBody}
                                /* The content comes from the form-builder, authored by
                                   trusted staff (HOD/Admin). We render basic HTML; sanitising
                                   library can be added later if untrusted authors are introduced. */
                                dangerouslySetInnerHTML={{ __html: field.text }}
                            />
                        )}
                        {field.helpText && <p className={styles.fieldHelp}>{field.helpText}</p>}
                    </div>
                )

            default:
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        <div className={styles.unsupported}>
                            Field type "{field.type}" is not yet supported in this renderer.
                        </div>
                        {helpEl}
                    </div>
                )
        }
    }

    // ── Renders a single non-repeating section's fields ──────────────────────
    const renderSectionFields = (
        section: Section,
        instanceData: Record<string, any>,
        onInstanceChange: (patch: Record<string, any>) => void,
        errKeyPrefix: string,
    ) => (
        <div
            className={
                section.layout === "double" ? styles.sectionFieldsDouble : styles.sectionFields
            }
        >
            {section.fields.map((field) => {
                const key = field.key
                if (field.allowMultiple) {
                    const arr: any[] = Array.isArray(instanceData?.[key]) ? instanceData[key] : []
                    return (
                        <MultiInstanceField
                            key={key}
                            field={field}
                            values={arr}
                            disabled={readOnly}
                            errKeyPrefix={`${errKeyPrefix}${field.key}`}
                            onChange={(next) => onInstanceChange({ [key]: next })}
                            renderOne={(val, i, onOne, oneErrKey) =>
                                renderField(field, val, onOne, oneErrKey, instanceData)
                            }
                        />
                    )
                }
                return renderField(
                    field,
                    instanceData?.[key],
                    (v) => onInstanceChange({ [key]: v }),
                    `${errKeyPrefix}${field.key}`,
                    instanceData,
                )
            })}
        </div>
    )

    // ── Renders a section, handling allowMultiple at section-level ───────────
    const renderSection = (section: Section, page: Page) => {
        if (!isSectionVisible(section, mode)) return null
        const remarks = activeRemarksBySection?.[section.key]

        if (section.allowMultiple) {
            const instances: Array<Record<string, any>> = Array.isArray(answers?.[section.key])
                ? answers[section.key]
                : []
            // If there are no instances yet in fill mode, seed one empty.
            const effective = instances.length === 0 && mode === "fill" ? [{}] : instances

            const updateInstances = (next: Array<Record<string, any>>) => {
                setAnswer(section.key, next)
            }

            return (
                <div key={section.key} className={styles.section}>
                    <SectionHeader section={section} remarks={remarks} />

                    {effective.map((inst, idx) => (
                        <div key={idx} className={styles.sectionInstance}>
                            <div className={styles.sectionInstanceHeader}>
                                <span className={styles.instanceLabel}>
                                    {section.addedSectionLabel
                                        ? section.addedSectionLabel.replace("{n}", String(idx + 1))
                                        : `${section.title} #${idx + 1}`}
                                </span>
                                {!readOnly && effective.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.removeInstanceBtn}
                                        onClick={() => {
                                            const next = effective.filter((_, i) => i !== idx)
                                            updateInstances(next)
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {renderSectionFields(
                                section,
                                inst,
                                (patch) => {
                                    const next = [...effective]
                                    next[idx] = { ...next[idx], ...patch }
                                    updateInstances(next)
                                },
                                `${section.key}[${idx}].`,
                            )}
                        </div>
                    ))}

                    {!readOnly && (
                        <button
                            type="button"
                            className={styles.addInstanceBtn}
                            onClick={() => updateInstances([...effective, {}])}
                        >
                            {section.addSectionText || `+ Add another ${section.title.toLowerCase()}`}
                        </button>
                    )}
                </div>
            )
        }

        return (
            <div key={section.key} className={styles.section}>
                <SectionHeader section={section} remarks={remarks} />
                {renderSectionFields(section, answers, (patch) => onChange?.(patch), "")}
            </div>
        )
    }

    return (
        <div className={styles.renderer}>
            {schema.pages.map((page) => (
                <section key={page.key} className={styles.page}>
                    <h3 className={styles.pageTitle}>{page.title}</h3>
                    {page.description && <p className={styles.pageDesc}>{page.description}</p>}
                    {page.sections.map((section) => renderSection(section, page))}
                </section>
            ))}
        </div>
    )
}

// ── Small subcomponents ─────────────────────────────────────────────────────
const SectionHeader = ({
    section, remarks,
}: {
    section: Section
    remarks?: Array<{ _id: string; text: string; authorName?: string }>
}) => (
    <>
        <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>{section.title}</h4>
            {section.description && <p className={styles.sectionDesc}>{section.description}</p>}
        </div>
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
    </>
)

// MultiInstanceField — renders an allowMultiple field, with add/remove
// controls. Each instance is rendered via the renderOne callback.
const MultiInstanceField = ({
    field, values, disabled, errKeyPrefix, onChange, renderOne,
}: {
    field: Field
    values: any[]
    disabled: boolean
    errKeyPrefix: string
    onChange: (next: any[]) => void
    renderOne: (
        val: any,
        i: number,
        onOne: (v: any) => void,
        errKey: string,
    ) => React.ReactNode
}) => {
    const effective = values.length === 0 && !disabled ? [undefined] : values
    return (
        <div className={styles.multiFieldWrap}>
            <div className={styles.multiFieldHeader}>
                <strong>{field.label}</strong>
                {field.required && <span className={styles.required}>*</span>}
            </div>
            {effective.map((val, i) => (
                <div key={i} className={styles.multiFieldInstance}>
                    <div className={styles.multiFieldInstanceLabel}>
                        {field.addedFieldLabel
                            ? field.addedFieldLabel.replace("{n}", String(i + 1))
                            : `#${i + 1}`}
                        {!disabled && effective.length > 1 && (
                            <button
                                type="button"
                                className={styles.removeInstanceBtn}
                                onClick={() => onChange(effective.filter((_, j) => j !== i))}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    {renderOne(
                        val,
                        i,
                        (v: any) => {
                            const next = [...effective]
                            next[i] = v
                            onChange(next)
                        },
                        `${errKeyPrefix}[${i}]`,
                    )}
                </div>
            ))}
            {!disabled && (
                <button
                    type="button"
                    className={styles.addInstanceBtn}
                    onClick={() => onChange([...effective, undefined])}
                >
                    {field.addFieldText || `+ Add another`}
                </button>
            )}
        </div>
    )
}

export default FormRenderer
