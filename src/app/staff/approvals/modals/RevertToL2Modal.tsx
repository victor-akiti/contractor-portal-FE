'use client'

import Modal from "@/components/modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../styles/styles.module.css";

export default function RevertToL2Modal({
  actionProgress,
  onConfirm,
  onCancel,
  vendorID,
}: {
  actionProgress: string;
  onConfirm: () => void;
  onCancel: () => void;
  vendorID?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "resume">("choose");

  return (
    <Modal>
      <div className={styles.revertToL2Div}>
        {step === "choose" && (
          <>
            <h3>Unpark Application</h3>
            <p>How would you like to proceed with this parked application?</p>
            <div>
              <button onClick={() => setStep("resume")}>Resume at previous stage</button>
              <button onClick={() => {
                onCancel();
                if (vendorID) router.push(`/staff/approvals/${vendorID}?action=return-to-contractor`);
              }}>Return to contractor</button>
              <button onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}

        {step === "resume" && (
          <>
            <h3>Resume at Previous Stage</h3>
            <p>You are about to move this vendor&apos;s application back to L2. Proceed?</p>
            <div>
              {actionProgress !== "processing" && <button onClick={onConfirm}>Resume</button>}
              <button onClick={() => setStep("choose")}>Back</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
