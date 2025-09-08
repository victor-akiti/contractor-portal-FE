import Link from 'next/link'
import moment from 'moment'
import styles from '../styles/styles.module.css'
export default function CompletedL2Row({index, companyRecord, revertToL2, user}:any){
  const getLastUpdated = () => {
    if (companyRecord.lastUpdate) return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString()
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString()
    if (companyRecord.approvalActivityHistory) return new Date(companyRecord.approvalActivityHistory[0].date).toISOString()
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString()
  }
  const hasAdminPermissions = (role:string) => (["Admin","HOD"].includes(role))
  const getCurrentStage = () => {
    if (!companyRecord?.flags?.approvals?.level) return "A"
    if (companyRecord?.flags?.approvals?.level===1) return "B"
    if (companyRecord?.flags?.approvals?.level===2) return "C"
    if (companyRecord?.flags?.approvals?.level===3) return "D"
    if (companyRecord?.flags?.approvals?.level===4) return "E"
    if (companyRecord?.flags?.approvals?.level===5) return "F"
    if (companyRecord?.flags?.approvals?.level===6) return "G"
  }
  return (
    <tr className={[styles.completedL2Item, index%2===0 && styles.rowDarkBackground].join(" ")}>
      <td><Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toUpperCase()}</Link><p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p></td>
      <td><p>{`Stage ${getCurrentStage()}`}</p></td>
      <td>{hasAdminPermissions(user.role) && <a onClick={()=> revertToL2(companyRecord.vendor)}>REVERT TO PENDING L2</a>}</td>
      <td><p>{moment(getLastUpdated()).format("LL")}</p></td>
    </tr>
  )
}
