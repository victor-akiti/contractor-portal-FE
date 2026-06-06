'use client'

// FormBuilder - visual schema editor for FormTemplate working drafts.
//
// Layout mirrors the legacy /staff/form-builder canvas pattern:
//   • Toolbar at the top (export / import / counts)
//   • Page tabs
//   • Two-column body: canvas on the left, inspector on the right
//     - Canvas renders sections + field rows as visual cards. Clicking a
//       page header / section header / field row selects that item.
//     - Inspector shows the property editor for the selected item.
//
// Improvements over the legacy builder:
//   • Strongly-typed schema with key uniqueness + auto-camelCase from labels.
//   • Inline validation feedback on keys.
//   • Native visibility rules (visibleIf) with a real field picker.
//   • Per-type validation block (min/max for numeric, length/pattern for text).
//   • Export / Import JSON for backup and copy-paste between templates.
//   • Sticky inspector with breadcrumbs back up to the selection root.

import { useCallback, useMemo, useRef, useState } from "react"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import styles from "./FormBuilder.module.css"

// ── Field-type registry ─────────────────────────────────────────────────────
const FIELD_TYPES = [
    { value: "shortText",    label: "Short text",      icon: "Aa",  hasOptions: false },
    { value: "longText",     label: "Long text",       icon: "¶",   hasOptions: false },
    { value: "email",        label: "Email",           icon: "@",   hasOptions: false },
    { value: "phone",        label: "Phone",           icon: "☎",   hasOptions: false },
    { value: "number",       label: "Number",          icon: "#",   hasOptions: false },
    { value: "currency",     label: "Currency",        icon: "$",   hasOptions: false },
    { value: "date",         label: "Date",            icon: "📅",  hasOptions: false },
    { value: "dropdown",     label: "Dropdown",        icon: "▾",   hasOptions: true  },
    { value: "radioButtons", label: "Radio buttons",   icon: "◉",   hasOptions: true  },
    { value: "checkBoxes",   label: "Checkboxes",      icon: "☑",   hasOptions: true  },
    { value: "multiSelect",  label: "Multi-select (defined options)",    icon: "≣",   hasOptions: true  },
    { value: "multiSelectFreeText", label: "Multi-select (free text)",  icon: "✎≣",  hasOptions: false },
    { value: "file",         label: "File upload",     icon: "📎",  hasOptions: false },
    { value: "certificate",  label: "Certificate",     icon: "🪪",  hasOptions: false },
    { value: "textBlock",    label: "Text block",      icon: "T",   hasOptions: false },
] as const

type FieldType = (typeof FIELD_TYPES)[number]["value"]

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
    FIELD_TYPES.map((t) => [t.value, t.label]),
)
const TYPE_ICON: Record<string, string> = Object.fromEntries(
    FIELD_TYPES.map((t) => [t.value, t.icon]),
)
const TYPE_HAS_OPTIONS = new Set(FIELD_TYPES.filter((t) => t.hasOptions).map((t) => t.value))
const TEXT_TYPES = new Set(["shortText", "longText", "email", "phone"])
const NUMERIC_TYPES = new Set(["number", "currency"])
const FILE_TYPES = new Set(["file", "certificate"])
const CURRENCY_TYPES = new Set(["currency"])

// File-format catalogue - matches the legacy builder's options.
const FILE_FORMATS = ["PDF", "JPG", "PNG", "SVG", "GIF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTM"]

// Default currency catalogue. The builder author picks a subset (or types in
// any 3-letter ISO code via the chip grid). All currencies render with their
// ISO code; symbol mapping is in the renderer for the common cases.
const DEFAULT_CURRENCY_CHOICES = ["NGN", "USD", "EUR", "GBP", "CAD", "ZAR", "GHS", "KES"]

// ── Types ───────────────────────────────────────────────────────────────────
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
    type: FieldType
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

    // EBA - "Editable by Amni": when true, this field can be edited by
    // VRM at Stage B (and at Stage E if also visible there). Downstream
    // reviewers (Supervisor at C, HOD at F) see edits highlighted with
    // a full audit trail and can flag / return.
    eba?: boolean

    // allowMultiple: vendor can add repeated instances of this field.
    allowMultiple?: boolean
    addFieldText?: string
    addedFieldLabel?: string

    // Currency-specific (only when type === "currency")
    // Stores answer as { amount: number, currency: string }.
    currencyOptions?: string[]
    defaultCurrency?: string
    allowCurrencyChange?: boolean
    // How the currency picker is rendered to the contractor. The legacy form
    // expressed currency via dropdowns / radio groups, so we mirror that as
    // an explicit choice rather than locking everyone to a dropdown.
    currencyDisplay?: "dropdown" | "radio"

    // File / certificate
    maxAllowedFiles?: number
    allowedFormats?: string[]
    allowSelectPreviouslyUploadedFile?: boolean
    hasExpiryDate?: boolean

    // textBlock - rich content (HTML or markdown). We store as string;
    // the renderer decides how to display.
    text?: string
}

interface Section {
    key: string
    title: string
    description?: string
    layout?: "single" | "double"
    fields: Field[]

    // allowMultiple: vendor can add repeated instances of this section.
    allowMultiple?: boolean
    addSectionText?: string
    addedSectionLabel?: string

    // Visibility flags for downstream views.
    hideOnApproval?: boolean
    hideOnView?: boolean
}

interface Page {
    key: string
    title: string
    description?: string
    sections: Section[]
}

export interface FormSchema {
    version: 1
    pages: Page[]
}

interface Props {
    value: FormSchema
    onChange: (next: FormSchema) => void
    disabled?: boolean
}

type Selection =
    | { type: "page"; pageIdx: number }
    | { type: "section"; pageIdx: number; secIdx: number }
    | { type: "field"; pageIdx: number; secIdx: number; fieldIdx: number }

// ── Helpers ─────────────────────────────────────────────────────────────────
const KEY_RE = /^[a-z][a-zA-Z0-9_]*$/

const toCamelKey = (label: string): string => {
    const cleaned = label.trim().replace(/[^a-zA-Z0-9 ]+/g, " ").split(/\s+/).filter(Boolean)
    if (cleaned.length === 0) return ""
    const first = cleaned[0].toLowerCase()
    const rest = cleaned.slice(1).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    const candidate = [first, ...rest].join("")
    if (!/^[a-z]/.test(candidate)) return "field" + candidate.replace(/[^a-zA-Z0-9_]/g, "")
    return candidate
}

const uniqueKey = (base: string, taken: Set<string>): string => {
    if (!base) base = "item"
    if (!taken.has(base)) return base
    let i = 2
    while (taken.has(`${base}${i}`)) i++
    return `${base}${i}`
}

