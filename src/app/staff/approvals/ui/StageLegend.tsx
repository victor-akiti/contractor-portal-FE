import { useState } from "react";
import styles from "../styles/styles.module.css";

export default function StageLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  const stages = [
    {
      stage: "A",
      title: "Contractor Submission",
      description: "The contractor completes profile information and uploads all required supporting documentation on the portal.",
      status: "Unchecked",
    },
    {
      stage: "B",
      title: "VMO Document Review",
      description: "The VMO conducts a desktop review to confirm completeness, accuracy, and compliance of submitted information and documents. Where gaps are identified, the registration is returned to the contractor for update.",
      status: "Unverified",
    },
    {
      stage: "C",
      title: "C&P Supervisor/HOD Review",
      description: "The C&P Supervisor/HOD reviews the VMO assessment and submitted documentation, endorsing progression where satisfactory. The Supervisor/HOD also categorises the contractor at this stage.",
      status: "Unverified",
    },
    {
      stage: "D",
      title: "End-User Review",
      description: "The User Department performs a desktop review of the contractor's experience, applicable NUPRC permit categories, and financial turnover. The End-User may categorize the contractor and indicate where a site visit may be required.",
      status: "Unverified",
    },
    {
      stage: "E",
      title: "VMO Due Diligence Review",
      description: "The VMO conducts due diligence checks including CAC verification, integrity screening of the contractor, its shareholders and directors, and reference checks for relevant past work.",
      status: "Unverified",
    },
    {
      stage: "F",
      title: "C&P HOD Due Diligence Review",
      description: "The C&P HOD reviews the completed registration and due diligence outcomes, endorsing progression where satisfactory.",
      status: "Unverified",
    },
    {
      stage: "G",
      title: "Management Approval",
      description: "Final Management review and approval by the GCOO, resulting in formal activation of the contractor as a fully registered vendor and inclusion on the Approved Contractors List.",
      status: "Verified",
    },
  ];

  return (
    <div className={styles.stageLegend}>
      <button
        className={styles.legendToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.legendIcon}>ⓘ</span>
        <span>Stage Legend</span>
        <span className={styles.chevron}>{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className={styles.legendContent}>
          <div className={styles.legendGrid}>
            {stages.map(({ stage, title, description, status }) => (
              <div key={stage} className={styles.legendItem}>
                <div className={styles.legendHeader}>
                  <span className={styles.legendStage}>Stage {stage}</span>
                  <span className={`${styles.legendStatus} ${styles[`status${status}`]}`}>
                    {status}
                  </span>
                </div>
                <h4 className={styles.legendTitle}>{title}</h4>
                <p className={styles.legendDescription}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
