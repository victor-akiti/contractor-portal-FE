import styles from "./certStatusBadge.module.css";

interface Props {
    status?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
    "pending review": { label: "Pending Review", className: styles.pending },
    approved: { label: "Approved", className: styles.approved },
    rejected: { label: "Rejected", className: styles.rejected },
};

export default function CertStatusBadge({ status }: Props) {
    if (!status) return null;
    const config = statusMap[status.toLowerCase()];
    if (!config) return null;
    return <span className={`${styles.badge} ${config.className}`}>{config.label}</span>;
}
