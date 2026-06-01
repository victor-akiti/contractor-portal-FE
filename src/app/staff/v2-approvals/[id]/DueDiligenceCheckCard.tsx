"use client"

import { useEffect, useState } from "react"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import styles from "./styles.module.css"

export type FileRef = { url: string; name: string }
export type DDCheck = {
    flagged?: boolean
    flagMessage?: string
    files?: FileRef[]
    completed?: boolean
}

interface Props {
    stepNumber: number
    title: string
    help: string
    check: DDCheck
    canEdit: boolean
    isSaving: boolean
    onSave: (next: DDCheck) => void
    onUploadFiles: (files: FileList | null) => void
    onRemoveFile: (idx: number) => void
}

// One Due Diligence check rendered as a stand-alone card. Owns its own
// draft state for the finding textarea so each keystroke only mutates
// local state - no parent re-render, no BE round-trip, no focus loss.
// The draft is committed back to the parent on blur (or when the user
// toggles a checkbox / hits Mark Complete).
const DueDiligenceCheckCard = ({
    stepNumber,
    title,
    help,
    check,
    canEdit,
    isSaving,
    onSave,
    onUploadFiles,
    onRemoveFile,
}: Props) => {
    const complete = checkIsComplete(check)
    const hasFile = (check.files || []).length > 0
    const canMarkComplete = hasFile && (!check.flagged || !!check.flagMessage?.trim())

    // Local draft for the textarea. Sync from prop only when the saved
    // value actually changes (e.g. another reviewer saves on the BE side
    // and our parent re-fetches) - this prevents the cursor jumping
    // every time our own onBlur commits the same value back.
    const [draftFinding, setDraftFinding] = useState(check.flagMessage || "")
    useEffect(() => {
        setDraftFinding(check.flagMessage || "")
    }, [check.flagMessage])

    return (
        <div className={`${styles.ddCard} ${complete ? styles.ddCardDone : ""}`}>
            <div className={styles.ddCardHead}>
                <div className={styles.ddCardTitle}>
                    <span className={styles.ddStepBadge}>{stepNumber}</span>
                    <div>
                        <h4>{title}</h4>
                        <p className={styles.ddHelp}>{help}</p>
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
                            {check.flagged && (
                                <span className={styles.ddRequiredHint}>
                                    Required when flagged
                                </span>
                            )}
                        </label>
                        <textarea
                            className={styles.ddTextarea}
                            rows={3}
                            value={draftFinding}
                            placeholder={
                                check.flagged
                                    ? "Explain the concern - this surfaces to the HOD review"
                                    : "Optional notes for the HOD review"
                            }
                            onChange={(e) => setDraftFinding(e.target.value)}
                            onBlur={() => {
                                if (draftFinding !== (check.flagMessage || "")) {
                                    onSave({ ...check, flagMessage: draftFinding })
                                }
                            }}
                        />
                        <label className={styles.ddInlineToggle}>
                            <input
                                type="checkbox"
                                checked={!!check.flagged}
                                onChange={(e) =>
                                    onSave({ ...check, flagged: e.target.checked })
                                }
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
                                    onChange={(e) => onUploadFiles(e.target.files)}
                                />
                                <span>+ Upload file</span>
                            </label>
                            {(check.files || []).length === 0 && (
                                <span className={styles.ddDropHint}>
                                    Screenshot, PDF or letter that proves this check
                                </span>
                            )}
                            {(check.files || []).map((f, i) => (
                                <div key={i} className={styles.ddFileRow}>
                                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                                        {f.name}
                                    </a>
                                    <button
                                        className={styles.btnLink}
                                        onClick={() => onRemoveFile(i)}
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
                        onClick={() => onSave({ ...check, completed: !check.completed })}
                        disabled={!complete && !canMarkComplete}
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
                        <strong>Concern raised:</strong> {check.flagged ? "Yes" : "No"}
                    </div>
                    {check.flagMessage && (
                        <div className={styles.ddReadRow}>
                            <strong>Finding:</strong> {check.flagMessage}
                        </div>
                    )}
                    <div className={styles.ddFiles}>
                        {(check.files || []).map((f, i) => (
                            <div key={i} className={styles.ddFileRow}>
                                <a href={f.url} target="_blank" rel="noopener noreferrer">
                                    {f.name}
                                </a>
                            </div>
                        ))}
                        {(check.files || []).length === 0 && (
                            <span className={styles.dim}>No files uploaded.</span>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

const checkIsComplete = (c?: DDCheck): boolean => {
    if (!c) return false
    if (!c.completed) return false
    if (c.flagged && !c.flagMessage?.trim()) return false
    return (c.files || []).length > 0 || !c.flagged
}

export default DueDiligenceCheckCard
