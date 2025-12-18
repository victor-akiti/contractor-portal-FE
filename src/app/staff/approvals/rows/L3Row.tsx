import moment from "moment";
import Link from "next/link";
import styles from "../styles/styles.module.css";
export default function L3Row({ index, companyRecord, revertToL2, user, togglePriority }: any) {
  const getLastUpdated = () => {
    if (companyRecord.lastUpdate)
      return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString();
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString();
    if (companyRecord.approvalActivityHistory)
      return new Date(companyRecord.approvalActivityHistory[0].date).toISOString();
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString();
  };
  const hasAdminPermissions = (role: string) => ["Admin", "HOD"].includes(role);

  return (
    <tr className={[styles.l3Item, index % 2 === 0 && styles.rowDarkBackground].join(" ")}>
      <td>
        <Link href={`/staff/vendor/${companyRecord._id}`}>
          {String(companyRecord.companyName).toUpperCase()}
        </Link>
        {companyRecord?.flags?.isPriority && (
          <span className={styles.priorityBadge}>Priority</span>
        )}
        {/* <p>
          {String(
            companyRecord?.vendorAppAdminProfile?.email
              ? companyRecord?.vendorAppAdminProfile?.email
              : companyRecord?.contractorDetails?.email,
          )}
        </p> */}
      </td>
      <td className={styles.actionsContainer}>
        {hasAdminPermissions(user.role) && (
          <a onClick={() => revertToL2(companyRecord.vendor)}>MOVE TO L2</a>
        )}
      </td>
      <td>
        <p>{moment(getLastUpdated()).format("LL")}</p>
      </td>
    </tr>
  );
}
