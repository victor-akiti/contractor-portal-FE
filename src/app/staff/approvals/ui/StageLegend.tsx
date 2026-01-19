import { useState } from 'react';
import styles from '../styles/styles.module.css';

export default function StageLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  const stages = [
    {
      stage: 'A',
      title: 'Initial Application Review',
      description: 'Initial review and approval of contractor application',
      status: 'Unchecked'
    },
    {
      stage: 'B',
      title: 'Supervisor Review',
      description: 'Supervisor review with end user assignment',
      status: 'Unverified'
    },
    {
      stage: 'C',
      title: 'End User Assessment',
      description: 'End user evaluates contractor suitability',
      status: 'Unverified'
    },
    {
      stage: 'D',
      title: 'Due Diligence',
      description: 'Compliance officer performs exposure and due diligence checks',
      status: 'Unverified'
    },
    {
      stage: 'E',
      title: 'HOD Final Review',
      description: 'Head of Department reviews due diligence and approves for L3',
      status: 'Unverified'
    },
    {
      stage: 'F',
      title: 'Executive Decision',
      description: 'Executive final decision on approved contractors list',
      status: 'Verified'
    }
  ];

  return (
    <div className={styles.stageLegend}>
      <button
        className={styles.legendToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.legendIcon}>ℹ️</span>
        <span>Stage Legend</span>
        <span className={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
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
