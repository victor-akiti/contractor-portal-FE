"use client";
import Accordion from "@/components/accordion";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import { getProtected } from "@/requests/get";
import moment from "moment";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import styles from "./styles/styles.module.css";

type RegistrationForm = {
  _id?: string;
  vendorID?: string;
  files?: Array<any>;
  form?: {
    pages?: Array<{
      pageTitle?: string;
      sections?: Array<{
        layout?: string;
        title?: string;
        hideOnApproval?: boolean;
        description?: string;
        allowMultiple?: boolean;
        addSectionText?: string;
        fields?: Array<{
          value?: any;
          type?: any;
          placeholder?: any;
          options?: any;
          allowedFormats?: any;
          required?: boolean;
          maxAllowedFiles?: any;
          isACertificate?: boolean;
          hasExpiryDate?: any;
          label?: any;
          errorText?: any;
          textType?: any;
          infoText?: any;
          option?: any;
          text?: any;
          maxLength?: any;
          allowMultiple?: boolean;
          addFieldText?: string;
          isDuplicate?: boolean;
          approvalInfoText?: string;
        }>;
      }>;
    }>;
  };
};

/**
 * VIEW PAGE (MODERNIZED)
 * - View contractor registration details
 * - Certificate expiry tracking
 * - Elegant accordion-based layout
 * - 100% backward-compatible with existing functionality
 */
