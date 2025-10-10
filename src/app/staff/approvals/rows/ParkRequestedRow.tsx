import Link from 'next/link'
import { getL2PendingStage } from '../ApprovalsContainer'
import styles from '../styles/styles.module.css'
export default function ParkRequestedRow({ index, companyRecord, approveParkRequest, declineParkRequest, user }: any) {
  const hasAdminPermissions = (role: string) => (["Admin", "HOD"].includes(role))

  return (
    <tr className={[styles.parkRequestedItem, index % 2 === 0 && styles.rowDarkBackground].join(" ")}>
      <td><Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toUpperCase()}</Link><p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p></td>
      <td><p>Stage {getL2PendingStage(companyRecord?.flags)}</p></td>
      <td><p>{companyRecord?.flags?.hold?.requestedBy?.name}</p></td>
      <td>
        {companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers?.length > 0 && (<></>)}
        {hasAdminPermissions(user.role) && (<>
          <a onClick={() => approveParkRequest(companyRecord._id)}>APPROVE PARK REQUEST</a><br />
          <a onClick={() => declineParkRequest(companyRecord._id)}>REJECT PARK REQUEST</a>
        </>)}
      </td>
    </tr>
  )
}
