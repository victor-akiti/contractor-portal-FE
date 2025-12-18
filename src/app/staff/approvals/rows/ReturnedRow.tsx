import moment from "moment";
import Link from "next/link";
import { userCanTogglePriority } from "../page";
import styles from "../styles/styles.module.css";

export default function ReturnedRow({ index, companyRecord, togglePriority, user }: any) {

  const getLastUpdated = () => {
    if (companyRecord.lastUpdate)
      return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString();
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString();
    if (companyRecord.approvalActivityHistory)
      return new Date(companyRecord.approvalActivityHistory[0].date).toISOString();
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString();
  };

  const getCurrentStage = () => {
    const level = companyRecord?.flags?.approvals?.level ?? companyRecord?.flags?.level ?? 0; // fallback

    switch (level) {
      case 0:
        return "A";
      case 1:
        return "B";
      case 2:
        return "C";
      case 3:
        return "D";
      case 4:
        return "E";
      case 5:
        return "F";
      case 6:
        return "L3"; // G
      default:
        return "A";
    }
  };

  return (
    <tr
      className={[
        styles.returnedItem,
        companyRecord.needsAttention
          ? styles.needsAttendionBackground
          : index % 2 === 0 && styles.rowDarkBackground,
      ].join(" ")}
    >
      <td>
        <div className={styles.companyNameContainer}>
          <Link href={`/staff/vendor/${companyRecord._id}`}>
            {String(companyRecord.companyName).toUpperCase()}
          </Link>
          {companyRecord?.flags?.isPriority && (
            <span className={styles.priorityBadge}>Priority</span>
          )}
        </div>
        {/* <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p> */}
      </td>
      <td>
        <span className={styles.stageBadge}>{`Stage ${getCurrentStage()}`}</span>
      </td>
      <td>
        <div className={styles.actionsContainer}>
          <Link href={`/staff/vendor/${companyRecord._id}`}>VIEW</Link>
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
        </div>
      </td>
      <td>
        <p className={styles.dateDisplay}>{moment(getLastUpdated()).format("LL")}</p>
      </td>
    </tr>
  );
}