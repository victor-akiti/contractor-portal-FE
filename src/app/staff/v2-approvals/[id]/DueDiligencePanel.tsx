"use client"

/**
 * DueDiligencePanel — combined Stage E (record DD), Stage F (HOD review)
 * and Stage G (Executive Approver view) UI.
 *
 * Behaviour by level:
 *  - level 3 (Stage E): the four checks (registration, internet, reference)
 *    are editable. Exposed-persons list supports add / update / delete.
 *  - level 4 (Stage F): read-only display of the DD record + HOD approval
 *    checkboxes (one per check) + Remark for Executive Approver textarea.
 *  - level 5 (Stage G): read-only display of the DD record + HOD approval
 *    marks + HOD remark for EA. Action buttons live in the parent header.
 *  - everywhere else: read-only summary if a DD record exists; otherwise
 *    an empty-state message.
 *
 * File uploads use the existing POST /api/v2/upload staff endpoint which
 * returns [{url, name, ...}]. Files are stored inline on the dueDiligence
 * subdoc as [{url, name}] arrays.
 */

import { useState } from "react"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import SuccessMessage from "@/components/successMessage"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import { deleteProtected } from "@/requests/delete"
import { BACKEND_BASE_URL } from "@/lib/config"
import { auth } from "@/lib/firebase"
import { getIdToken } from "firebase/auth"
import styles from "./styles.module.css"

type FileRef = { url: string; name: string }
type DDCheck = {
    flagged?: boolean
    flagMessage?: string
    files?: FileRef[]
    completed?: boolean
}
type ExposedPerson = {
    _id?: string
    entityType?: "individual" | "corporate"
    title?: string
    firstName?: string
    lastName?: string
    otherName?: string
    companyName?: string
    registrationNumber?: string
    role?: string
    flagged?: boolean
    flagMessage?: string
    files?: FileRef[]
}

type DD = {
    registrationCheck?: DDCheck
    internetCheck?: DDCheck
    referenceCheck?: DDCheck
    exposedPersons?: ExposedPerson[]
    exposedPersonsReviewed?: boolean
    hodApprovals?: {
        registrationCheck?: boolean
        internetCheck?: boolean
        referenceCheck?: boolean
        exposedPersonsCheck?: boolean
        actor?: { name?: string; role?: string; email?: string }
        date?: string
    }
}

interface Props {
    submissionId: string
    role: string
    level: number
    status: string
    dueDiligence: DD | null
    hodRemarkForEA?: string
    onReload: () => Promise<void> | void
}

const CHECK_LABELS: Record<string, string> = {
    registrationCheck: "Registration Check",
    internetCheck: "Internet Check",
    referenceCheck: "Reference Check",
}

// Short prompts per check so the DD officer always knows what they are
// looking for. Mirrors what the legacy stage-D / stage-E components
// describe in their inline help text.
const CHECK_HELP: Record<string, string> = {
    registrationCheck:
        "Verify the contractor's CAC / corporate registration. Upload the registry screenshot or letter.",
    internetCheck:
        "Open-source search on the contractor, its directors and shareholders. Upload the report.",
    referenceCheck:
        "Contact at least one prior client / referee. Upload the email trail or reference letter.",
}

const CHECK_ORDER: Array<"registrationCheck" | "internetCheck" | "referenceCheck"> = [
    "registrationCheck",
    "internetCheck",
    "referenceCheck",
]

const blankPerson = (): ExposedPerson => ({
    _id: undefined,
    entityType: "individual",
    title: "",
    firstName: "",
    lastName: "",
    otherName: "",
    companyName: "",
    registrationNumber: "",
    role: "",
    flagged: false,
    flagMessage: "",
    files: [],
})

const isCheckComplete = (c?: DDCheck): boolean => {
    if (!c) return false
    if (!c.completed) return false
    if (c.flagged && !c.flagMessage?.trim()) return false
    return (c.files || []).length > 0 || !c.flagged
}

