import styles from "../styles/styles.module.css";

/**
 * PriorityBadge - Displays a golden animated badge for priority contractors
 * Features: Gradient background, star icon, subtle pulse animation, hover tooltip
 */
const PriorityBadge = () => {
    return (
        <span
            className={styles.priorityBadge}
            data-tooltip="This badge indicates that AMNI already works with this contractor."
            aria-label="Priority contractor - AMNI already works with this contractor"
            tabIndex={0}
            role="note"
        >
            Priority
        </span>
    );
};

export default PriorityBadge;