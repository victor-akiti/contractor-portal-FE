import moment from "moment";
import styles from "../styles/styles.module.css";
import PriorityBadge from "../ui/PriorityBadge";

export default function InProgressRow({ index, companyRecord, togglePriority, user }: any) {

  const getLastUpdated = () => companyRecord.vendorFormUpdatedAt ?? companyRecord.updatedAt;

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
            <PriorityBadge />
          )}
        </div>
        {/* {togglePriority && userCanTogglePriority(user) && (
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
        )} */}
        {/* <p>{companyRecord?.contractorDetails?.email}</p> */}
      </td>
      <td>
        <p className={styles.dateDisplay}>{moment(getLastUpdated()).format("LL")}</p>
      </td>
    </tr>
  );
}