import Modal from "@/components/modal";
import styles from "../styles/styles.module.css";

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
  const iconClass = isPriority ? styles.prioritise : styles.deprioritise;

  return (
    <Modal>
      <div className={styles.priorityToggleModal}>
        <div className={styles.modalHeader}>
          <div className={`${styles.iconWrapper} ${iconClass}`}>
            {icon}
          </div>
          <h3>{action} Contractor</h3>
        </div>

        <div className={styles.modalBody}>
          {companyName && (
            <div className={styles.companyName}>
              {companyName}
            </div>
          )}
          <p className={styles.description}>{description}</p>
          <p className={styles.confirmText}>
            Are you sure you want to proceed?
          </p>
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.cancelButton}
            onClick={onCancel}
          >
            Cancel
          </button>
          {actionProgress !== "processing" && (
            <button
              className={styles.confirmButton}
              onClick={onConfirm}
            >
              {action}
            </button>
          )}
          {actionProgress === "processing" && (
            <button
              className={styles.confirmButton}
              disabled
            >
              Processing...
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
