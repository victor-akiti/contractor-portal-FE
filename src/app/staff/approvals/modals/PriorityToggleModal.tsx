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
  const description = isPriority
    ? "This will mark the contractor as priority and move them to the top of the list."
    : "This will remove the priority status from the contractor.";

  return (
    <Modal>
      <div className={styles.revertToL2Div}>
        <h3>{action} Contractor</h3>
        <p>
          {companyName ? `${companyName}: ` : ""}
          {description}
        </p>
        <p>Proceed?</p>
        <div>
          {actionProgress !== "processing" && (
            <button onClick={onConfirm}>{action}</button>
          )}
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
