import moment from "moment";
import Link from "next/link";
import { userCanTogglePriority } from "../page";
import { deriveLevel, getNextStageFromFlags, getStageFromFlags, shouldShowEndUsers } from "../stageHelpers";
import styles from "../styles/styles.module.css";
import PriorityBadge from "../ui/PriorityBadge";

export default function PendingL2Row({ index, companyRecord, user, activeFilter, togglePriority }: any) {
  const canProcess = () => {
    if (
      companyRecord?.currentEndUsers &&
      Array.isArray(companyRecord?.currentEndUsers) &&
      companyRecord?.currentEndUsers?.length > 0
    ) {
      return companyRecord?.currentEndUsers.find((eu: any) => eu._id === user._id) ? true : false;
    }
    return false;
  };

  const userCanViewActions = () => {
    if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2) {
      return canProcess();
    }
    if (user.role === "Admin" || user.role === "HOD" || user.role === "Executive Approver")
      return true;
    if (user.role === "User") return false;
    if (deriveLevel(companyRecord?.flags) === 2 && companyRecord.currentEndUsers.includes(user._id))
      return true;
    if (user.role === "VRM" && (!companyRecord?.flags?.level || deriveLevel(companyRecord?.flags) === 3))
      return true;
    if (user.role === "CO" && (!companyRecord?.flags?.level || deriveLevel(companyRecord?.flags) === 2))
      return true;
    if (
      (user.role === "GM" || user.role?.toLowerCase() === "supervisor") &&
      (!companyRecord?.flags?.level || deriveLevel(companyRecord?.flags) === 4)
    )
      return true;
    return false;
  };

  const getLastUpdated = () => {
    if (companyRecord.lastUpdate)
      return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString();
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString();
    if (companyRecord.approvalActivityHistory)
      return new Date(companyRecord.approvalActivityHistory[0].date).toISOString();
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString();
  };

  const getEndUserNames = () => {
    if (companyRecord.currentEndUsers && Array.isArray(companyRecord.currentEndUsers)) {
      return companyRecord.currentEndUsers.map((eu: any) => eu.name).join(", ");
    } else {
      return "No End Users Assigned";
    }
  };

  const currentStage = getStageFromFlags(companyRecord?.flags);
  const nextStage = getNextStageFromFlags(companyRecord?.flags);

  return (
    <tr
      className={[
        styles.pendingL2Item,
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
            <PriorityBadge />
          )}
        </div>
        {/* <p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p> */}
      </td>
      <td>
        <span className={styles.stageBadge}>{`Stage ${currentStage}`}</span>
      </td>
      {shouldShowEndUsers(activeFilter) && <td>{getEndUserNames()}</td>}
      <td>
        <div className={styles.actionsContainer}>
          {userCanViewActions() && (
            <Link href={`/staff/approvals/${companyRecord._id}`}>{`PROCESS STAGE ${nextStage}`}</Link>
          )}
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