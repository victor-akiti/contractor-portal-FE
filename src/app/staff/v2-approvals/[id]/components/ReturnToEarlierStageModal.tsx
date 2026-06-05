"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import styles from "../styles.module.css"
import { ActionKey } from "../types"

interface Props {
    currentLevel: number
    targetLevel: number
    setTargetLevel: (n: number) => void
    reason: string
    setReason: (v: string) => void
    actionRunning: ActionKey | null
    actionError: string
    onSubmit: () => void
    onClose: () => void
}

const STAGE_NAMES = ["VRM", "Supervisor", "End User", "Due Diligence", "HOD Review"]

// HOD "Return to Earlier Stage" - pick any level lower than the current
// one and attach a remark for the receiving stage owner.
const ReturnToEarlierStageModal = ({
    currentLevel,
    targetLevel,
    setTargetLevel,
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
                <h3>Return to Earlier Stage</h3>
                <p className={styles.modalSub}>
                    Sends the application back to any earlier stage with your
                    remark. Use this when the issue is something an earlier
                    reviewer (e.g. the VRM at Stage B) should have caught.
                </p>
            </div>
            <div className={styles.modalBody}>
                <label className={styles.modalLabel}>Send back to</label>
                <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(Number(e.target.value))}
                    className={styles.formSelect}
                >
                    {Array.from({ length: currentLevel }, (_, i) => i).map((lvl) => (
                        <option key={lvl} value={lvl}>
                            Stage {String.fromCharCode(66 + lvl)} ({STAGE_NAMES[lvl]})
                        </option>
                    ))}
                </select>
                <label className={styles.modalLabel} style={{ marginTop: 12 }}>
                    Remark for the receiving stage
                </label>
                <textarea
                    rows={4}
                    placeholder="Explain what needs to be fixed at that stage."
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
                    disabled={actionRunning === "return-to-earlier-stage" || !reason.trim()}
                >
                    Return to Stage {String.fromCharCode(66 + targetLevel)}
                    {actionRunning === "return-to-earlier-stage" && <ButtonLoadingIcon />}
                </button>
            </div>
        </div>
    </Modal>
)

export default ReturnToEarlierStageModal
