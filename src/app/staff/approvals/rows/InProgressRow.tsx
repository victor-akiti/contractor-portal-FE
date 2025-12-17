import moment from "moment";
import styles from "../styles/styles.module.css";
export default function InProgressRow({ index, companyRecord, togglePriority, user }: any) {
  const userCanTogglePriority = () => {
    if (!user) return false;
    const allowedRoles = ["Admin", "HOD", "IT Admin", "C&P Admin", "C and P Staff"];
    return allowedRoles.includes(user?.role);
  };
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
    <tr className={[styles.inProgressItem, index % 2 === 0 && styles.rowDarkBackground].join(" ")}>
      <td>
        <a>{companyRecord?.companyName}</a>
        {togglePriority && userCanTogglePriority() && (
          <>
            {" - "}
            <a
              onClick={() =>
                togglePriority(
                  companyRecord._id,
                  !companyRecord?.flags?.isPriority,
                  companyRecord.companyName
                )
              }
              style={{ fontSize: "0.85em", cursor: "pointer" }}
            >
              {companyRecord?.flags?.isPriority ? "[Deprioritise]" : "[Prioritise]"}
            </a>
          </>
        )}
        {/* <p>{companyRecord?.contractorDetails?.email}</p> */}
      </td>
      <td>
        <p>{moment(getLastUpdated()).format("LL")}</p>
      </td>
    </tr>
  );
}
