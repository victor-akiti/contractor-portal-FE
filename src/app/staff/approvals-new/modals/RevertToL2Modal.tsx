import styles from '../styles/styles.module.css'
export default function RevertToL2Modal({actionProgress, onConfirm, onCancel}:{actionProgress:string, onConfirm:()=>void, onCancel:()=>void}){
  return (
    <div className={styles.revertToL2Div}>
      <h3>Revert To L2</h3>
      <p>You are about to move this vendor&apos;s application back to L2. Proceed?</p>
      <div>
        {actionProgress !== "processing" && <button onClick={onConfirm}>Revert to L2</button>}
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
