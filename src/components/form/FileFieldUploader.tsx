'use client'

// FileFieldUploader — the actual upload widget for file / certificate
// fields in the V2 form renderer.
//
// Two upload modes depending on the host page:
//   • Contractor (hash-authed): POST /api/v2/upload/by-hash/:hash
//     — public endpoint, the invite hash is the auth token.
//   • Staff: POST /api/v2/upload  (Firebase auth via standard helper)
//
// Per-file metadata stored as part of the field's value:
//   { _id, label, name, url, updateCode, issueDate?, expiryDate?, status? }
//
// Slot semantics: every uploaded file is assigned an updateCode the first
// time it lands. A re-upload reuses the same updateCode so the BE can
// in-place replace the CertificateV2 record (status → pending, isReUpload
// → true). The contractor never sees the updateCode; it's generated here
// and preserved across edits.

import { useRef, useState } from "react"
import { BACKEND_BASE_URL } from "@/lib/config"
import styles from "./FileFieldUploader.module.css"

export interface FileFieldValue {
    _id?: string
    label?: string
    name: string
    url: string
    updateCode: string
    issueDate?: string
    expiryDate?: string
    status?: "pending" | "approved" | "rejected"
    reviewRemarks?: string
}

interface Props {
    value: FileFieldValue[]
    onChange: (next: FileFieldValue[]) => void
    isCertificate: boolean
    hasExpiryDate: boolean
    maxAllowedFiles: number
    allowedFormats: string[]
    allowSelectPreviouslyUploadedFile: boolean
    previousUploads: FileFieldValue[]
    uploadAuthHash?: string
    disabled?: boolean
    fieldKey: string
}

