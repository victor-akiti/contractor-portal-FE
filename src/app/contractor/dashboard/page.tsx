'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import CertStatusBadge from "@/components/certStatusBadge"
import ErrorText from "@/components/errorText"
import FileUploader from "@/components/fileUploader"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

interface Certificate {
    _id: string;
    label: string;
    name?: string;
    expiryDate: string;
    issueDate?: string;
    url: string;
    updateCode: string;
    vendorID?: string;
    certStatus?: string;
    reviewRemarks?: string;
    isReUpload?: boolean;
    updatedAt?: string;
    createdAt?: string;
    vendor?: {
        _id: string;
        form?: {
            name?: string;
            pages: Array<{
                pageTitle?: string;
                sections: Array<{
                    title?: string;
                    fields: Array<{
                        _id?: string;
                        updateCode?: string;
                        type?: string;
                        label?: string;
                        approvalLabel?: string;
                        value?: Array<{ _id?: string }>;
                    }>;
                }>;
            }>;
        };
    };
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
    pendingCertificates: Certificate[];
    rejectedCertificates: Certificate[];
    files: any[];
}

const getCertificateTimeValidity = (expiryDate: string): string => {
    const currentDateObject = new Date()
    const expiryDateObject = new Date(expiryDate)

    if (currentDateObject.getTime() >= expiryDateObject.getTime()) {
        return "expired"
    } else if ((expiryDateObject.getTime() - currentDateObject.getTime()) / 1000 < 7884000) {
        return "expiring"
    } else {
        return ""
    }
}

const extractCertificatesFromFormPages = (pages: any[], vendorID?: string): { expiring: Certificate[], expired: Certificate[] } => {
    const expiring: Certificate[] = []
    const expired: Certificate[] = []

    pages.forEach((page: any) => {
        page.sections?.forEach((section: any) => {
            section.fields?.forEach((field: any) => {
                if (field.type === "file" && Array.isArray(field.value)) {
                    field.value.forEach((entry: any) => {
                        if (!entry?.expiryDate) return
                        const validity = getCertificateTimeValidity(entry.expiryDate)
                        if (validity === "expiring" || validity === "expired") {
                            const cert: Certificate = {
                                _id: entry._id || field._id || "",
                                label: field.label || field.approvalLabel || "",
                                expiryDate: entry.expiryDate,
                                issueDate: entry.issueDate,
                                url: entry.url || "",
                                updateCode: entry.updateCode || field.updateCode || "",
                                vendorID,
                            }
                            if (validity === "expiring") expiring.push(cert)
                            else expired.push(cert)
                        }
                    })
                }
            })
        })
    })

    return { expiring, expired }
}

const getCertSectionTitle = (certificate: Certificate): string | null => {
    const pages = certificate.vendor?.form?.pages
    if (!pages) return null

    for (const page of pages) {
        for (const section of page.sections ?? []) {
            for (const field of section.fields ?? []) {
                if (field.type !== "file") continue
                const fieldValueId = field.value?.[0]?._id
                const matches =
                    (fieldValueId && fieldValueId === certificate._id) ||
                    (field.updateCode && field.updateCode === certificate.updateCode)
                if (matches) {
                    const parts = [page.pageTitle, section.title].filter(Boolean)
                    return parts.length > 0 ? parts.join(" › ") : null
                }
            }
        }
    }
    return null
}

