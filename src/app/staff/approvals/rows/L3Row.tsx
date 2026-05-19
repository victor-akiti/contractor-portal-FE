import moment from "moment";
import Link from "next/link";
import styles from "../styles/styles.module.css";
export default function L3Row({ index, companyRecord, revertToL2, user, togglePriority }: any) {
  const getLastUpdated = () => companyRecord.vendorFormUpdatedAt ?? companyRecord.updatedAt;
  const hasAdminPermissions = (role: string) => ["Admin", "HOD"].includes(role);

  return (
    <tr className={[styles.l3Item, index % 2 === 0 && styles.rowDarkBackground].join(" ")}>
      <td>
        <Link href={`/staff/vendor/${companyRecord._id}`}>
          {String(companyRecord.companyName).toUpperCase()}
        </Link>
        {/* {companyRecord?.flags?.isPriority && (
          <PriorityBadge />
        )} */}
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