const generateUpdateCode = (fieldKey: string): string =>
    `${fieldKey}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const formatBytes = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

const extOf = (name: string): string => {
    const m = name.match(/\.([^.]+)$/)
    return m ? m[1].toUpperCase() : ""
}

const statusBadgeClass = (status?: string): string => {
    if (status === "approved") return styles.statusApproved
    if (status === "rejected") return styles.statusRejected
    if (status === "pending") return styles.statusPending
    return styles.statusNeutral
}

const certExpiryStatus = (expiryDate?: string): "expired" | "expiring" | "healthy" | null => {
    if (!expiryDate) return null
    const exp = new Date(expiryDate).getTime()
    if (Number.isNaN(exp)) return null
    const now = Date.now()
    if (exp < now) return "expired"
    const days30 = 30 * 24 * 60 * 60 * 1000
    if (exp - now < days30) return "expiring"
    return "healthy"
}

const FileFieldUploader = ({
    value,
    onChange,
    isCertificate,
    hasExpiryDate,
    maxAllowedFiles,
    allowedFormats,
    allowSelectPreviouslyUploadedFile,
    previousUploads,
    uploadAuthHash,
    disabled,
    fieldKey,
}: Props) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")
    const [showReusePicker, setShowReusePicker] = useState(false)
    const [reUploadIdx, setReUploadIdx] = useState<number | null>(null)

    const atCapacity = value.length >= maxAllowedFiles

    const acceptAttr = allowedFormats.length
        ? allowedFormats.map((f) => `.${f.toLowerCase()}`).join(",")
        : undefined

    const formatAllowed = (ext: string): boolean => {
        if (allowedFormats.length === 0) return true
        return allowedFormats.includes(ext.toUpperCase())
    }

    const uploadOne = async (file: File): Promise<FileFieldValue | null> => {
        const ext = extOf(file.name)
        if (!formatAllowed(ext)) {
            setError(`"${file.name}" — .${ext.toLowerCase()} is not in the allowed formats (${allowedFormats.join(", ")})`)
            return null
        }
        if (file.size > 25 * 1024 * 1024) {
            setError(`"${file.name}" exceeds the 25 MB upload limit (${formatBytes(file.size)})`)
            return null
        }

        const fd = new FormData()
        fd.append("file", file)
        const updateCode =
            reUploadIdx !== null ? value[reUploadIdx]?.updateCode : generateUpdateCode(fieldKey)
        fd.append("updateCode", updateCode)
        fd.append("fieldKey", fieldKey)

        // Pick endpoint based on auth context.
        const url = uploadAuthHash
            ? `${BACKEND_BASE_URL}/api/v2/upload/by-hash/${uploadAuthHash}`
            : `${BACKEND_BASE_URL}/api/v2/upload`

        const headers: Record<string, string> = {}
        // Staff path — attach the Firebase token. Lazy-import to avoid pulling
        // firebase into the contractor bundle.
        if (!uploadAuthHash) {
            const { auth } = await import("@/lib/firebase")
            const { getIdToken } = await import("firebase/auth")
            const u = auth.currentUser
            if (u) headers["Authorization"] = `Bearer ${await getIdToken(u)}`
        }

        const res = await fetch(url, {
            method: "POST",
            body: fd,
            headers,
            credentials: "include",
        })

        if (!res.ok) {
            let msg = `Upload failed (${res.status})`
            try {
                const body = await res.json()
                if (body?.error?.message) msg = body.error.message
            } catch { /* fallthrough */ }
            setError(msg)
            return null
        }

        const body = await res.json()
        const uploaded = Array.isArray(body?.data) ? body.data[0] : body?.data
        if (!uploaded?.url) {
            setError("Upload succeeded but the server didn't return a URL")
            return null
        }

        return {
            _id: uploaded._id,
            name: uploaded.name || file.name,
            url: uploaded.url,
            label: uploaded.label,
            updateCode,
            // If this is a re-upload, preserve the slot's prior dates so the
            // contractor doesn't have to re-enter them.
            issueDate:
                reUploadIdx !== null ? value[reUploadIdx]?.issueDate : undefined,
            expiryDate:
                reUploadIdx !== null ? value[reUploadIdx]?.expiryDate : undefined,
            status: "pending",
        }
    }

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setError("")
        setUploading(true)
        try {
            const arr = Array.from(files)
            // If re-uploading into a slot, only the first file counts.
            if (reUploadIdx !== null) {
                const uploaded = await uploadOne(arr[0])
                if (uploaded) {
                    const next = [...value]
                    next[reUploadIdx] = { ...uploaded }
                    onChange(next)
                }
                setReUploadIdx(null)
                return
            }
            // Honor maxAllowedFiles.
            const room = Math.max(0, maxAllowedFiles - value.length)
            if (room === 0) {
                setError(`Already at max (${maxAllowedFiles}) — remove one before adding more.`)
                return
            }
            const toUpload = arr.slice(0, room)
            const uploaded: FileFieldValue[] = []
            for (const f of toUpload) {
                const u = await uploadOne(f)
                if (u) uploaded.push(u)
            }
            if (uploaded.length > 0) onChange([...value, ...uploaded])
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ""
        }
    }

    const removeAt = (idx: number) => {
        const next = value.filter((_, i) => i !== idx)
        onChange(next)
    }

    const updateAt = (idx: number, patch: Partial<FileFieldValue>) => {
        const next = [...value]
        next[idx] = { ...next[idx], ...patch }
        onChange(next)
    }

    const pickPrevious = (prev: FileFieldValue) => {
        // Re-use a previously-uploaded file by referencing the same URL, but
        // mint a NEW updateCode so the BE records this as a fresh association
        // with this field. (If the contractor wants to update it later, that
        // becomes a re-upload against this new slot.)
        const cloned: FileFieldValue = {
            ...prev,
            updateCode: generateUpdateCode(fieldKey),
            status: "pending",
        }
        const room = Math.max(0, maxAllowedFiles - value.length)
        if (room === 0) {
            setError(`Already at max (${maxAllowedFiles}) — remove one before adding more.`)
            return
        }
        onChange([...value, cloned])
        setShowReusePicker(false)
    }

    return (
        <div className={styles.uploader}>
            {/* File list */}
            {value.length > 0 && (
                <div className={styles.fileList}>
                    {value.map((f, i) => {
                        const expStat = isCertificate && hasExpiryDate ? certExpiryStatus(f.expiryDate) : null
                        return (
                            <div key={(f._id || f.updateCode) + i} className={styles.fileCard}>
                                <div className={styles.fileRow}>
                                    <div className={styles.fileIcon}>{extOf(f.name) || "FILE"}</div>
                                    <div className={styles.fileMeta}>
                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                                            {f.name}
                                        </a>
                                        <div className={styles.fileSub}>
                                            {f.status && (
                                                <span className={`${styles.statusBadge} ${statusBadgeClass(f.status)}`}>
                                                    {f.status}
                                                </span>
                                            )}
                                            {expStat && (
                                                <span className={`${styles.statusBadge} ${styles[`expiry_${expStat}`]}`}>
                                                    {expStat}
                                                </span>
                                            )}
                                            <span className={styles.dim}>slot {f.updateCode.slice(-6)}</span>
                                        </div>
                                        {f.reviewRemarks && (
                                            <div className={styles.reviewRemarks}>
                                                <strong>Reviewer:</strong> {f.reviewRemarks}
                                            </div>
                                        )}
                                    </div>
                                    {!disabled && (
                                        <div className={styles.fileActions}>
                                            <button
                                                type="button"
                                                className={styles.linkBtn}
                                                onClick={() => {
                                                    setReUploadIdx(i)
                                                    inputRef.current?.click()
                                                }}
                                            >
                                                Re-upload
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.linkBtnDanger}
                                                onClick={() => removeAt(i)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Per-file dates for certificates */}
                                {isCertificate && (
                                    <div className={styles.certDates}>
                                        <label>
                                            Issue date
                                            <input
                                                type="date"
                                                value={f.issueDate || ""}
                                                onChange={(e) => updateAt(i, { issueDate: e.target.value })}
                                                disabled={disabled}
                                            />
                                        </label>
                                        {hasExpiryDate && (
                                            <label>
                                                Expiry date
                                                <input
                                                    type="date"
                                                    value={f.expiryDate || ""}
                                                    onChange={(e) => updateAt(i, { expiryDate: e.target.value })}
                                                    disabled={disabled}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Drop / browse zone */}
            {!disabled && (!atCapacity || reUploadIdx !== null) && (
                <div className={styles.dropZone}>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={acceptAttr}
                        multiple={maxAllowedFiles > 1 && reUploadIdx === null}
                        onChange={(e) => handleFiles(e.target.files)}
                        disabled={uploading}
                        style={{ display: "none" }}
                    />
                    <button
                        type="button"
                        className={styles.browseBtn}
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading
                            ? "Uploading…"
                            : reUploadIdx !== null
                              ? "Pick a file to replace"
                              : value.length === 0
                                ? "Upload file"
                                : `Add another file (${value.length}/${maxAllowedFiles})`}
                    </button>
                    {allowSelectPreviouslyUploadedFile && previousUploads.length > 0 && reUploadIdx === null && (
                        <button
                            type="button"
                            className={styles.reuseBtn}
                            onClick={() => setShowReusePicker(true)}
                        >
                            Pick a previously uploaded file
                        </button>
                    )}
                    {reUploadIdx !== null && (
                        <button
                            type="button"
                            className={styles.cancelReupload}
                            onClick={() => setReUploadIdx(null)}
                        >
                            Cancel re-upload
                        </button>
                    )}
                </div>
            )}

            {/* Format hint */}
            {!disabled && allowedFormats.length > 0 && (
                <p className={styles.formatHint}>
                    Allowed: {allowedFormats.join(", ")} · Max 25 MB · Up to {maxAllowedFiles} file{maxAllowedFiles === 1 ? "" : "s"}
                </p>
            )}

            {error && <p className={styles.errText}>{error}</p>}

            {/* Re-use picker */}
            {showReusePicker && (
                <div className={styles.reuseBackdrop} onClick={() => setShowReusePicker(false)}>
                    <div className={styles.reuseCard} onClick={(e) => e.stopPropagation()}>
                        <h4>Pick a previously uploaded file</h4>
                        {previousUploads.length === 0 ? (
                            <p className={styles.dim}>You haven't uploaded any files yet.</p>
                        ) : (
                            <ul className={styles.reuseList}>
                                {previousUploads.map((p, i) => (
                                    <li key={(p._id || p.updateCode) + i}>
                                        <button type="button" onClick={() => pickPrevious(p)}>
                                            <span className={styles.fileIcon}>{extOf(p.name) || "FILE"}</span>
                                            <span>{p.name}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className={styles.reuseFooter}>
                            <button type="button" onClick={() => setShowReusePicker(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FileFieldUploader