// ── V2 certificates panel ───────────────────────────────────────────────────
// Mirrors the V1 cert tables but reads from the CertificateV2 collection.
// One section per category; "Update certificate" opens the parent
// dashboard's file-uploader + dates modal flow via onUpdate.
interface V2Cert {
    _id: string
    fieldKey: string
    updateCode: string
    url: string
    name?: string
    label?: string
    issueDate?: string
    expiryDate?: string
    certStatus: "pending" | "approved" | "rejected"
    reviewRemarks?: string
    trackingStatus: string
    isReUpload?: boolean
    createdAt?: string
    updatedAt?: string
}
interface V2CategoryBuckets {
    rejected: V2Cert[]
    pending: V2Cert[]
    expired: V2Cert[]
    expiring: V2Cert[]
}
const V2CertificatesPanel = ({
    loading,
    categories,
    onUpdate,
}: {
    loading: boolean
    categories: V2CategoryBuckets
    onUpdate: (c: V2Cert) => void
}) => {
    const total =
        categories.rejected.length +
        categories.pending.length +
        categories.expired.length +
        categories.expiring.length
    if (loading) {
        return (
            <>
                <hr className={styles.divider} />
                <div className={styles.section}>
                    <div className={styles.loadingContainer}>
                        <ButtonLoadingIcon />
                        <p>Loading certificates...</p>
                    </div>
                </div>
            </>
        )
    }
    if (total === 0) return null
    const renderTable = (
        title: string,
        certs: V2Cert[],
        opts: { titleClass?: string; showRemarks?: boolean; ctaLabel?: string; banner?: string },
    ) => {
        if (certs.length === 0) return null
        return (
            <>
                <hr className={styles.divider} />
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h5 className={`${styles.sectionTitle} ${opts.titleClass || ""}`}>
                            {title}
                        </h5>
                    </div>
                    {opts.banner && (
                        <div className={styles.actionRequiredBanner}>{opts.banner}</div>
                    )}
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Certificate</th>
                                    <th>File</th>
                                    <th>Issue Date</th>
                                    <th>Expiry Date</th>
                                    {opts.showRemarks && <th>Reason</th>}
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map((c) => (
                                    <tr key={c._id}>
                                        <td className={styles.certificateType}>
                                            {c.label || c.fieldKey}
                                        </td>
                                        <td>
                                            <Link
                                                href={c.url}
                                                target="_blank"
                                                className={`${styles.tableButton} ${styles.tableButtonView}`}
                                            >
                                                View ↗
                                            </Link>
                                        </td>
                                        <td>
                                            {c.issueDate
                                                ? new Date(c.issueDate).toLocaleDateString("en-NG")
                                                : "-"}
                                        </td>
                                        <td>
                                            {c.expiryDate
                                                ? new Date(c.expiryDate).toLocaleDateString("en-NG")
                                                : "-"}
                                        </td>
                                        {opts.showRemarks && (
                                            <td>
                                                {c.reviewRemarks ? (
                                                    <div className={styles.rejectionRemarksBox}>
                                                        <p className={styles.rejectionRemarksText}>
                                                            {c.reviewRemarks}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        )}
                                        <td>
                                            {c.certStatus === "pending" && c.isReUpload ? (
                                                <CertStatusBadge status="pending" />
                                            ) : (
                                                <button
                                                    className={`${styles.tableButton} ${styles.tableButtonUpdate}`}
                                                    onClick={() => onUpdate(c)}
                                                >
                                                    {opts.ctaLabel || "Update certificate"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )
    }
    return (
        <>
            {renderTable(
                "Action Required - Rejected Certificates",
                categories.rejected,
                {
                    titleClass: styles.rejectedSectionTitle,
                    showRemarks: true,
                    ctaLabel: "Re-upload",
                    banner:
                        "One or more of your re-uploaded certificates were rejected. Please re-upload the correct document.",
                },
            )}
            {renderTable("Pending Review", categories.pending, {
                titleClass: styles.pendingSectionTitle,
            })}
            {renderTable("Expired Certificates", categories.expired, {})}
            {renderTable("Certificates Expiring Soon", categories.expiring, {})}
        </>
    )
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
        pendingCertificates: [],
        rejectedCertificates: [],
        files: []
    })
    const [fetchedDashboardData, setFetchedDashboardData] = useState(false)
    const [fetchingDashboardData, setFetchingDashboardData] = useState(true)
    const [selectedCertificate, setSelectedCertificate] = useState<any>({})
    console.log({ selectedCertificate })
    const [updateCertificateError, setUpdateCertificateError] = useState("")
    const [updatingCertificate, setUpdatingCertificate] = useState(false)
    const [updateCertificateSuccess, setUpdateCertificateSuccess] = useState("")

    // V2 application surface - appears only when the contractor's account is
    // linked to a SubmissionV2 via the V2 invite/registration flow.
    const [v2Submission, setV2Submission] = useState<{ status: string; answers: Record<string, unknown>; cycleNumber?: number } | null>(null)
    const [v2Probed, setV2Probed] = useState(false)
    // V2 certificates - parallel to dashboardData.expiring/expired/etc.
    // Loaded from /api/v2/submissions/mine/certificates when a V2 submission
    // is detected. When present, the V1 cert sections are suppressed so the
    // dashboard reflects V2 as the source of truth.
    interface V2Certificate {
        _id: string
        fieldKey: string
        updateCode: string
        url: string
        name?: string
        label?: string
        issueDate?: string
        expiryDate?: string
        certStatus: "pending" | "approved" | "rejected"
        reviewRemarks?: string
        trackingStatus: string
        isReUpload?: boolean
        createdAt?: string
        updatedAt?: string
    }
    const [v2Certs, setV2Certs] = useState<V2Certificate[]>([])
    const [v2CertsLoading, setV2CertsLoading] = useState(false)
    const [v2SelectedCert, setV2SelectedCert] = useState<V2Certificate | null>(null)
    const [v2NewFile, setV2NewFile] = useState<{ url: string; name?: string; label?: string; updateCode?: string } | null>(null)
    const [v2NewIssueDate, setV2NewIssueDate] = useState("")
    const [v2NewExpiryDate, setV2NewExpiryDate] = useState("")
    const [v2UpdatingCert, setV2UpdatingCert] = useState(false)
    const [v2UpdateError, setV2UpdateError] = useState("")
    const [v2UpdateSuccess, setV2UpdateSuccess] = useState("")
    const user = useSelector((state: any) => state.user.user)

    useEffect(() => {
        fetchDashboardData()
        probeV2Submission()
    }, [])

    const probeV2Submission = async () => {
        try {
            const r = await getProtected("api/v2/submissions/mine", user?.role)
            if (r?.status === "OK" && r.data?.submission) {
                setV2Submission({
                    status: r.data.submission.status,
                    cycleNumber: r.data.submission.cycleNumber,
                    answers: r.data.submission.answers,
                })
                fetchV2Certificates()
            }
        } catch {
            // No V2 submission linked - that's fine, this contractor predates V2.
        } finally {
            setV2Probed(true)
        }
    }

    const fetchV2Certificates = async () => {
        try {
            setV2CertsLoading(true)
            const r = await getProtected("api/v2/submissions/mine/certificates", user?.role)
            if (r?.status === "OK") {
                setV2Certs(r.data?.certificates || [])
            }
        } catch (err) {
            console.error("V2 cert fetch failed", err)
        } finally {
            setV2CertsLoading(false)
        }
    }

    // Categorize tracked V2 certs the same way the V1 dashboard does:
    // rejected > pending > expired > expiring > healthy. A cert that's
    // already been re-uploaded (trackingStatus !== "tracked") is hidden -
    // its replacement is what surfaces.
    const v2CertCategories = useMemo(() => {
        const now = Date.now()
        const horizon = 30 * 24 * 60 * 60 * 1000
        const rejected: V2Certificate[] = []
        const pending: V2Certificate[] = []
        const expired: V2Certificate[] = []
        const expiring: V2Certificate[] = []
        for (const c of v2Certs) {
            if (c.trackingStatus !== "tracked") continue
            if (c.certStatus === "rejected") { rejected.push(c); continue }
            if (c.certStatus === "pending" && c.isReUpload) { pending.push(c); continue }
            if (!c.expiryDate) continue
            const exp = new Date(c.expiryDate).getTime()
            if (Number.isNaN(exp)) continue
            if (exp < now) expired.push(c)
            else if (exp - now < horizon) expiring.push(c)
        }
        return { rejected, pending, expired, expiring }
    }, [v2Certs])

    const openV2CertUpdate = (cert: V2Certificate) => {
        setV2SelectedCert(cert)
        setV2NewFile(null)
        setV2NewIssueDate("")
        setV2NewExpiryDate("")
        setV2UpdateError("")
        setV2UpdateSuccess("")
    }

    const closeV2CertModal = () => {
        const wasSuccess = !!v2UpdateSuccess
        setV2SelectedCert(null)
        setV2NewFile(null)
        setV2NewIssueDate("")
        setV2NewExpiryDate("")
        setV2UpdateError("")
        setV2UpdateSuccess("")
        if (wasSuccess) fetchV2Certificates()
    }

    const submitV2CertReplacement = async () => {
        if (!v2SelectedCert || !v2NewFile) return
        if (!v2NewExpiryDate) {
            setV2UpdateError("Please set an expiry date for this certificate.")
            return
        }
        try {
            setV2UpdatingCert(true)
            setV2UpdateError("")
            const r = await postProtected(
                `api/v2/submissions/mine/certificates/${v2SelectedCert._id}/replace`,
                {
                    url: v2NewFile.url,
                    name: v2NewFile.name,
                    label: v2NewFile.label || v2SelectedCert.label,
                    issueDate: v2NewIssueDate || undefined,
                    expiryDate: v2NewExpiryDate,
                },
                user?.role,
            )
            if (r?.status === "OK") {
                setV2UpdateSuccess("Certificate updated. Staff will review the new file.")
            } else {
                setV2UpdateError(r?.error?.message || "We couldn't update this certificate. Please try again.")
            }
        } catch (err: any) {
            setV2UpdateError(err?.message || "Unexpected error updating certificate.")
        } finally {
            setV2UpdatingCert(false)
        }
    }

    const fetchDashboardData = async () => {
        try {
            setFetchingDashboardData(true)
            setFetchedDashboardData(false)
            const fetchDashboardDataRequest = await getProtected("companies/dashboard/data", user.role)

            if (fetchDashboardDataRequest.status === "OK") {
                const data: DashboardData = fetchDashboardDataRequest.data

                // If backend doesn't return certificates, compute them from each company's form pages
                if (
                    (!data.expiringCertificates || data.expiringCertificates.length === 0) &&
                    (!data.expiredCertificates || data.expiredCertificates.length === 0) &&
                    data.companies?.length > 0
                ) {
                    const allExpiring: Certificate[] = []
                    const allExpired: Certificate[] = []

                    await Promise.all(
                        data.companies.map(async (company) => {
                            try {
                                const formRequest = await getProtected(`companies/register/form/${company.vendor}`, user.role)
                                if (formRequest.status === "OK") {
                                    const pages = formRequest.data?.generalRegistrationForm?.form?.pages || []
                                    const vendorID = formRequest.data?.generalRegistrationForm?._id
                                    const { expiring, expired } = extractCertificatesFromFormPages(pages, vendorID)
                                    allExpiring.push(...expiring)
                                    allExpired.push(...expired)
                                }
                            } catch (err) {
                                console.error({ err })
                            }
                        })
                    )

                    data.expiringCertificates = allExpiring
                    data.expiredCertificates = allExpired
                }

                // De-dupe across all four cert arrays by _id (a cert can
                // theoretically appear in multiple arrays during edge cases)
                const seenIds = new Set<string>()
                const dedup = (certs: Certificate[]) =>
                    (certs ?? []).filter(c => {
                        if (seenIds.has(c._id)) return false
                        seenIds.add(c._id)
                        return true
                    })
                // Priority order: rejected > pending > expired > expiring
                data.rejectedCertificates = dedup(data.rejectedCertificates ?? [])
                data.pendingCertificates = dedup(data.pendingCertificates ?? [])
                data.expiredCertificates = dedup(data.expiredCertificates ?? [])
                data.expiringCertificates = dedup(data.expiringCertificates ?? [])

                setFetchedDashboardData(true)
                setFetchingDashboardData(false)
                setDashboardData(data)
            }
        } catch (error) {
            console.error({ error })
            setFetchingDashboardData(false)
        }
    }

    const setCertificateToUpdate = (certificate: Certificate, certificateCategory: string, certificateIndex: number) => {

        console.log({ see2: certificate, certificateCategory, certificateIndex })
        setSelectedCertificate({ ...certificate, certificateCategory, certificateIndex })
    }

    const setNewCertificate = (newCertificate: any) => {
        console.log({ see1: selectedCertificate })
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

    const isAdminRole = (role: string) => ["Admin", "IT Admin", "C&P Admin"].includes(role)

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
                setUpdateCertificateError(updateCertificateRequest.error?.message ?? "Failed to update certificate")
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

    const setNewCertificateIssueDate = (issueDate: string) => {
        setSelectedCertificate({
            ...selectedCertificate,
            newCertificate: {
                ...selectedCertificate.newCertificate,
                issueDate
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

    const isEmptyAnswers = v2Submission?.answers ? Object.keys(v2Submission.answers).length === 0 : true;
    const isDraft = v2Submission?.status === "draft";
    const isReturned = v2Submission?.status === "returned";

    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.dashboardHeader}>
                <h3 className={styles.dashboardTitle}>Your Dashboard</h3>
            </div>

            {/* V2 Application CTA - only when this contractor's account is
                linked to a SubmissionV2 (i.e. they came in via the new
                invite/registration flow). */}

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
                                                <td>Issue Date</td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        defaultValue={selectedCertificate.issueDate ? new Date(selectedCertificate.issueDate).toISOString().split('T')[0] : undefined}
                                                        onChange={(event) => setNewCertificateIssueDate(event.target.value)}
                                                    />
                                                </td>
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
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h6 className={styles.emptyStateTitle}>{isEmptyAnswers ? "No Company Registration" : isDraft ? "Company Registration In Progress" : isReturned ? "Company Registration Returned" : "Company Registration Submitted"}
                            </h6>
                            <p className={styles.emptyStateText}>
                                {isEmptyAnswers ?
                                    "You have not started your company registration yet. Start the process to become an approved contractor."
                                    : v2Submission?.status === "draft" ? "Complete your company registration to become an approved contractor."
                                        : v2Submission?.status === "returned" ? "Your company registration has been returned. Please update your information and resubmit."
                                            : "Your Application is being reviewed."
                                }
                            </p>
                            <Link href="/contractor/v2/application" className={styles.emptyStateButton}>
                                {v2Submission?.status === "draft" || v2Submission?.status === "returned"
                                    ? (v2Submission?.status === "returned" ? "Update Registration" : "Continue Company Registration")
                                    : "View Application"}
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* ── V2 Certificates ─────────────────────────────────
                        Shown whenever this contractor has a SubmissionV2.
                        Reads from /api/v2/submissions/mine/certificates;
                        renders the same expiring / expired / pending /
                        rejected buckets the V1 dashboard uses. Update click
                        opens the file uploader → dates modal → POST to
                        /api/v2/submissions/mine/certificates/:id/replace.
                    */}
                    {v2Submission && (
                        <V2CertificatesPanel
                            loading={v2CertsLoading}
                            categories={v2CertCategories}
                            onUpdate={openV2CertUpdate}
                        />
                    )}

                    {/* V1 certificate sections are suppressed when a V2
                        submission exists - V2 is the source of truth. */}
                    {!v2Submission && (dashboardData.rejectedCertificates ?? []).length > 0 && (
                        <>
                            <hr className={styles.divider} />
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h5 className={`${styles.sectionTitle} ${styles.rejectedSectionTitle}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Action Required - Rejected Certificates
                                    </h5>
                                </div>

                                <div className={styles.actionRequiredBanner}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    One or more of your re-uploaded certificates have been reviewed and rejected. Please read the reason below and re-upload the correct document.
                                </div>

                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Certificate</th>
                                                <th>File</th>
                                                <th>Section</th>
                                                <th>Issue Date</th>
                                                <th>Expiry Date</th>
                                                <th>Reason for Rejection</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.rejectedCertificates.map((certificate, index) => (
                                                <tr key={index}>
                                                    <td className={styles.certificateType}>
                                                        {certificate.label}
                                                    </td>
                                                    <td>
                                                        {certificate.name ? (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                                <span style={{ fontSize: "var(--font-size-sm)" }}>{certificate.name}</span>
                                                                <Link
                                                                    href={certificate.url}
                                                                    target="_blank"
                                                                    className={`${styles.tableButton} ${styles.tableButtonView}`}
                                                                    style={{ alignSelf: "flex-start", marginTop: 2 }}
                                                                >
                                                                    View ↗
                                                                </Link>
                                                            </div>
                                                        ) : (
                                                            <Link
                                                                href={certificate.url}
                                                                target="_blank"
                                                                className={`${styles.tableButton} ${styles.tableButtonView}`}
                                                            >
                                                                View ↗
                                                            </Link>
                                                        )}
                                                    </td>
                                                    <td className={styles.certSectionLabel}>
                                                        {getCertSectionTitle(certificate) ?? (
                                                            <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className={styles.expiryDate}>
                                                            {certificate.issueDate
                                                                ? new Date(certificate.issueDate).toLocaleDateString("en-NG")
                                                                : <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                                                            }
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={`${styles.expiryDate} ${styles.expiryDateExpired}`}>
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                                <path d="M8 4v4m0 2h.01M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            {certificate.expiryDate
                                                                ? new Date(certificate.expiryDate).toLocaleDateString("en-NG")
                                                                : <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                                                            }
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {certificate.reviewRemarks ? (
                                                            <div className={styles.rejectionRemarksBox}>
                                                                <p className={styles.rejectionRemarksText}>{certificate.reviewRemarks}</p>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>No reason provided</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => setCertificateToUpdate(certificate, "rejected", index)}
                                                            className={`${styles.tableButton} ${styles.tableButtonFix}`}
                                                        >
                                                            Re-upload
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Pending Review Section - shown only when non-empty */}
                    {!v2Submission && (dashboardData.pendingCertificates ?? []).length > 0 && (
                        <>
                            <hr className={styles.divider} />
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h5 className={`${styles.sectionTitle} ${styles.pendingSectionTitle}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Pending Review
                                    </h5>
                                </div>

                                <div className={styles.pendingInfoBanner}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Your re-uploaded certificate(s) are awaiting staff review. You will be notified by email once a decision has been made.
                                </div>

                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Certificate</th>
                                                <th>Uploaded</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.pendingCertificates.map((certificate, index) => (
                                                <tr key={index}>
                                                    <td className={styles.certificateType}>
                                                        {certificate.label}
                                                    </td>
                                                    <td className={`${styles.expiryDate} ${styles.expiryDateExpiring}`}>
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                            <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                                                        </svg>
                                                        {certificate.updatedAt
                                                            ? new Date(certificate.updatedAt).toLocaleDateString("en-NG")
                                                            : certificate.createdAt
                                                                ? new Date(certificate.createdAt).toLocaleDateString("en-NG")
                                                                : "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {!v2Submission && <hr className={styles.divider} />}

                    {/* Expiring Certificates Section */}
                    {!v2Submission && <div className={styles.section}>
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
                                            <th>Issue Date</th>
                                            <th>Expiry Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.expiringCertificates.map((certificate, index) => (
                                            <tr key={index}>
                                                <td className={styles.certificateType}>
                                                    {certificate.label}
                                                    {certificate.certStatus && (
                                                        <span style={{ marginLeft: 8 }}>
                                                            <CertStatusBadge status={certificate.certStatus} />
                                                        </span>
                                                    )}
                                                    {certificate.certStatus === "rejected" && certificate.reviewRemarks && (
                                                        <div style={{ fontSize: "0.8rem", color: "#c62828", marginTop: 4 }}>
                                                            {certificate.reviewRemarks}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className={styles.expiryDate}>
                                                        {certificate.issueDate
                                                            ? new Date(certificate.issueDate).toLocaleDateString("en-NG")
                                                            : <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td className={`${styles.expiryDate} ${styles.expiryDateExpiring}`}>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                                                    </svg>
                                                    {new Date(certificate.expiryDate).toLocaleDateString("en-NG")}
                                                </td>
                                                <td>
                                                    <div className={styles.tableActions}>
                                                        <Link
                                                            href={certificate.url}
                                                            target="_blank"
                                                            className={`${styles.tableButton} ${styles.tableButtonView}`}
                                                        >
                                                            View
                                                        </Link>
                                                        {certificate.certStatus === "rejected" ? (
                                                            <button
                                                                onClick={() => setCertificateToUpdate(certificate, "expiring", index)}
                                                                className={styles.tableButton}
                                                            >
                                                                Re-upload
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setCertificateToUpdate(certificate, "expiring", index)}
                                                                className={styles.tableButton}
                                                            >
                                                                Update Certificate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>}

                    {!v2Submission && <hr className={styles.divider} />}

                    {/* Expired Certificates Section */}
                    {!v2Submission && <div className={styles.section}>
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
                                            <th>Issue Date</th>
                                            <th>Expiry Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.expiredCertificates.map((certificate, index) => (
                                            <tr key={index}>
                                                <td className={styles.certificateType}>
                                                    {certificate.label}
                                                    {certificate.certStatus && (
                                                        <span style={{ marginLeft: 8 }}>
                                                            <CertStatusBadge status={certificate.certStatus} />
                                                        </span>
                                                    )}
                                                    {certificate.certStatus === "rejected" && certificate.reviewRemarks && (
                                                        <div style={{ fontSize: "0.8rem", color: "#c62828", marginTop: 4 }}>
                                                            {certificate.reviewRemarks}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className={styles.expiryDate}>
                                                        {certificate.issueDate
                                                            ? new Date(certificate.issueDate).toLocaleDateString("en-NG")
                                                            : <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td className={`${styles.expiryDate} ${styles.expiryDateExpired}`}>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M8 4v4m0 2h.01M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    {new Date(certificate.expiryDate).toLocaleDateString("en-NG")}
                                                </td>
                                                <td>
                                                    <div className={styles.tableActions}>
                                                        <Link
                                                            href={certificate.url}
                                                            target="_blank"
                                                            className={`${styles.tableButton} ${styles.tableButtonView}`}
                                                        >
                                                            View
                                                        </Link>
                                                        {certificate.certStatus === "rejected" ? (
                                                            <button
                                                                onClick={() => setCertificateToUpdate(certificate, "expired", index)}
                                                                className={styles.tableButton}
                                                            >
                                                                Re-upload
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setCertificateToUpdate(certificate, "expired", index)}
                                                                className={styles.tableButton}
                                                            >
                                                                Update Certificate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>}

                    {/* ── V2 cert update modals ──────────────────────────
                        File picker first; once a file is uploaded, swap
                        to the dates form. submitV2CertReplacement posts
                        to the BE replace endpoint and closeV2CertModal
                        triggers a re-fetch on success. */}
                    {v2SelectedCert && !v2NewFile && (
                        <Modal>
                            <FileUploader
                                closeUploader={closeV2CertModal}
                                label={v2SelectedCert.label || v2SelectedCert.fieldKey}
                                maxFiles={1}
                                updateCode={v2SelectedCert.updateCode}
                                updateUploadedFiles={(newFiles: any[]) => setV2NewFile(newFiles?.[0] || null)}
                                files={dashboardData.files}
                                uploadPath="api/v2/upload"
                            />
                        </Modal>
                    )}
                    {v2SelectedCert && v2NewFile && (
                        <Modal>
                            <div className={styles.updateCertificateModal}>
                                <div className={styles.modalHeader}>
                                    <h3 className={styles.modalTitle}>Update Certificate</h3>
                                    <p>{v2SelectedCert.label || v2SelectedCert.fieldKey}</p>
                                </div>
                                <div className={styles.modalContent}>
                                    {v2UpdateSuccess ? (
                                        <div className={styles.modalSuccess}>
                                            <SuccessMessage message={v2UpdateSuccess} />
                                        </div>
                                    ) : (
                                        <>
                                            <p>
                                                New file:{" "}
                                                <strong>
                                                    {v2NewFile.name || v2NewFile.url.split("/").pop()}
                                                </strong>
                                            </p>
                                            <table>
                                                <tbody>
                                                    <tr>
                                                        <td>Issue Date</td>
                                                        <td>
                                                            <input
                                                                type="date"
                                                                value={v2NewIssueDate}
                                                                onChange={(e) => setV2NewIssueDate(e.target.value)}
                                                                disabled={v2UpdatingCert}
                                                            />
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>Expiry Date</td>
                                                        <td>
                                                            <input
                                                                type="date"
                                                                value={v2NewExpiryDate}
                                                                onChange={(e) => setV2NewExpiryDate(e.target.value)}
                                                                disabled={v2UpdatingCert}
                                                            />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            {v2UpdateError && (
                                                <div className={styles.modalError}>
                                                    <ErrorText text={v2UpdateError} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        onClick={closeV2CertModal}
                                        className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                                    >
                                        {v2UpdateSuccess ? "Close" : "Cancel"}
                                    </button>
                                    {!v2UpdateSuccess && (
                                        <>
                                            <button
                                                onClick={() => setV2NewFile(null)}
                                                disabled={v2UpdatingCert}
                                                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                            >
                                                Back to File Selection
                                            </button>
                                            <button
                                                onClick={submitV2CertReplacement}
                                                disabled={v2UpdatingCert || !v2NewExpiryDate}
                                                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                                            >
                                                Update Certificate
                                                {v2UpdatingCert && <ButtonLoadingIcon />}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Modal>
                    )}
                </>
            )}
        </div>
    )
}

export default Dashboard