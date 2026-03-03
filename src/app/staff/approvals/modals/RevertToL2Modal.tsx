'use client'

import Modal from "@/components/modal";
import { useState } from "react";
import styles from "../styles/styles.module.css";

export default function RevertToL2Modal({
  actionProgress,
  onConfirm,
  onCancel,
  vendorID,
}: {
  actionProgress: string;
  onConfirm: (level?: number) => void;
  onCancel: () => void;
  vendorID?: string;
}) {
  const [step, setStep] = useState<"choose" | "resume" | "return-to-l0">("choose");

  return (
    <Modal>
      <div className={styles.revertToL2Div}>
        {step === "choose" && (
          <>
            <h3>Unpark Application</h3>
            <p>How would you like to proceed with this parked application?</p>
            <div>
              <button onClick={() => setStep("resume")}>Resume at previous stage</button>
              <button onClick={() => setStep("return-to-l0")}>Return to Approvals (Level 0)</button>
              <button onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}

        {step === "resume" && (
          <>
            <h3>Resume at Previous Stage</h3>
            <p>You are about to move this vendor&apos;s application back to L2. Proceed?</p>
            <div>
              {actionProgress !== "processing" && <button onClick={() => onConfirm()}>Resume</button>}
              <button onClick={() => setStep("choose")}>Back</button>
            </div>
          </>
        )}

        {step === "return-to-l0" && (
          <>
            <h3>Return to Approvals (Level 0)</h3>
            <p>You are about to return this application to the beginning of the approvals process.</p>
            <div>
              {actionProgress !== "processing" && <button onClick={() => onConfirm(0)}>Return to Approvals</button>}
              <button onClick={() => setStep("choose")}>Back</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
