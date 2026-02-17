'use client';

import Accordion from "@/components/accordion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./styles/styles.module.css";

import checkboxIconChecked from "@/assets/images/checkbox_checked.svg";
import checkboxIconUnchecked from "@/assets/images/checkbox_unchecked.svg";
import closeIconWhite from "@/assets/images/close_icon_white.svg";
import roundCheckboxIconChecked from "@/assets/images/round_checkbox_checked.svg";
import roundCheckboxIconUnchecked from "@/assets/images/rounde_checkbox_unchecked.svg";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import CertificateHistoryModal from "@/components/certificateHistory";
import Modal from "@/components/modal";
import staffApi from "@/redux/apis/staffApi";
import { getProtected } from "@/requests/get";
import { postProtected } from "@/requests/post";
import { formatNumberAsCurrency } from "@/utilities/currency";
import FileLink from "@/components/fileLink";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";

const StageC = () => {
    const [approvalData, setApprovalData] = useState<any>({});
    const [pages, setPages] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
    const [vendorID, setVendorID] = useState("");
    const [sectionRemarksToShow, setSectionRemarksToShow] = useState<any>({});
    const [showSetReasonForHoldModal, setShowSetReasonForHoldModal] = useState(false);
    const [approvalChoice, setApprovalChoice] = useState("complete");
    const [jobCategories, setJobCategories] = useState<any[]>([]);
    const [fixedJobCategories, setFixedJobCategoires] = useState<any[]>([]);
    const [currentVendorCategories, setCurrentVendorCategories] = useState<any[]>([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [applicationProcessed, setApplicationProcessed] = useState(false);
    const user = useSelector((state: any) => state.user);
    const [itemBeingUpdated, setItemBeingUpdated] = useState("");
    const [updateStatus, setUpdateStatus] = useState({ status: "", message: "" });
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [siteVisitRequired, setSiteVisitRequired] = useState(false);
    const router = useRouter();
    const params = useParams();
    const [vendorData, setVendorData] = useState<any>({ approvalData: {}, pages: [] });
    const [showApprovalActions, setShowApprovalActions] = useState(false);
    const [services, setServices] = useState<any[]>([]);

    // ---------------------------------------------------------------------------
    // Certificate expiry visibility gate
    // If user does NOT have any of these roles, hide:
    //  - Expiry date text
    //  - "Certificate has expired"
    //  - "Certificate will soon expire"
    // ---------------------------------------------------------------------------
    const CERT_EXPIRY_VIEW_ROLES = [
        "VRM",
        "HOD",
        "C and P Staff",
        "C and P Supervisor",
        "Supervisor",
        "C&P Admin",
        "Admin",
    ];

    const getUserRole = () => {
        return [user?.user?.role];
    };

    const canViewCertificateExpiry = () => {
        const roles = getUserRole();
        return roles.some((r) => CERT_EXPIRY_VIEW_ROLES.includes(r));
    };

    const SHOULD_SHOW_CERT_EXPIRY = canViewCertificateExpiry();

    useEffect(() => {
        if (params?.id) {
            fetchVendorData(params.id);
            getAllServices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    useEffect(() => {
        fetchJobCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages]);

    const getAllServices = async () => {
        try {
            const allServicesRequest = await getProtected("jobCategories", user.role);

            if (allServicesRequest.status === "OK") {
                let tempServices = [...services];
                tempServices = allServicesRequest.data;
                setServices(tempServices);
            }
        } catch (error) {
            console.error({ error });
        }
    };

    const fetchVendorData = async (vendorID: any) => {
        setVendorID(vendorID);

        try {
            const fetchVendorDataRequest = await getProtected(
                `companies//approval-data/${vendorID}`,
                user.role
            );

            if (fetchVendorDataRequest.status === "OK") {
                const tempVendorData = { ...vendorData };
                tempVendorData.approvalData = fetchVendorDataRequest.data.approvalData;
                tempVendorData.pages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages;
                setVendorData(tempVendorData);

                let tempPages: any[] = [...pages];
                tempPages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages;
                setPages(tempPages);

                if (fetchVendorDataRequest.data.approvalData.jobCategories) {
                    let tempSelectedCategories: any[] = [...selectedCategories];
                    tempSelectedCategories = fetchVendorDataRequest.data.approvalData.jobCategories;
                    setSelectedCategories(tempSelectedCategories);

                    let tempCurrentCategories: any[] = [...currentVendorCategories];
                    tempCurrentCategories = fetchVendorDataRequest.data.approvalData.jobCategories;
                    setCurrentVendorCategories(tempCurrentCategories);
                }

                let tempApprovalData = { ...approvalData };
                tempApprovalData = fetchVendorDataRequest.data.approvalData;
                setApprovalData(tempApprovalData);

                getExpiringAndExpiredCertificates(tempPages);
            }
        } catch (error) {
            console.error({ error });
        }
    };

    const getCertificateTimeValidity = (expiryDate: any) => {
        const currentDateObject = new Date();
        const expiryDateObject = new Date(expiryDate);

        if (currentDateObject.getTime() >= expiryDateObject.getTime()) {
            return "expired";
        } else if ((expiryDateObject.getTime() - currentDateObject.getTime()) / 1000 < 7884000) {
            return "expiring";
        } else {
            return "";
        }
    };

    const toggleApprovalChoice = () => {
        if (approvalChoice === "approve") {
            setApprovalChoice("complete");
        } else {
            setApprovalChoice("approve");
        }
    };

    const toggleSiteVisitRequiredStatus = () => {
        if (siteVisitRequired) {
            setSiteVisitRequired(false);
        } else {
            setSiteVisitRequired(true);
        }
    };

    const [currentCertificateHistory, setCurrentCertificateHistory] = useState<any[]>([]);

    const setHistoryAsCurrentCertificateHistory = (certificateHistory: any) => {
        let tempCurrentCertificateHistory = [...currentCertificateHistory];
        tempCurrentCertificateHistory = certificateHistory;
        setCurrentCertificateHistory(tempCurrentCertificateHistory);
    };

    const clearCurrentCertificateHistory = () => {
        let tempCurrentCertificateHistory = [...currentCertificateHistory];
        tempCurrentCertificateHistory = [];
        setCurrentCertificateHistory(tempCurrentCertificateHistory);
    };

    // Helper function to check if a field has a meaningful value
    const hasFieldValue = (field: any) => {
        if (field.value === null || field.value === undefined) return false;
        if (typeof field.value === "string" && field.value.trim() === "") return false;
        if (Array.isArray(field.value) && field.value.length === 0) return false;
        if (typeof field.value === "object" && !Array.isArray(field.value)) {
            if (Object.keys(field.value).length === 0) return false;
        }
        return true;
    };

    // Helper function to check if section has any displayable data
    const sectionHasData = (section: any) => {
        return section.fields.some((field: any) => hasFieldValue(field));
    };

    const getFieldItemComponent = (field: any, index: number, section: any) => {

        // Don't render if field has no value
        if (!hasFieldValue(field)) return null;

        switch (field.type) {
            case "shortText":
                return (
                    <div key={index} className={styles.fieldItem}>
                        <div>
                            <p className={styles.fieldData}>
                                <label>{`${field.label}:`}</label>

                                {typeof field.value !== "string" ? (
                                    <div></div>
                                ) : field.textType === "number" && field.isCurrency ? (
                                    (() => {
                                        const currencyField = section.fields.find((f: any) => f.label === "Currency");
                                        const selectedCurrency = currencyField?.value || "Naira (NGN)";
                                        return <p>{formatNumberAsCurrency(field.value, selectedCurrency)}</p>;
                                    })()
                                ) : field.textType === "number" ? (
                                    <p>{field.value}</p>
                                ) : (
                                    <p>{field?.value?.e164Number ? field.value.number : field.value}</p>
                                )}
                            </p>
                        </div>

                        {field.approvalInfoText && (
                            <p className={styles.approvalInfoText}>Approval info text</p>
                        )}
                    </div>
                );

            case "longText":
                return (
                    <div key={index} className={styles.fieldItem}>
                        <div>
                            <p className={styles.fieldData}>
                                <label>{`${field.label}:`}</label>
                                <p>{field.value}</p>
                            </p>
                        </div>

                        {field.approvalInfoText && (
                            <p className={styles.approvalInfoText}>Approval info text</p>
                        )}
                    </div>
                );

            case "dropDown":
                return (
                    <div key={index} className={styles.fieldItem}>
                        <div>
                            <p className={styles.fieldData}>
                                <label>{`${field.label}:`}</label>
                                <p>{field.value}</p>
                            </p>
                        </div>

                        {field.approvalInfoText && (
                            <p className={styles.approvalInfoText}>Approval info text</p>
                        )}
                    </div>
                );

            case "date":
                return (
                    <div key={index} className={styles.fieldItem}>
                        <div>
                            <p className={styles.fieldData}>
                                <label>{`${field.label}:`}</label>
                                <p>{field.value ? moment(field.value).format("YYYY-MM-DD") : ""}</p>
                            </p>
                        </div>

                        {field.approvalInfoText && (
                            <p className={styles.approvalInfoText}>Approval info text</p>
                        )}
                    </div>
                );

            case "file":
                if (field.value) {
                    const expiryDate = field?.value?.[0]?.expiryDate;

                    return (
                        <div key={index} className={styles.fieldItem}>
                            <div>
                                <div className={styles.fieldData}>
                                    <label>{`${field.label}:`}</label>

                                    {field?.value?.[0]?.url && (
                                        <div>
                                            <FileLink url={field?.value?.[0]?.url} name={field?.value?.[0]?.name} type={field?.value?.[0]?.type}>
                                                <p>View</p>
                                            </FileLink>
                                        </div>
                                    )}

                                    {field.hasExpiryDate && field.history && (
                                        <a
                                            style={{ marginLeft: "20px" }}
                                            onClick={() => setHistoryAsCurrentCertificateHistory(field.history)}
                                        >
                                            Certificate History
                                        </a>
                                    )}
                                </div>
                            </div>

                            {field.approvalInfoText && (
                                <p className={styles.approvalInfoText}>Approval info text</p>
                            )}

                            {/* ------------------------------------------------------------------
                  EXPIRY DATE + STATUS:
                  Only show when user has any of the allowed roles.
                  ------------------------------------------------------------------ */}
                            {field.isACertificate && SHOULD_SHOW_CERT_EXPIRY && (
                                <>
                                    {expiryDate && (
                                        <p className={styles.expiryDateText}>{`Expiry date: ${expiryDate}`}</p>
                                    )}

                                    {expiryDate && (
                                        <>
                                            {getCertificateTimeValidity(expiryDate) === "expired" && (
                                                <p className={styles.certificateExpiredText}>Certificate has expired</p>
                                            )}

                                            {getCertificateTimeValidity(expiryDate) === "expiring" && (
                                                <p className={styles.certificateToExpireText}>
                                                    Certificate will soon expire
                                                </p>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    );
                }
                break;

            case "multiSelectText":
                return (
                    <div className={styles.fieldItem} key={index}>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            {field.value?.length > 0 && (
                                <p className={styles.multiSelectTextValues}>
                                    {field?.value?.map((item: any, index: number) => (
                                        <p key={index}>{item.label}</p>
                                    ))}
                                </p>
                            )}
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    const fetchJobCategories = async () => {
        try {
            const jobCategoriesRequest = await getProtected("jobCategories", user.role);

            if (jobCategoriesRequest.status === "OK") {
                let tempJobCategories = [...jobCategories];
                tempJobCategories = jobCategoriesRequest.data;
                setJobCategories(tempJobCategories);

                tempJobCategories = [...fixedJobCategories];
                tempJobCategories = jobCategoriesRequest.data;
                setFixedJobCategoires(tempJobCategories);
            }
        } catch (error) {
            console.error({ error });
        }
    };

    const getExpiringAndExpiredCertificates = (pages: any[]) => {
        const tempExpiringCertificates: any[] = [];
        const tempExpiredCertificates: any[] = [];

        pages.forEach((page) => {
            page.sections.forEach((section: any) => {
                section.fields.forEach((field: any) => {
                    if (field.type === "file") {
                        if (field.value) {
                            if (getCertificateTimeValidity(field.value?.[0]?.expiryDate) === "expiring") {
                                tempExpiringCertificates.push(field);
                            }
                            if (getCertificateTimeValidity(field.value?.[0]?.expiryDate) === "expired") {
                                tempExpiredCertificates.push(field);
                            }
                        }
                    }
                });
            });
        });
    };

    const toggleHideSectionRemarks = (pageIndex: number, sectionIndex: number) => {
        const tempSectionRemarksToShow = { ...sectionRemarksToShow };

        if (!tempSectionRemarksToShow[pageIndex]) {
            tempSectionRemarksToShow[pageIndex] = [];
        }

        if (!tempSectionRemarksToShow[pageIndex].includes(sectionIndex)) {
            tempSectionRemarksToShow[pageIndex].push(sectionIndex);
        } else {
            tempSectionRemarksToShow[pageIndex].splice(
                tempSectionRemarksToShow[pageIndex].indexOf(sectionIndex),
                1
            );
        }

        setSectionRemarksToShow(tempSectionRemarksToShow);
    };

    const hideAllRemarks = () => {
        setSectionRemarksToShow({});
    };

    const recommendForHold = async (reason: string) => {
        setItemBeingUpdated("hold");

        try {
            const recommendForHoldRequest = await postProtected(
                `approvals/hold/recommend/${vendorID}`,
                { reason },
                user.role
            );

            if (recommendForHoldRequest.status === "OK") {
                setShowSetReasonForHoldModal(false);
                actionCompleted();
            }
        } catch (error) { }
    };

    const actionCompleted = () => {
        setApplicationProcessed(true);

        setTimeout(() => {
            router.push("/staff/approvals");
        }, 4000);
    };

    const addServiceToServicesList = (service: any) => {
        if (
            !selectedServices.some((item: any) => {
                return item._id === service._id;
            })
        ) {
            const tempSelectedServices = [...selectedServices];
            tempSelectedServices.push(service);
            setSelectedServices(tempSelectedServices);
        }
    };

    const removeServiceFromServicesList = (serviceId: string) => {
        let tempSelectedServices = [...selectedServices];
        tempSelectedServices = tempSelectedServices.filter((item: any) => item._id !== serviceId);
        setSelectedServices(tempSelectedServices);
    };

    const dispatch = useDispatch();

    // Reusable function to invalidate approval-related cache
    const invalidateApprovalCache = () => {
        dispatch(
            staffApi.util.invalidateTags([
                "Counts",
                { type: "Tab", id: "pending-l2" },
                { type: "Tab", id: "l3" },
                { type: "Tab", id: "completed-l2" },
                { type: "Tab", id: "in-progress" },
                { type: "Tab", id: "returned" },
                { type: "Tab", id: "park-requests" },
            ])
        );
    };

    const processToStageD = async () => {
        try {
            setItemBeingUpdated("approve");
            const processToStageDRequest = await postProtected(
                `approvals/process/${vendorID}`,
                { pages, selectedServices, siteVisitRequired },
                user.role
            );

            if (processToStageDRequest.status === "OK") {
                invalidateApprovalCache();
                actionCompleted();
            }
        } catch (error) { }
    };

    return (
        <div className={styles.stageC}>
            {showSetReasonForHoldModal && (
                <Modal>
                    <div className={styles.recommendForHoldModal}>
                        <form
                            onSubmit={(e: any) => {
                                e.preventDefault();
                                recommendForHold(e.target[0].value);
                            }}
                        >
                            <h3>Recommend application for hold</h3>

                            <p>Please include a reason why this application should be held</p>

                            <textarea placeholder="Reason for hold..." rows={5}></textarea>

                            <div>
                                <button type="button" onClick={() => setShowSetReasonForHoldModal(false)}>
                                    Cancel
                                </button>
                                <button>
                                    SUBMIT {itemBeingUpdated === "hold" && <ButtonLoadingIcon />}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}

            {currentCertificateHistory.length > 0 && (
                <CertificateHistoryModal
                    clearCurrentCertificateHistory={() => clearCurrentCertificateHistory()}
                    currentCertificateHistory={currentCertificateHistory}
                />
            )}

            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <div>
                    <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>
                </div>
            </div>

            <h3 className={styles.subTitle}>Carry out Stage D</h3>

            {!applicationProcessed && (
                <>
                    <div className={styles.topNotice}>
                        <p>
                            You have been identified as a possible end user of this contractor. You need
                            to assess whether or not the contractor is suitable to be used by Amni.
                        </p>

                        <p>Please click on the relevant tabs to view the information provided by the contractor.</p>
                    </div>

                    <div className={styles.approvalContent}>
                        {pages.map((item: any, index: number) => (
                            <Accordion defaultOpen={index === 0} key={index} title={item.pageTitle}>
                                {item.sections.map((sectionItem: any, sectionIndex: number) => {
                                    if (!sectionItem.hideOnApproval && sectionHasData(sectionItem)) {
                                        return (
                                            <div key={sectionIndex} className={styles.sectionItem}>
                                                <div>
                                                    <div className={styles.sectionHeader}>
                                                        <h6>{sectionItem.title}</h6>
                                                    </div>

                                                    <div>
                                                        {sectionItem.fields.map((fieldItem: any, fieldIndex: number) =>
                                                            getFieldItemComponent(fieldItem, fieldIndex, sectionItem)
                                                        )}
                                                    </div>

                                                    <div>
                                                        {sectionItem.remarks && sectionItem.remarks.length > 0 && (
                                                            <div className={styles.showCommentTriggerDiv}>
                                                                <p onClick={() => toggleHideSectionRemarks(index, sectionIndex)}>
                                                                    SHOW COMMENTS
                                                                </p>
                                                            </div>
                                                        )}

                                                        {sectionRemarksToShow[index]?.includes(sectionIndex) && (
                                                            <div>
                                                                {sectionItem?.remarks && sectionItem?.remarks.length > 0 && (
                                                                    <div className={styles.remarksContent}>
                                                                        <p>Notes for Vendor</p>

                                                                        <div>
                                                                            {sectionItem?.remarks?.map((remarkItem: any, remarkIndex: number) => (
                                                                                <div key={remarkIndex} className={styles.remarksItem}>
                                                                                    <p>{remarkItem.remark}</p>
                                                                                    <p>
                                                                                        <span>{remarkItem.userName} </span>
                                                                                        <p>|</p>
                                                                                        <p>{moment(remarkItem.date).format("DD/MM/YYYY")}</p>
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {sectionItem?.comments && sectionItem?.comments.length > 0 && (
                                                                    <div className={styles.commentsContent}>
                                                                        <p>Comments</p>

                                                                        <div>
                                                                            {sectionItem?.comments?.map((commentItem: any, commentIndex: number) => (
                                                                                <div key={commentIndex} className={styles.remarksItem}>
                                                                                    <p>{commentItem.comment}</p>
                                                                                    <p>
                                                                                        <span>{commentItem.userName} </span>
                                                                                        <p>|</p>
                                                                                        <p>{moment(commentItem.date).format("DD/MM/YYYY")}</p>
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {sectionIndex !== item.sections.length - 1 && <hr />}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </Accordion>
                        ))}
                    </div>

                    {!showApprovalActions && (
                        <>
                            <div className={styles.bottomNotice}>
                                <p>
                                    Once you have reviewed the contractor&#39;s registration information, please click &#34;Continue&#34; to proceed to the next step.
                                </p>
                            </div>
                            <footer>
                                <button onClick={() => setShowApprovalActions(true)}>CONTINUE</button>
                            </footer>
                        </>
                    )}
                </>
            )}

            {showApprovalActions && !applicationProcessed && (
                <div className={styles.allApprovedDiv}>
                    <div className={styles.stageCApprovals}>
                        <div>
                            <div>
                                <h5>Option 1 - Progress Registration</h5>
                                <p>Select if you think this contractor would be a suitable contractor for your department.</p>

                                {approvalChoice === "approve" && (
                                    <>
                                        <div>
                                            <h6>You must select a service</h6>
                                            <p>
                                                <span>a&#41;</span> Select the type of services this contractor could provide to your department.
                                            </p>

                                            <div className={styles.selectedServicesDiv}>
                                                {selectedServices.map((item: any, index: number) => (
                                                    <div key={index}>
                                                        <label>{item.category}</label>
                                                        <Image
                                                            onClick={() => removeServiceFromServicesList(item._id)}
                                                            src={closeIconWhite}
                                                            alt="remove end user icon"
                                                            width={10}
                                                            height={10}
                                                            style={{ cursor: "pointer", marginLeft: "10px" }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <select
                                                onChange={(event) => addServiceToServicesList(JSON.parse(event.target.value))}
                                            >
                                                <option>Add services</option>

                                                {services.map((item: any, index: number) => (
                                                    <option key={index} value={JSON.stringify(item)}>
                                                        {item.category}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={styles.siteVisitRequiredDiv}>
                                            <p>
                                                <span>b&#41;</span>{" "}
                                                {`Indicate, by checking the box, if a site visit is required by an Amni Team to verify the capacity of ${approvalData.companyName}`}
                                            </p>

                                            <Image
                                                src={siteVisitRequired ? checkboxIconChecked : checkboxIconUnchecked}
                                                alt="checkbox"
                                                width={30}
                                                height={30}
                                                onClick={() => toggleSiteVisitRequiredStatus()}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <Image
                                src={approvalChoice === "approve" ? roundCheckboxIconChecked : roundCheckboxIconUnchecked}
                                alt="checkbox"
                                width={30}
                                height={30}
                                style={{ cursor: "pointer" }}
                                onClick={() => toggleApprovalChoice()}
                            />
                        </div>

                        <div>
                            <div>
                                <h5>Option 2 – Take no Further Action at this Point.</h5>

                                {approvalChoice === "complete" && (
                                    <p>
                                        If, after reviewing the information uploaded on the portal, you think that this contractor is NOT a needed or suitable contractor for your department at this time, please select this option{" "}
                                        <span>and no further action will be taken on the registration at this point. </span>
                                        A Contractor’s registration can always be progressed further at a later time.
                                    </p>
                                )}
                            </div>

                            <Image
                                src={approvalChoice === "complete" ? roundCheckboxIconChecked : roundCheckboxIconUnchecked}
                                alt="checkbox"
                                width={30}
                                height={30}
                                style={{ cursor: "pointer" }}
                                onClick={() => toggleApprovalChoice()}
                            />
                        </div>
                    </div>

                    {approvalChoice === "approve" && (
                        <button disabled={itemBeingUpdated === "approve"} onClick={() => processToStageD()}>
                            CONFIRM YOUR APPROVAL {itemBeingUpdated === "approve" && <ButtonLoadingIcon />}
                        </button>
                    )}

                    {approvalChoice === "complete" && (
                        <button
                            disabled={itemBeingUpdated === "complete"}
                            onClick={() => setShowSetReasonForHoldModal(true)}
                        >
                            SUBMIT {itemBeingUpdated === "complete" && <ButtonLoadingIcon />}
                        </button>
                    )}
                </div>
            )}

            {applicationProcessed && (
                <div className={styles.allApprovedDiv}>
                    <p>Success!</p>
                    <p>All approval actions have been completed successfully. Redirecting you to the approvals list.</p>
                </div>
            )}
        </div>
    );
};

export default StageC;
