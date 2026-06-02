'use client'

// V2 contractor application page.
//
// Route: /contractor/v2/application
// Auth: Firebase (contractor logged in as Vendor — gated by /contractor layout).
//
// Replaces the earlier hash-authed /contractor/v2/form/[hash] page. The
// invite is now only a registration gate; once the contractor has a login,
// they reach this page via the contractor dashboard and read/write their
// SubmissionV2 through /api/v2/submissions/mine.

import FormRenderer, { validateSchema } from "@/components/form/FormRenderer"
import { FileFieldValue } from "@/components/form/FileFieldUploader"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { patchProtected } from "@/requests/patch"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles.module.css"

interface FormVersion {
    _id: string
    versionNumber: number
    schema: any
}

interface Submission {
    _id: string
    status: string
    submitted: boolean
    level: number
    cycleNumber: number
    answers: Record<string, any> | Map<string, any>
    companyName: string
    contractorEmail: string
}

interface Remark {
    _id: string
    text: string
    sectionKey: string
    fieldKey?: string
    authorName?: string
    cycleNumber?: number
    status?: "active" | "addressed" | "withdrawn"
}

// ── Page-progress helpers ───────────────────────────────────────────────────
// Walk a single page's sections + fields and count required + filled. Used by
// the tab strip badges so the contractor can see at a glance which pages still
// need attention.

const visibleHere = (field: any, scope: Record<string, any>): boolean => {
    if (!field.visibleIf) return true
    const dep = scope?.[field.visibleIf.field]
    const depStr =
        dep === undefined || dep === null
            ? ""
            : Array.isArray(dep)
              ? dep.map(String).join(",")
              : String(dep)
    if (field.visibleIf.op === "eq") return depStr === String(field.visibleIf.value)
    if (field.visibleIf.op === "neq") return depStr !== String(field.visibleIf.value)
    return true
}

const isFilled = (v: any): boolean => {
    if (v === undefined || v === null || v === "") return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "object") {
        // Currency-style { amount, currency }
        if ("amount" in v) return v.amount !== "" && v.amount != null
        return Object.keys(v).length > 0
    }
    return true
}

const countRequired = (page: any, answers: Record<string, any>): number => {
    let n = 0
    for (const sec of page.sections || []) {
        if (sec.allowMultiple) {
            // Required count across configured instances — fall back to 1 row.
            const instances: any[] = Array.isArray(answers?.[sec.key]) ? answers[sec.key] : [{}]
            instances.forEach((inst) => {
                for (const f of sec.fields || []) {
                    if (f.required && f.enabled !== false && visibleHere(f, inst)) n++
                }
            })
        } else {
            for (const f of sec.fields || []) {
                if (f.required && f.enabled !== false && visibleHere(f, answers)) n++
            }
        }
    }
    return n
}

const countFilledRequired = (page: any, answers: Record<string, any>): number => {
    let n = 0
    for (const sec of page.sections || []) {
        if (sec.allowMultiple) {
            const instances: any[] = Array.isArray(answers?.[sec.key]) ? answers[sec.key] : []
            instances.forEach((inst) => {
                for (const f of sec.fields || []) {
                    if (f.required && f.enabled !== false && visibleHere(f, inst) && isFilled(inst?.[f.key])) n++
                }
            })
        } else {
            for (const f of sec.fields || []) {
                if (f.required && f.enabled !== false && visibleHere(f, answers) && isFilled(answers?.[f.key])) n++
            }
        }
    }
    return n
}

