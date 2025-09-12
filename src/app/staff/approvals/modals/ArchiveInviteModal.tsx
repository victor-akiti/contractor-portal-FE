import Modal from '@/components/modal'
import ButtonLoadingIcon from '@/components/buttonLoadingIcon'
import ErrorText from '@/components/errorText'
import SuccessMessage from '@/components/successMessage'
import styles from '../styles/styles.module.css'

interface Props{
  archivingInvite:any
  archiveStatusMessages:{errorMessage:string, successMessage:string}
  onArchive:()=>void
  onClose:()=>void
}
export default function ArchiveInviteModal({archivingInvite, archiveStatusMessages, onArchive, onClose}:Props){
  return (
    <Modal>
      <div className={styles.confirmArchiveModalDiv}>
        {!archiveStatusMessages.successMessage && <p>You are about to archive this invite. You would only be able to restore the invite if the email is still unused.</p>}
        <div className={styles.archiveStatusMessages}>
          {archiveStatusMessages.errorMessage && <ErrorText text={archiveStatusMessages.errorMessage} />}
          {archiveStatusMessages.successMessage && <SuccessMessage message={archiveStatusMessages.successMessage} />}
        </div>
        <div>
          {!archiveStatusMessages.successMessage && <button disabled={archivingInvite} onClick={onArchive}>Continue {archivingInvite && <ButtonLoadingIcon />}</button>}
          <button disabled={archivingInvite} onClick={onClose}>{archiveStatusMessages.successMessage ? "Close" : "Cancel"}</button>
        </div>
      </div>
    </Modal>
  )
}
