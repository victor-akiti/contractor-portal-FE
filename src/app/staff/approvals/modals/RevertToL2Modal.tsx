'use client'

import Modal from "@/components/modal";
import { useState } from "react";
import styles from "../styles/styles.module.css";

export default function RevertToL2Modal({
  actionProgress,
  onConfirm,
  onCancel,
}: {
  actionProgress: string;
  onConfirm: (level?: number) => void;
  onCancel: () => void;
  vendorID?: string;
}) {
  const [returnToL0, setReturnToL0] = useState(false);

  return (
    <Modal>
      <div className={styles.revertToL2Div}>
        <h3>Unpark Application</h3>

        <div>
          <label>
            <input
              type="radio"
              name="unparkMode"
              checked={!returnToL0}
              onChange={() => setReturnToL0(false)}
            />
            Resume at previous stage
          </label>
          <label>
            <input
              type="radio"
              name="unparkMode"
              checked={returnToL0}
              onChange={() => setReturnToL0(true)}
            />
            Return to Approvals (Level 0)
          </label>
        </div>

        <div>
          {actionProgress !== "processing" && (
            <button onClick={() => onConfirm(returnToL0 ? 0 : undefined)}>
              {returnToL0 ? "Return to Approvals" : "Resume"}
            </button>
          )}
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
