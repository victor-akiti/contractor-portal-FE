'use client'

// FormRenderer - renders a FormSchema, handles every field-type the
// FormBuilder can produce, evaluates conditional visibility, supports
// repeated fields & sections, and exposes a `validateSchema` helper so
// the host page can block submission until the answers satisfy the
// builder's validation rules.
//
// Field-type coverage:
//   shortText, longText, email, phone, number (with isCurrency), date  - input
//   dropdown, radioButtons                                              - single-select
//   checkBoxes, multiSelect                                             - multi-select
//   file, certificate                                                   - upload widget
//   textBlock                                                           - display-only
//
// Modes:
//   fill      - contractor editing
//   view      - read-only display for the contractor / generic view
//   approval  - read-only display for staff approval (honors hideOnApproval)
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

import React, { useCallback, useState } from "react"
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
    eba?: boolean
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
    currencyDisplay?: "dropdown" | "radio"
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

// Edit-row shape passed in by the host page (matches FieldEditV2 schema).
export interface FieldEditRow {
    _id: string
    fieldKey: string
    fieldPath: string
    sectionKey?: string
    previousValue: any
    newValue: any
    editedBy?: { name?: string; role?: string }
    editedAtStage: string
    editedAtLevel: number
    cycleNumber: number
    status: "active" | "accepted" | "flagged" | "reverted"
    flaggedReason?: string
    flaggedBy?: { name?: string; role?: string }
    flaggedAtStage?: string
    createdAt?: string
}

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
    // Field-level remarks, keyed by `${sectionKey}::${fieldKey}`. Shown
    // as a per-field indicator beside the label when the contractor
    // opens a returned application. Switches to an "Addressed" state
    // once the contractor edits that specific field.
    activeRemarksByField?: Record<
        string,
        Array<{ _id: string; text: string; authorName?: string }>
    >
    // Hash used by the FileFieldUploader to talk to the V2 upload endpoint.
    uploadAuthHash?: string
    // Previously-uploaded files (per field key) for the "re-use" picker.
    previousFilesByField?: Record<string, FileFieldValue[]>

    // ─── EBA (Editable by Amni) wiring ─────────────────────────────────
    // When true, EBA-enabled fields show an "Edit" pencil button next to
    // them. Host page should set this when current viewer can edit (e.g.
    // VRM at Stage B / E).
    ebaEditableNow?: boolean
    // When true, edited fields show Flag / Accept controls. Set when
    // current viewer is the downstream reviewer (Supervisor at C, HOD at F).
    editReviewerNow?: boolean
    // Active + flagged edits by fieldPath ("rcNumber" or "directors[2].directorShares").
    fieldEditsByPath?: Record<string, FieldEditRow>
    // Edit triggers - host owns the modals.
    onEditField?: (args: {
        field: Field
        fieldPath: string
        sectionKey: string
        currentValue: any
    }) => void
    onFlagEdit?: (edit: FieldEditRow) => void
    onAcceptEdit?: (edit: FieldEditRow) => void

    // When provided, only this page is rendered - used by host pages that
    // implement a tabbed-by-page layout (contractor application). Leave
    // undefined to render every page sequentially (default).
    activePageKey?: string

    // ─── Field disable/hide for flagged-only editing ────────────────────
    // Optional callback to determine if a field should be disabled.
    // Called with sectionKey and fieldKey. Return true to disable the field.
    isFieldDisabled?: (sectionKey: string, fieldKey: string) => boolean
    // Optional callback to determine if a field should be hidden.
    // Called with sectionKey and fieldKey. Return true to hide the field.
    isFieldHidden?: (sectionKey: string, fieldKey: string) => boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const VISIBILITY_FALLBACK = true

const fieldLabelForMode = (field: Field, mode: FormMode): string =>
    mode === "approval" && field.approvalLabel ? field.approvalLabel : field.label

