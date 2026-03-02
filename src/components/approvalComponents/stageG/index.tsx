'use client'
import Accordion from "@/components/accordion"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import styles from "./styles/styles.module.css"

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import CertificateHistoryModal from "@/components/certificateHistory"
import ErrorText from "@/components/errorText"
import staffApi from "@/redux/apis/staffApi"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { formatNumberAsCurrency } from "@/utilities/currency"
import moment from "moment"
import Link from "next/link"
import { useDispatch, useSelector } from "react-redux"



const StageG = () => {

    const [approvalData, setApprovalData] = useState<any>({})
    const [pages, setPages] = useState([])
    const [vendorID, setVendorID] = useState("")
    const [sectionRemarksToShow, setSectionRemarksToShow] = useState({})
    const [applicationProcessed, setApplicationProcessed] = useState(false)

    const user = useSelector((state: any) => state.user)
    const [updateStatus, setUpdateStatus] = useState({
        status: "",
        message: ""
    })
    const [currentDecision, setCurrentDecision] = useState("")
    const router = useRouter()
    const [actionResponse, setActionResponse] = useState({
        title: "",
        body: "",
        actionResponseCode: 0
    })
    const [updating, setUpdating] = useState(false)
    const [revertReason, setRevertReason] = useState("")
    const [errorText, setErrorText] = useState("")
    const params = useParams()
    const [vendorData, setVendorData] = useState({
        approvalData: {},
        pages: []
    })

    const [currentCertificateHistory, setCurrentCertificateHistory] = useState([])

    const setActionResponseObject = (title, body, actionResponseCode) => {
        setActionResponse({
            title,
            body,
            actionResponseCode
        })
    }

    useEffect(() => {
        if (params.id) {
            fetchVendorData(params.id)
        }
    }, [params])

    const fetchVendorData = async (vendorID) => {
        setVendorID(vendorID)
        try {
            const fetchVendorDataRequest = await getProtected(`companies/approval-data/${vendorID}`, user.role)

            if (fetchVendorDataRequest.status === "OK") {
                const tempVendorData = { ...vendorData }
                tempVendorData.approvalData = fetchVendorDataRequest.data.approvalData
                tempVendorData.pages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setVendorData(tempVendorData)

                let tempPages = [...pages]
                tempPages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setPages(tempPages)

                let tempApprovalData = { ...approvalData }
                tempApprovalData = fetchVendorDataRequest.data.approvalData
                setApprovalData(tempApprovalData)
            }

        } catch (error) {
            console.error({ error });
        }
    }

    const getCertificateTimeValidity = expiryDate => {
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

    const setHistoryAsCurrentCertificateHistory = (certificateHistory) => {
        let tempCurrentCertificateHistory = [...currentCertificateHistory]
        tempCurrentCertificateHistory = certificateHistory
        setCurrentCertificateHistory(tempCurrentCertificateHistory)
    }

    const clearCurrentCertificateHistory = () => {
        setCurrentCertificateHistory([])
    }

    const hasFieldValue = (field) => {
        if (field.value === null || field.value === undefined) return false;
        if (typeof field.value === "string" && field.value.trim() === "") return false;
        if (Array.isArray(field.value) && field.value.length === 0) return false;
        if (typeof field.value === "object" && !Array.isArray(field.value)) {
            if (Object.keys(field.value).length === 0) return false;
        }
        return true;
    }

    const sectionHasData = (section) => {
        return section.fields.some(field => hasFieldValue(field));
    }

    const getFieldItemComponent = (field, index, section) => {
        if (!hasFieldValue(field)) return null;

        switch (field.type) {
            case "shortText":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            {typeof field.value !== "string" ? <div></div> :
                                field.textType === "number" && field.isCurrency ? (
                                    (() => {
                                        const currencyField = section.fields.find(f => f.label === "Currency");
                                        const selectedCurrency = currencyField?.value || "Naira (NGN)";
                                        return <p>{formatNumberAsCurrency(field.value, selectedCurrency)}</p>;
                                    })()
                                ) : field.textType === "number" ? (
                                    <p>{field.value}</p>
                                ) : (
                                    <p>{field?.value?.e164Number ? field.value.number : field.value}</p>
                                )
                            }
                        </p>
                    </div>
                </div>
            case "longText":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field.value}</p>
                        </p>
                    </div>
                </div>
            case "dropDown":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field.value}</p>
                        </p>
                    </div>
                </div>
            case "date":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field.value ? moment(field.value).format("YYYY-MM-DD") : ""}</p>
                        </p>
                    </div>
                </div>
            case "file":
                if (field.value) {
                    return <div key={index} className={styles.fieldItem}>
                        <div>
                            <div className={styles.fieldData}>
                                <label>{`${field.label}:`}</label>
                                {field?.value[0]?.url && (
                                    <div>
                                        <Link href={field?.value[0]?.url} target="_blank"><p>View</p></Link>
                                    </div>
                                )}
                                {field.hasExpiryDate && field.history && (
                                    <a style={{ marginLeft: "20px" }} onClick={() => setHistoryAsCurrentCertificateHistory(field.history)}>Certificate History</a>
                                )}
                            </div>
                        </div>
                        {field.isACertificate && <>
                            {field?.value[0]?.expiryDate && (
                                <p className={styles.expiryDateText}>{`Expiry date: ${field.value[0].expiryDate}`}</p>
                            )}
                            {field.value && field?.value[0]?.expiryDate && <>
                                {getCertificateTimeValidity(field?.value[0]?.expiryDate) === "expired" && (
                                    <p className={styles.certificateExpiredText}>Certificate has expired</p>
                                )}
                                {getCertificateTimeValidity(field?.value[0]?.expiryDate) === "expiring" && (
                                    <p className={styles.certificateToExpireText}>Certificate will soon expire</p>
                                )}
                            </>}
                        </>}
                    </div>
                }
                break;
            case "multiSelectText":
                return <div className={styles.fieldItem}>
                    <p className={styles.fieldData}>
                        <label>{`${field.label}:`}</label>
                        {field.value?.length > 0 && (
                            <p className={styles.multiSelectTextValues}>
                                {field?.value?.map((item, index) => <p key={index}>{item.label}</p>)}
                            </p>
                        )}
                    </p>
                </div>
        }
    }

    const toggleHideSectionRemarks = (pageIndex, sectionIndex) => {
        const tempSectionRemarksToShow = { ...sectionRemarksToShow }

        if (!tempSectionRemarksToShow[pageIndex]) {
            tempSectionRemarksToShow[pageIndex] = []
        }

        if (!tempSectionRemarksToShow[pageIndex].includes(sectionIndex)) {
            tempSectionRemarksToShow[pageIndex].push(sectionIndex)
        } else {
            tempSectionRemarksToShow[pageIndex].splice(tempSectionRemarksToShow[pageIndex].indexOf(sectionIndex), 1)
        }

        setSectionRemarksToShow(tempSectionRemarksToShow)
    }

    const hideAllRemarks = () => {
        setSectionRemarksToShow({})
    }

    const dispatch = useDispatch();

    const invalidateApprovalCache = () => {
        dispatch(staffApi.util.invalidateTags([
            'Counts',
            { type: 'Tab', id: 'pending-l2' },
            { type: 'Tab', id: 'l3' },
            { type: 'Tab', id: 'completed-l2' },
            { type: 'Tab', id: 'in-progress' },
            { type: 'Tab', id: 'returned' },
            { type: 'Tab', id: 'park-requests' }
        ]));
    };

    const approveToL3 = async () => {
        if (!updating) {
            try {
                setUpdating(true)
                const approveToL3Request = await postProtected(`approvals/process/${vendorID}`, {
                    pages
                }, user.role)

                if (approveToL3Request.status === "OK") {
                    invalidateApprovalCache();
                    postActionCompleted("Vendor approved for L3", `${approvalData.companyName} has been approved for L3. Returning to the vendors list.`, 1)
                } else {
                    setUpdating(false)
                    setErrorText(approveToL3Request.error.message)
                }

            } catch (error) {
                setUpdating(false)
            }
        }
    }

    const returnToStageF = async () => {
        try {
            const returnToStageFRequest = await postProtected(`approvals/revert/${vendorID}`, {
                revertReason
            }, user.role)

            if (returnToStageFRequest.status === "OK") {
                postActionCompleted("Vendor application returned", `${approvalData.companyName}'s application has been returned to the C&P Department for further review.`, 1)
            } else {
                setUpdating(false)
                setErrorText(returnToStageFRequest.error.message)
            }

        } catch (error) {
            console.error({ error })
        }
    }

    const postActionCompleted = (title, message, actionResponseCode) => {
        setActionResponseObject(title, message, actionResponseCode)

        setTimeout(() => {
            router.push("/staff/approvals")
        }, 5000)
    }

    return (
        <div className={styles.stageG}>
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

            <h3 className={styles.subTitle}>Management Approval — Final Review by GCOO</h3>

            {approvalData?.flags?.approvals && !actionResponse.actionResponseCode && (() => {
                const approvals = approvalData.flags.approvals;
                const levelApprovals = [];

                const stageInfo = [
                    { name: 'A to B', description: 'Contractor Submission' },
                    { name: 'B to C', description: 'VMO Document Review' },
                    { name: 'C to D', description: 'C&P Supervisor/HOD Review' },
                    { name: 'D to E', description: 'End-User Review' },
                    { name: 'E to F', description: 'VMO Due Diligence Review' },
                    { name: 'F to G', description: 'C&P HOD Due Diligence Review' },
                ];

                for (let i = 0; i <= 5; i++) {
                    const levelKey = `level${i}`;
                    if (approvals[levelKey] && approvals[levelKey].approved) {
                        levelApprovals.push({
                            level: i,
                            stage: stageInfo[i]?.name || `Level ${i}`,
                            description: stageInfo[i]?.description || '',
                            approver: approvals[levelKey].approver,
                            date: approvals[levelKey].date
                        });
                    }
                }

                if (levelApprovals.length === 0) return null;

                return (
                    <div className={styles.approvalHistoryDiv}>
                        <h4>Approval History</h4>
                        <div className={styles.approvalHistoryList}>
                            {levelApprovals.map((approval, index) => (
                                <div key={index} className={styles.approvalHistoryItem}>
                                    <div className={styles.stageColumn}>
                                        <span className={styles.stageLabel}>Stage:</span>
                                        <span className={styles.stageValue}>{approval.stage}</span>
                                    </div>
                                    <div className={styles.descriptionColumn}>
                                        <span className={styles.descriptionValue}>{approval.description}</span>
                                    </div>
                                    <div className={styles.approverColumn}>
                                        <span className={styles.approverLabel}>Approver:</span>
                                        <span className={styles.approverValue}>{approval.approver?.name || 'Unknown'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {actionResponse.actionResponseCode === 1 && (
                <div className={styles.allApprovedDiv}>
                    <h4>{actionResponse.title}</h4>
                    <p>{actionResponse.body}</p>
                </div>
            )}

            {errorText && <ErrorText text={errorText} />}

            {!actionResponse.actionResponseCode && <>
                <div className={styles.managementDecisionDiv}>
                    <div>
                        <span>GCOO Management Decision</span>
                    </div>
                    <div>
                        <select onChange={(event) => setCurrentDecision(event.target.value)}>
                            <option selected disabled>Select a decision</option>
                            <option value={"approve"}>Approve and Add To Approved Contractors List</option>
                            <option value={"return"}>Return to C&P HOD for further review</option>
                        </select>
                    </div>
                </div>

                {currentDecision === "approve" && (
                    <div className={styles.approveDecisionDiv}>
                        <button disabled={updating} onClick={() => approveToL3()}>
                            APPROVE {updating && <ButtonLoadingIcon />}
                        </button>
                    </div>
                )}

                {currentDecision === "return" && (
                    <div className={styles.returnDecisionDiv}>
                        <div>
                            <span>Please indicate the reason for return</span>
                        </div>
                        <div>
                            <textarea
                                rows={5}
                                placeholder="Notes for C&P HOD"
                                onChange={(event) => setRevertReason(event.target.value)}
                            ></textarea>
                            <div>
                                <button onClick={() => returnToStageF()}>
                                    RETURN {updating && <ButtonLoadingIcon />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!applicationProcessed && (
                    <div className={styles.approvalContent}>
                        {pages.map((item, index) => (
                            <Accordion defaultOpen={true} key={index} title={item.pageTitle}>
                                {item.sections.map((sectionItem, sectionIndex) => {
                                    if (!sectionItem.hideOnApproval && sectionHasData(sectionItem)) {
                                        return (
                                            <div key={sectionIndex} className={styles.sectionItem}>
                                                <div>
                                                    <div className={styles.sectionHeader}>
                                                        <h6>{sectionItem.title}</h6>
                                                    </div>
                                                    <div>
                                                        {sectionItem.fields.map((fieldItem, fieldIndex) =>
                                                            getFieldItemComponent(fieldItem, fieldIndex, sectionItem)
                                                        )}
                                                    </div>
                                                    <div>
                                                        {sectionItem.remarks && sectionItem.remarks.length > 0 && (
                                                            <div className={styles.showCommentTriggerDiv}>
                                                                <p onClick={() => toggleHideSectionRemarks(index, sectionIndex)}>SHOW COMMENTS</p>
                                                            </div>
                                                        )}
                                                        {sectionRemarksToShow[index]?.includes(sectionIndex) && (
                                                            <div>
                                                                {sectionItem?.remarks && sectionItem?.remarks.length > 0 && (
                                                                    <div className={styles.remarksContent}>
                                                                        <p>Notes for Vendor</p>
                                                                        <div>
                                                                            {sectionItem?.remarks?.map((remarkItem, remarkIndex) => (
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
                                                                            {sectionItem?.comments?.map((commentItem, commentIndex) => (
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
                                        )
                                    }
                                })}
                            </Accordion>
                        ))}
                    </div>
                )}
            </>}
        </div>
    )
}

export default StageG
