import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import ErrorText from "@/components/errorText";
import Modal from "@/components/modal";
import { useState } from "react";
import { toast } from "react-toastify";
import { useReviewCertificateMutation } from "@/redux/features/certReviewSlice";
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
    userRole: string;
    onClose: () => void;
}

export default function CertReviewModal({ item, userRole, onClose }: Props) {
    const [decision, setDecision] = useState<"approved" | "rejected" | "">("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const [reviewCertificate, { isLoading }] = useReviewCertificateMutation();

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-NG");
    };

    const handleSubmit = async () => {
        if (!decision) {
            setError("Please select a decision.");
            return;
        }
        if (decision === "rejected" && !reason.trim()) {
            setError("A reason is required when rejecting a certificate.");
            return;
        }
        setError("");

        try {
            await reviewCertificate({
                certificateId: item.certificateId || item._id,
                decision,
                reason: decision === "rejected" ? reason.trim() : undefined,
                userRole,
            }).unwrap();

            toast.success(
                decision === "approved"
                    ? "Certificate approved successfully."
                    : "Certificate rejected successfully."
            );
            onClose();
        } catch (err: any) {
            setError(err?.data?.message || "An error occurred. Please try again.");
        }
    };

    return (
        <Modal>
            <div className={styles.modalInner}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Review Certificate</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                <table className={styles.detailsTable}>
                    <tbody>
                        <tr>
                            <td>Company</td>
                            <td>{item.companyName}</td>
                        </tr>
                        <tr>
                            <td>Certificate</td>
                            <td>{item.label}</td>
                        </tr>
                        <tr>
                            <td>File</td>
                            <td>
                                <span style={{ marginRight: 10 }}>{item.fileName}</span>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.viewFileBtn}
                                >
                                    View File ↗
                                </a>
                            </td>
                        </tr>
                        {item.submittedAt && (
                            <tr>
                                <td>Submitted</td>
                                <td>{formatDate(item.submittedAt)}</td>
                            </tr>
                        )}
                        {item.expiryDate && (
                            <tr>
                                <td>Expiry Date</td>
                                <td>{formatDate(item.expiryDate)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className={styles.decisionSection}>
                    <span className={styles.decisionLabel}>Decision</span>
                    <div className={styles.radioGroup}>
                        <label>
                            <input
                                type="radio"
                                name="decision"
                                value="approved"
                                checked={decision === "approved"}
                                onChange={() => { setDecision("approved"); setError(""); }}
                            />
                            Approve
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="decision"
                                value="rejected"
                                checked={decision === "rejected"}
                                onChange={() => { setDecision("rejected"); setError(""); }}
                            />
                            Reject
                        </label>
                    </div>
                </div>

                {decision === "rejected" && (
                    <div className={styles.reasonSection}>
                        <span className={styles.reasonLabel}>
                            Reason <span style={{ color: "#c62828" }}>*</span>
                        </span>
                        <textarea
                            className={styles.reasonTextarea}
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setError(""); }}
                            placeholder="Explain why this certificate is being rejected..."
                        />
                    </div>
                )}

                {error && <ErrorText text={error} />}

                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
                        Cancel
                    </button>
                    <button className={styles.submitBtn} onClick={handleSubmit} disabled={isLoading || !decision}>
                        Submit Review
                        {isLoading && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
