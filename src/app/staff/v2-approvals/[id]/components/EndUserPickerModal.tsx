"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import { getProtected } from "@/requests/get"
import { putProtected } from "@/requests/put"
import { useEffect, useState } from "react"
import styles from "../styles.module.css"
import { Submission } from "../types"

interface Candidate { _id: string; name: string; email: string; role: string }

interface Props {
    submissionId: string
    role: string
    submission: Submission
    onSaved: () => void | Promise<void>
    onClose: () => void
}

// Stage C - Supervisor / HOD picks the End User(s) who will see the
// submission at Stage D. Owns its own list, picker, save state.
const EndUserPickerModal = ({
    submissionId,
    role,
    submission,
    onSaved,
    onClose,
}: Props) => {
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [pickedIds, setPickedIds] = useState<string[]>(
        Array.isArray(submission.selectedEndUsers)
            ? submission.selectedEndUsers.map((u: any) =>
                  typeof u === "string" ? u : String(u?._id || u),
              )
            : [],
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const r = await getProtected("api/v2/staff/end-user-candidates", role)
                if (cancelled) return
                if (r?.status === "OK") setCandidates(r.data?.users || [])
                else setError(r?.error?.message || "Could not load end users")
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Could not load end users")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [role])

    const save = async () => {
        if (pickedIds.length === 0) {
            setError("Pick at least one end user before saving.")
            return
        }
        setSaving(true)
        setError("")
        try {
            const r = await putProtected(
                `api/v2/submissions/${submissionId}/end-users`,
                { userIds: pickedIds },
                role,
            )
            if (r?.status === "OK") {
                await onSaved()
                onClose()
            } else {
                setError(r?.error?.message || "Could not save end users")
            }
        } catch (e: any) {
            setError(e?.message || "Unexpected error")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal>
            <div className={styles.modalCard}>
                <div className={styles.modalHeader}>
                    <h3>Assign End Users</h3>
                    <p className={styles.modalSub}>
                        Pick the specialist staff who should see this
                        application at Stage D. They are the only non-HOD staff
                        who will be able to advance, return or hold it once it
                        moves forward.
                    </p>
                </div>
                <div className={styles.modalBody}>
                    {loading && <p className={styles.modalSub}>Loading...</p>}
                    {!loading && candidates.length > 0 && (
                        <div className={styles.endUserList}>
                            {candidates.map((u) => {
                                const checked = pickedIds.includes(u._id)
                                return (
                                    <label key={u._id} className={styles.endUserRow}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={saving}
                                            onChange={() =>
                                                setPickedIds(
                                                    checked
                                                        ? pickedIds.filter((x) => x !== u._id)
                                                        : [...pickedIds, u._id],
                                                )
                                            }
                                        />
                                        <span className={styles.endUserName}>{u.name}</span>
                                        <span className={styles.endUserRole}>{u.role}</span>
                                        <span className={styles.endUserEmail}>{u.email}</span>
                                    </label>
                                )
                            })}
                        </div>
                    )}
                    {error && <ErrorText text={error} />}
                </div>
                <div className={styles.modalActions}>
                    <button
                        className={styles.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.btnPrimary}
                        onClick={save}
                        disabled={saving || pickedIds.length === 0}
                    >
                        Save selection
                        {saving && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default EndUserPickerModal