const reorder = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length) return arr
    const copy = [...arr]
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    return copy
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
const FormBuilder = ({ value, onChange, disabled }: Props) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { confirm, dialog: confirmDialog } = useConfirmDialog()
    const [selection, setSelection] = useState<Selection | null>(null)
    const [importText, setImportText] = useState("")
    const [importError, setImportError] = useState("")
    const [showImport, setShowImport] = useState(false)
    const [addFieldFor, setAddFieldFor] = useState<{ pageIdx: number; secIdx: number } | null>(null)

    const pages = value?.pages || []
    const activePageIdx = selection?.pageIdx ?? 0
    const activePage = pages[activePageIdx] || pages[0] || null

    // Cross-field key uniqueness lookups - used by the visibility-rule
    // field picker so it can't reference a section/page key.
    const allFieldKeys = useMemo(() => {
        const out: string[] = []
        pages.forEach((p) => p.sections.forEach((s) => s.fields.forEach((f) => out.push(f.key))))
        return out
    }, [pages])

    // ALL keys in the schema (pages + sections + fields). Section keys and
    // field keys are technically allowed to overlap by the JSON shape, but
    // we treat the whole tree as one namespace so visibility rules + remark
    // anchors + hideOnApproval semantics are unambiguous. The inspector uses
    // this to surface duplicate-key errors live and to suffix auto-derived
    // keys so collisions can't slip through silently.
    const allKeys = useMemo(() => {
        const out = new Set<string>()
        pages.forEach((p) => {
            if (p.key) out.add(p.key)
            p.sections.forEach((s) => {
                if (s.key) out.add(s.key)
                s.fields.forEach((f) => { if (f.key) out.add(f.key) })
            })
        })
        return out
    }, [pages])

    // Build "taken set excluding self" - the inspector passes its own current
    // key so a row doesn't fail its own uniqueness check.
    const keysExcluding = useCallback(
        (self: string | undefined) => {
            if (!self) return allKeys
            const copy = new Set(allKeys)
            copy.delete(self)
            return copy
        },
        [allKeys],
    )

    // ── Schema mutators ──────────────────────────────────────────────────────
    const mutate = useCallback(
        (fn: (draft: FormSchema) => FormSchema | void) => {
            const next = JSON.parse(JSON.stringify(value)) as FormSchema
            const result = fn(next) || next
            onChange(result)
        },
        [value, onChange],
    )

    const setActivePage = (idx: number) => setSelection({ type: "page", pageIdx: idx })

    // Pages
    const addPage = () => {
        const newIdx = pages.length
        mutate((d) => {
            const taken = new Set(d.pages.map((p) => p.key))
            const key = uniqueKey(toCamelKey(`page ${d.pages.length + 1}`) || "page", taken)
            d.pages.push({ key, title: `Page ${d.pages.length + 1}`, description: "", sections: [] })
        })
        setSelection({ type: "page", pageIdx: newIdx })
    }

    const updatePage = (idx: number, patch: Partial<Page>) => {
        mutate((d) => { d.pages[idx] = { ...d.pages[idx], ...patch } })
    }

    const deletePage = async (idx: number) => {
        const ok = await confirm({
            headerText: "Delete page?",
            bodyText: `"${pages[idx]?.title}" and all its sections + fields will be removed from the draft. This cannot be undone unless you have a JSON export.`,
            confirmText: "Delete page",
            destructive: true,
        })
        if (!ok) return
        mutate((d) => { d.pages.splice(idx, 1) })
        setSelection(null)
    }

    const movePage = (idx: number, dir: -1 | 1) => {
        mutate((d) => { d.pages = reorder(d.pages, idx, idx + dir) })
        const newIdx = idx + dir
        if (newIdx >= 0 && newIdx < pages.length) {
            setSelection({ type: "page", pageIdx: newIdx })
        }
    }

    // Sections
    const addSection = (pageIdx: number) => {
        let newIdx = 0
        mutate((d) => {
            const page = d.pages[pageIdx]
            const taken = new Set(page.sections.map((s) => s.key))
            const idx = page.sections.length + 1
            const key = uniqueKey(toCamelKey(`section ${idx}`), taken)
            page.sections.push({ key, title: `Section ${idx}`, description: "", layout: "single", fields: [] })
            newIdx = page.sections.length - 1
        })
        setSelection({ type: "section", pageIdx, secIdx: newIdx })
    }

    const updateSection = (pageIdx: number, secIdx: number, patch: Partial<Section>) => {
        mutate((d) => {
            d.pages[pageIdx].sections[secIdx] = { ...d.pages[pageIdx].sections[secIdx], ...patch }
        })
    }

    const deleteSection = async (pageIdx: number, secIdx: number) => {
        const sec = pages[pageIdx]?.sections[secIdx]
        if (!sec) return
        const ok = await confirm({
            headerText: "Delete section?",
            bodyText: `"${sec.title}" and all ${sec.fields.length} field${sec.fields.length === 1 ? "" : "s"} inside it will be removed from the draft.`,
            confirmText: "Delete section",
            destructive: true,
        })
        if (!ok) return
        mutate((d) => { d.pages[pageIdx].sections.splice(secIdx, 1) })
        setSelection({ type: "page", pageIdx })
    }

    const moveSection = (pageIdx: number, secIdx: number, dir: -1 | 1) => {
        mutate((d) => {
            d.pages[pageIdx].sections = reorder(d.pages[pageIdx].sections, secIdx, secIdx + dir)
        })
        const newIdx = secIdx + dir
        if (newIdx >= 0) setSelection({ type: "section", pageIdx, secIdx: newIdx })
    }

    // Fields
    const addField = (pageIdx: number, secIdx: number, type: FieldType) => {
        let newIdx = 0
        mutate((d) => {
            const sec = d.pages[pageIdx].sections[secIdx]
            const takenAll = new Set<string>()
            d.pages.forEach((p) => p.sections.forEach((s) => s.fields.forEach((f) => takenAll.add(f.key))))
            const i = sec.fields.length + 1
            const key = uniqueKey(toCamelKey(`field ${i}`), takenAll)
            const def: Field = {
                key,
                type,
                label: `${TYPE_LABEL[type]} field`,
                required: false,
                enabled: true,
            }
            if (TYPE_HAS_OPTIONS.has(type)) {
                def.options = [
                    { key: "option1", label: "Option 1" },
                    { key: "option2", label: "Option 2" },
                ]
            }
            if (type === "file") {
                def.maxAllowedFiles = 1
                def.allowedFormats = ["PDF", "JPG", "PNG"]
                def.allowSelectPreviouslyUploadedFile = true
            }
            if (type === "certificate") {
                def.maxAllowedFiles = 1
                def.allowedFormats = ["PDF", "JPG", "PNG"]
                def.allowSelectPreviouslyUploadedFile = true
                def.hasExpiryDate = true
            }
            if (type === "currency") {
                def.currencyOptions = ["NGN", "USD"]
                def.defaultCurrency = "NGN"
                def.allowCurrencyChange = true
                def.currencyDisplay = "dropdown"
            }
            sec.fields.push(def)
            newIdx = sec.fields.length - 1
        })
        setSelection({ type: "field", pageIdx, secIdx, fieldIdx: newIdx })
        setAddFieldFor(null)
    }

    const updateField = (pageIdx: number, secIdx: number, fieldIdx: number, patch: Partial<Field>) => {
        mutate((d) => {
            const cur = d.pages[pageIdx].sections[secIdx].fields[fieldIdx]
            d.pages[pageIdx].sections[secIdx].fields[fieldIdx] = { ...cur, ...patch }
        })
    }

    const deleteField = async (pageIdx: number, secIdx: number, fieldIdx: number) => {
        const f = pages[pageIdx]?.sections[secIdx]?.fields[fieldIdx]
        if (!f) return
        const ok = await confirm({
            headerText: "Delete field?",
            bodyText: `"${f.label}" will be removed from the draft. Any visibility rules that depend on this field will need to be updated.`,
            confirmText: "Delete field",
            destructive: true,
        })
        if (!ok) return
        mutate((d) => { d.pages[pageIdx].sections[secIdx].fields.splice(fieldIdx, 1) })
        setSelection({ type: "section", pageIdx, secIdx })
    }

    const moveField = (pageIdx: number, secIdx: number, fieldIdx: number, dir: -1 | 1) => {
        mutate((d) => {
            d.pages[pageIdx].sections[secIdx].fields = reorder(
                d.pages[pageIdx].sections[secIdx].fields, fieldIdx, fieldIdx + dir,
            )
        })
        const newIdx = fieldIdx + dir
        if (newIdx >= 0) setSelection({ type: "field", pageIdx, secIdx, fieldIdx: newIdx })
    }

    // Export / Import
    const exportJson = () => {
        const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `form-schema-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = () => {
        setImportError("")
        let parsed: any
        try { parsed = JSON.parse(importText) }
        catch (e: any) { setImportError(`Invalid JSON: ${e?.message}`); return }
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.pages)) {
            setImportError("Schema must be an object with a 'pages' array.")
            return
        }
        if (parsed.version !== 1) { setImportError("Schema version must be 1."); return }
        onChange(parsed)
        setShowImport(false)
        setImportText("")
        setSelection(null)
    }

    const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => { setImportText(String(reader.result || "")); setShowImport(true) }
        reader.readAsText(file)
        e.target.value = ""
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className={styles.builder}>
            {confirmDialog}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <button className={styles.btnGhost} onClick={exportJson} disabled={disabled}>
                        Export JSON
                    </button>
                    <button
                        className={styles.btnGhost}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                    >
                        Import JSON
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        style={{ display: "none" }}
                        onChange={onPickFile}
                    />
                </div>
                <div className={styles.toolbarRight}>
                    <span className={styles.countPill}>
                        {pages.length} page{pages.length === 1 ? "" : "s"}
                    </span>
                    <span className={styles.countPill}>
                        {pages.reduce((sum, p) => sum + p.sections.length, 0)} sections
                    </span>
                    <span className={styles.countPill}>{allFieldKeys.length} fields</span>
                </div>
            </div>

            {pages.length === 0 ? (
                <div className={styles.emptyState}>
                    <h4>Empty schema</h4>
                    <p>Start by adding the first page of your form.</p>
                    <button className={styles.btnPrimary} onClick={addPage} disabled={disabled}>
                        + Add first page
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.pageTabs}>
                        {pages.map((p, i) => (
                            <button
                                key={p.key + i}
                                className={`${styles.pageTab} ${i === activePageIdx ? styles.pageTabActive : ""}`}
                                onClick={() => setActivePage(i)}
                            >
                                {p.title || "(untitled)"}
                            </button>
                        ))}
                        <button className={styles.pageTabAdd} onClick={addPage} disabled={disabled}>
                            + Add page
                        </button>
                    </div>

                    <div className={styles.body}>
                        <div className={styles.canvas}>
                            {activePage && (
                                <PageCanvas
                                    page={activePage}
                                    pageIdx={activePageIdx}
                                    selection={selection}
                                    onSelect={setSelection}
                                    onAddSection={() => addSection(activePageIdx)}
                                    onAddField={(secIdx) =>
                                        setAddFieldFor({ pageIdx: activePageIdx, secIdx })
                                    }
                                />
                            )}
                        </div>

                        <div className={styles.inspector}>
                            {!selection || !pages[selection.pageIdx] ? (
                                <EmptyInspector />
                            ) : selection.type === "page" ? (
                                <PageInspector
                                    page={pages[selection.pageIdx]}
                                    pageIdx={selection.pageIdx}
                                    totalPages={pages.length}
                                    takenKeys={keysExcluding(pages[selection.pageIdx].key)}
                                    disabled={disabled}
                                    onUpdate={(patch) => updatePage(selection.pageIdx, patch)}
                                    onDelete={() => deletePage(selection.pageIdx)}
                                    onMove={(dir) => movePage(selection.pageIdx, dir)}
                                />
                            ) : selection.type === "section" ? (
                                <SectionInspector
                                    section={pages[selection.pageIdx].sections[selection.secIdx]}
                                    secIdx={selection.secIdx}
                                    totalSections={pages[selection.pageIdx].sections.length}
                                    pageTitle={pages[selection.pageIdx].title}
                                    takenKeys={keysExcluding(
                                        pages[selection.pageIdx].sections[selection.secIdx].key,
                                    )}
                                    disabled={disabled}
                                    onUpdate={(patch) =>
                                        updateSection(selection.pageIdx, selection.secIdx, patch)
                                    }
                                    onDelete={() => deleteSection(selection.pageIdx, selection.secIdx)}
                                    onMove={(dir) => moveSection(selection.pageIdx, selection.secIdx, dir)}
                                    onUp={() => setSelection({ type: "page", pageIdx: selection.pageIdx })}
                                />
                            ) : (
                                <FieldInspector
                                    field={
                                        pages[selection.pageIdx].sections[selection.secIdx].fields[
                                            selection.fieldIdx
                                        ]
                                    }
                                    fieldIdx={selection.fieldIdx}
                                    totalFields={
                                        pages[selection.pageIdx].sections[selection.secIdx].fields.length
                                    }
                                    allFieldKeys={allFieldKeys}
                                    takenKeys={keysExcluding(
                                        pages[selection.pageIdx].sections[selection.secIdx].fields[
                                            selection.fieldIdx
                                        ].key,
                                    )}
                                    sectionTitle={pages[selection.pageIdx].sections[selection.secIdx].title}
                                    disabled={disabled}
                                    onUpdate={(patch) =>
                                        updateField(
                                            selection.pageIdx, selection.secIdx, selection.fieldIdx, patch,
                                        )
                                    }
                                    onDelete={() =>
                                        deleteField(selection.pageIdx, selection.secIdx, selection.fieldIdx)
                                    }
                                    onMove={(dir) =>
                                        moveField(
                                            selection.pageIdx, selection.secIdx, selection.fieldIdx, dir,
                                        )
                                    }
                                    onUp={() =>
                                        setSelection({
                                            type: "section",
                                            pageIdx: selection.pageIdx,
                                            secIdx: selection.secIdx,
                                        })
                                    }
                                />
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add-field type picker */}
            {addFieldFor && (
                <div className={styles.modalBackdrop} onClick={() => setAddFieldFor(null)}>
                    <div className={styles.typePickerCard} onClick={(e) => e.stopPropagation()}>
                        <h3>Add a field</h3>
                        <p className={styles.dim}>Pick the type of input you want to add.</p>
                        <div className={styles.typeGrid}>
                            {FIELD_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    className={styles.typeTile}
                                    onClick={() =>
                                        addField(addFieldFor.pageIdx, addFieldFor.secIdx, t.value)
                                    }
                                >
                                    <span className={styles.typeTileIcon}>{t.icon}</span>
                                    <span className={styles.typeTileLabel}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.btnGhost} onClick={() => setAddFieldFor(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import JSON */}
            {showImport && (
                <div className={styles.modalBackdrop} onClick={() => setShowImport(false)}>
                    <div className={styles.importCard} onClick={(e) => e.stopPropagation()}>
                        <h3>Import schema</h3>
                        <p className={styles.dim}>
                            Paste a JSON schema and click Import. This replaces the current draft.
                        </p>
                        <textarea
                            rows={14}
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className={styles.importTextarea}
                        />
                        {importError && <div className={styles.errText}>{importError}</div>}
                        <div className={styles.modalFooter}>
                            <button className={styles.btnGhost} onClick={() => setShowImport(false)}>
                                Cancel
                            </button>
                            <button className={styles.btnPrimary} onClick={handleImport}>
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Canvas
// ═══════════════════════════════════════════════════════════════════════════
interface PageCanvasProps {
    page: Page
    pageIdx: number
    selection: Selection | null
    onSelect: (s: Selection) => void
    onAddSection: () => void
    onAddField: (secIdx: number) => void
}

const PageCanvas = ({ page, pageIdx, selection, onSelect, onAddSection, onAddField }: PageCanvasProps) => {
    const isPageSelected = selection?.type === "page" && selection.pageIdx === pageIdx
    return (
        <div className={styles.pageCanvas}>
            <div
                className={`${styles.pageHeaderCanvas} ${isPageSelected ? styles.selected : ""}`}
                onClick={() => onSelect({ type: "page", pageIdx })}
            >
                <h2 className={styles.pageTitleCanvas}>{page.title || "(untitled page)"}</h2>
                {page.description && (
                    <p className={styles.pageDescCanvas}>{page.description}</p>
                )}
            </div>

            {page.sections.length === 0 && (
                <div className={styles.canvasEmpty}>
                    <p>No sections yet on this page.</p>
                </div>
            )}

            {page.sections.map((section, secIdx) => {
                const isSecSel =
                    selection?.type === "section" &&
                    selection.pageIdx === pageIdx &&
                    selection.secIdx === secIdx
                return (
                    <div key={section.key + secIdx} className={styles.sectionCanvas}>
                        <div
                            className={`${styles.sectionHeaderCanvas} ${isSecSel ? styles.selected : ""}`}
                            onClick={() => onSelect({ type: "section", pageIdx, secIdx })}
                        >
                            <div>
                                <h3 className={styles.sectionTitleCanvas}>
                                    {section.title || "(untitled section)"}
                                </h3>
                                {section.description && (
                                    <p className={styles.sectionDescCanvas}>{section.description}</p>
                                )}
                            </div>
                            <div className={styles.sectionMetaWrap}>
                                <span className={styles.sectionMeta}>
                                    {section.fields.length} field{section.fields.length === 1 ? "" : "s"}
                                    {section.layout === "double" && " · 2-column"}
                                </span>
                                <div className={styles.sectionBadges}>
                                    {section.allowMultiple && (
                                        <span className={styles.tagBadge}>multiples allowed</span>
                                    )}
                                    {section.hideOnApproval && (
                                        <span className={styles.tagBadgeDim} title="Hidden from approval view">
                                            no-approval
                                        </span>
                                    )}
                                    {section.hideOnView && (
                                        <span className={styles.tagBadgeDim} title="Hidden from read-only view">
                                            no-view
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className={`${styles.fieldRowsContainer} ${
                                section.layout === "double" ? styles.doubleCol : ""
                            }`}
                        >
                            {section.fields.length === 0 && (
                                <div className={styles.fieldRowEmpty}>
                                    <span>No fields. Add one below.</span>
                                </div>
                            )}
                            {section.fields.map((field, fieldIdx) => {
                                const isFieldSel =
                                    selection?.type === "field" &&
                                    selection.pageIdx === pageIdx &&
                                    selection.secIdx === secIdx &&
                                    selection.fieldIdx === fieldIdx
                                return (
                                    <button
                                        key={field.key + fieldIdx}
                                        className={`${styles.fieldRow} ${isFieldSel ? styles.selected : ""} ${
                                            field.enabled === false ? styles.fieldDisabled : ""
                                        }`}
                                        onClick={() =>
                                            onSelect({ type: "field", pageIdx, secIdx, fieldIdx })
                                        }
                                    >
                                        <span className={styles.fieldRowIcon}>{TYPE_ICON[field.type]}</span>
                                        <span className={styles.fieldRowLabel}>
                                            {field.label || "(unlabelled)"}
                                            {field.required && <span className={styles.reqStar}>*</span>}
                                        </span>
                                        <div className={styles.fieldRowMeta}>
                                            {field.allowMultiple && (
                                                <span className={styles.miniBadge}>multiples allowed</span>
                                            )}
                                            {field.enabled === false && (
                                                <span className={styles.miniBadge}>disabled</span>
                                            )}
                                            {field.type === "certificate" && field.hasExpiryDate && (
                                                <span className={styles.miniBadge}>expires</span>
                                            )}
                                            {field.type === "currency" && field.defaultCurrency && (
                                                <span className={styles.miniBadge}>{field.defaultCurrency}</span>
                                            )}
                                            {field.eba && (
                                                <span className={`${styles.miniBadge} ${styles.miniBadgeEba}`} title="Editable by Amni (VRM at Stage B, Stage E)">
                                                    EBA
                                                </span>
                                            )}
                                            {field.visibleIf && (
                                                <span className={styles.miniBadge} title="Has visibility rule">
                                                    conditional
                                                </span>
                                            )}
                                            <span className={styles.fieldRowType}>{field.type}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className={styles.sectionFooter}>
                            <button
                                className={styles.btnDashed}
                                onClick={(e) => { e.stopPropagation(); onAddField(secIdx) }}
                            >
                                + Add field
                            </button>
                        </div>
                    </div>
                )
            })}

            <button className={styles.btnDashedWide} onClick={onAddSection}>
                + Add section
            </button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Inspector - Empty
// ═══════════════════════════════════════════════════════════════════════════
const EmptyInspector = () => (
    <div className={styles.inspectorEmpty}>
        <div className={styles.inspectorEmptyIcon}>⚙</div>
        <h4>Nothing selected</h4>
        <p>
            Click a page header, a section, or a field on the canvas to edit its properties here.
        </p>
    </div>
)

// ═══════════════════════════════════════════════════════════════════════════
// Inspector - Page
// ═══════════════════════════════════════════════════════════════════════════
interface PageInspectorProps {
    page: Page
    pageIdx: number
    totalPages: number
    takenKeys: Set<string>
    disabled?: boolean
    onUpdate: (patch: Partial<Page>) => void
    onDelete: () => void
    onMove: (dir: -1 | 1) => void
}

const PageInspector = ({
    page, pageIdx, totalPages, takenKeys, disabled, onUpdate, onDelete, onMove,
}: PageInspectorProps) => {
    const [keyEdited, setKeyEdited] = useState(false)
    const keyInvalid = !!page.key && !KEY_RE.test(page.key)
    const keyDuplicate = !!page.key && takenKeys.has(page.key)
    const keyError = keyInvalid
        ? "Must start with a-z, then a-z/0-9/_"
        : keyDuplicate
          ? "This key is already used elsewhere in the form. Keys must be unique."
          : undefined

    const onTitleChange = (title: string) => {
        const patch: Partial<Page> = { title }
        // Auto-derive into a free slot so renaming a page can't silently
        // collide with an existing key.
        if (!keyEdited) {
            const base = toCamelKey(title) || page.key
            patch.key = takenKeys.has(base) ? uniqueKey(base, new Set(takenKeys)) : base
        }
        onUpdate(patch)
    }

    return (
        <div className={styles.inspectorPanel}>
            <div className={styles.inspectorBreadcrumbs}>
                <span className={styles.crumb}>Page</span>
            </div>
            <div className={styles.inspectorHeaderRow}>
                <h4 className={styles.inspectorTitle}>Page settings</h4>
                <div className={styles.iconBar}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => onMove(-1)}
                        disabled={disabled || pageIdx === 0}
                        title="Move page left"
                    >↑</button>
                    <button
                        className={styles.iconBtn}
                        onClick={() => onMove(1)}
                        disabled={disabled || pageIdx === totalPages - 1}
                        title="Move page right"
                    >↓</button>
                    <button
                        className={styles.iconBtnDanger}
                        onClick={onDelete}
                        disabled={disabled}
                        title="Delete page"
                    >×</button>
                </div>
            </div>

            <FieldBox label="Title">
                <input value={page.title} onChange={(e) => onTitleChange(e.target.value)} disabled={disabled} />
            </FieldBox>
            <FieldBox label="Key" error={keyError}>
                <input
                    className={`${styles.codeInput} ${keyError ? styles.invalid : ""}`}
                    value={page.key}
                    onChange={(e) => { setKeyEdited(true); onUpdate({ key: e.target.value }) }}
                    disabled={disabled}
                />
            </FieldBox>
            <FieldBox label="Description">
                <textarea
                    rows={3}
                    value={page.description || ""}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    disabled={disabled}
                    placeholder="Helper text shown at the top of the page"
                />
            </FieldBox>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Inspector - Section
// ═══════════════════════════════════════════════════════════════════════════
interface SectionInspectorProps {
    section: Section
    secIdx: number
    totalSections: number
    pageTitle: string
    takenKeys: Set<string>
    disabled?: boolean
    onUpdate: (patch: Partial<Section>) => void
    onDelete: () => void
    onMove: (dir: -1 | 1) => void
    onUp: () => void
}

const SectionInspector = ({
    section, secIdx, totalSections, pageTitle, takenKeys,
    disabled, onUpdate, onDelete, onMove, onUp,
}: SectionInspectorProps) => {
    const [keyEdited, setKeyEdited] = useState(false)
    const keyInvalid = !!section.key && !KEY_RE.test(section.key)
    const keyDuplicate = !!section.key && takenKeys.has(section.key)
    const keyError = keyInvalid
        ? "Must start with a-z, then a-z/0-9/_"
        : keyDuplicate
          ? "This key is already used elsewhere in the form. Keys must be unique."
          : undefined

    const onTitleChange = (title: string) => {
        const patch: Partial<Section> = { title }
        if (!keyEdited) {
            const base = toCamelKey(title) || section.key
            patch.key = takenKeys.has(base) ? uniqueKey(base, new Set(takenKeys)) : base
        }
        onUpdate(patch)
    }

    return (
        <div className={styles.inspectorPanel}>
            <div className={styles.inspectorBreadcrumbs}>
                <button className={styles.crumbLink} onClick={onUp}>{pageTitle}</button>
                <span className={styles.crumbSep}>›</span>
                <span className={styles.crumb}>Section</span>
            </div>
            <div className={styles.inspectorHeaderRow}>
                <h4 className={styles.inspectorTitle}>Section settings</h4>
                <div className={styles.iconBar}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => onMove(-1)}
                        disabled={disabled || secIdx === 0}
                        title="Move section up"
                    >↑</button>
                    <button
                        className={styles.iconBtn}
                        onClick={() => onMove(1)}
                        disabled={disabled || secIdx === totalSections - 1}
                        title="Move section down"
                    >↓</button>
                    <button
                        className={styles.iconBtnDanger}
                        onClick={onDelete}
                        disabled={disabled}
                        title="Delete section"
                    >×</button>
                </div>
            </div>

            <FieldBox label="Title">
                <input value={section.title} onChange={(e) => onTitleChange(e.target.value)} disabled={disabled} />
            </FieldBox>
            <FieldBox label="Key" error={keyError}>
                <input
                    className={`${styles.codeInput} ${keyError ? styles.invalid : ""}`}
                    value={section.key}
                    onChange={(e) => { setKeyEdited(true); onUpdate({ key: e.target.value }) }}
                    disabled={disabled}
                />
            </FieldBox>
            <FieldBox label="Layout">
                <div className={styles.segmented}>
                    <button
                        className={`${styles.segmentBtn} ${section.layout !== "double" ? styles.segmentActive : ""}`}
                        onClick={() => onUpdate({ layout: "single" })}
                        disabled={disabled}
                    >
                        Single column
                    </button>
                    <button
                        className={`${styles.segmentBtn} ${section.layout === "double" ? styles.segmentActive : ""}`}
                        onClick={() => onUpdate({ layout: "double" })}
                        disabled={disabled}
                    >
                        Two columns
                    </button>
                </div>
            </FieldBox>
            <FieldBox label="Description">
                <textarea
                    rows={3}
                    value={section.description || ""}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    disabled={disabled}
                    placeholder="Helper text shown under the section heading"
                />
            </FieldBox>

            <SubBlock
                title="Multiples allowed"
                action={
                    <label className={styles.toggleLabel}>
                        <input
                            type="checkbox"
                            checked={!!section.allowMultiple}
                            onChange={(e) => onUpdate({ allowMultiple: e.target.checked })}
                            disabled={disabled}
                        />
                        <span>Allow multiple</span>
                    </label>
                }
            >
                {section.allowMultiple ? (
                    <>
                        <FieldBox label="‘Add another section’ button text">
                            <input
                                value={section.addSectionText || ""}
                                onChange={(e) => onUpdate({ addSectionText: e.target.value })}
                                disabled={disabled}
                                placeholder="+ Add another"
                            />
                        </FieldBox>
                        <FieldBox label="Repeated instance label">
                            <input
                                value={section.addedSectionLabel || ""}
                                onChange={(e) => onUpdate({ addedSectionLabel: e.target.value })}
                                disabled={disabled}
                                placeholder='e.g. "Branch #{n}"'
                            />
                        </FieldBox>
                    </>
                ) : (
                    <p className={styles.dim}>
                        Off - contractors see this section exactly once.
                    </p>
                )}
            </SubBlock>

            <SubBlock title="Visibility">
                <div className={styles.toggleGrid}>
                    <label className={styles.toggleLabel}>
                        <input
                            type="checkbox"
                            checked={!!section.hideOnApproval}
                            onChange={(e) => onUpdate({ hideOnApproval: e.target.checked })}
                            disabled={disabled}
                        />
                        <span>Hide on approval view</span>
                    </label>
                    <label className={styles.toggleLabel}>
                        <input
                            type="checkbox"
                            checked={!!section.hideOnView}
                            onChange={(e) => onUpdate({ hideOnView: e.target.checked })}
                            disabled={disabled}
                        />
                        <span>Hide on read-only view</span>
                    </label>
                </div>
                <p className={styles.dim}>
                    Useful for sections that are contractor-facing only or staff-facing only.
                </p>
            </SubBlock>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Inspector - Field
// ═══════════════════════════════════════════════════════════════════════════
interface FieldInspectorProps {
    field: Field
    fieldIdx: number
    totalFields: number
    allFieldKeys: string[]
    takenKeys: Set<string>
    sectionTitle: string
    disabled?: boolean
    onUpdate: (patch: Partial<Field>) => void
    onDelete: () => void
    onMove: (dir: -1 | 1) => void
    onUp: () => void
}

const FieldInspector = ({
    field, fieldIdx, totalFields, allFieldKeys, takenKeys, sectionTitle,
    disabled, onUpdate, onDelete, onMove, onUp,
}: FieldInspectorProps) => {
    const [keyEdited, setKeyEdited] = useState(false)
    const keyInvalid = !!field.key && !KEY_RE.test(field.key)
    const keyDuplicate = !!field.key && takenKeys.has(field.key)
    const keyError = keyInvalid
        ? "Must start with a-z, then a-z/0-9/_"
        : keyDuplicate
          ? "This key is already used elsewhere in the form. Keys must be unique."
          : undefined

    const onLabelChange = (label: string) => {
        const patch: Partial<Field> = { label }
        if (!keyEdited) {
            const base = toCamelKey(label) || field.key
            patch.key = takenKeys.has(base) ? uniqueKey(base, new Set(takenKeys)) : base
        }
        onUpdate(patch)
    }

    const onTypeChange = (type: FieldType) => {
        const patch: Partial<Field> = { type }
        if (TYPE_HAS_OPTIONS.has(type) && (!field.options || field.options.length === 0)) {
            patch.options = [
                { key: "option1", label: "Option 1" },
                { key: "option2", label: "Option 2" },
            ]
        }
        if (!TYPE_HAS_OPTIONS.has(type)) patch.options = undefined

        // File / certificate defaults - preserve existing if already a file-type.
        if (FILE_TYPES.has(type)) {
            if (field.maxAllowedFiles == null) patch.maxAllowedFiles = 1
            if (!field.allowedFormats || field.allowedFormats.length === 0) {
                patch.allowedFormats = ["PDF", "JPG", "PNG"]
            }
            if (field.allowSelectPreviouslyUploadedFile == null) {
                patch.allowSelectPreviouslyUploadedFile = true
            }
            if (type === "certificate" && field.hasExpiryDate == null) {
                patch.hasExpiryDate = true
            }
        } else {
            patch.maxAllowedFiles = undefined
            patch.allowedFormats = undefined
            patch.allowSelectPreviouslyUploadedFile = undefined
            patch.hasExpiryDate = undefined
        }

        // Currency defaults - only relevant when switching INTO currency.
        if (CURRENCY_TYPES.has(type)) {
            if (!field.currencyOptions || field.currencyOptions.length === 0) {
                patch.currencyOptions = ["NGN", "USD"]
            }
            if (!field.defaultCurrency) {
                patch.defaultCurrency = (patch.currencyOptions || field.currencyOptions || ["NGN"])[0]
            }
            if (field.allowCurrencyChange == null) patch.allowCurrencyChange = true
            if (!field.currencyDisplay) patch.currencyDisplay = "dropdown"
        } else {
            patch.currencyOptions = undefined
            patch.defaultCurrency = undefined
            patch.allowCurrencyChange = undefined
            patch.currencyDisplay = undefined
        }

        onUpdate(patch)
    }

    const toggleCurrency = (code: string) => {
        const current = new Set(field.currencyOptions || [])
        if (current.has(code)) {
            // Don't allow removing the last currency.
            if (current.size === 1) return
            current.delete(code)
        } else {
            current.add(code)
        }
        const next = Array.from(current)
        const patch: Partial<Field> = { currencyOptions: next }
        // If the default currency was just removed, fall back to the first remaining one.
        if (field.defaultCurrency && !next.includes(field.defaultCurrency)) {
            patch.defaultCurrency = next[0]
        }
        onUpdate(patch)
    }

    const toggleFormat = (fmt: string) => {
        const current = new Set(field.allowedFormats || [])
        if (current.has(fmt)) current.delete(fmt)
        else current.add(fmt)
        onUpdate({ allowedFormats: Array.from(current) })
    }

    const updateOption = (i: number, patch: Partial<{ key: string; label: string }>) => {
        const next = [...(field.options || [])]
        next[i] = { ...next[i], ...patch }
        // Auto-derive option key from label if user hasn't manually edited it.
        if (patch.label !== undefined && next[i].key === (toCamelKey((field.options || [])[i]?.label || ""))) {
            next[i].key = toCamelKey(patch.label) || next[i].key
        }
        onUpdate({ options: next })
    }
    const addOption = () => {
        const next = [...(field.options || [])]
        next.push({ key: `option${next.length + 1}`, label: `Option ${next.length + 1}` })
        onUpdate({ options: next })
    }
    const removeOption = (i: number) => {
        const next = [...(field.options || [])]
        next.splice(i, 1)
        onUpdate({ options: next })
    }
    const moveOption = (i: number, dir: -1 | 1) => {
        onUpdate({ options: reorder(field.options || [], i, i + dir) })
    }

    const updateValidation = (patch: Partial<Validation>) => {
        const next: Validation = { ...(field.validation || {}), ...patch }
        const cleaned: Validation = {}
        Object.entries(next).forEach(([k, v]) => {
            if (v !== "" && v !== undefined && v !== null) (cleaned as any)[k] = v
        })
        onUpdate({ validation: Object.keys(cleaned).length ? cleaned : undefined })
    }

    const updateVisibleIf = (patch: Partial<VisibleIf> | null) => {
        if (patch === null) { onUpdate({ visibleIf: null }); return }
        const next: VisibleIf = {
            field: field.visibleIf?.field || "",
            op: field.visibleIf?.op || "eq",
            value: field.visibleIf?.value || "",
            ...patch,
        }
        onUpdate({ visibleIf: next })
    }

    const hasOpts = TYPE_HAS_OPTIONS.has(field.type)
    const isText = TEXT_TYPES.has(field.type)
    const isNumeric = NUMERIC_TYPES.has(field.type)
    const otherFieldKeys = allFieldKeys.filter((k) => k !== field.key)

    return (
        <div className={styles.inspectorPanel}>
            <div className={styles.inspectorBreadcrumbs}>
                <button className={styles.crumbLink} onClick={onUp}>{sectionTitle}</button>
                <span className={styles.crumbSep}>›</span>
                <span className={styles.crumb}>Field</span>
            </div>
            <div className={styles.inspectorHeaderRow}>
                <h4 className={styles.inspectorTitle}>
                    <span className={styles.fieldHeaderIcon}>{TYPE_ICON[field.type]}</span>
                    Field
                </h4>
                <div className={styles.iconBar}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => onMove(-1)}
                        disabled={disabled || fieldIdx === 0}
                        title="Move field up"
                    >↑</button>
                    <button
                        className={styles.iconBtn}
                        onClick={() => onMove(1)}
                        disabled={disabled || fieldIdx === totalFields - 1}
                        title="Move field down"
                    >↓</button>
                    <button
                        className={styles.iconBtnDanger}
                        onClick={onDelete}
                        disabled={disabled}
                        title="Delete field"
                    >×</button>
                </div>
            </div>

            <FieldBox label="Label">
                <input value={field.label} onChange={(e) => onLabelChange(e.target.value)} disabled={disabled} />
            </FieldBox>
            <FieldBox label="Key" error={keyError}>
                <input
                    className={`${styles.codeInput} ${keyError ? styles.invalid : ""}`}
                    value={field.key}
                    onChange={(e) => { setKeyEdited(true); onUpdate({ key: e.target.value }) }}
                    disabled={disabled}
                />
            </FieldBox>
            <FieldBox label="Type">
                <select
                    value={field.type}
                    onChange={(e) => onTypeChange(e.target.value as FieldType)}
                    disabled={disabled}
                >
                    {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </FieldBox>
            <div className={styles.toggleGrid}>
                <label className={styles.toggleLabel}>
                    <input
                        type="checkbox"
                        checked={!!field.required}
                        onChange={(e) => onUpdate({ required: e.target.checked })}
                        disabled={disabled}
                    />
                    <span>Required</span>
                </label>
                <label className={styles.toggleLabel}>
                    <input
                        type="checkbox"
                        checked={field.enabled !== false}
                        onChange={(e) => onUpdate({ enabled: e.target.checked })}
                        disabled={disabled}
                    />
                    <span>Enabled</span>
                </label>
            </div>

            <FieldBox label="Help text">
                <input
                    value={field.helpText || ""}
                    onChange={(e) => onUpdate({ helpText: e.target.value })}
                    disabled={disabled}
                    placeholder="Shown under the field"
                />
            </FieldBox>
            {field.type !== "textBlock" && !FILE_TYPES.has(field.type) && (
                <FieldBox label="Placeholder">
                    <input
                        value={field.placeholder || ""}
                        onChange={(e) => onUpdate({ placeholder: e.target.value })}
                        disabled={disabled}
                    />
                </FieldBox>
            )}

            {field.type !== "textBlock" && (
                <SubBlock
                    title="Editable by Amni (EBA)"
                    action={
                        <label className={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                checked={!!field.eba}
                                onChange={(e) => onUpdate({ eba: e.target.checked })}
                                disabled={disabled}
                            />
                            <span>EBA-enabled</span>
                        </label>
                    }
                >
                    <p className={styles.dim}>
                        When enabled, VRM can edit this field at Stage B (and at Stage E if
                        also present in that stage's view). Downstream reviewers
                        (Supervisor at C, HOD at F) see the edit highlighted with a full
                        audit trail and can flag or return.
                    </p>
                </SubBlock>
            )}

            <SubBlock title="Approval & defaults">
                <FieldBox label="Approval label">
                    <input
                        value={field.approvalLabel || ""}
                        onChange={(e) => onUpdate({ approvalLabel: e.target.value })}
                        disabled={disabled}
                        placeholder="Different label for the approval view (optional)"
                    />
                </FieldBox>
                {field.type !== "textBlock" && !FILE_TYPES.has(field.type) && (
                    <FieldBox label="Default value">
                        <input
                            value={field.defaultValue || ""}
                            onChange={(e) => onUpdate({ defaultValue: e.target.value })}
                            disabled={disabled}
                            placeholder="Pre-fills the field for the contractor"
                        />
                    </FieldBox>
                )}
            </SubBlock>

            {field.type === "textBlock" && (
                <SubBlock title="Content">
                    <FieldBox label="Body text">
                        <textarea
                            rows={5}
                            value={field.text || ""}
                            onChange={(e) => onUpdate({ text: e.target.value })}
                            disabled={disabled}
                            placeholder="Markdown / HTML rendered as a static block"
                        />
                    </FieldBox>
                    <p className={styles.dim}>
                        Plain text or simple HTML. Shown to the contractor as a non-input block.
                    </p>
                </SubBlock>
            )}

            {field.type !== "textBlock" && (
                <SubBlock
                    title="Multiples allowed"
                    action={
                        <label className={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                checked={!!field.allowMultiple}
                                onChange={(e) => onUpdate({ allowMultiple: e.target.checked })}
                                disabled={disabled}
                            />
                            <span>Allow multiple</span>
                        </label>
                    }
                >
                    {field.allowMultiple ? (
                        <>
                            <FieldBox label="‘Add another’ button text">
                                <input
                                    value={field.addFieldText || ""}
                                    onChange={(e) => onUpdate({ addFieldText: e.target.value })}
                                    disabled={disabled}
                                    placeholder="+ Add another"
                                />
                            </FieldBox>
                            <FieldBox label="Repeated instance label">
                                <input
                                    value={field.addedFieldLabel || ""}
                                    onChange={(e) => onUpdate({ addedFieldLabel: e.target.value })}
                                    disabled={disabled}
                                    placeholder='e.g. "Director #{n}"'
                                />
                            </FieldBox>
                        </>
                    ) : (
                        <p className={styles.dim}>
                            Off - contractors see a single instance of this field.
                        </p>
                    )}
                </SubBlock>
            )}

            {FILE_TYPES.has(field.type) && (
                <SubBlock title={field.type === "certificate" ? "Certificate upload" : "File upload"}>
                    <div className={styles.twoCol}>
                        <FieldBox label="Max files allowed">
                            <input
                                type="number"
                                min={1}
                                value={field.maxAllowedFiles ?? 1}
                                onChange={(e) =>
                                    onUpdate({
                                        maxAllowedFiles:
                                            e.target.value === "" ? undefined : Number(e.target.value),
                                    })
                                }
                                disabled={disabled}
                            />
                        </FieldBox>
                        <div className={styles.fieldBox}>
                            <label>Re-use previous</label>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={!!field.allowSelectPreviouslyUploadedFile}
                                    onChange={(e) =>
                                        onUpdate({ allowSelectPreviouslyUploadedFile: e.target.checked })
                                    }
                                    disabled={disabled}
                                />
                                <span>Allow picking previously uploaded files</span>
                            </label>
                        </div>
                    </div>

                    <div className={styles.fieldBox}>
                        <label>Allowed formats</label>
                        <div className={styles.formatGrid}>
                            {FILE_FORMATS.map((fmt) => {
                                const selected = (field.allowedFormats || []).includes(fmt)
                                return (
                                    <button
                                        key={fmt}
                                        type="button"
                                        className={`${styles.formatChip} ${selected ? styles.formatChipOn : ""}`}
                                        onClick={() => toggleFormat(fmt)}
                                        disabled={disabled}
                                    >
                                        {fmt}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {field.type === "certificate" && (
                        <>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={!!field.hasExpiryDate}
                                    onChange={(e) => onUpdate({ hasExpiryDate: e.target.checked })}
                                    disabled={disabled}
                                />
                                <span>Has expiry date</span>
                            </label>
                            <div className={styles.certNote}>
                                <strong>Certificate tracking:</strong> each upload is recorded with{" "}
                                <code>issueDate</code>, <code>expiryDate</code> (when enabled),{" "}
                                <code>certStatus</code> (pending → approved/rejected), and{" "}
                                <code>updateCode</code> (stable slot ID so re-uploads replace in-place rather than
                                creating duplicates). Re-uploads automatically flip status back to{" "}
                                <em>pending</em> for staff re-review. Expiry status is computed at view time -
                                no cron needed.
                            </div>
                        </>
                    )}
                </SubBlock>
            )}

            {hasOpts && (
                <SubBlock title="Options">
                    {(field.options || []).map((o, i) => (
                        <div key={i} className={styles.optionRow}>
                            <input
                                placeholder="Label"
                                value={o.label}
                                onChange={(e) => updateOption(i, { label: e.target.value })}
                                disabled={disabled}
                            />
                            <input
                                className={styles.codeInput}
                                placeholder="key"
                                value={o.key}
                                onChange={(e) => updateOption(i, { key: e.target.value })}
                                disabled={disabled}
                            />
                            <div className={styles.iconBar}>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => moveOption(i, -1)}
                                    disabled={disabled || i === 0}
                                >↑</button>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => moveOption(i, 1)}
                                    disabled={disabled || i === (field.options?.length || 1) - 1}
                                >↓</button>
                                <button
                                    className={styles.iconBtnDanger}
                                    onClick={() => removeOption(i)}
                                    disabled={disabled}
                                >×</button>
                            </div>
                        </div>
                    ))}
                    <button className={styles.btnDashed} onClick={addOption} disabled={disabled}>
                        + Add option
                    </button>
                </SubBlock>
            )}

            {CURRENCY_TYPES.has(field.type) && (
                <SubBlock title="Currency">
                    <div className={styles.fieldBox}>
                        <label>Available currencies</label>
                        <div className={styles.formatGrid}>
                            {Array.from(
                                new Set([...DEFAULT_CURRENCY_CHOICES, ...(field.currencyOptions || [])]),
                            ).map((code) => {
                                const on = (field.currencyOptions || []).includes(code)
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        className={`${styles.formatChip} ${on ? styles.formatChipOn : ""}`}
                                        onClick={() => toggleCurrency(code)}
                                        disabled={disabled}
                                    >
                                        {code}
                                    </button>
                                )
                            })}
                        </div>
                        <p className={styles.dim}>
                            Contractors will pick from the highlighted set. Keep at least one.
                        </p>
                    </div>
                    <div className={styles.twoCol}>
                        <FieldBox label="Default currency">
                            <select
                                value={field.defaultCurrency || (field.currencyOptions || ["NGN"])[0]}
                                onChange={(e) => onUpdate({ defaultCurrency: e.target.value })}
                                disabled={disabled}
                            >
                                {(field.currencyOptions || []).map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </FieldBox>
                        <div className={styles.fieldBox}>
                            <label>Contractor can change</label>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={field.allowCurrencyChange !== false}
                                    onChange={(e) =>
                                        onUpdate({ allowCurrencyChange: e.target.checked })
                                    }
                                    disabled={disabled}
                                />
                                <span>Allow currency change</span>
                            </label>
                        </div>
                    </div>
                    <FieldBox label="Picker display">
                        <div className={styles.segmented}>
                            <button
                                type="button"
                                className={`${styles.segmentBtn} ${
                                    (field.currencyDisplay || "dropdown") === "dropdown" ? styles.segmentActive : ""
                                }`}
                                onClick={() => onUpdate({ currencyDisplay: "dropdown" })}
                                disabled={disabled}
                            >
                                Dropdown
                            </button>
                            <button
                                type="button"
                                className={`${styles.segmentBtn} ${
                                    field.currencyDisplay === "radio" ? styles.segmentActive : ""
                                }`}
                                onClick={() => onUpdate({ currencyDisplay: "radio" })}
                                disabled={disabled}
                            >
                                Radio buttons
                            </button>
                        </div>
                    </FieldBox>
                </SubBlock>
            )}

            {(isText || isNumeric) && (
                <SubBlock title="Validation">
                    {isText && (
                        <>
                            <div className={styles.twoCol}>
                                <FieldBox label="Min length">
                                    <input
                                        type="number"
                                        value={field.validation?.minLength ?? ""}
                                        onChange={(e) =>
                                            updateValidation({
                                                minLength: e.target.value === "" ? undefined : Number(e.target.value),
                                            })
                                        }
                                        disabled={disabled}
                                    />
                                </FieldBox>
                                <FieldBox label="Max length">
                                    <input
                                        type="number"
                                        value={field.validation?.maxLength ?? ""}
                                        onChange={(e) =>
                                            updateValidation({
                                                maxLength: e.target.value === "" ? undefined : Number(e.target.value),
                                            })
                                        }
                                        disabled={disabled}
                                    />
                                </FieldBox>
                            </div>
                            <FieldBox label="Regex pattern">
                                <input
                                    className={styles.codeInput}
                                    value={field.validation?.pattern || ""}
                                    onChange={(e) => updateValidation({ pattern: e.target.value })}
                                    disabled={disabled}
                                    placeholder="e.g. ^[A-Z0-9-]+$"
                                />
                            </FieldBox>
                            {field.validation?.pattern && (
                                <FieldBox label="Pattern error message">
                                    <input
                                        value={field.validation?.patternMessage || ""}
                                        onChange={(e) => updateValidation({ patternMessage: e.target.value })}
                                        disabled={disabled}
                                    />
                                </FieldBox>
                            )}
                        </>
                    )}
                    {isNumeric && (
                        <div className={styles.twoCol}>
                            <FieldBox label="Min">
                                <input
                                    type="number"
                                    value={field.validation?.min ?? ""}
                                    onChange={(e) =>
                                        updateValidation({
                                            min: e.target.value === "" ? undefined : Number(e.target.value),
                                        })
                                    }
                                    disabled={disabled}
                                />
                            </FieldBox>
                            <FieldBox label="Max">
                                <input
                                    type="number"
                                    value={field.validation?.max ?? ""}
                                    onChange={(e) =>
                                        updateValidation({
                                            max: e.target.value === "" ? undefined : Number(e.target.value),
                                        })
                                    }
                                    disabled={disabled}
                                />
                            </FieldBox>
                        </div>
                    )}
                </SubBlock>
            )}

            <SubBlock
                title="Visibility"
                action={
                    field.visibleIf ? (
                        <button className={styles.linkBtn} onClick={() => updateVisibleIf(null)} disabled={disabled}>
                            Always show
                        </button>
                    ) : null
                }
            >
                {!field.visibleIf ? (
                    <p className={styles.dim}>
                        Always visible.{" "}
                        {otherFieldKeys.length > 0 ? (
                            <button
                                className={styles.linkBtn}
                                onClick={() => updateVisibleIf({ field: otherFieldKeys[0], op: "eq", value: "" })}
                                disabled={disabled}
                            >
                                Add condition
                            </button>
                        ) : (
                            <span className={styles.dim}>(no other fields to depend on yet)</span>
                        )}
                    </p>
                ) : (
                    <>
                        <FieldBox label="Show when field">
                            <select
                                value={field.visibleIf.field}
                                onChange={(e) => updateVisibleIf({ field: e.target.value })}
                                disabled={disabled}
                            >
                                <option value="">Select a field…</option>
                                {otherFieldKeys.map((k) => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        </FieldBox>
                        <div className={styles.twoCol}>
                            <FieldBox label="Operator">
                                <select
                                    value={field.visibleIf.op}
                                    onChange={(e) => updateVisibleIf({ op: e.target.value as any })}
                                    disabled={disabled}
                                >
                                    <option value="eq">equals</option>
                                    <option value="neq">does not equal</option>
                                </select>
                            </FieldBox>
                            <FieldBox label="Value">
                                <input
                                    value={field.visibleIf.value}
                                    onChange={(e) => updateVisibleIf({ value: e.target.value })}
                                    disabled={disabled}
                                />
                            </FieldBox>
                        </div>
                    </>
                )}
            </SubBlock>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Small UI primitives
// ═══════════════════════════════════════════════════════════════════════════
const FieldBox = ({
    label, children, error,
}: { label: string; children: React.ReactNode; error?: string }) => (
    <div className={styles.fieldBox}>
        <label>{label}</label>
        {children}
        {error && <span className={styles.errText}>{error}</span>}
    </div>
)

const SubBlock = ({
    title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <div className={styles.subBlock}>
        <div className={styles.subBlockHeader}>
            <span>{title}</span>
            {action}
        </div>
        <div className={styles.subBlockBody}>{children}</div>
    </div>
)

export default FormBuilder
