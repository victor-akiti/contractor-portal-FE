"use client"

import styles from "../styles.module.css"
import { Submission } from "../types"

interface Props { submission: Submission }

// Inbox-style alert shown when the HOD has bounced this submission down
// to the current stage via return-to-earlier-stage. Surfaces the most
// recent (up to 3) active entries so the receiving owner sees the HOD's
// note before anything else.
const HodReturnInbox = ({ submission }: Props) => {
    const arr = (submission as any).reverts?.history || []
    const matched: any[] = arr
        .filter(
            (h: any) =>
                h?.type === "HOD_RETURN" &&
                Number(h.toLevel) === submission.level &&
                h.status !== "resolved",
        )
        .slice(-3)
    if (matched.length === 0) return null
    return (
        <div className={styles.hodReturnInbox}>
            <h4>HOD sent this back to your stage</h4>
            {matched.map((h, i) => (
                <div key={i} className={styles.hodReturnEntry}>
                    <p className={styles.hodReturnReason}>{h.reason}</p>
                    <span className={styles.hodReturnMeta}>
                        From Stage {String.fromCharCode(66 + Number(h.fromLevel))} -{" "}
                        {h.returnedBy?.name || h.returnedBy?.email || "HOD"}
                        {h.returnedAt && ` - ${new Date(h.returnedAt).toLocaleString("en-NG")}`}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default HodReturnInbox