const V2ApplicationPage = () => {
    const user = useSelector((state: any) => state.user.user)
    const role = user?.role
    const { confirm, dialog: confirmDialog } = useConfirmDialog()

    const [submission, setSubmission] = useState<Submission | null>(null)
    const [formVersion, setFormVersion] = useState<FormVersion | null>(null)
    const [remarks, setRemarks] = useState<Remark[]>([])
    const [migrationAvailable, setMigrationAvailable] = useState<any>(null)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState("")
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [saveSuccess, setSaveSuccess] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    // Active page tab — contractor steps through the form one page at a time.
    const [activePageKey, setActivePageKey] = useState<string | null>(null)
    // Autosave: track whether unsynced edits exist + last save timestamp.
    const [dirty, setDirty] = useState(false)
    const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
    const [autoSaveError, setAutoSaveError] = useState("")
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchSubmission = async () => {
        try {
            setLoading(true)
            setFetchError("")
            const result = await getProtected("api/v2/submissions/mine", role)
            if (result?.status === "OK") {
                const sub = result.data.submission as Submission
                setSubmission(sub)
                setFormVersion(result.data.formVersion as FormVersion)
                setRemarks((result.data.remarks || []) as Remark[])
                setMigrationAvailable(result.data.migrationAvailable || null)
                const a = sub.answers
                setAnswers(a && typeof a === "object" ? (a as Record<string, any>) : {})
            } else {
                setFetchError(result?.error?.message || "Could not load your application.")
            }
        } catch (e: any) {
            setFetchError(e?.message || "Could not reach the server.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (role) fetchSubmission()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role])

    // Default the active page tab to the first page once the form loads.
    useEffect(() => {
        if (!activePageKey && formVersion?.schema?.pages?.[0]?.key) {
            setActivePageKey(formVersion.schema.pages[0].key)
        }
    }, [formVersion, activePageKey])

    const handleChange = (changes: Record<string, any>) => {
        setAnswers((prev) => ({ ...prev, ...changes }))
        setSaveSuccess("")
        setSaveError("")
        setDirty(true)
        setAutoSaveStatus("idle")
    }

    // Debounced autosave. Fires 1.5s after the contractor stops typing,
    // skips when status is read-only (already with reviewers). Save Draft
    // button still works as an explicit "save now" trigger.
    useEffect(() => {
        if (!submission || !dirty) return
        if (!["draft", "returned"].includes(submission.status)) return
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                setAutoSaveStatus("saving")
                const result = await patchProtected(
                    "api/v2/submissions/mine/answers",
                    { answers },
                    role,
                )
                if (result?.status === "OK") {
                    setSubmission(result.data.submission)
                    setDirty(false)
                    setAutoSaveStatus("saved")
                    setAutoSaveError("")
                } else {
                    setAutoSaveStatus("error")
                    setAutoSaveError(result?.error?.message || "Autosave failed.")
                }
            } catch (e: any) {
                setAutoSaveStatus("error")
                setAutoSaveError(e?.message || "Autosave failed.")
            }
        }, 1500)
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers, dirty, submission?.status])

    const saveDraft = async () => {
        if (!submission) return
        try {
            setSaving(true)
            setSaveError("")
            setSaveSuccess("")
            const result = await patchProtected(
                "api/v2/submissions/mine/answers",
                { answers },
                role,
            )
            if (result?.status === "OK") {
                setSubmission(result.data.submission)
                setSaveSuccess("Draft saved.")
            } else {
                setSaveError(result?.error?.message || "Save failed.")
            }
        } catch (e: any) {
            setSaveError(e?.message || "Save failed.")
        } finally {
            setSaving(false)
        }
    }

    const submitOrResubmit = async () => {
        if (!submission || !formVersion) return
        const isResubmit = submission.status === "returned"

        const errs = validateSchema(formVersion.schema, answers, "fill")
        setValidationErrors(errs)
        if (Object.keys(errs).length > 0) {
            setSubmitError(
                `Please fix ${Object.keys(errs).length} field${
                    Object.keys(errs).length === 1 ? "" : "s"
                } before submitting.`,
            )
            const firstKey = Object.keys(errs)[0]

            // Find which page contains the field with the first error. The
            // renderer only mounts fields for the active page, so a direct
            // querySelector misses errors on other pages. Switch pages first,
            // then scroll on the next tick after the field is mounted.
            const pages = formVersion?.schema?.pages || []
            const fieldHostPage = pages.find((p: any) =>
                (p.sections || []).some((s: any) =>
                    (s.fields || []).some((f: any) => {
                        // Match flat fieldKey OR repeated section path
                        // 'sectionKey[idx].fieldKey'.
                        if (firstKey === f.key) return true
                        if (firstKey.startsWith(`${s.key}[`) && firstKey.endsWith(`.${f.key}`)) return true
                        return false
                    }),
                ),
            )
            const scrollOnce = () => {
                document
                    .querySelector(`[id^="field-${CSS.escape(firstKey)}"]`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            if (fieldHostPage && fieldHostPage.key !== activePageKey) {
                setActivePageKey(fieldHostPage.key)
                // Wait for the render → then scroll.
                setTimeout(scrollOnce, 80)
            } else {
                scrollOnce()
            }
            return
        }

        const ok = await confirm({
            headerText: isResubmit ? "Resubmit application?" : "Submit application?",
            bodyText: isResubmit
                ? "Make sure all reviewer remarks have been addressed. You won't be able to edit the application again until it's returned to you."
                : "Once submitted, you won't be able to edit this application unless a reviewer returns it to you.",
            confirmText: isResubmit ? "Resubmit" : "Submit",
        })
        if (!ok) return

        try {
            setSubmitting(true)
            setSubmitError("")
            // Save any pending edits first.
            await patchProtected("api/v2/submissions/mine/answers", { answers }, role)
            const result = await postProtected(
                `api/v2/submissions/mine/${isResubmit ? "resubmit" : "submit"}`,
                {},
                role,
            )
            if (result?.status === "OK") {
                await fetchSubmission()
            } else {
                setSubmitError(result?.error?.message || "Submit failed.")
            }
        } catch (e: any) {
            setSubmitError(e?.message || "Submit failed.")
        } finally {
            setSubmitting(false)
        }
    }

    const previousFilesByField = useMemo<Record<string, FileFieldValue[]>>(() => {
        if (!formVersion?.schema) return {}
        const allFiles: FileFieldValue[] = []
        const visit = (val: any) => {
            if (!val) return
            if (Array.isArray(val)) {
                for (const v of val) {
                    if (v && typeof v === "object" && (v as any).url && (v as any).updateCode) {
                        allFiles.push(v as FileFieldValue)
                    } else if (v && typeof v === "object") {
                        Object.values(v).forEach(visit)
                    }
                }
            }
        }
        Object.values(answers).forEach(visit)

        const out: Record<string, FileFieldValue[]> = {}
        const pages = (formVersion.schema as any).pages || []
        for (const p of pages) {
            for (const s of p.sections || []) {
                for (const f of s.fields || []) {
                    if (
                        (f.type === "file" || f.type === "certificate") &&
                        f.allowSelectPreviouslyUploadedFile
                    ) {
                        out[f.key] = allFiles
                    }
                }
            }
        }
        return out
    }, [answers, formVersion])

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <p>Loading your application…</p>
                </div>
            </div>
        )
    }

    if (fetchError || !submission || !formVersion) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h2 className={styles.title}>Application Form</h2>
                    <div className={styles.errorBanner}>
                        {fetchError || "Could not load your application."}
                    </div>
                </div>
            </div>
        )
    }

    const readOnly = ["pending", "park requested", "parked", "approved"].includes(submission.status)
    const isReturned = submission.status === "returned"
    // Split active remarks for the current cycle into section-anchored
    // and field-anchored buckets so the FormRenderer can show the right
    // indicator. A remark with a fieldKey lights up that field; one
    // without lights up the whole section header.
    const remarksBySection: Record<string, Remark[]> = {}
    const remarksByField: Record<string, Remark[]> = {}
    remarks
        .filter(
            (r) =>
                (!r.cycleNumber || r.cycleNumber === submission.cycleNumber) &&
                r.status === "active",
        )
        .forEach((r) => {
            if ((r as any).fieldKey) {
                const k = `${r.sectionKey || ""}::${(r as any).fieldKey}`
                if (!remarksByField[k]) remarksByField[k] = []
                remarksByField[k].push(r)
            } else {
                const k = r.sectionKey || ""
                if (!remarksBySection[k]) remarksBySection[k] = []
                remarksBySection[k].push(r)
            }
        })

    return (
        <div className={styles.page}>
            {confirmDialog}
            <div className={styles.card}>
                <header className={styles.header}>
                    <h2 className={styles.title}>{submission.companyName || "Application form"}</h2>
                    <p className={styles.subtitle}>
                        Status: <strong>{submission.status}</strong>
                        {submission.submitted && ` · cycle ${submission.cycleNumber}`}
                    </p>
                    {isReturned && (
                        <div className={styles.bannerReturned}>
                            This application has been returned to you for fixes. Please address the
                            reviewer notes below and resubmit.
                        </div>
                    )}
                    {readOnly && !isReturned && (
                        <div className={styles.bannerInfo}>
                            This application is currently with reviewers and cannot be edited. You'll
                            be notified by email if changes are needed.
                        </div>
                    )}
                    {migrationAvailable && (
                        <div className={styles.bannerMigration}>
                            <strong>This form was updated since you started.</strong>
                            <p>
                                {migrationAvailable.diff?.addedFieldKeys?.length || 0} new field(s)
                                were added
                                {migrationAvailable.diff?.requiredAddedFieldKeys?.length
                                    ? ` (${migrationAvailable.diff.requiredAddedFieldKeys.length} required)`
                                    : ""}
                                {migrationAvailable.diff?.removedFieldKeys?.length
                                    ? `, ${migrationAvailable.diff.removedFieldKeys.length} removed`
                                    : ""}
                                {migrationAvailable.diff?.changedTypeFieldKeys?.length
                                    ? `, ${migrationAvailable.diff.changedTypeFieldKeys.length} changed type`
                                    : ""}
                                .{" "}
                                {migrationAvailable.diff?.isSafe
                                    ? "Please check your answers before submitting."
                                    : "Some answers may need re-entry. The updated form will load when you refresh; contact your invitation team if you have questions."}
                            </p>
                        </div>
                    )}
                </header>

                {/* Page tab strip — mirrors the form-builder pagination so the
                    contractor can jump between pages and pick up where they
                    left off (autosave handles persistence). Only one page is
                    rendered at a time via activePageKey on FormRenderer. */}
                {formVersion.schema?.pages?.length > 1 && (
                    <div className={styles.pageTabs}>
                        {formVersion.schema.pages.map((p: any, i: number) => {
                            const active = activePageKey === p.key
                            const filled = countFilledRequired(p, answers)
                            const required = countRequired(p, answers)
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    className={`${styles.pageTab} ${active ? styles.pageTabActive : ""}`}
                                    onClick={() => setActivePageKey(p.key)}
                                    title={p.title}
                                >
                                    <span className={styles.pageTabIdx}>{i + 1}</span>
                                    <span className={styles.pageTabLabel}>{p.title}</span>
                                    {required > 0 && (
                                        <span className={`${styles.pageTabBadge} ${filled === required ? styles.pageTabBadgeDone : ""}`}>
                                            {filled}/{required}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                <FormRenderer
                    schema={formVersion.schema}
                    answers={answers}
                    mode={readOnly && !isReturned ? "view" : "fill"}
                    activePageKey={activePageKey || undefined}
                    onChange={handleChange}
                    activeRemarksBySection={remarksBySection}
                    activeRemarksByField={remarksByField}
                    previousFilesByField={previousFilesByField}
                    errors={validationErrors}
                />

                {/* Previous / Next page navigation within the form. */}
                {formVersion.schema?.pages?.length > 1 && (
                    <div className={styles.pageNav}>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => {
                                const pages = formVersion.schema.pages
                                const idx = pages.findIndex((p: any) => p.key === activePageKey)
                                if (idx > 0) {
                                    setActivePageKey(pages[idx - 1].key)
                                    window.scrollTo({ top: 0, behavior: "smooth" })
                                }
                            }}
                            disabled={
                                !activePageKey ||
                                formVersion.schema.pages.findIndex((p: any) => p.key === activePageKey) === 0
                            }
                        >
                            ← Previous page
                        </button>
                        <span className={styles.pageNavInfo}>
                            Page {formVersion.schema.pages.findIndex((p: any) => p.key === activePageKey) + 1}
                            {" "}of {formVersion.schema.pages.length}
                        </span>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => {
                                const pages = formVersion.schema.pages
                                const idx = pages.findIndex((p: any) => p.key === activePageKey)
                                if (idx >= 0 && idx < pages.length - 1) {
                                    setActivePageKey(pages[idx + 1].key)
                                    window.scrollTo({ top: 0, behavior: "smooth" })
                                }
                            }}
                            disabled={
                                !activePageKey ||
                                formVersion.schema.pages.findIndex((p: any) => p.key === activePageKey) ===
                                    formVersion.schema.pages.length - 1
                            }
                        >
                            Next page →
                        </button>
                    </div>
                )}

                {!readOnly || isReturned ? (
                    <div className={styles.actions}>
                        <button
                            className={styles.btnSecondary}
                            onClick={saveDraft}
                            disabled={saving || submitting}
                        >
                            {saving ? "Saving…" : "Save draft"}
                        </button>
                        <button
                            className={styles.btnPrimary}
                            onClick={submitOrResubmit}
                            disabled={saving || submitting}
                        >
                            {submitting ? "Submitting…" : isReturned ? "Resubmit" : "Submit application"}
                        </button>
                        <span className={styles.autosaveStatus}>
                            {autoSaveStatus === "saving" && "Autosaving…"}
                            {autoSaveStatus === "saved" && "✓ All changes saved"}
                            {autoSaveStatus === "error" && (
                                <span className={styles.statusErr}>Autosave failed: {autoSaveError}</span>
                            )}
                            {autoSaveStatus === "idle" && dirty && "Unsaved changes…"}
                        </span>
                        {saveSuccess && <span className={styles.statusOk}>{saveSuccess}</span>}
                        {saveError && <span className={styles.statusErr}>{saveError}</span>}
                        {submitError && <span className={styles.statusErr}>{submitError}</span>}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default V2ApplicationPage
