import moment from 'moment'
import Link from 'next/link'
import styles from '../styles/styles.module.css'
export default function PendingL2Row({ index, companyRecord, user, activeFilter }: any) {
  const userCanViewActions = () => {
    if (user.role === "Admin" || user.role === "HOD" || user.role === "Executive Approver") return true
    if (user.role === "User") return false
    if (companyRecord?.flags?.level === 2 && companyRecord.currentEndUsers.includes(user._id)) return true
    if (user.role === "VRM" && (!companyRecord?.flags?.level || companyRecord?.flags?.level === 3)) return true
    if (user.role === "CO" && (!companyRecord?.flags?.level || companyRecord?.flags?.level === 2)) return true
    if ((user.role === "GM" || user.role === "supervisor") && (!companyRecord?.flags?.level || companyRecord?.flags?.level === 4)) return true
    return false
  }
  const getCurrentStage = () => {
    if (!companyRecord?.flags?.approvals?.level && !companyRecord?.flags?.level) return "A"
    if (companyRecord?.flags?.level === 1 || companyRecord?.flags?.approvals?.level === 1) return "B"
    if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2) return "C"
    if (companyRecord?.flags?.level === 3 || companyRecord?.flags?.approvals?.level === 3) return "D"
    if (companyRecord?.flags?.level === 4 || companyRecord?.flags?.approvals?.level === 4) return "E"
    if (companyRecord?.flags?.level === 5 || companyRecord?.flags?.approvals?.level === 5) return "F"
    if (companyRecord?.flags?.level === 6 || companyRecord?.flags?.approvals?.level === 6) return "G"
  }
  const getNextStage = () => {
    if (!companyRecord?.flags?.approvals?.level && !companyRecord?.flags?.level) return "B"
    if (companyRecord?.flags?.level === 1 || companyRecord?.flags?.approvals?.level === 1) return "C"
    if (companyRecord?.flags?.level === 2 || companyRecord?.flags?.approvals?.level === 2) return "D"
    if (companyRecord?.flags?.level === 3 || companyRecord?.flags?.approvals?.level === 3) return "E"
    if (companyRecord?.flags?.level === 4 || companyRecord?.flags?.approvals?.level === 4) return "F"
    if (companyRecord?.flags?.level === 5 || companyRecord?.flags?.approvals?.level === 5) return "G"
    if (companyRecord?.flags?.level === 6 || companyRecord?.flags?.approvals?.level === 6) return "H"
  }
  const getLastUpdated = () => {
    if (companyRecord.lastUpdate) return new Date(companyRecord.lastUpdate._seconds * 1000).toISOString()
    if (companyRecord.lastApproved) return new Date(companyRecord.lastApproved).toISOString()
    if (companyRecord.approvalActivityHistory) return new Date(companyRecord.approvalActivityHistory[0].date).toISOString()
    if (companyRecord.updatedAt) return new Date(companyRecord.updatedAt).toISOString()
  }

  const getEndUserNames = () => {
    if (companyRecord.currentEndUsers && Array.isArray(companyRecord.currentEndUsers)) {
      return companyRecord.currentEndUsers.map((eu: any) => eu.name).join(", ")
    } else {
      return "No End Users Assigned"
    }
  }
  return (
    <tr className={[styles.pendingL2Item, companyRecord.needsAttention ? styles.needsAttendionBackground : (index % 2 === 0 && styles.rowDarkBackground)].join(" ")}>
      <td><Link href={`/staff/vendor/${companyRecord._id}`}>{String(companyRecord.companyName).toUpperCase()}</Link><p>{companyRecord?.vendorAppAdminProfile?.email ? companyRecord?.vendorAppAdminProfile?.email : companyRecord?.contractorDetails?.email}</p></td>
      <td><p>{`Stage ${getCurrentStage()}`}</p></td>
      {(activeFilter === "C" || activeFilter === "E") && <td>{getEndUserNames()}</td>}
      <td>{userCanViewActions() && <Link href={`/staff/approvals/${companyRecord._id}`}>{`PROCESS TO STAGE ${getNextStage()}`}</Link>}</td>
      <td><p>{moment(getLastUpdated()).format("LL")}</p></td>
    </tr>
  )
}
