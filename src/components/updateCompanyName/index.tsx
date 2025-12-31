'use client'

import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import ErrorText from "@/components/errorText";
import Modal from "@/components/modal";
import SuccessMessage from "@/components/successMessage";
import { putProtected } from "@/requests/put";
import { useState } from "react";
import styles from "./styles/styles.module.css";

interface UpdateCompanyNameProps {
    companyId: string;
    currentName: string;
    userRole: string;
    onUpdate: (data: any) => void;
    onRefetch?: () => void;
    onRefetch?: () => void;
}

const UpdateCompanyName = ({ companyId, currentName, userRole, onUpdate, onRefetch }: UpdateCompanyNameProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newName.trim()) {
            setError("Company name cannot be empty");
            return;
        }

        if (newName.trim() === currentName.trim()) {
            setError("New company name must be different from the current name");
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await putProtected(
                `companies/company-name/${companyId}`,
                { newCompanyName: newName.trim() },
                userRole
            );

            if (response.status === "OK" && response.data) {
                setSuccess(response.data.message || "Company name updated successfully");

                // Call parent component's update handler
                onUpdate({
                    companyName: response.data.companyName,
                    companyNameUpdatedByAmni: response.data.companyNameUpdatedByAmni,
                    previousCompanyName: response.data.previousCompanyName
                });

                // Refetch vendor data to update the UI with badge
                if (onRefetch) {
                    onRefetch();
                }

                // Close modal after a brief delay to show success message
                setTimeout(() => {
                    setIsModalOpen(false);
                    setNewName("");
                    setSuccess("");
                }, 1500);
            } else if (response.status === "Failed") {
                setError(response.error?.message || "Failed to update company name");
            } else {
                setError("An unexpected error occurred");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred while updating company name");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setIsModalOpen(false);
            setNewName("");
            setError("");
            setSuccess("");
        }
    };

    return (
        <>
            <button
                className={styles.editButton}
                onClick={() => setIsModalOpen(true)}
                title="Edit company name"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.9149 1.44775 13.1601 1.49653 13.3889 1.59129C13.6177 1.68605 13.8256 1.82494 14.0007 2.00004C14.1758 2.17513 14.3147 2.383 14.4094 2.61178C14.5042 2.84055 14.553 3.08575 14.553 3.33337C14.553 3.58099 14.5042 3.82619 14.4094 4.05497C14.3147 4.28374 14.1758 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isModalOpen && (
                <Modal>
                    <div className={styles.updateCompanyNameModal}>
                        <h2>Update Company Name</h2>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label>Current Name</label>
                                <input
                                    type="text"
                                    value={currentName}
                                    disabled
                                    className={styles.disabledInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>New Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter new company name"
                                    disabled={isLoading}
                                    className={styles.input}
                                />
                            </div>

                            {error && (
                                <div className={styles.messageContainer}>
                                    <ErrorText text={error} />
                                </div>
                            )}

                            {success && (
                                <div className={styles.messageContainer}>
                                    <SuccessMessage message={success} />
                                </div>
                            )}

                            <div className={styles.buttonContainer}>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    className={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={styles.saveButton}
                                >
                                    {isLoading ? (
                                        <>
                                            Saving <ButtonLoadingIcon />
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default UpdateCompanyName;
