import Link from 'next/link'
import { useState } from 'react'
import PrimaryColorSmallLoadingIcon from '@/components/primaryColorLoadingIcon'
import { getProtected } from '@/requests/get'
import styles from '../styles/styles.module.css'

export default function InvitedContractorRow({inviteDetails, index, user, setInviteToArchiveObject, activeFilter, removeInviteFromExpired}:any){
  const inviteHasExpired = () => {
    const currentDate = new Date()
    const expiryDate = inviteDetails?.expiry?._seconds ? new Date(inviteDetails.expiry._seconds*1000) : new Date(inviteDetails.expiry)
    return currentDate.getTime() > expiryDate.getTime()
  }
  const hasCnPPermissions = () => (["Admin","HOD","VRM","CnP Staff","Supervisor"].includes(user.role))
  const getDateFromTimestamp = (timestamp:any) => {
    const date = new Date(timestamp); return date ? `${date.toDateString()}` : ""
  }
  const getDateFromDateString = (dateString:any) => {
    const date = dateString?._seconds ? new Date(dateString._seconds*1000) : new Date(dateString)
    return date ? `${date.toDateString()}` : ""
  }

  const [sendReminderText, setSendReminderText] = useState("SEND REMINDER")
  const [renewText, setRenewText] = useState("EXTEND EXPIRY DATE")
  const [renewing, setRenewing] = useState(false)

  const sendReminder = async () => {
    try{
      setSendReminderText("SENDING REMINDER")
      const res = await getProtected(`invites/remind/${inviteDetails._id}`, user.role)
      if (res.status === "OK"){
        setSendReminderText("REMINDER SENT")
        if (activeFilter === "Expired"){ removeInviteFromExpired(inviteDetails._id) }
      } else {
        setSendReminderText("SEND REMINDER")
      }
    } catch(e){
      setSendReminderText("SEND REMINDER")
    }
  }

  const renewRequest = async () => {
    try{
      setRenewText("EXTENDING EXPIRY DATE...")
      const renewRes = await getProtected(`invites/renew/${inviteDetails._id}`, user.role)
      if (renewRes.status === "OK"){
        setRenewText("EXTENDED EXPIRY DATE")
      } else {
        setRenewText("EXTEND EXPIRY DATE")
      }
    } catch(e){
      setRenewText("EXTEND EXPIRY DATE")
    }
  }

  return (
    <tr className={index%2===0 && styles.rowDarkBackground as any}>
      <td>
        <p className={styles.contractorName}>{String(inviteDetails.companyName).toLocaleUpperCase()}</p>
      </td>
      <td className={styles.userDetails}>
        <p>{`${inviteDetails.fname} ${inviteDetails.lname}`.toLocaleUpperCase()}</p>
        <p>{inviteDetails.vendorAppAdminProfile?.email ? inviteDetails.vendorAppAdminProfile?.email : inviteDetails.email}</p>
        <p>{inviteDetails?.phone?.number ? inviteDetails?.phone?.number : inviteDetails?.phone}</p>
      </td>
      <td className={styles.status}>
        {/* EXPIRED & UNUSED */}
        {inviteHasExpired() && !inviteDetails.used && (<>
          <p className={styles.expiredText}>EXPIRED</p>
          <p className={styles.statusDateText}>Expired: {getDateFromDateString(inviteDetails.expiry)}</p>
          <div className={styles.renewRequestTextDiv}>
            {renewText !== "EXTENDED EXPIRY DATE" && hasCnPPermissions() && <a className={styles.renewText} onClick={renewRequest}>{renewText}</a>}
            {renewText === "EXTENDING EXPIRY DATE..." && <PrimaryColorSmallLoadingIcon />}
            {renewText === "EXTENDED EXPIRY DATE" && <p className={styles.reminderSentText}>EXPIRY DATE EXTENDED</p>}
          </div>
        </>)}

        {/* USED */}
        {inviteDetails.used && (<>
          <p className={styles.usedText}>USED</p>
          <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved)}</p>
          <p className={styles.statusDateText}>Used: {getDateFromTimestamp(inviteDetails.used)}</p>
        </>)}

        {/* ACTIVE */}
        {!inviteHasExpired() && !inviteDetails.used && (<>
          <p className={styles.activeText}>ACTIVE</p>
          <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved ? inviteDetails.timeApproved : inviteDetails.createdAt)}</p>
          {inviteDetails.lastReminderSent && <p className={styles.statusDateText}>Last Reminder Sent: {getDateFromDateString(inviteDetails.lastReminderSent)}</p>}
          {sendReminderText !== "REMINDER SENT" && (
            <div className={styles.reminderDiv}>
              <a onClick={sendReminder} className={styles.renewText}>{sendReminderText}</a>
              {sendReminderText === "SENDING REMINDER" && <PrimaryColorSmallLoadingIcon />}
            </div>
          )}
          {sendReminderText === "REMINDER SENT" && <p className={styles.reminderSentText}>REMINDER SENT</p>}
          {hasCnPPermissions() && <Link href={`invites/${inviteDetails._id}`}>RESEND INVITE</Link>}
        </>)}

        {(user.role === "Admin" || user.role === "HOD" || user.role === "VRM") && !inviteDetails.used && (
          <p className={styles.deleteInviteText} onClick={()=> setInviteToArchiveObject(inviteDetails)}>Archive Invite</p>
        )}
        <p></p>
        <p></p>
      </td>
    </tr>
  )
}
