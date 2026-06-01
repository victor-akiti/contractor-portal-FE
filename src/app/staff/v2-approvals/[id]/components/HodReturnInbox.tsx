"use client"

import styles from "../styles.module.css"
import { Submission } from "../types"

interface Props { submission: Submission }

interface HodReturnEntry {
    reason: string
    fromLevel: number
    toLevel: number
    returnedBy?: { name?: string; email?: string }
    returnedAt?: string | number | Date
}

// Inbox-style alert shown when the HOD (or Executive Approver) sent this
// submission back to the current stage. Surfaces the reason so the
// receiving owner sees the research request before anything else.
//
// Sources we read from, in order of preference:
//   1. reverts.history entries with type "HOD_RETURN" and matching toLevel.
//      Populated by return-to-earlier-stage (HOD generic) and
//      return-to-previous-stage (HOD F->E, EA G->F).
//   2. approvalHistory entries with action matching the legacy
//      "Returned from Stage X to Stage Y for additional research" line
//      and extraData.reason. Used as a fallback for submissions that
//      were returned before the reverts.history push was wired in, so
//      the VRM still sees the HOD's reason on existing data.
const HodReturnInbox = ({ submission }: Props) => {
    const currentLevel = submission.level
    const fromReverts: HodReturnEntry[] = ((submission as any).reverts?.history || [])
        .filter(
            (h: any) =>
                h?.type === "HOD_RETURN" &&
                Number(h.toLevel) === currentLevel &&
                h.status !== "resolved",
        )
        .map((h: any) => ({
            reason: h.reason,
            fromLevel: Number(h.fromLevel),
            toLevel: Number(h.toLevel),
            returnedBy: h.returnedBy,
            returnedAt: h.returnedAt,
        }))

    const matchedFromHistory: HodReturnEntry[] =
        fromReverts.length > 0
            ? []
            : ((submission as any).approvalHistory || [])
                  .slice()
                  .reverse()
                  .filter((h: any) => {
                      const action = String(h?.action || "")
                      if (!action.includes("for additional research")) return false
                      // Action shape: "Returned from Stage F to Stage E for additional research"
                      const m = action.match(/from Stage ([A-G]) to Stage ([A-G])/)
                      if (!m) return false
                      const to = m[2].charCodeAt(0) - 66
                      return to === currentLevel
                  })
                  .map((h: any) => {
                      const m = String(h.action).match(/from Stage ([A-G]) to Stage ([A-G])/)
                      const from = m ? m[1].charCodeAt(0) - 66 : -1
                      return {
                          reason:
                              (h.extraData && h.extraData.reason) ||
                              h.description ||
                              "(no reason recorded)",
                          fromLevel: from,
                          toLevel: currentLevel,
                          returnedBy: { name: h.actorName, email: h.actorEmail },
                          returnedAt: h.date,
                      }
                  })

    const matched = (fromReverts.length > 0 ? fromReverts : matchedFromHistory).slice(-3)
    if (matched.length === 0) return null

    return (
        <div className={styles.hodReturnInbox}>
            <h4>HOD requested additional research</h4>
            {matched.map((h, i) => (
                <div key={i} className={styles.hodReturnEntry}>
                    <p className={styles.hodReturnReason}>{h.reason}</p>
                    <span className={styles.hodReturnMeta}>
                        From Stage {String.fromCharCode(66 + h.fromLevel)} -{" "}
                        {h.returnedBy?.name || h.returnedBy?.email || "HOD"}
                        {h.returnedAt && ` - ${new Date(h.returnedAt).toLocaleString("en-NG")}`}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default HodReturnInbox
