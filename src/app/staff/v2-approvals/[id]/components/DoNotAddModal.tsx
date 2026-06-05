"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import styles from "../styles.module.css"
import { ActionKey } from "../types"

interface Props {
    reason: string
    setReason: (v: string) => void
    actionRunning: ActionKey | null
    actionError: string
    onSubmit: () => void
    onClose: () => void
}

// Stage G "Do Not Add" - Executive Approver parks the submission at L2
// without approving. Final decision; reason captured for the audit.
const DoNotAddModal = ({
    reason,
    setReason,
    actionRunning,
    actionError,
    onSubmit,
    onClose,
}: Props) => (
    <Modal>
        <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
                <h3>Do Not Add (Park at L2)</h3>
                <p className={styles.modalSub}>
                    The contractor will be parked at L2 and will not be added to
                    the approved list. Provide a clear reason - this is the
                    final Executive Approver decision and shows in the audit
                    trail.
                </p>
            </div>
            <div className={styles.modalBody}>
                <textarea
                    rows={4}
                    placeholder="Reason for not adding the contractor."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
                {actionError && <ErrorText text={actionError} />}
            </div>
            <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={onClose}>
                    Cancel
                </button>
                <button
                    className={styles.btnDanger}
                    onClick={onSubmit}
                    disabled={actionRunning === "park-at-l2" || !reason.trim()}
                >
                    Confirm Do Not Add
                    {actionRunning === "park-at-l2" && <ButtonLoadingIcon />}
                </button>
            </div>
        </div>
    </Modal>
)

export default DoNotAddModal
