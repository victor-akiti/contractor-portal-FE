import Link from "next/link";
import { userCanTogglePriority } from "../page";
import { getL2PendingStage } from "../stageHelpers";
import styles from "../styles/styles.module.css";
export default function ParkRequestedRow({
  index,
  companyRecord,
  approveParkRequest,
  declineParkRequest,
  user,
  togglePriority,
}: any) {
  const hasAdminPermissions = (role: string) => ["Admin", "HOD"].includes(role);

  return (
    <tr
      className={[styles.parkRequestedItem, index % 2 === 0 && styles.rowDarkBackground].join(" ")}
    >
      <td>
        <Link href={`/staff/vendor/${companyRecord._id}`}>
          {String(companyRecord.companyName).toUpperCase()}
        </Link>
        {companyRecord?.flags?.isPriority && (
          <span className={styles.priorityBadge}>Priority</span>
        )}
        {/* <p>
          {companyRecord?.vendorAppAdminProfile?.email
            ? companyRecord?.vendorAppAdminProfile?.email
            : companyRecord?.contractorDetails?.email}
        </p> */}
      </td>
      <td>
        <p>Stage {getL2PendingStage(companyRecord?.flags)}</p>
      </td>
      <td>
        <p>{companyRecord?.flags?.hold?.requestedBy?.name}</p>
      </td>
      <td>
        {companyRecord.endUsers &&
          Array.isArray(companyRecord.endUsers) &&
          companyRecord.endUsers?.length > 0 && <></>}
        {hasAdminPermissions(user.role) && (
          <>
            <a onClick={() => approveParkRequest(companyRecord._id)}>APPROVE PARK REQUEST</a>
            <br />
            <a onClick={() => declineParkRequest(companyRecord._id)}>REJECT PARK REQUEST</a>
          </>
        )}
        {togglePriority && userCanTogglePriority(user) && (
          <>
            <br />
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
          </>
        )}
      </td>
    </tr>
  );
}