const ViewPage = () => {
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({});
  const [isLoading, setIsLoading] = useState(true);
  const location = useParams();
  const router = useRouter();
  const user = useSelector((state: any) => state.user.user);

  useEffect(() => {
    const vendorID = location?.id;
    if (vendorID) {
      getVendorForm(vendorID);
    }
  }, [location]);

  const getVendorForm = async (vendorID: any) => {
    try {
      setIsLoading(true);
      const getVendorRegistrationFormRequest = await getProtected(
        `companies/register/form/${vendorID}`,
        user.role
      );

      if (getVendorRegistrationFormRequest.status === "OK") {
        const generalRegistrationForm =
          getVendorRegistrationFormRequest.data.generalRegistrationForm;
        setRegistrationForm(generalRegistrationForm);
      } else {
        console.error("Failed to load registration form");
      }
    } catch (error) {
      console.error({ error });
    } finally {
      setIsLoading(false);
    }
  };

  const getCertificateTimeValidity = (expiryDate: string) => {
    const currentDateObject = new Date();
    const expiryDateObject = new Date(expiryDate);

    if (currentDateObject.getTime() >= expiryDateObject.getTime()) {
      return "expired";
    } else if (
      (expiryDateObject.getTime() - currentDateObject.getTime()) / 1000 <
      7884000
    ) {
      return "expiring";
    } else {
      return "";
    }
  };

  const getFieldItemComponent = (field: any, index: number) => {
    switch (field.type) {
      case "shortText":
      case "longText":
      case "dropDown":
        return (
          <div key={index} className={styles.fieldItem}>
            <div className={styles.fieldData}>
              <label className={styles.fieldLabel}>{field.label}</label>
              <p className={styles.fieldValue}>{field.value || "Not provided"}</p>
            </div>
            {field.approvalInfoText && (
              <p className={styles.approvalInfoText}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {field.approvalInfoText}
              </p>
            )}
          </div>
        );

      case "date":
        return (
          <div key={index} className={styles.fieldItem}>
            <div className={styles.fieldData}>
              <label className={styles.fieldLabel}>{field.label}</label>
              <p className={styles.fieldValue}>
                {field.value ? moment(field.value).format("YYYY-MM-DD") : "Not provided"}
              </p>
            </div>
            {field.approvalInfoText && (
              <p className={styles.approvalInfoText}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {field.approvalInfoText}
              </p>
            )}
          </div>
        );

      case "file":
        if (field.value && field.value[0]) {
          const certificateStatus = field.isACertificate && field.value[0]?.expiryDate
            ? getCertificateTimeValidity(field.value[0].expiryDate)
            : "";

          return (
            <div key={index} className={styles.fieldItem}>
              <div className={styles.fieldData}>
                <label className={styles.fieldLabel}>{field.label}</label>
                <div className={styles.fileDetailsDiv}>
                  <p>{field.value[0].name || "File"}</p>

                  {field.value[0]?.expiryDate && (
                    <div className={styles.expiryDateDiv}>
                      Expires: <span>{field.value[0].expiryDate}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
                    {field.value[0]?.url && (
                      <Link href={field.value[0].url} target="_blank">
                        View Document
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M12 8.667V12a1.333 1.333 0 01-1.333 1.333H4A1.333 1.333 0 012.667 12V4.667A1.333 1.333 0 014 3.333h3.333M10 2h4v4M6.667 9.333L14 2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Link>
                    )}

                    {field.hasExpiryDate && (
                      <a href="#" className={styles.certificateHistoryLink}>
                        Certificate History
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {field.isACertificate && field.value[0]?.expiryDate && (
                <>
                  {certificateStatus === "expired" && (
                    <p className={styles.certificateExpiredText}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Certificate has expired
                    </p>
                  )}

                  {certificateStatus === "expiring" && (
                    <p className={styles.certificateToExpireText}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 4v4l3 3m3-3a6 6 0 11-12 0 6 6 0 0112 0z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Certificate will soon expire
                    </p>
                  )}
                </>
              )}

              {field.approvalInfoText && (
                <p className={styles.approvalInfoText}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {field.approvalInfoText}
                </p>
              )}
            </div>
          );
        }
        return null;

      case "multiSelectText":
        return (
          <div key={index} className={styles.fieldItem}>
            <div className={styles.fieldData}>
              <label className={styles.fieldLabel}>{field.label}</label>
              {field?.value?.length > 0 ? (
                <div className={styles.multiSelectTextValues}>
                  {field.value.map((item: any, itemIndex: number) => (
                    <p key={itemIndex}>{item.label}</p>
                  ))}
                </div>
              ) : (
                <p className={styles.fieldValue}>Not provided</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.view}>
        <div className={styles.loadingContainer}>
          <ButtonLoadingIcon />
          <p className={styles.loadingText}>Loading registration details...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!registrationForm || Object.values(registrationForm).length === 0) {
    return (
      <div className={styles.view}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className={styles.emptyStateText}>
            No registration details found
          </p>
        </div>
      </div>
    );
  }

  const companyName =
    registrationForm.form?.pages?.[0]?.sections?.[0]?.fields?.[0]?.value ||
    "Company Registration";

  return (
    <div className={styles.view}>
      {/* Header */}
      <div className={styles.viewHeader}>
        <Link href="/contractor" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className={styles.companyTitle}>{companyName}</h1>
      </div>

      {/* Content */}
      <div className={styles.approvalContent}>
        {registrationForm.form?.pages?.map((page, pageIndex) => (
          <Accordion
            defaultOpen={pageIndex === 0}
            key={pageIndex}
            title={page.pageTitle || `Page ${pageIndex + 1}`}
          >
            {page.sections?.map((section, sectionIndex) => {
              if (section.hideOnApproval) {
                return null;
              }

              return (
                <div key={sectionIndex} className={styles.sectionItem}>
                  <div>
                    <div className={styles.sectionHeader}>
                      <h6 className={styles.sectionTitle}>{section.title}</h6>
                    </div>

                    <div>
                      {section.fields?.map((field, fieldIndex) =>
                        getFieldItemComponent(field, fieldIndex)
                      )}
                    </div>

                    {sectionIndex !== (page.sections?.length || 0) - 1 && (
                      <hr className={styles.sectionDivider} />
                    )}
                  </div>
                </div>
              );
            })}
          </Accordion>
        ))}
      </div>
    </div>
  );
};

export default ViewPage;