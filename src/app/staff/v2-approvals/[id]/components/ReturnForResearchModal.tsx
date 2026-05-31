"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import styles from "../styles.module.css"
import { ActionKey } from "../types"

interface Props {
    level: number
    reason: string
    setReason: (v: string) => void
    actionRunning: ActionKey | null
    actionError: string
    onSubmit: () => void
    onClose: () => void
}

// Stage F -> E or Stage G -> F internal-return modal. The destination
// level is inferred from current level by the BE.
const ReturnForResearchModal = ({
    level,
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
                <h3>Return for Research</h3>
                <p className={styles.modalSub}>
                    {level === 5
                        ? "Sends the application back to the HOD at Stage F with a research request. The contractor is not notified."
                        : "Sends the application back to the Due Diligence officer at Stage E. The contractor is not notified."}
                </p>
            </div>
            <div className={styles.modalBody}>
                <textarea
                    rows={4}
                    placeholder="State what additional research is needed."
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
                    className={styles.btnPrimary}
                    onClick={onSubmit}
                    disabled={actionRunning === "return-to-previous-stage" || !reason.trim()}
                >
                    Submit
                    {actionRunning === "return-to-previous-stage" && <ButtonLoadingIcon />}
                </button>
            </div>
        </div>
    </Modal>
)

export default ReturnForResearchModal
