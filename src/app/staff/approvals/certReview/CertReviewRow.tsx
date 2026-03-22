import styles from "./certReview.module.css";

interface CertReviewItem {
    _id: string;
    certificateId: string;
    companyName: string;
    label: string;
    fileName: string;
    url: string;
    submittedAt?: string;
    expiryDate?: string;
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
            <td className={styles.companyName}>{item.companyName}</td>
            <td className={styles.certLabel}>{item.label}</td>
            <td className={styles.fileName} title={item.fileName}>{item.fileName}</td>
            <td className={styles.dateText}>{formatDate(item.submittedAt)}</td>
            <td className={styles.dateText}>{formatDate(item.expiryDate)}</td>
            <td>
                <button className={styles.reviewBtn} onClick={() => onReview(item)}>
                    Review
                </button>
            </td>
        </tr>
    );
}
