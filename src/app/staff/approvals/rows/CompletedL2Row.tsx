import moment from "moment";
import Link from "next/link";
import styles from "../styles/styles.module.css";
export default function CompletedL2Row({ index, companyRecord, revertToL2, user }: any) {
  const getLastUpdated = () => {
    if (companyRecord.lastUpdate)
      return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString();
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString();
    if (companyRecord.approvalActivityHistory)
      return new Date(companyRecord.approvalActivityHistory[0].date).toISOString();
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString();
  };
  const hasAdminPermissions = (role: string) => ["Admin", "HOD"].includes(role);
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
        return "G";
      default:
        return "A";
    }
  };

  return (
    <tr className={[styles.completedL2Item, index % 2 === 0 && styles.rowDarkBackground].join(" ")}>
      <td>
        <Link href={`/staff/vendor/${companyRecord._id}`}>
          {String(companyRecord.companyName).toUpperCase()}
        </Link>
        {/* <p>
          {companyRecord?.vendorAppAdminProfile?.email
            ? companyRecord?.vendorAppAdminProfile?.email
            : companyRecord?.contractorDetails?.email}
        </p> */}
      </td>
      <td>
        <p>{`Stage ${getCurrentStage()}`}</p>
      </td>
      <td>
        {hasAdminPermissions(user.role) && (
          <a onClick={() => revertToL2(companyRecord.vendor)}>REVERT TO PENDING L2</a>
        )}
      </td>
      <td>
        <p>{moment(getLastUpdated()).format("LL")}</p>
      </td>
    </tr>
  );
}
