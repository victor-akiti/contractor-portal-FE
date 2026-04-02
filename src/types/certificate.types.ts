// ---------------------------------------------------------------------------
// Certificate-related types shared across the contractor dashboard,
// staff cert-review tab, approval stage components, and RTK Query slice.
// ---------------------------------------------------------------------------

export type CertStatus = "pending" | "approved" | "rejected";

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

/** A file object returned by POST files/upload (single entry in the array). */
export interface UploadedFile {
    _id?: string;
    url: string;
    name: string;
    type?: string;
    size?: number;
    createdAt?: string;
    updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Vendor form shape (used to look up section titles on the dashboard)
// ---------------------------------------------------------------------------

export interface VendorFormFileValue {
    _id?: string;
    url?: string;
    expiryDate?: string;
}

export interface VendorFormField {
    _id?: string;
    updateCode?: string;
    type?: string;
    label?: string;
    approvalLabel?: string;
    value?: VendorFormFileValue[];
}

export interface VendorFormSection {
    title?: string;
    fields: VendorFormField[];
}

export interface VendorFormPage {
    pageTitle?: string;
    sections: VendorFormSection[];
}

export interface VendorForm {
    name?: string;
    pages: VendorFormPage[];
}

// ---------------------------------------------------------------------------
// Certificate record (vendor perspective — dashboard)
// ---------------------------------------------------------------------------

/** A certificate as returned by GET companies/dashboard/data */
export interface Certificate {
    _id: string;
    label: string;
    /** Uploaded file name */
    name?: string;
    expiryDate: string;
    issueDate?: string;
    url: string;
    updateCode: string;
    vendorID?: string;
    certStatus?: CertStatus;
    reviewRemarks?: string;
    isReUpload?: boolean;
    updatedAt?: string;
    createdAt?: string;
    /** Populated on rejected/pending certs returned with vendor form data */
    vendor?: {
        _id: string;
        form?: VendorForm;
    };
}

/** Certificate extended with UI-only fields set when the vendor opens the update modal */
export interface SelectedCertificate extends Certificate {
    certificateCategory: "expiring" | "expired" | "rejected" | "pending";
    certificateIndex: number;
    /** Set after the vendor uploads a new file (before submitting) */
    newCertificate?: UploadedFile & { expiryDate?: string };
}

// ---------------------------------------------------------------------------
// Certificate update request body  (PUT companies/certificates/:id)
// ---------------------------------------------------------------------------

export interface CertUpdateNewCertificate {
    url: string;
    name: string;
    expiryDate: string;
}

export interface CertUpdateBody {
    newCertificate: CertUpdateNewCertificate;
    updateCode: string;
    /** Required when the caller is not a Vendor (e.g. an admin updating on behalf) */
    vendorID?: string;
}

// ---------------------------------------------------------------------------
// Contractor dashboard API
// ---------------------------------------------------------------------------

export interface Company {
    _id: string;
    companyName: string;
    vendor: string;
    flags: {
        stage: string;
        status: string;
        submitted: boolean;
    };
}

/** Shape of data returned by GET companies/dashboard/data */
export interface DashboardData {
    companies: Company[];
    expiringCertificates: Certificate[];
    expiredCertificates: Certificate[];
    /** Certs the vendor re-uploaded that are awaiting staff review */
    pendingCertificates: Certificate[];
    /** Certs the vendor re-uploaded that staff rejected */
    rejectedCertificates: Certificate[];
    files: UploadedFile[];
}

// ---------------------------------------------------------------------------
// Staff cert-review queue  (GET companies/certificates/pending-review)
// ---------------------------------------------------------------------------

/** A single item in the staff cert-review queue */
export interface CertReviewItem {
    _id: string;
    company: { _id: string; companyName: string };
    label: string;
    /** Uploaded file name */
    name: string;
    url: string;
    updateCode?: string;
    createdAt?: string;
    updatedAt?: string;
    expiryDate?: string;
    /** Form section path, e.g. "Page Title › Section Title" */
    section?: string | null;
    isReUpload?: boolean;
    certStatus?: CertStatus;
}

/** Response shape from GET companies/certificates/pending-review */
export interface CertReviewQueueResponse {
    status: "OK" | "FAILED";
    data: { certificates: CertReviewItem[] } | CertReviewItem[];
    error?: { message: string };
}

// ---------------------------------------------------------------------------
// Certificate review decision  (PUT companies/certificates/:id/review)
// ---------------------------------------------------------------------------

/** RTK mutation argument */
export interface ReviewCertificateRequest {
    certificateId: string;
    certStatus: "approved" | "rejected";
    reviewRemarks?: string;
    /** Saved to the section's internalComment array; not visible to the vendor */
    internalComment?: string;
    userRole: string;
}

/** Body sent to the backend */
export interface ReviewCertificateBody {
    certStatus: "approved" | "rejected";
    reviewRemarks?: string;
    internalComment?: string;
}

// ---------------------------------------------------------------------------
// Pending-certs confirmation modal  (Feature 2 — auto-approve on stage advance)
// ---------------------------------------------------------------------------

/** A pending cert item returned inside the error body of POST approvals/process/:vendorID */
export interface PendingCert {
    _id: string;
    label: string;
}

// ---------------------------------------------------------------------------
// Generic API response wrapper
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
    status: "OK" | "FAILED";
    data?: T;
    error?: {
        message: string;
        /** Extra fields (e.g. pendingCerts) may be spread here */
        [key: string]: unknown;
    };
}
