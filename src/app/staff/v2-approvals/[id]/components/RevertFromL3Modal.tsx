"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import styles from "../styles.module.css"
import { ActionKey } from "../types"

interface Props {
    reason: string
    setReason: (v: string) => void
    targetLevel: number
    setTargetLevel: (n: number) => void
    actionRunning: ActionKey | null
    actionError: string
    onSubmit: () => void
    onClose: () => void
}

const STAGE_NAMES = ["VRM", "Supervisor", "End User", "Due Diligence", "HOD DD Review", "Executive Approver"]

// Admin-only: pull a contractor back out of L3. The BE requires a
// reason and accepts a target stage (defaults to G / Executive
// Approver, the stage that originally approved them).
const RevertFromL3Modal = ({
    reason,
    setReason,
    targetLevel,
    setTargetLevel,
    actionRunning,
    actionError,
    onSubmit,
    onClose,
}: Props) => (
    <Modal>
        <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
                <h3>Revert from L3</h3>
                <p className={styles.modalSub}>
                    Pulls the contractor out of the L3 Approved list and
                    sends them back to a pending stage so a reviewer can
                    redo their step. Reason is required and shows in the
                    audit trail.
                </p>
            </div>
            <div className={styles.modalBody}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>Send back to</label>
                    <select
                        className={styles.formSelect}
                        value={targetLevel}
                        onChange={(e) => setTargetLevel(Number(e.target.value))}
                    >
                        {[0, 1, 2, 3, 4, 5].map((lvl) => (
                            <option key={lvl} value={lvl}>
                                Stage {String.fromCharCode(66 + lvl)} ({STAGE_NAMES[lvl]})
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>
                        Reason
                        <span className={styles.formReq}>required</span>
                    </label>
                    <textarea
                        className={styles.formTextarea}
                        rows={4}
                        placeholder="Why does this approved contractor need to come back out of L3?"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
                {actionError && <ErrorText text={actionError} />}
            </div>
            <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={onClose}>
                    Cancel
                </button>
                <button
                    className={styles.btnDanger}
                    onClick={onSubmit}
                    disabled={actionRunning === "revert-from-l3" || !reason.trim()}
                >
                    Confirm revert
                    {actionRunning === "revert-from-l3" && <ButtonLoadingIcon />}
                </button>
            </div>
        </div>
    </Modal>
)

export default RevertFromL3Modal
