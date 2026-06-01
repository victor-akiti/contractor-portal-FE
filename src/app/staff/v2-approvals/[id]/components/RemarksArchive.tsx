"use client"

import styles from "../styles.module.css"
import { Remark, anchorLabel } from "../types"

interface Props {
    remarks: Remark[]
    role: string
    schema: any
    currentLevel: number
}

// Senior-only archive of remarks for stages after B. Shown inside the
// Comments tab so HOD / VRM / Supervisor can see prior concerns with
// rich context (who, when, which cycle, section + field as labels) but
// without surfacing them inline on the form (which is a Stage B
// affordance).
const RemarksArchive = ({ remarks, role, schema, currentLevel }: Props) => {
    // Hidden at Stage B (where they live inline on the form) and for
    // non-senior viewers (End Users, DD officers, Executive Approver).
    // BE already empties the list for them, but we belt-and-braces hide
    // the section header here too.
    if (currentLevel === 0) return null
    const SENIOR = ["Admin", "HOD", "VRM", "Supervisor"]
    if (!SENIOR.includes(role)) return null
    if (!Array.isArray(remarks) || remarks.length === 0) return null

    // Group by cycle so reviewers see the latest cycle first; within a
    // cycle, active > addressed > withdrawn so unresolved sits on top.
    const order = (s: string) => (s === "active" ? 0 : s === "addressed" ? 1 : 2)
    const byCycle = new Map<number, Remark[]>()
    for (const r of remarks) {
        const arr = byCycle.get(r.cycleNumber) || []
        arr.push(r)
        byCycle.set(r.cycleNumber, arr)
    }
    const cycles = Array.from(byCycle.keys()).sort((a, b) => b - a)

    return (
        <div className={styles.remarksArchive}>
            <h4>Remarks archive</h4>
            <p className={styles.archiveSub}>
                Concerns raised by the VRM and resolved (or still open)
                across submission cycles. Visible to HOD / VRM / Supervisor
                only.
            </p>
            {cycles.map((c) => {
                const items = (byCycle.get(c) || []).slice().sort(
                    (a, b) => order(a.status) - order(b.status),
                )
                return (
                    <div key={c} className={styles.archiveCycle}>
                        <div className={styles.archiveCycleHead}>
                            Cycle #{c}
                        </div>
                        <ul className={styles.archiveList}>
                            {items.map((r) => (
                                <li key={r._id} className={styles[`archive_${r.status}`]}>
                                    <div className={styles.archiveAnchor}>
                                        {anchorLabel(schema, r.sectionKey, (r as any).fieldKey)}
                                    </div>
                                    <p className={styles.archiveText}>{r.text}</p>
                                    <div className={styles.archiveMeta}>
                                        <span
                                            className={`${styles.archiveStatus} ${styles[`rstat_${r.status}`]}`}
                                        >
                                            {r.status}
                                        </span>
                                        <span>{r.authorName || r.authorEmail || "Staff"}</span>
                                        {r.createdAt && (
                                            <span>
                                                Returned {new Date(r.createdAt).toLocaleString("en-NG")}
                                            </span>
                                        )}
                                        {r.status === "addressed" && r.addressedAt && (
                                            <span>
                                                Addressed {new Date(r.addressedAt).toLocaleString("en-NG")}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            })}
        </div>
    )
}

export default RemarksArchive
