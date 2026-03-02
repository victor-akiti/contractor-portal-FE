import { useState } from "react";
import styles from "../styles/styles.module.css";

export default function StageLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  const stages = [
    {
      stage: "A",
      title: "Contractor Submission",
      description:
        "The contractor completes the company profile and uploads all required supporting documentation on the portal for initial review.",
      status: "Unchecked",
    },
    {
      stage: "B",
      title: "VMO Document Review",
      description:
        "The Vendor Management Officer (VMO) conducts a desktop review to confirm completeness, accuracy, and compliance. Where gaps are identified, the application is returned to the contractor for correction and resubmission.",
      status: "Unverified",
    },
    {
      stage: "C",
      title: "C&P Supervisor/HOD Review",
      description:
        "The C&P Supervisor/HOD reviews the VMO assessment and submitted documentation, endorsing progression where satisfactory and assigning contractor categorisation.",
      status: "Unverified",
    },
    {
      stage: "D",
      title: "End-User Review",
      description:
        "The User Department evaluates contractor experience, applicable NUPRC permit categories, and financial turnover. A site visit may be indicated where required. (Note: This does not constitute a Technical Evaluation conducted during RFQ processes.)",
      status: "Unverified",
    },
    {
      stage: "E",
      title: "VMO Due Diligence Review",
      description:
        "The VMO performs due diligence including CAC verification, integrity screening of the contractor, shareholders and directors, and reference checks for relevant past work.",
      status: "Unverified",
    },
    {
      stage: "F",
      title: "C&P HOD Due Diligence Review",
      description:
        "The C&P HOD reviews the completed registration and due diligence findings, endorsing progression where satisfactory.",
      status: "Unverified",
    },
    {
      stage: "G",
      title: "Management Approval",
      description:
        "Final Management review and approval by the GCOO. Upon approval, the contractor is formally activated and included on the Approved Contractors List.",
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
                  <span
                    className={`${styles.legendStatus} ${styles[`status${status}`]}`}
                  >
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