const DueDiligencePanel = ({
    submissionId,
    role,
    level,
    status,
    dueDiligence,
    hodRemarkForEA,
    onReload,
}: Props) => {
    const canEdit = level === 3 && status === "pending"
    const canHodReview = level === 4 && status === "pending" && ["Admin", "HOD"].includes(role)
    const dd: DD = dueDiligence || {}

    const [savingKey, setSavingKey] = useState<string | null>(null)
    const [err, setErr] = useState("")
    const [success, setSuccess] = useState("")

    // Stage F local form state
    const initialApprovals = dd.hodApprovals || {}
    const [hodApprovals, setHodApprovals] = useState({
        registrationCheck: !!initialApprovals.registrationCheck,
        internetCheck: !!initialApprovals.internetCheck,
        referenceCheck: !!initialApprovals.referenceCheck,
        exposedPersonsCheck: !!initialApprovals.exposedPersonsCheck,
    })
    const [remarkForEA, setRemarkForEA] = useState(hodRemarkForEA || "")
    const [savingHod, setSavingHod] = useState(false)

    // Exposed person editor state
    const [editingPerson, setEditingPerson] = useState<ExposedPerson | null>(null)
    const [savingPerson, setSavingPerson] = useState(false)

    // ── Stage E helpers ─────────────────────────────────────────────────────

    const uploadFiles = async (files: FileList | null): Promise<FileRef[]> => {
        if (!files || files.length === 0) return []
        const fd = new FormData()
        for (const f of Array.from(files)) fd.append("file", f)
        fd.append("submissionId", submissionId)
        const url = `${BACKEND_BASE_URL}/api/v2/upload`
        const u = auth.currentUser
        const token = u ? await getIdToken(u) : null
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const res = await fetch(url, {
            method: "POST",
            headers,
            credentials: "include",
            body: fd,
        })
        const json = await res.json()
        if (json?.status !== "OK") throw new Error(json?.error?.message || "Upload failed")
        const data: any[] = Array.isArray(json.data) ? json.data : []
        return data.map((d) => ({ url: d.url, name: d.name }))
    }

    const saveCheck = async (key: keyof DD, next: DDCheck) => {
        setSavingKey(String(key))
        setErr("")
        setSuccess("")
        try {
            const r = await putProtected(
                `api/v2/submissions/${submissionId}/due-diligence`,
                { [key]: next },
                role,
            )
            if (r?.status !== "OK") throw new Error(r?.error?.message || "Save failed")
            await onReload()
            setSuccess(`${CHECK_LABELS[String(key)] || String(key)} saved.`)
        } catch (e: any) {
            setErr(e?.message || "Unexpected error")
        } finally {
            setSavingKey(null)
        }
    }

    const onCheckFiles = async (key: keyof DD, files: FileList | null) => {
        if (!files || files.length === 0) return
        setErr("")
        setSavingKey(String(key))
        try {
            const uploaded = await uploadFiles(files)
            const existing = (dd as any)[key] as DDCheck | undefined
            const next: DDCheck = {
                ...existing,
                files: [...(existing?.files || []), ...uploaded],
            }
            await saveCheck(key, next)
        } catch (e: any) {
            setErr(e?.message || "Upload failed")
            setSavingKey(null)
        }
    }

    const onRemoveCheckFile = async (key: keyof DD, idx: number) => {
        const existing = (dd as any)[key] as DDCheck | undefined
        const files = [...(existing?.files || [])]
        files.splice(idx, 1)
        await saveCheck(key, { ...existing, files })
    }

    // ── Exposed persons ────────────────────────────────────────────────────

    const savePerson = async () => {
        if (!editingPerson) return
        if (editingPerson.entityType === "corporate") {
            if (!editingPerson.companyName?.trim()) {
                setErr("Company name is required.")
                return
            }
        } else if (!editingPerson.firstName?.trim() || !editingPerson.lastName?.trim()) {
            setErr("First name and last name are required.")
            return
        }
        setSavingPerson(true)
        setErr("")
        try {
            const r = await postProtected(
                `api/v2/submissions/${submissionId}/due-diligence/exposed-person`,
                editingPerson,
                role,
            )
            if (r?.status !== "OK") throw new Error(r?.error?.message || "Save failed")
            await onReload()
            setEditingPerson(null)
        } catch (e: any) {
            setErr(e?.message || "Unexpected error")
        } finally {
            setSavingPerson(false)
        }
    }

    const removePerson = async (pid: string) => {
        if (!pid) return
        if (!window.confirm("Remove this exposed-persons entry?")) return
        setErr("")
        try {
            const r = await deleteProtected(
                `api/v2/submissions/${submissionId}/due-diligence/exposed-person/${pid}`,
                role,
            )
            if (r?.status !== "OK") throw new Error(r?.error?.message || "Remove failed")
            await onReload()
        } catch (e: any) {
            setErr(e?.message || "Unexpected error")
        }
    }

    const onPersonFiles = async (files: FileList | null) => {
        if (!editingPerson || !files?.length) return
        try {
            const uploaded = await uploadFiles(files)
            setEditingPerson({
                ...editingPerson,
                files: [...(editingPerson.files || []), ...uploaded],
            })
        } catch (e: any) {
            setErr(e?.message || "Upload failed")
        }
    }

    // ── Stage F save ───────────────────────────────────────────────────────

    const saveHodReview = async () => {
        setSavingHod(true)
        setErr("")
        setSuccess("")
        try {
            const r = await putProtected(
                `api/v2/submissions/${submissionId}/hod-dd-review`,
                { approvals: hodApprovals, hodRemarkForEA: remarkForEA },
                role,
            )
            if (r?.status !== "OK") throw new Error(r?.error?.message || "Save failed")
            await onReload()
            setSuccess("Saved. You can now Advance to Stage G when ready.")
        } catch (e: any) {
            setErr(e?.message || "Unexpected error")
        } finally {
            setSavingHod(false)
        }
    }

    // ── Rendering ──────────────────────────────────────────────────────────

    const renderCheck = (
        key: "registrationCheck" | "internetCheck" | "referenceCheck",
        stepNumber: number,
    ) => {
        const c: DDCheck = (dd[key] as DDCheck) || {}
        const isSaving = savingKey === key
        const complete = isCheckComplete(c)
        const hasFile = (c.files || []).length > 0
        // The Mark Complete tick is only meaningful once the officer
        // has done something. Disable it until they've uploaded at
        // least one file - keeps officers from forgetting the upload.
        const canMarkComplete = hasFile && (!c.flagged || !!c.flagMessage?.trim())
        return (
            <div
                key={key}
                className={`${styles.ddCard} ${complete ? styles.ddCardDone : ""}`}
            >
                <div className={styles.ddCardHead}>
                    <div className={styles.ddCardTitle}>
                        <span className={styles.ddStepBadge}>{stepNumber}</span>
                        <div>
                            <h4>{CHECK_LABELS[key]}</h4>
                            <p className={styles.ddHelp}>{CHECK_HELP[key]}</p>
                        </div>
                    </div>
                    <span className={complete ? styles.ddDone : styles.ddPending}>
                        {complete ? "Completed" : "Pending"}
                    </span>
                </div>
                {canEdit ? (
                    <>
                        <div className={styles.ddFieldGroup}>
                            <label className={styles.ddFieldLabel}>
                                Finding / note
                                {c.flagged && (
                                    <span className={styles.ddRequiredHint}>
                                        Required when flagged
                                    </span>
                                )}
                            </label>
                            <textarea
                                className={styles.ddTextarea}
                                rows={3}
                                value={c.flagMessage || ""}
                                placeholder={
                                    c.flagged
                                        ? "Explain the concern - this surfaces to the HOD review"
                                        : "Optional notes for the HOD review"
                                }
                                onChange={(e) =>
                                    saveCheck(key, { ...c, flagMessage: e.target.value })
                                }
                                disabled={isSaving}
                            />
                            <label className={styles.ddInlineToggle}>
                                <input
                                    type="checkbox"
                                    checked={!!c.flagged}
                                    onChange={(e) =>
                                        saveCheck(key, { ...c, flagged: e.target.checked })
                                    }
                                    disabled={isSaving}
                                />
                                <span>Raise a concern on this check</span>
                            </label>
                        </div>

                        <div className={styles.ddFieldGroup}>
                            <label className={styles.ddFieldLabel}>
                                Supporting upload
                                <span className={styles.ddRequiredHint}>Required</span>
                            </label>
                            <div className={styles.ddDropZone}>
                                <label className={styles.ddUploadBtn}>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => onCheckFiles(key, e.target.files)}
                                        disabled={isSaving}
                                    />
                                    <span>+ Upload file</span>
                                </label>
                                {(c.files || []).length === 0 && (
                                    <span className={styles.ddDropHint}>
                                        Screenshot, PDF or letter that proves this check
                                    </span>
                                )}
                                {(c.files || []).map((f, i) => (
                                    <div key={i} className={styles.ddFileRow}>
                                        <a href={f.url} target="_blank" rel="noopener noreferrer">
                                            {f.name}
                                        </a>
                                        <button
                                            className={styles.btnLink}
                                            onClick={() => onRemoveCheckFile(key, i)}
                                            disabled={isSaving}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={`${styles.ddCompleteBtn} ${
                                complete ? styles.ddCompleteBtnOn : ""
                            }`}
                            onClick={() => saveCheck(key, { ...c, completed: !c.completed })}
                            disabled={isSaving || (!complete && !canMarkComplete)}
                            title={
                                !complete && !canMarkComplete
                                    ? "Upload a file (and explain any concern) before marking complete"
                                    : complete
                                      ? "Un-mark - reopens this check"
                                      : "Mark this check complete"
                            }
                        >
                            {complete ? "✓ Marked Complete - click to undo" : "Mark Complete"}
                            {isSaving && <ButtonLoadingIcon />}
                        </button>
                    </>
                ) : (
                    <>
                        <div className={styles.ddReadRow}>
                            <strong>Concern raised:</strong> {c.flagged ? "Yes" : "No"}
                        </div>
                        {c.flagMessage && (
                            <div className={styles.ddReadRow}>
                                <strong>Finding:</strong> {c.flagMessage}
                            </div>
                        )}
                        <div className={styles.ddFiles}>
                            {(c.files || []).map((f, i) => (
                                <div key={i} className={styles.ddFileRow}>
                                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                                        {f.name}
                                    </a>
                                </div>
                            ))}
                            {(c.files || []).length === 0 && (
                                <span className={styles.dim}>No files uploaded.</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        )
    }

    const markExposedReviewed = async (next: boolean) => {
        setSavingKey("exposedPersonsReviewed")
        setErr("")
        try {
            const r = await putProtected(
                `api/v2/submissions/${submissionId}/due-diligence`,
                { exposedPersonsReviewed: next },
                role,
            )
            if (r?.status !== "OK") throw new Error(r?.error?.message || "Save failed")
            await onReload()
        } catch (e: any) {
            setErr(e?.message || "Unexpected error")
        } finally {
            setSavingKey(null)
        }
    }

    const renderExposedPersons = () => {
        const arr = dd.exposedPersons || []
        const reviewed = !!dd.exposedPersonsReviewed
        return (
            <div className={`${styles.ddCard} ${reviewed ? styles.ddCardDone : ""}`}>
                <div className={styles.ddCardHead}>
                    <div className={styles.ddCardTitle}>
                        <span className={styles.ddStepBadge}>4</span>
                        <div>
                            <h4>Exposed Persons / Shareholders</h4>
                            <p className={styles.ddHelp}>
                                Screen the contractor's directors, shareholders
                                and any politically exposed persons. Add an
                                entry for each one (or none if there are none),
                                then tick Mark Section Reviewed.
                            </p>
                        </div>
                    </div>
                    <span className={reviewed ? styles.ddDone : styles.ddPending}>
                        {reviewed ? "Reviewed" : "Pending"}
                    </span>
                </div>
                {canEdit && (
                    <div className={styles.ddRow}>
                        <button
                            className={styles.btnSecondary}
                            onClick={() => setEditingPerson(blankPerson())}
                            disabled={savingKey === "exposedPersonsReviewed"}
                        >
                            Add entry
                        </button>
                        <label className={styles.ddRow} style={{ marginLeft: "auto" }}>
                            <input
                                type="checkbox"
                                checked={reviewed}
                                disabled={savingKey === "exposedPersonsReviewed"}
                                onChange={(e) => markExposedReviewed(e.target.checked)}
                            />
                            <span>Mark section reviewed</span>
                        </label>
                    </div>
                )}
                {arr.length === 0 ? (
                    <p className={styles.dim}>No entries recorded.</p>
                ) : (
                    <ul className={styles.exposedList}>
                        {arr.map((p) => (
                            <li key={p._id} className={styles.exposedRow}>
                                <div>
                                    <strong>
                                        {p.entityType === "corporate"
                                            ? p.companyName
                                            : [p.title, p.firstName, p.lastName, p.otherName]
                                                  .filter(Boolean)
                                                  .join(" ")}
                                    </strong>
                                    <span className={styles.exposedRole}>{p.role || "-"}</span>
                                    {p.flagged && (
                                        <span className={styles.exposedFlag}>Flagged</span>
                                    )}
                                </div>
                                {p.flagMessage && <p className={styles.dim}>{p.flagMessage}</p>}
                                {(p.files || []).map((f, i) => (
                                    <a
                                        key={i}
                                        className={styles.btnLink}
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {f.name}
                                    </a>
                                ))}
                                {canEdit && (
                                    <div className={styles.exposedActions}>
                                        <button
                                            className={styles.btnLink}
                                            onClick={() => setEditingPerson({ ...p })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className={styles.btnLink}
                                            onClick={() => removePerson(String(p._id))}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }

    // Progress headline so the officer sees at a glance how many of the
    // four mandatory checks are left.
    const completedChecks =
        CHECK_ORDER.filter((k) => isCheckComplete(dd[k] as DDCheck)).length +
        (dd.exposedPersonsReviewed ? 1 : 0)
    const totalChecks = 4

    return (
        <div className={styles.tabBody}>
            {err && <ErrorText text={err} />}
            {success && <SuccessMessage message={success} />}

            <div className={styles.ddIntro}>
                <div>
                    <h3>Due Diligence Checks</h3>
                    <p>
                        Work through the four checks below in order. Each
                        check needs a finding (with file proof) and a Mark
                        Complete tick before this stage can advance to the
                        HOD Review at Stage F.
                    </p>
                </div>
                <div className={styles.ddProgress}>
                    <div className={styles.ddProgressLabel}>
                        {completedChecks}/{totalChecks} complete
                    </div>
                    <div className={styles.ddProgressBar}>
                        <div
                            className={styles.ddProgressFill}
                            style={{ width: `${(completedChecks / totalChecks) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.ddStack}>
                {renderCheck("registrationCheck", 1)}
                {renderCheck("internetCheck", 2)}
                {renderCheck("referenceCheck", 3)}
                {renderExposedPersons()}
            </div>

            {canHodReview && (
                <div className={styles.ddHodReview}>
                    <h3>HOD Due Diligence Review</h3>
                    <p className={styles.modalSub}>
                        Tick each box once you have reviewed the
                        corresponding check. All four are required before
                        the application can advance to the Executive
                        Approver.
                    </p>
                    {(["registrationCheck", "internetCheck", "referenceCheck", "exposedPersonsCheck"] as const).map((k) => (
                        <label key={k} className={styles.ddRow}>
                            <input
                                type="checkbox"
                                checked={hodApprovals[k]}
                                onChange={(e) =>
                                    setHodApprovals({ ...hodApprovals, [k]: e.target.checked })
                                }
                                disabled={savingHod}
                            />
                            <span>
                                {k === "exposedPersonsCheck"
                                    ? "Exposed Persons / Shareholders reviewed"
                                    : `${CHECK_LABELS[k]} reviewed`}
                            </span>
                        </label>
                    ))}
                    <label className={styles.modalLabel}>
                        Remark for Executive Approver (optional)
                    </label>
                    <textarea
                        rows={3}
                        value={remarkForEA}
                        onChange={(e) => setRemarkForEA(e.target.value)}
                        disabled={savingHod}
                    />
                    <button
                        className={styles.btnPrimary}
                        onClick={saveHodReview}
                        disabled={savingHod}
                    >
                        Save HOD review
                        {savingHod && <ButtonLoadingIcon />}
                    </button>
                </div>
            )}

            {level >= 5 && hodRemarkForEA && (
                <div className={styles.ddHodReview}>
                    <h3>Remark from HOD</h3>
                    <p>{hodRemarkForEA}</p>
                </div>
            )}

            {editingPerson && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <h3>
                                {editingPerson._id
                                    ? "Edit exposed-persons entry"
                                    : "Add exposed-persons entry"}
                            </h3>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.modalLabel}>Entity type</label>
                            <select
                                value={editingPerson.entityType || "individual"}
                                onChange={(e) =>
                                    setEditingPerson({
                                        ...editingPerson,
                                        entityType: e.target.value as any,
                                    })
                                }
                            >
                                <option value="individual">Individual</option>
                                <option value="corporate">Corporate</option>
                            </select>

                            {editingPerson.entityType === "corporate" ? (
                                <>
                                    <label className={styles.modalLabel}>Company name</label>
                                    <input
                                        value={editingPerson.companyName || ""}
                                        onChange={(e) =>
                                            setEditingPerson({
                                                ...editingPerson,
                                                companyName: e.target.value,
                                            })
                                        }
                                    />
                                    <label className={styles.modalLabel}>Registration number</label>
                                    <input
                                        value={editingPerson.registrationNumber || ""}
                                        onChange={(e) =>
                                            setEditingPerson({
                                                ...editingPerson,
                                                registrationNumber: e.target.value,
                                            })
                                        }
                                    />
                                </>
                            ) : (
                                <>
                                    <label className={styles.modalLabel}>Title</label>
                                    <input
                                        value={editingPerson.title || ""}
                                        onChange={(e) =>
                                            setEditingPerson({
                                                ...editingPerson,
                                                title: e.target.value,
                                            })
                                        }
                                    />
                                    <label className={styles.modalLabel}>First name</label>
                                    <input
                                        value={editingPerson.firstName || ""}
                                        onChange={(e) =>
                                            setEditingPerson({
                                                ...editingPerson,
                                                firstName: e.target.value,
                                            })
                                        }
                                    />
                                    <label className={styles.modalLabel}>Last name</label>
                                    <input
                                        value={editingPerson.lastName || ""}
                                        onChange={(e) =>
                                            setEditingPerson({
                                                ...editingPerson,
                                                lastName: e.target.value,
                                            })
                                        }
                                    />
                                    <label className={styles.modalLabel}>Other names</label>
                                    <input
                                        value={editingPerson.otherName || ""}
                                        onChange={(e) =>
                                            setEditingPerson({
                                                ...editingPerson,
                                                otherName: e.target.value,
                                            })
                                        }
                                    />
                                </>
                            )}

                            <label className={styles.modalLabel}>
                                Role (e.g. Shareholder, Director, Both, Former)
                            </label>
                            <input
                                value={editingPerson.role || ""}
                                onChange={(e) =>
                                    setEditingPerson({
                                        ...editingPerson,
                                        role: e.target.value,
                                    })
                                }
                            />

                            <label className={styles.ddRow}>
                                <input
                                    type="checkbox"
                                    checked={!!editingPerson.flagged}
                                    onChange={(e) =>
                                        setEditingPerson({
                                            ...editingPerson,
                                            flagged: e.target.checked,
                                        })
                                    }
                                />
                                <span>Flag this person</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Finding / note"
                                value={editingPerson.flagMessage || ""}
                                onChange={(e) =>
                                    setEditingPerson({
                                        ...editingPerson,
                                        flagMessage: e.target.value,
                                    })
                                }
                            />

                            <div className={styles.ddFiles}>
                                {(editingPerson.files || []).map((f, i) => (
                                    <div key={i} className={styles.ddFileRow}>
                                        <a href={f.url} target="_blank" rel="noopener noreferrer">
                                            {f.name}
                                        </a>
                                        <button
                                            className={styles.btnLink}
                                            onClick={() =>
                                                setEditingPerson({
                                                    ...editingPerson,
                                                    files: (editingPerson.files || []).filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                })
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="file"
                                multiple
                                onChange={(e) => onPersonFiles(e.target.files)}
                            />
                            {err && <ErrorText text={err} />}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setEditingPerson(null)}
                                disabled={savingPerson}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.btnPrimary}
                                onClick={savePerson}
                                disabled={savingPerson}
                            >
                                Save
                                {savingPerson && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DueDiligencePanel