// Evaluate visibleIf against a flat answer scope. `scope` is the relevant
// view of answers - for a top-level field that's the full answers map; for a
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
                    /* invalid regex - let it pass; the builder should warn */
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
    activeRemarksByField,
    uploadAuthHash,
    previousFilesByField,
    ebaEditableNow,
    editReviewerNow,
    fieldEditsByPath,
    onEditField,
    onFlagEdit,
    onAcceptEdit,
    activePageKey,
    isFieldDisabled,
    isFieldHidden,
}: Props) => {
    const readOnly = mode !== "fill"

    // Local set of field paths the contractor has touched since the
    // form loaded. Powers the "Addressed" state on the returned-remark
    // indicator (per-field) and the section-wide indicator. We don't
    // persist this to the BE - the actual remark status flip from
    // "active" to "addressed" happens on resubmit. This is purely a UI
    // cue so the contractor sees their progress as they work through
    // the reviewer's notes.
    const [editedPaths, setEditedPaths] = useState<Set<string>>(new Set())
    const [editedSections, setEditedSections] = useState<Set<string>>(new Set())

    const markEdited = useCallback(
        (sectionKey: string, fieldPath: string) => {
            setEditedPaths((prev) =>
                prev.has(fieldPath) ? prev : new Set(prev).add(fieldPath),
            )
            setEditedSections((prev) =>
                prev.has(sectionKey) ? prev : new Set(prev).add(sectionKey),
            )
        },
        [],
    )

    const setAnswer = useCallback(
        (key: string, value: any) => { if (onChange) onChange({ [key]: value }) },
        [onChange],
    )

    // Check if a field should be hidden (applies before any rendering)
    const shouldHideField = useCallback((sectionKey: string, fieldKey: string): boolean => {
        return isFieldHidden ? isFieldHidden(sectionKey, fieldKey) : false
    }, [isFieldHidden])

    // Check if a field should be disabled
    const shouldDisableField = useCallback((sectionKey: string, fieldKey: string): boolean => {
        // First check if the host page wants to disable this field
        if (isFieldDisabled && isFieldDisabled(sectionKey, fieldKey)) return true
        // Also respect the field's own enabled flag
        return false // The field's own enabled flag is handled in renderField
    }, [isFieldDisabled])

    // Early return after all hooks have been called
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
        rawOnValueChange: (v: any) => void,
        errKey: string,
        scope: Record<string, any>,
        sectionKey?: string,
    ) => {
        // Check if this field should be hidden
        if (sectionKey && shouldHideField(sectionKey, field.key)) return null

        if (field.enabled === false && mode === "fill") {
            // Disabled in fill mode: still show as disabled so the user knows
            // it exists but can't be touched.
        }
        if (!isFieldVisible(field, scope)) return null

        const label = fieldLabelForMode(field, mode)

        // Determine if field should be disabled (either by callback or field.enabled)
        const disabledByCallback = sectionKey && shouldDisableField(sectionKey, field.key)
        const disabled = readOnly || field.enabled === false || disabledByCallback

        const fieldErr = errors?.[errKey]

        // Wrap the upstream change handler so we can mark this path
        // edited for the remark-indicator (and trip the section-wide
        // "addressed" state). Aliased to onValueChange so the rest of
        // the renderField body keeps reading naturally; every input's
        // onChange flows through tracking automatically.
        const onValueChange = (v: any) => {
            if (sectionKey) markEdited(sectionKey, errKey)
            rawOnValueChange(v)
        }

        // Field-level remark indicator. Lights up red until the
        // contractor edits this field, then flips to a green
        // "Addressed" chip so they know the reviewer's note is being
        // dealt with. The actual BE state change happens on resubmit.
        const fieldRemarks =
            sectionKey && activeRemarksByField
                ? activeRemarksByField[`${sectionKey}::${field.key}`]
                : undefined
        const remarkAddressed = editedPaths.has(errKey)
        const remarkIndicator =
            fieldRemarks && fieldRemarks.length > 0 ? (
                <div
                    className={
                        remarkAddressed
                            ? styles.fieldRemarkBoxAddressed
                            : styles.fieldRemarkBoxActive
                    }
                >
                    <div className={styles.fieldRemarkHead}>
                        <span className={styles.fieldRemarkPill}>
                            {remarkAddressed
                                ? "✓ Addressed - will be saved on resubmit"
                                : "Reviewer note - please address"}
                        </span>
                    </div>
                    <ul className={styles.fieldRemarkList}>
                        {fieldRemarks.map((r) => (
                            <li key={r._id}>
                                {r.text}
                                {r.authorName && (
                                    <em className={styles.remarkAuthor}> - {r.authorName}</em>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null

        const labelEl = (
            <>
                <label htmlFor={`field-${errKey}`} className={styles.fieldLabel}>
                    {label}
                    {field.required && <span className={styles.required}>*</span>}
                    {fieldRemarks && fieldRemarks.length > 0 && (
                        <span
                            className={
                                remarkAddressed
                                    ? styles.fieldRemarkChipAddressed
                                    : styles.fieldRemarkChipActive
                            }
                            title={
                                remarkAddressed
                                    ? "Edit detected. The reviewer's note will be marked addressed when you resubmit."
                                    : "The reviewer left a note on this field. Edit the value to clear the indicator."
                            }
                        >
                            {remarkAddressed ? "✓ Addressed" : "Reviewer note"}
                        </span>
                    )}
                    {field.enabled === false && <span className={styles.disabledTag}>disabled</span>}
                    {disabledByCallback && !field.enabled === false && <span className={styles.disabledTag}>disabled</span>}
                </label>
                {remarkIndicator}
            </>
        )
        // Field help text is contractor-facing guidance — hide it on every
        // staff view (approval mode, read-only browse, edit-audit, etc.) so
        // the form reads as a clean record of what the contractor entered
        // rather than a how-to. Staff fall back to the section/page intros
        // for context.
        const helpEl = field.helpText && !readOnly ? <p className={styles.fieldHelp}>{field.helpText}</p> : null
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

                if (readOnly || disabledByCallback) {
                    return (
                        <div key={errKey} className={styles.fieldRow}>
                            {labelEl}
                            <div className={styles.readonlyValue}>
                                {currentAmount === "" ? (
                                    <span className={styles.placeholderText}>-</span>
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
                    (field as any).allowCurrencyChange !== false && currencyChoices.length > 1
                const display: "dropdown" | "radio" =
                    (field as any).currencyDisplay === "radio" ? "radio" : "dropdown"
                return (
                    <div key={errKey} className={styles.fieldRow}>
                        {labelEl}
                        {display === "radio" && canChangeCurrency && (
                            <div className={styles.currencyRadioRow}>
                                {currencyChoices.map((c) => (
                                    <label key={c} className={styles.currencyRadioOption}>
                                        <input
                                            type="radio"
                                            name={`currency-${errKey}`}
                                            value={c}
                                            checked={currentCurrency === c}
                                            disabled={disabled}
                                            onChange={() => emit({ currency: c })}
                                        />
                                        <span>{c}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className={styles.currencyInputRow}>
                            {(display === "dropdown" || !canChangeCurrency) && (
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
                            )}
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

            case "multiSelectFreeText": {
                // Free-text multi: contractor types, presses Enter (or blurs
                // with content) to push the token into the array. Each token
                // renders as a removable chip. Mirrors the legacy
                // multiSelectText widget.
                const arr: string[] = Array.isArray(effectiveValue) ? (effectiveValue as string[]) : []
                return (
                    <FreeTextMultiSelect
                        key={errKey}
                        id={`field-${errKey}`}
                        label={labelEl}
                        helpEl={helpEl}
                        errEl={errEl}
                        values={arr}
                        placeholder={field.placeholder || "Type a value and press Enter"}
                        disabled={disabled}
                        onChange={onValueChange}
                    />
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
                        {field.helpText && !readOnly && <p className={styles.fieldHelp}>{field.helpText}</p>}
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
                // Check if this field should be hidden before rendering anything
                if (shouldHideField(section.key, field.key)) return null

                if (field.allowMultiple) {
                    const arr: any[] = Array.isArray(instanceData?.[key]) ? instanceData[key] : []
                    return (
                        <MultiInstanceField
                            key={key}
                            field={field}
                            values={arr}
                            disabled={readOnly || shouldDisableField(section.key, field.key)}
                            errKeyPrefix={`${errKeyPrefix}${field.key}`}
                            onChange={(next) => onInstanceChange({ [key]: next })}
                            renderOne={(val, i, onOne, oneErrKey) =>
                                renderField(field, val, onOne, oneErrKey, instanceData, section.key)
                            }
                        />
                    )
                }
                // fieldPath matches the backend resolveFieldPath syntax:
                // "rcNumber" or "directors[2].directorShares".
                const fieldPath = `${errKeyPrefix}${field.key}`
                const fieldNode = renderField(
                    field,
                    instanceData?.[key],
                    (v) => onInstanceChange({ [key]: v }),
                    fieldPath,
                    instanceData,
                    section.key,
                )
                return (
                    <EbaWrap
                        key={key}
                        field={field}
                        fieldPath={fieldPath}
                        sectionKey={section.key}
                        currentValue={instanceData?.[key]}
                        edit={fieldEditsByPath?.[fieldPath]}
                        ebaEditableNow={!!ebaEditableNow}
                        editReviewerNow={!!editReviewerNow}
                        onEditField={onEditField}
                        onFlagEdit={onFlagEdit}
                        onAcceptEdit={onAcceptEdit}
                    >
                        {fieldNode}
                    </EbaWrap>
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
                    <SectionHeader
                        section={section}
                        remarks={remarks}
                        addressed={editedSections.has(section.key)}
                    />

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

        // Check if this section has any visible fields (non-hidden)
        const hasVisibleFields = section.fields.some(field => !shouldHideField(section.key, field.key))
        if (!hasVisibleFields) return null

        return (
            <div key={section.key} className={styles.section}>
                <SectionHeader
                    section={section}
                    remarks={remarks}
                    addressed={editedSections.has(section.key)}
                />
                {renderSectionFields(section, answers, (patch) => onChange?.(patch), "")}
            </div>
        )
    }

    return (
        <div className={styles.renderer}>
            {schema.pages
                .filter((page) => !activePageKey || page.key === activePageKey)
                .map((page) => (
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
    section, remarks, addressed,
}: {
    section: Section
    remarks?: Array<{ _id: string; text: string; authorName?: string }>
    addressed?: boolean
}) => (
    <>
        <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
                {section.title}
                {remarks && remarks.length > 0 && (
                    <span
                        className={
                            addressed
                                ? styles.sectionRemarkChipAddressed
                                : styles.sectionRemarkChipActive
                        }
                        title={
                            addressed
                                ? "You've edited at least one field in this section. The reviewer's note will be marked addressed on resubmit."
                                : "The reviewer left a note on this section. Edit any field to clear the indicator."
                        }
                    >
                        {addressed ? "✓ Addressed" : "Reviewer note"}
                    </span>
                )}
            </h4>
            {section.description && <p className={styles.sectionDesc}>{section.description}</p>}
        </div>
        {remarks && remarks.length > 0 && (
            <div
                className={
                    addressed ? styles.remarksPanelAddressed : styles.remarksPanel
                }
            >
                <div className={styles.remarksHeader}>
                    {addressed
                        ? "Reviewer notes - addressed (will be saved on resubmit)"
                        : "Reviewer notes - please address before resubmitting"}
                </div>
                <ul>
                    {remarks.map((r) => (
                        <li key={r._id}>
                            <span>{r.text}</span>
                            {r.authorName && (
                                <em className={styles.remarkAuthor}> - {r.authorName}</em>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </>
)

// MultiInstanceField - renders an allowMultiple field, with add/remove
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

// EbaWrap - decorates a rendered field with EBA edit affordances:
//   • If field.eba && ebaEditableNow → shows "Edit" pencil button. Calls
//     onEditField with the metadata the host needs to open its edit modal.
//   • If there's an active edit on this fieldPath → highlights the field
//     with an amber band, shows "Edited by X at Stage Y" caption, and
//     (when editReviewerNow) Flag / Accept actions.
//   • If the edit is flagged → red band + caption showing the reason.
//
// No-op when the field isn't EBA-enabled OR none of the above apply, so
// the wrap is cheap on non-EBA forms.
const EbaWrap = ({
    field, fieldPath, sectionKey, currentValue, edit,
    ebaEditableNow, editReviewerNow,
    onEditField, onFlagEdit, onAcceptEdit, children,
}: {
    field: Field
    fieldPath: string
    sectionKey: string
    currentValue: any
    edit?: FieldEditRow
    ebaEditableNow: boolean
    editReviewerNow: boolean
    onEditField?: Props["onEditField"]
    onFlagEdit?: Props["onFlagEdit"]
    onAcceptEdit?: Props["onAcceptEdit"]
    children: React.ReactNode
}) => {
    const showEdit = !!field.eba && ebaEditableNow && !!onEditField
    const showEditMeta = !!edit
    if (!showEdit && !showEditMeta) return <>{children}</>

    const isActive = edit?.status === "active"
    const isFlagged = edit?.status === "flagged"
    const isAccepted = edit?.status === "accepted"
    const bannerClass = isFlagged
        ? styles.ebaBannerFlagged
        : isActive
            ? styles.ebaBannerActive
            : isAccepted
                ? styles.ebaBannerAccepted
                : ""

    return (
        <div className={`${styles.ebaWrap} ${edit ? bannerClass : ""}`}>
            {edit && (
                <div className={styles.ebaCaption}>
                    <span className={styles.ebaCaptionTitle}>
                        {isFlagged
                            ? `FLAGGED at Stage ${edit.flaggedAtStage}`
                            : isAccepted
                                ? `Accepted edit from Stage ${edit.editedAtStage}`
                                : `Edited at Stage ${edit.editedAtStage}`}
                    </span>
                    <span className={styles.ebaCaptionMeta}>
                        by {edit.editedBy?.name || edit.editedBy?.role || "Amni staff"}
                        {edit.previousValue !== undefined && edit.previousValue !== null && edit.previousValue !== "" && (
                            <>
                                {" "}· was{" "}
                                <code className={styles.ebaPrior}>
                                    {typeof edit.previousValue === "string"
                                        ? edit.previousValue
                                        : JSON.stringify(edit.previousValue)}
                                </code>
                            </>
                        )}
                    </span>
                    {isFlagged && edit.flaggedReason && (
                        <p className={styles.ebaFlagReason}>
                            <strong>{edit.flaggedBy?.name || "Reviewer"}:</strong>{" "}
                            {edit.flaggedReason}
                        </p>
                    )}
                    {isActive && editReviewerNow && (
                        <div className={styles.ebaReviewerActions}>
                            <button
                                type="button"
                                className={styles.ebaAcceptBtn}
                                onClick={() => onAcceptEdit?.(edit)}
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                className={styles.ebaFlagBtn}
                                onClick={() => onFlagEdit?.(edit)}
                            >
                                Flag
                            </button>
                        </div>
                    )}
                </div>
            )}
            <div className={styles.ebaFieldHolder}>
                {children}
                {showEdit && (
                    <button
                        type="button"
                        className={styles.ebaEditBtn}
                        onClick={() =>
                            onEditField!({ field, fieldPath, sectionKey, currentValue })
                        }
                        title="Edit (EBA)"
                    >
                        ✎ Edit
                    </button>
                )}
            </div>
        </div>
    )
}

// FreeTextMultiSelect - contractor types a value, presses Enter (or blurs
// with content) to push it into the array. Each entry renders as a chip
// with an inline ✕ to remove. Mirrors the legacy multiSelectText widget.
const FreeTextMultiSelect = ({
    id, label, helpEl, errEl, values, placeholder, disabled, onChange,
}: {
    id: string
    label: React.ReactNode
    helpEl: React.ReactNode
    errEl: React.ReactNode
    values: string[]
    placeholder: string
    disabled: boolean
    onChange: (next: string[]) => void
}) => {
    const [draft, setDraft] = React.useState("")

    const commit = () => {
        const t = draft.trim()
        if (!t) return
        // Dedupe (case-insensitive) so the same value can't be pushed twice.
        if (values.some((v) => v.toLowerCase() === t.toLowerCase())) {
            setDraft("")
            return
        }
        onChange([...values, t])
        setDraft("")
    }

    return (
        <div className={styles.fieldRow}>
            {label}
            <div className={styles.freeMultiBox}>
                {values.map((v, i) => (
                    <span key={`${v}-${i}`} className={styles.freeMultiChip}>
                        {v}
                        {!disabled && (
                            <button
                                type="button"
                                className={styles.freeMultiRemove}
                                onClick={() => onChange(values.filter((_, j) => j !== i))}
                                aria-label={`Remove ${v}`}
                            >
                                ×
                            </button>
                        )}
                    </span>
                ))}
                {!disabled && (
                    <input
                        id={id}
                        type="text"
                        className={styles.freeMultiInput}
                        value={draft}
                        placeholder={values.length === 0 ? placeholder : "Add another…"}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                commit()
                            } else if (e.key === "Backspace" && !draft && values.length > 0) {
                                // Convenience: backspace on empty input removes the last chip.
                                onChange(values.slice(0, -1))
                            }
                        }}
                        // Save typed-but-not-Enter'd content on blur so partial
                        // input isn't lost when the contractor tabs away.
                        onBlur={commit}
                    />
                )}
            </div>
            {helpEl}
            {errEl}
        </div>
    )
}

export default FormRenderer