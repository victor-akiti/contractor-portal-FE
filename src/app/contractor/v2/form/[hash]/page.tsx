'use client'

// Contractor V2 form-fill page.
// Route: /contractor/v2/form/[hash]
// Auth: invite hash IS the token. No Firebase login required.
//
// Flow:
//   1. GET /api/v2/submissions/by-hash/:hash — loads (or creates) the
//      SubmissionV2, returns it + the FormVersion schema + active remarks.
//   2. Contractor edits answers. PATCH /by-hash/:hash/answers fires on
//      "Save draft" (no continuous autosave for MVP — explicit button).
//   3. "Submit" button fires POST /by-hash/:hash/submit (first cycle) or
//      /resubmit (subsequent cycles, after a return).

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import FormRenderer, { validateSchema } from "@/components/form/FormRenderer"
import { FileFieldValue } from "@/components/form/FileFieldUploader"
import { BACKEND_BASE_URL } from "@/lib/config"
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
    authorName?: string
    cycleNumber?: number
}

const callPlain = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${BACKEND_BASE_URL}/${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    })
    if (!res.ok) {
        // Try to parse a structured error body
        let message = `Request failed with status ${res.status}`
        try {
            const body = await res.json()
            message = body?.message || body?.error?.message || message
        } catch {
            // ignore
        }
        return { status: "FAILED", error: { message } }
    }
    return res.json()
}

const ContractorFormPage = () => {
    const params = useParams<{ hash: string }>()
    const hash = params?.hash

    const [submission, setSubmission] = useState<Submission | null>(null)
    const [formVersion, setFormVersion] = useState<FormVersion | null>(null)
    const [remarks, setRemarks] = useState<Remark[]>([])
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState("")
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [saveSuccess, setSaveSuccess] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    const fetchSubmission = async () => {
        try {
            setLoading(true)
            setFetchError("")
            const result = await callPlain(`api/v2/submissions/by-hash/${hash}`)
            if (result?.status === "OK") {
                const sub = result.data.submission as Submission
                setSubmission(sub)
                setFormVersion(result.data.formVersion as FormVersion)
                setRemarks((result.data.remarks || []) as Remark[])
                // Mongoose Map serialises to an object over JSON.
                const a = sub.answers
                setAnswers(a && typeof a === "object" ? (a as Record<string, any>) : {})
            } else {
                setFetchError(result?.error?.message || "Could not load the form.")
            }
        } catch (e: any) {
            setFetchError(e?.message || "Could not reach the server.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (hash) fetchSubmission()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hash])

    const handleChange = (changes: Record<string, any>) => {
        setAnswers((prev) => ({ ...prev, ...changes }))
        setSaveSuccess("")
        setSaveError("")
    }

    const saveDraft = async () => {
        if (!submission) return
        try {
            setSaving(true)
            setSaveError("")
            setSaveSuccess("")
            const result = await callPlain(`api/v2/submissions/by-hash/${hash}/answers`, {
                method: "PATCH",
                body: JSON.stringify({ answers }),
            })
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

        // Block submit if there are validation errors.
        const errs = validateSchema(formVersion.schema, answers, "fill")
        setValidationErrors(errs)
        if (Object.keys(errs).length > 0) {
            setSubmitError(
                `Please fix ${Object.keys(errs).length} field${
                    Object.keys(errs).length === 1 ? "" : "s"
                } before submitting.`,
            )
            // Scroll to the first error if possible
            const firstKey = Object.keys(errs)[0]
            const el = document.querySelector(`[id^="field-${firstKey}"]`)
            el?.scrollIntoView({ behavior: "smooth", block: "center" })
            return
        }

        if (!confirm(
            isResubmit
                ? "Resubmit this application to the reviewer? Make sure all remarks have been addressed."
                : "Submit this application? You won't be able to edit it after this unless it's returned to you."
        )) return

        try {
            setSubmitting(true)
            setSubmitError("")
            // Save any pending edits first.
            await callPlain(`api/v2/submissions/by-hash/${hash}/answers`, {
                method: "PATCH",
                body: JSON.stringify({ answers }),
            })
            const result = await callPlain(
                `api/v2/submissions/by-hash/${hash}/${isResubmit ? "resubmit" : "submit"}`,
                { method: "POST", body: JSON.stringify({}) }
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

    // Build a per-field map of files already uploaded across the form so the
    // FileFieldUploader's "re-use a previously uploaded file" picker has
    // something to show. We walk all file/cert field values in the current
    // answers and group by every field that allows re-use.
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
                <div className={styles.card}><p>Loading…</p></div>
            </div>
        )
    }

    if (fetchError || !submission || !formVersion) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h2 className={styles.title}>Application Form</h2>
                    <div className={styles.errorBanner}>{fetchError || "Could not load form."}</div>
                </div>
            </div>
        )
    }

    const readOnly = ["pending", "park requested", "parked", "approved"].includes(submission.status)
    const isReturned = submission.status === "returned"
    const remarksBySection: Record<string, Remark[]> = {}
    remarks
        .filter((r) => !r.cycleNumber || r.cycleNumber === submission.cycleNumber)
        .forEach((r) => {
            const key = r.sectionKey || ""
            if (!remarksBySection[key]) remarksBySection[key] = []
            remarksBySection[key].push(r)
        })

    return (
        <div className={styles.page}>
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
                </header>

                <FormRenderer
                    schema={formVersion.schema}
                    answers={answers}
                    mode={readOnly && !isReturned ? "view" : "fill"}
                    onChange={handleChange}
                    activeRemarksBySection={remarksBySection}
                    uploadAuthHash={hash}
                    previousFilesByField={previousFilesByField}
                    errors={validationErrors}
                />

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
                        {saveSuccess && <span className={styles.statusOk}>{saveSuccess}</span>}
                        {saveError && <span className={styles.statusErr}>{saveError}</span>}
                        {submitError && <span className={styles.statusErr}>{submitError}</span>}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default ContractorFormPage
