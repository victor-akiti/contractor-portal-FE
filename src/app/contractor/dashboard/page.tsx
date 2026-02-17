'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FileLink from "@/components/fileLink"
import FileUploader from "@/components/fileUploader"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { getProtected } from "@/requests/get"
import { putProtected } from "@/requests/put"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

interface Certificate {
    _id: string;
    label: string;
    expiryDate: string;
    url: string;
    updateCode: string;
}

interface Company {
    _id: string;
    companyName: string;
    vendor: string;
    flags: {
        stage: string;
        status: string;
        submitted: boolean;
    };
}

interface DashboardData {
    companies: Company[];
    expiringCertificates: Certificate[];
    expiredCertificates: Certificate[];
    files: any[];
}

/**
 * CONTRACTOR DASHBOARD (MODERNIZED)
 * - Company registration overview
 * - Certificate expiry tracking
 * - Elegant, responsive design
 * - 100% backward-compatible with existing functionality
 */
const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        companies: [],
        expiringCertificates: [],
        expiredCertificates: [],
        files: []
    })
    const [fetchedDashboardData, setFetchedDashboardData] = useState(false)
    const [fetchingDashboardData, setFetchingDashboardData] = useState(true)
    const [selectedCertificate, setSelectedCertificate] = useState<any>({})
    const [updateCertificateError, setUpdateCertificateError] = useState("")
    const [updatingCertificate, setUpdatingCertificate] = useState(false)
    const [updateCertificateSuccess, setUpdateCertificateSuccess] = useState("")
    const user = useSelector((state: any) => state.user.user)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setFetchingDashboardData(true)
            setFetchedDashboardData(false)
            const fetchDashboardDataRequest = await getProtected("companies/dashboard/data", user.role)

            if (fetchDashboardDataRequest.status === "OK") {
                setFetchedDashboardData(true)
                setFetchingDashboardData(false)
                setDashboardData(fetchDashboardDataRequest.data)
            }
        } catch (error) {
            console.error({ error })
            setFetchingDashboardData(false)
        }
    }

    const setCertificateToUpdate = (certificate: Certificate, certificateCategory: string, certificateIndex: number) => {
        setSelectedCertificate({ ...certificate, certificateCategory, certificateIndex })
    }

    const setNewCertificate = (newCertificate: any) => {
        setSelectedCertificate({ ...selectedCertificate, newCertificate })
    }

    const validateNewCertificate = () => {
        if (!selectedCertificate?.newCertificate?.expiryDate) {
            setUpdateCertificateError("Please set an expiry date for this certificate")
        } else {
            setUpdateCertificateError("")
            updateCertificate()
        }
    }

    const updateCertificate = async () => {
        try {
            setUpdatingCertificate(true)
            const updateCertificateRequest = await putProtected(
                `companies/certificates/${selectedCertificate._id}`,
                selectedCertificate,
                user.role
            )
            setUpdatingCertificate(false)

            if (updateCertificateRequest.status === "OK") {
                setUpdateCertificateSuccess("Certificate updated successfully!")
            } else {
                setUpdateCertificateError(updateCertificateRequest.error.message)
            }
        } catch (error) {
            console.error({ error })
            setUpdatingCertificate(false)
            setUpdateCertificateError("An error occurred while updating the certificate")
        }
    }

    const setNewCertificateExpiry = (expiryDate: string) => {
        setSelectedCertificate({
            ...selectedCertificate,
            newCertificate: {
                ...selectedCertificate.newCertificate,
                expiryDate
            }
        })
    }

    const closeUploader = () => {
        setSelectedCertificate({})
        setUpdateCertificateError("")

        if (updateCertificateSuccess) {
            fetchDashboardData()
            setUpdateCertificateSuccess("")
        }
    }

    const backToFileSelection = () => {
        const { newCertificate, ...rest } = selectedCertificate
        setSelectedCertificate(rest)
    }

    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.dashboardHeader}>
                <h3 className={styles.dashboardTitle}>Your Dashboard</h3>
            </div>

            {/* Loading State */}
            {fetchingDashboardData && (
                <div className={styles.loadingContainer}>
                    <ButtonLoadingIcon />
                    <p>Loading your dashboard...</p>
                </div>
            )}

            {/* Main Content */}
            {!fetchingDashboardData && (
                <>
                    {/* File Uploader Modal */}
                    {Object.values(selectedCertificate).length > 0 && !selectedCertificate.newCertificate && (
                        <Modal>
                            <FileUploader
                                closeUploader={closeUploader}
                                label={selectedCertificate.label}
                                maxFiles={1}
                                updateCode={selectedCertificate.updateCode}
                                updateUploadedFiles={(newFiles) => setNewCertificate(newFiles[0])}
                                files={dashboardData.files}
                            />
                        </Modal>
                    )}

                    {/* Update Certificate Modal */}
                    {selectedCertificate.newCertificate && (
                        <Modal>
                            <div className={styles.updateCertificateModal}>
                                <div className={styles.modalHeader}>
                                    <h3 className={styles.modalTitle}>Update Certificate</h3>
                                </div>

                                <div className={styles.modalContent}>
                                    <table className={styles.certificateDetailsTable}>
                                        <tbody>
                                            <tr>
                                                <td>Certificate Title</td>
                                                <td>{selectedCertificate.label}</td>
                                            </tr>
                                            <tr>
                                                <td>File Name</td>
                                                <td>{selectedCertificate.newCertificate.name}</td>
                                            </tr>
                                            <tr>
                                                <td>Expiry Date</td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(event) => setNewCertificateExpiry(event.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {updateCertificateError && (
                                        <div className={styles.modalError}>
                                            <ErrorText text={updateCertificateError} />
                                        </div>
                                    )}

                                    {updateCertificateSuccess && (
                                        <div className={styles.modalSuccess}>
                                            <SuccessMessage message={updateCertificateSuccess} />
                                        </div>
                                    )}
                                </div>

                                <div className={styles.modalActions}>
                                    <button
                                        onClick={closeUploader}
                                        className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                                    >
                                        {updateCertificateSuccess ? "Close" : "Cancel"}
                                    </button>

                                    {!updateCertificateSuccess && (
                                        <>
                                            <button
                                                onClick={backToFileSelection}
                                                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                            >
                                                Back to File Selection
                                            </button>

                                            <button
                                                onClick={validateNewCertificate}
                                                disabled={updatingCertificate}
                                                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                                            >
                                                Update Certificate
                                                {updatingCertificate && <ButtonLoadingIcon />}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Modal>
                    )}

                    {/* Company Registration Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h5 className={styles.sectionTitle}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Your Company Registration
                            </h5>
                        </div>

                        {dashboardData.companies.length > 0 ? (
                            <div>
                                {dashboardData.companies.map((company, index) => (
                                    <div key={index} className={styles.companyCard}>
                                        <div className={styles.companyInfo}>
                                            <h6 className={styles.companyName}>{company.companyName}</h6>
                                            <span className={styles.companyStatus}>
                                                <span className={styles.statusDot}></span>
                                                Status: {company.flags.stage}
                                            </span>
                                        </div>

                                        <div className={styles.companyActions}>
                                            <Link href={`/contractor/application/view/${company.vendor}`} className={styles.actionLink}>
                                                View
                                            </Link>

                                            <Link href={`/contractor/settings/${company._id}`} className={styles.actionLink}>
                                                Settings
                                            </Link>

                                            {(!company.flags.submitted || company.flags.stage === "returned" || company.flags.status === "returned") && (
                                                <Link
                                                    href={`/contractor/form/form/${company.vendor}`}
                                                    className={`${styles.actionLink} ${styles.actionLinkPrimary}`}
                                                >
                                                    Continue & Submit
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h6 className={styles.emptyStateTitle}>No Company Registration</h6>
                                <p className={styles.emptyStateText}>
                                    You have not started your company registration yet. Start the process to become an approved contractor.
                                </p>
                                <Link href="/contractor/form/form" className={styles.emptyStateButton}>
                                    Start Company Registration
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            </div>
                        )}
                    </div>

                    <hr className={styles.divider} />

                    {/* Expiring Certificates Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h5 className={styles.sectionTitle}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Expiring Certificates
                            </h5>
                        </div>

                        {dashboardData.expiringCertificates.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <p className={styles.emptyStateText}>You do not have any expiring certificates</p>
                            </div>
                        ) : (
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Certificate Type</th>
                                            <th>Expiry Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.expiringCertificates.map((certificate, index) => (
                                            <tr key={index}>
                                                <td className={styles.certificateType}>{certificate.label}</td>
                                                <td className={`${styles.expiryDate} ${styles.expiryDateExpiring}`}>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                                                    </svg>
                                                    {new Date(certificate.expiryDate).toLocaleDateString("en-NG")}
                                                </td>
                                                <td>
                                                    <div className={styles.tableActions}>
                                                        <FileLink
                                                            url={certificate.url}
                                                            name={certificate.name}
                                                            className={`${styles.tableButton} ${styles.tableButtonView}`}
                                                        >
                                                            View
                                                        </FileLink>
                                                        <button
                                                            onClick={() => setCertificateToUpdate(certificate, "expiring", index)}
                                                            className={styles.tableButton}
                                                        >
                                                            Update Certificate
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <hr className={styles.divider} />

                    {/* Expired Certificates Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h5 className={styles.sectionTitle}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Expired Certificates
                            </h5>
                        </div>

                        {dashboardData.expiredCertificates.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <p className={styles.emptyStateText}>You do not have any expired certificates</p>
                            </div>
                        ) : (
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Certificate Type</th>
                                            <th>Expiry Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.expiredCertificates.map((certificate, index) => (
                                            <tr key={index}>
                                                <td className={styles.certificateType}>{certificate.label}</td>
                                                <td className={`${styles.expiryDate} ${styles.expiryDateExpired}`}>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M8 4v4m0 2h.01M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    {new Date(certificate.expiryDate).toLocaleDateString("en-NG")}
                                                </td>
                                                <td>
                                                    <div className={styles.tableActions}>
                                                        <FileLink
                                                            url={certificate.url}
                                                            name={certificate.name}
                                                            className={`${styles.tableButton} ${styles.tableButtonView}`}
                                                        >
                                                            View
                                                        </FileLink>
                                                        <button
                                                            onClick={() => setCertificateToUpdate(certificate, "expired", index)}
                                                            className={styles.tableButton}
                                                        >
                                                            Update Certificate
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default Dashboard