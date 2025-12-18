import Modal from "@/components/modal";
import styles from "./styles.module.css";

export default function PriorityToggleModal({
  actionProgress,
  onConfirm,
  onCancel,
  isPriority,
  companyName,
}: {
  actionProgress: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPriority: boolean;
  companyName: string;
}) {
  const action = isPriority ? "Prioritise" : "Deprioritise";
  const actionVerb = isPriority ? "prioritised" : "deprioritised";
  const description = isPriority
    ? "This contractor will be marked as priority and appear near the top of your approval lists, making them easier to track and process."
    : "This contractor will no longer be marked as priority and will appear in standard order within approval lists.";
  const icon = isPriority ? "⭐" : "🔻";

  return (
    <Modal>
      <div className={`${styles.priorityModal} ${!isPriority ? styles.deprioritise : ""}`}>
        {/* Header with Icon */}
        <div className={styles.priorityModalHeader}>
          <div className={styles.priorityModalIcon}>{icon}</div>
          <div className={styles.priorityModalHeaderContent}>
            <h2 className={styles.priorityModalTitle}>{action} Contractor</h2>
          </div>
        </div>

        {/* Body */}
        <div className={styles.priorityModalBody}>
          {companyName && (
            <div className={styles.priorityModalCompanyName}>
              <p>{companyName}</p>
            </div>
          )}

          <p className={styles.priorityModalDescription}>{description}</p>

          <p className={styles.priorityModalConfirmation}>Are you sure you want to proceed?</p>
        </div>

        {/* Footer */}
        <div className={styles.priorityModalFooter}>
          <button
            onClick={onCancel}
            className={`${styles.priorityModalButton} ${styles.priorityModalCancelButton}`}
            disabled={actionProgress === "processing"}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className={`${styles.priorityModalButton} ${styles.priorityModalConfirmButton}`}
            disabled={actionProgress === "processing"}
          >
            {actionProgress !== "processing" && (
              <>
                <span className={styles.priorityModalButtonIcon}>{icon}</span>
                <span>{action}</span>
              </>
            )}
            {actionProgress === "processing" && <span>Processing...</span>}
          </button>
        </div>
      </div>
    </Modal>
  );
}