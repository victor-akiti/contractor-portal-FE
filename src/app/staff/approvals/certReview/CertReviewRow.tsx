import styles from "./certReview.module.css";

interface CertReviewItem {
    _id: string;
    company: { _id: string; companyName: string };
    label: string;
    name: string;
    url: string;
    createdAt?: string;
    expiryDate?: string;
    section?: string;
}

interface Props {
    item: CertReviewItem;
    onReview: (item: CertReviewItem) => void;
}

export default function CertReviewRow({ item, onReview }: Props) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-NG");
    };

    return (
        <tr>
            <td className={styles.certLabel}>{item.label}</td>
            <td className={styles.sectionLabel}>{item.section || "—"}</td>
            <td className={styles.fileName} title={item.name}>{item.name}</td>
            <td className={styles.dateText}>{formatDate(item.createdAt)}</td>
            <td className={styles.dateText}>{formatDate(item.expiryDate)}</td>
            <td>
                <button className={styles.reviewBtn} onClick={() => onReview(item)}>
                    Review
                </button>
            </td>
        </tr>
    );
}
