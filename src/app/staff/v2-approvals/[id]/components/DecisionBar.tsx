"use client"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import SuccessMessage from "@/components/successMessage"
import styles from "../styles.module.css"
import { ActionKey, CanDecide, Submission, stageFromLevel } from "../types"

interface Props {
    submission: Submission
    role: string
    user: any
    can: CanDecide
    actionRunning: ActionKey | null
    actionSuccess: string
    actionError: string
    hasActiveRemarksThisCycle: boolean
    allSectionsReviewed: boolean
    runAction: (action: ActionKey, payload?: Record<string, any>) => Promise<boolean>
    openEndUserPicker: () => void
    openServicesModal: () => void
    openReturnModal: () => void
    openParkRequestModal: () => void
    openReturnPrevModal: () => void
    openReturnEarlierModal: () => void
    openParkL2Modal: () => void
    openRevertL3Modal: () => void
    openUnparkModal: () => void
    openDeclineParkModal: () => void
}

// Bottom-of-page decision panel. Groups available state-machine
// transitions by intent (Stage Tasks / Process Forward / Send Back /
// Hold) and wraps responsively. The parent owns all state - this
// component is a pure render of the available paths.
const DecisionBar = ({
    submission,
    role,
    user,
    can,
    actionRunning,
    actionSuccess,
    actionError,
    hasActiveRemarksThisCycle,
    allSectionsReviewed,
    runAction,
    openEndUserPicker,
    openServicesModal,
    openReturnModal,
    openParkRequestModal,
    openReturnPrevModal,
    openReturnEarlierModal,
    openParkL2Modal,
    openRevertL3Modal,
    openUnparkModal,
    openDeclineParkModal,
}: Props) => {
    const anyDecision =
        can.advance ||
        can.finalApprove ||
        can.assignEndUsers ||
        can.recordServices ||
        can.returnToVendor ||
        can.requestPark ||
        can.approvePark ||
        can.declinePark ||
        can.releasePark ||
        can.retrieve ||
        can.revertFromL3 ||
        can.returnEarlier ||
        can.returnToE ||
        can.returnToF ||
        can.doNotAdd
    if (!anyDecision) return null

    const stageBlockedAtD =
        submission.status === "pending" &&
        submission.level === 2 &&
        !["Admin", "HOD"].includes(role) &&
        !(
            user?._id &&
            (submission.selectedEndUsers || []).some(
                (u: any) =>
                    String(typeof u === "string" ? u : u?._id || u) === String(user._id),
            )
        )

    return (
        <div className={styles.decisionBar}>
            {actionSuccess && <SuccessMessage message={actionSuccess} />}
            {actionError && <ErrorText text={actionError} />}
            {submission.status === "pending" &&
                submission.level === 0 &&
                hasActiveRemarksThisCycle && (
                    <div className={styles.remarkGate}>
                        Active remarks block the Process button at Stage B.
                        Return to contractor (which delivers the remarks) or
                        request hold to continue.
                    </div>
                )}
            {submission.status === "pending" && !allSectionsReviewed && (
                <div className={styles.remarkGate}>
                    Tick the Reviewed checkbox on each section before
                    processing forward.
                </div>
            )}
            {stageBlockedAtD && (
                <div className={styles.remarkGate}>
                    At Stage D only the End Users assigned by the Supervisor
                    can advance, return or hold this application.
                </div>
            )}

            <div className={styles.decisionBarHeader}>
                <h3>Decision</h3>
                <p>
                    Pick the action that matches your verdict. Stage tasks are
                    prerequisites; Process forward is the &quot;go ahead&quot; action;
                    Send back covers returns; Hold covers park/decline.
                </p>
            </div>

            <div className={styles.decisionGroups}>
                {(can.assignEndUsers || can.recordServices) && (
                    <div className={styles.decisionGroup}>
                        <span className={styles.decisionGroupLabel}>Stage Tasks</span>
                        <div className={styles.decisionButtons}>
                            {can.assignEndUsers && (
                                <button
                                    className={styles.btnSecondary}
                                    disabled={!!actionRunning}
                                    onClick={openEndUserPicker}
                                >
                                    {Array.isArray(submission.selectedEndUsers) &&
                                        submission.selectedEndUsers.length > 0
                                        ? `End Users (${submission.selectedEndUsers.length})`
                                        : "Assign End Users"}
                                </button>
                            )}
                            {can.recordServices && (
                                <button
                                    className={styles.btnSecondary}
                                    disabled={!!actionRunning}
                                    onClick={openServicesModal}
                                >
                                    {Array.isArray((submission as any).selectedServices) &&
                                        (submission as any).selectedServices.length > 0
                                        ? `Services (${(submission as any).selectedServices.length})`
                                        : "Record Services"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {(can.advance || can.finalApprove) && (
                    <div className={`${styles.decisionGroup} ${styles.decisionGroupPrimary}`}>
                        <span className={styles.decisionGroupLabel}>Process Forward</span>
                        <div className={styles.decisionButtons}>
                            {can.advance && (
                                <button
                                    className={styles.btnPrimary}
                                    disabled={!!actionRunning}
                                    onClick={() => runAction("advance")}
                                >
                                    Advance to Stage {stageFromLevel(submission.level + 1)}
                                    {actionRunning === "advance" && <ButtonLoadingIcon />}
                                </button>
                            )}
                            {can.finalApprove && (
                                <button
                                    className={styles.btnSuccess}
                                    disabled={!!actionRunning}
                                    onClick={() => runAction("final-approve")}
                                >
                                    Final Approve (L3)
                                    {actionRunning === "final-approve" && <ButtonLoadingIcon />}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {(can.returnToVendor ||
                    can.returnEarlier ||
                    can.returnToE ||
                    can.returnToF ||
                    can.retrieve ||
                    can.revertFromL3) && (
                        <div className={styles.decisionGroup}>
                            <span className={styles.decisionGroupLabel}>Send Back</span>
                            <p className={styles.decisionGroupHint}>
                                Returns the application to an earlier participant
                                with a reason. Return to Contractor reopens the
                                form for them to fix. Return for Research and
                                Return to Earlier Stage stay on the staff side.
                            </p>
                            <div className={styles.decisionButtons}>
                                {can.returnToVendor && (
                                    <button
                                        className={styles.btnDanger}
                                        disabled={!!actionRunning}
                                        onClick={openReturnModal}
                                        title="Reopen the form for the contractor with the active remarks attached. Status flips to Returned until they resubmit."
                                    >
                                        Return to Contractor
                                    </button>
                                )}
                                {(can.returnToE || can.returnToF) && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={openReturnPrevModal}
                                        title="Hop one stage back on the staff side with a reason. The contractor is not notified."
                                    >
                                        Return for Research
                                    </button>
                                )}
                                {can.returnEarlier && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={openReturnEarlierModal}
                                        title="HOD only: send back to any earlier stage with a remark for that stage's owner. Contractor is not notified."
                                    >
                                        Return to Earlier Stage
                                    </button>
                                )}
                                {can.retrieve && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={() => runAction("retrieve")}
                                    >
                                        Retrieve from Contractor
                                        {actionRunning === "retrieve" && <ButtonLoadingIcon />}
                                    </button>
                                )}
                                {can.revertFromL3 && (
                                    <button
                                        className={styles.btnDanger}
                                        disabled={!!actionRunning}
                                        onClick={openRevertL3Modal}
                                    >
                                        Revert from L3
                                        {actionRunning === "revert-from-l3" && <ButtonLoadingIcon />}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                {(can.requestPark ||
                    can.approvePark ||
                    can.declinePark ||
                    can.releasePark ||
                    can.doNotAdd) && (
                        <div className={styles.decisionGroup}>
                            <span className={styles.decisionGroupLabel}>Hold</span>
                            <p className={styles.decisionGroupHint}>
                                Parking pauses the application without rejecting
                                it. The contractor cannot resubmit while parked,
                                and no stage owner can advance it. The HOD
                                ultimately decides whether a park stands or is
                                released back to its previous stage.
                            </p>
                            <div className={styles.decisionButtons}>
                                {can.requestPark && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={openParkRequestModal}
                                        title="Ask the HOD to put this application on hold. A reason is required and the HOD will Approve or Decline."
                                    >
                                        Request Park
                                    </button>
                                )}
                                {can.approvePark && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={() => runAction("approve-park")}
                                        title="HOD only: confirms the park request. Application status flips to Parked and movement stops."
                                    >
                                        Approve Park
                                        {actionRunning === "approve-park" && <ButtonLoadingIcon />}
                                    </button>
                                )}
                                {can.declinePark && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={openDeclineParkModal}
                                        title="HOD only: rejects the park request. An optional reason can be recorded."
                                    >
                                        Decline Park
                                        {actionRunning === "decline-park" && <ButtonLoadingIcon />}
                                    </button>
                                )}
                                {can.releasePark && (
                                    <button
                                        className={styles.btnSecondary}
                                        disabled={!!actionRunning}
                                        onClick={openUnparkModal}
                                        title="HOD only: un-parks the application. A reason is required."
                                    >
                                        Unpark
                                        {actionRunning === "release-park" && <ButtonLoadingIcon />}
                                    </button>
                                )}
                                {can.doNotAdd && (
                                    <button
                                        className={styles.btnDanger}
                                        disabled={!!actionRunning}
                                        onClick={openParkL2Modal}
                                        title="Executive Approver only: final decision NOT to add the contractor. Parks at L2 with reason; cannot be released by lower stages."
                                    >
                                        Do Not Add (Park at L2)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
            </div>
        </div>
    )
}

export default DecisionBar
