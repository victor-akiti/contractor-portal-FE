import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import ErrorText from "@/components/errorText";
import Modal from "@/components/modal";
import { useState } from "react";
import { toast } from "react-toastify";
import { useReviewCertificateMutation } from "@/redux/features/certReviewSlice";
import styles from "./certReview.module.css";

interface CertReviewItem {
    _id: string;
    company: { _id: string; companyName: string };
    label: string;
    name: string;
    url: string;
    createdAt?: string;
    issueDate?: string;
    expiryDate?: string;
    section?: string | null;
}

interface Props {
    item: CertReviewItem;
    userRole: string;
    onClose: () => void;
}

export default function CertReviewModal({ item, userRole, onClose }: Props) {
    const [certStatus, setCertStatus] = useState<"approved" | "rejected" | "">("");
    const [reviewRemarks, setReviewRemarks] = useState("");
    const [internalComment, setInternalComment] = useState("");
    const [error, setError] = useState("");

    const [reviewCertificate, { isLoading }] = useReviewCertificateMutation();

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-NG");
    };

    const handleSubmit = async () => {
        if (!certStatus) {
            setError("Please select a decision.");
            return;
        }
        if (certStatus === "rejected" && !reviewRemarks.trim()) {
            setError("A reason is required when rejecting a certificate.");
            return;
        }
        setError("");

        try {
            await reviewCertificate({
                certificateId: item._id,
                certStatus,
                reviewRemarks: certStatus === "rejected" ? reviewRemarks.trim() : undefined,
                internalComment,
                userRole,
            }).unwrap();

            toast.success(
                certStatus === "approved"
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
                            <td>{item.company?.companyName}</td>
                        </tr>
                        <tr>
                            <td>Certificate</td>
                            <td>{item.label}</td>
                        </tr>
                        {item.section && (
                            <tr>
                                <td>Section</td>
                                <td>{item.section}</td>
                            </tr>
                        )}
                        <tr>
                            <td>File</td>
                            <td>
                                <span style={{ marginRight: 10 }}>{item.name}</span>
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
                        {item.createdAt && (
                            <tr>
                                <td>Submitted</td>
                                <td>{formatDate(item.createdAt)}</td>
                            </tr>
                        )}
                        {item.issueDate && (
                            <tr>
                                <td>Issue Date</td>
                                <td>{formatDate(item.issueDate)}</td>
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
                                name="certStatus"
                                value="approved"
                                checked={certStatus === "approved"}
                                onChange={() => { setCertStatus("approved"); setError(""); }}
                            />
                            Approve
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="certStatus"
                                value="rejected"
                                checked={certStatus === "rejected"}
                                onChange={() => { setCertStatus("rejected"); setError(""); }}
                            />
                            Reject
                        </label>
                    </div>
                </div>

                {certStatus === "rejected" && (
                    <div className={styles.reasonSection}>
                        <span className={styles.reasonLabel}>
                            Reason <span style={{ color: "#c62828" }}>*</span>
                        </span>
                        <textarea
                            className={styles.reasonTextarea}
                            value={reviewRemarks}
                            onChange={(e) => { setReviewRemarks(e.target.value); setError(""); }}
                            placeholder="Explain why this certificate is being rejected..."
                        />
                    </div>
                )}

                {certStatus && (
                    <div className={styles.reasonSection}>
                        <span className={styles.reasonLabel}>
                            Internal Comment <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>(optional)</span>
                        </span>
                        <textarea
                            className={styles.reasonTextarea}
                            value={internalComment}
                            onChange={(e) => setInternalComment(e.target.value)}
                            placeholder="Add an internal comment visible only to staff..."
                        />
                    </div>
                )}

                {error && <ErrorText text={error} />}

                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
                        Cancel
                    </button>
                    <button className={styles.submitBtn} onClick={handleSubmit} disabled={isLoading || !certStatus}>
                        Submit Review
                        {isLoading && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
