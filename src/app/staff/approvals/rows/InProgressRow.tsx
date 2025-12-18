import moment from "moment";
import { userCanTogglePriority } from "../page";
import styles from "../styles/styles.module.css";

export default function InProgressRow({ index, companyRecord, togglePriority, user }: any) {

  const getLastUpdated = () => {
    if (companyRecord.lastUpdate)
      return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString();
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString();
    if (companyRecord.lastUpdate)
      return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString();
    if (companyRecord.approvalActivityHistory)
      return new Date(companyRecord.approvalActivityHistory[0].date).toISOString();
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString();
  };

  return (
    <tr
      className={[
        styles.inProgressItem,
        companyRecord.needsAttention
          ? styles.needsAttendionBackground
          : index % 2 === 0 && styles.rowDarkBackground,
      ].join(" ")}
    >
      <td>
        <div className={styles.companyNameContainer}>
          <span>{companyRecord?.companyName}</span>
          {companyRecord?.flags?.isPriority && (
            <span className={styles.priorityBadge}>Priority</span>
          )}
        </div>
        {togglePriority && userCanTogglePriority(user) && (
          <button
            className={`${styles.priorityActionButton} ${companyRecord?.flags?.isPriority ? styles.deprioritise : ""}`}
            onClick={() =>
              togglePriority(
                companyRecord._id,
                !companyRecord?.flags?.isPriority,
                companyRecord.companyName
              )
            }
          >
            {companyRecord?.flags?.isPriority ? (
              <>
                <span className={styles.icon}>🔻</span>
                <span>Deprioritise</span>
              </>
            ) : (
              <>
                <span className={styles.icon}>⭐</span>
                <span>Prioritise</span>
              </>
            )}
          </button>
        )}
        {/* <p>{companyRecord?.contractorDetails?.email}</p> */}
      </td>
      <td>
        <p className={styles.dateDisplay}>{moment(getLastUpdated()).format("LL")}</p>
      </td>
    </tr>
  );
}