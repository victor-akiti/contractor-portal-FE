import Modal from "@/components/modal";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import styles from "./styles.module.css";

interface PendingCert {
    _id: string;
    label: string;
}

interface Props {
    certs: PendingCert[];
    isLoading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function PendingCertsConfirmModal({ certs, isLoading, onConfirm, onCancel }: Props) {
    return (
        <Modal>
            <div className={styles.inner}>
                <h3 className={styles.title}>Confirm Stage Advancement</h3>

                <p className={styles.description}>
                    The following certificate(s) were re-uploaded and haven&apos;t been individually reviewed.
                    Approving this company will also approve them:
                </p>

                <ul className={styles.certList}>
                    {certs.map((cert) => (
                        <li key={cert._id} className={styles.certItem}>
                            {cert.label}
                        </li>
                    ))}
                </ul>

                <p className={styles.question}>Do you want to continue?</p>

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </button>
                    <button className={styles.confirmBtn} onClick={onConfirm} disabled={isLoading}>
                        Yes, Continue
                        {isLoading && <ButtonLoadingIcon />}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
