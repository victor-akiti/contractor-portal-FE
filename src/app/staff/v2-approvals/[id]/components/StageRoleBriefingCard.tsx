"use client"

import styles from "../styles.module.css"
import { Submission } from "../types"

interface Props {
    submission: Submission
    role: string
    user: any
    openEndUserPicker: () => void
    openServicesModal: () => void
    openDueDiligenceTab: () => void
    // When true, the CTA button is suppressed entirely so the card
    // becomes a pure read-only briefing. Used by view-only mode.
    hideCta?: boolean
}

// Role-aware briefing for the current stage. Mirrors the legacy "you are
// <X> at <stage>, do <Y>" briefing so every staff role lands on a page
// that explains - in their own terms - what they need to do.
const StageRoleBriefingCard = ({
    submission,
    role,
    user,
    openEndUserPicker,
    openServicesModal,
    openDueDiligenceTab,
    hideCta,
}: Props) => {
    if (submission.status !== "pending") return null

    const lvl = submission.level
    const isAssignedEndUser =
        !!user?._id &&
        (submission.selectedEndUsers || []).some(
            (u: any) => String(typeof u === "string" ? u : u?._id || u) === String(user._id),
        )

    let title = ""
    let body = ""
    let cta: { label: string; onClick: () => void } | null = null
    let secondaryCta: { label: string; onClick: () => void } | null = null

    if (lvl === 0 && ["Admin", "HOD", "VRM"].includes(role)) {
        title = "Stage B - Vendor Relationship Manager"
        body = "Review every section, leave remarks on anything wrong, then advance to the Supervisor at Stage C."
    } else if (lvl === 1 && ["Admin", "HOD", "Supervisor"].includes(role)) {
        const n = (submission.selectedEndUsers || []).length
        const s = ((submission as any).selectedServices || []).length
        title = "Stage C - Supervisor"
        const partsDone: string[] = []
        const partsTodo: string[] = []
        if (n > 0) partsDone.push(`${n} End User${n === 1 ? "" : "s"} assigned`)
        else partsTodo.push("pick the End User(s) for Stage D")
        if (s > 0) partsDone.push(`${s} service${s === 1 ? "" : "s"} tagged`)
        else partsTodo.push("tag the services this contractor will be evaluated for")
        body = partsDone.length
            ? `${partsDone.join(" · ")}. You can edit either selection before advancing to Stage D.`
            : `Before advancing to Stage D, ${partsTodo.join(" and ")}.`
        cta = {
            label: n > 0 ? "Edit End Users" : "Assign End Users",
            onClick: openEndUserPicker,
        }
        secondaryCta = {
            label: s > 0 ? "Edit Services" : "Tag Services",
            onClick: openServicesModal,
        }
    } else if (lvl === 2) {
        if (isAssignedEndUser || ["Admin", "HOD"].includes(role)) {
            const n = ((submission as any).selectedServices || []).length
            title = "Stage D - End User"
            body =
                n > 0
                    ? `${n} service${n === 1 ? "" : "s"} recorded${
                          submission.siteVisitRequired ? ". Site visit flagged as required" : ""
                      }. You can edit before advancing to Due Diligence at Stage E.`
                    : "Record the services that apply to this contractor and flag whether a site visit is needed, then advance to Stage E."
            cta = { label: n > 0 ? "Edit Services" : "Record Services", onClick: openServicesModal }
        } else {
            title = "Stage D - End User"
            body =
                "Only the End Users assigned by the Supervisor (or HOD/Admin) can act at this stage. You can view but not advance."
        }
    } else if (lvl === 3 && ["Admin", "HOD", "CO", "Supervisor", "Amni Staff", "End User"].includes(role)) {
        title = "Stage E - Due Diligence"
        body =
            "Complete the four Due Diligence checks (Registration, Internet, Reference, Exposed Persons). Each check needs a finding plus supporting upload before you can advance to the HOD review at Stage F."
        cta = { label: "Open Due Diligence", onClick: openDueDiligenceTab }
    } else if (lvl === 4 && ["Admin", "HOD"].includes(role)) {
        title = "Stage F - HOD Due Diligence Review"
        body =
            "Read the Due Diligence record, tick the four approval boxes once you are satisfied, optionally add a note for the Executive Approver, then advance to Stage G."
        cta = { label: "Open Due Diligence", onClick: openDueDiligenceTab }
    } else if (lvl === 5 && ["Admin", "Executive Approver"].includes(role)) {
        title = "Stage G - Executive Approver"
        body =
            "Three options: Final approve to L3, Return for Research back to HOD, or Do Not Add (parks the contractor at L2). Read the HOD's note before deciding."
    }

    if (!title) return null

    return (
        <div className={styles.stageBriefing}>
            <div>
                <h4>{title}</h4>
                <p>{body}</p>
            </div>
            {!hideCta && (cta || secondaryCta) && (
                <div className={styles.stageBriefingCtas}>
                    {cta && (
                        <button className={styles.btnPrimary} onClick={cta.onClick}>
                            {cta.label}
                        </button>
                    )}
                    {secondaryCta && (
                        <button className={styles.btnSecondary} onClick={secondaryCta.onClick}>
                            {secondaryCta.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default StageRoleBriefingCard
