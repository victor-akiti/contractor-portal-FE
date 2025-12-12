'use client'
import closeIcon from "@/assets/images/closeGrey.svg"
import Accordion from "@/components/accordion"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"


import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import CertificateHistoryModal from "@/components/certificateHistory"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import moment from "moment"
import Image from "next/image"
import Link from "next/link"
import { useSelector } from "react-redux"



const StageX = () => {

    const [approvalData, setApprovalData] = useState<any>({})
    const [pages, setPages] = useState([])
    const [selectedCategories, setSelectedCategories] = useState([])
    const [vendorID, setVendorID] = useState("")
    const [sectionRemarksToShow, setSectionRemarksToShow] = useState({

    })
    const [showCategoriesList, setShowCategoriesList] = useState(false)
    const [jobCategories, setJobCategories] = useState([])
    const [fixedJobCategories, setFixedJobCategoires] = useState([])
    const [updatingVendorCategories, setUpdatingVendorCategories] = useState(false)
    const [currentVendorCategories, setCurrentVendorCategories] = useState([])
    const [showAddCategory, setShowAddCategory] = useState(false)
    const categoriesListDivRef = useRef(null)
    const [applicationProcessed, setApplicationProcessed] = useState(false)

    const user = useSelector((state: any) => state.user)
    const [itemBeingUpdated, setItemBeingUpdated] = useState("")
    const [updateStatus, setUpdateStatus] = useState({
        status: "",
        message: ""
    })
    const [currentDecision, setCurrentDecision] = useState("")
    const router = useRouter()


    const params = useParams()
    const [vendorData, setVendorData] = useState({
        approvalData: {},
        pages: []
    })




    useEffect(() => {
        if (params.id) {
            fetchVendorData(params.id)
        }
    }, [params])

    const fetchVendorData = async (vendorID) => {
        setVendorID(vendorID)
        try {
            const fetchVendorDataRequest = await getProtected(`companies//approval-data/${vendorID}`, user.role)



            if (fetchVendorDataRequest.status === "OK") {
                const tempVendorData = { ...vendorData }
                tempVendorData.approvalData = fetchVendorDataRequest.data.approvalData
                tempVendorData.pages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setVendorData(tempVendorData)

                let tempPages = [...pages]
                tempPages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setPages(tempPages)

                if (fetchVendorDataRequest.data.approvalData.jobCategories) {
                    let tempSelectedCategories = [...selectedCategories]
                    tempSelectedCategories = fetchVendorDataRequest.data.approvalData.jobCategories
                    setSelectedCategories(tempSelectedCategories)

                    let tempCurrentCategories = [...currentVendorCategories]
                    tempCurrentCategories = fetchVendorDataRequest.data.approvalData.jobCategories
                    setCurrentVendorCategories(tempCurrentCategories)
                }

                let tempApprovalData = { ...approvalData }
                tempApprovalData = fetchVendorDataRequest.data.approvalData
                setApprovalData(tempApprovalData)

                getExpiringAndExpiredCertificates(tempPages)
            }



        } catch (error) {
            console.error({ error });
        }
    }






    const getCertificateTimeValidity = expiryDate => {
        const currentDateObject = new Date()
        const expiryDateObject = new Date(expiryDate)


        if (currentDateObject.getTime() >= expiryDateObject.getTime()) {
            // let tempExpiredCertificates = [...expiredCertificates]
            // tempExpiredCertificates.push(expiryDate)
            // setExpiredCertificates(tempExpiredCertificates)

            return "expired"
        } else if ((expiryDateObject.getTime() - currentDateObject.getTime()) / 1000 < 7884000) {
            // let tempExpiringCertificates = [...expiringCertificates]
            // tempExpiringCertificates.push(expiryDate)
            // setExpiringCertificates(tempExpiringCertificates)   
            return "expiring"
        } else {
            return ""
        }
    }

    const addCategoryToSelectedCategories = (category) => {
        const tempSelectedCategories = [...selectedCategories]

        //Check if category is already selected
        if (tempSelectedCategories.some(selectedCategory => selectedCategory.category === category.category)) {
            return
        } else {
            tempSelectedCategories.push({
                category: category.category,
                addedBy: {
                    name: user?.user?.name,
                    _id: user?.user?._id
                }
            })
            setSelectedCategories(tempSelectedCategories)

        }

    }


    const filterCategoriesListByQueryString = (queryString) => {
        let tempCategoriesList = [...fixedJobCategories]


        tempCategoriesList = tempCategoriesList.filter(item => item.category.toLowerCase().includes(queryString.toLowerCase()))

        setJobCategories(tempCategoriesList)
    }

    const removeCategoryFromSelectedCategories = (category) => {
        let tempSelectedCategories = [...selectedCategories]
        tempSelectedCategories = tempSelectedCategories.filter(selectedCategory => selectedCategory.category !== category.category)
        setSelectedCategories(tempSelectedCategories)
    }

    const deleteCategoryFromCategoriesList = (category) => {
        let tempSelectedCategories = [...selectedCategories]

        if (tempSelectedCategories.some(selectedCategory => selectedCategory.category === category.category)) {
            tempSelectedCategories = tempSelectedCategories.filter(selectedCategory => selectedCategory.category !== category.category)
        }

        setSelectedCategories(tempSelectedCategories)

        let tempCurrentCategories = [...currentVendorCategories]

        tempCurrentCategories = tempCurrentCategories.filter(currentCategory => currentCategory.category !== category.category)

        setCurrentVendorCategories(tempCurrentCategories)

        updateVendorCategories(tempSelectedCategories)
    }

    const [currentCertificateHistory, setCurrentCertificateHistory] = useState([])

    const setHistoryAsCurrentCertificateHistory = (certificateHistory) => {
        let tempCurrentCertificateHistory = [...currentCertificateHistory]
        tempCurrentCertificateHistory = certificateHistory
        setCurrentCertificateHistory(tempCurrentCertificateHistory)
    }

    const clearCurrentCertificateHistory = () => {
        let tempCurrentCertificateHistory = [...currentCertificateHistory]
        tempCurrentCertificateHistory = []
        setCurrentCertificateHistory(tempCurrentCertificateHistory)
    }


    const getFieldItemComponent = (field, index) => {
        switch (field.type) {
            case "shortText":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field?.value?.e164Number ? field.value.number : field.value}</p>
                        </p>
                    </div>

                    {
                        field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                    }
                </div>
            case "longText":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field.value}</p>
                        </p>
                    </div>

                    {
                        field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                    }
                </div>
            case "dropDown":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field.value}</p>
                        </p>
                    </div>

                    {
                        field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                    }
                </div>
            case "date":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>
                            <p>{field.value ? moment(field.value).format("YYYY-MM-DD") : ""}</p>
                        </p>
                    </div>

                    {
                        field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                    }
                </div>
            case "file":
                if (field.value) {
                    return <div key={index} className={styles.fieldItem}>
                        <div>
                            <div className={styles.fieldData}>
                                <label>{`${field.label}:`}</label>
                                <div>
                                    <Link href={field?.value[0]?.url} target="_blank"><p>View</p></Link>
                                </div>

                                {
                                    field.hasExpiryDate && field.history && <a style={{ marginLeft: "20px" }} onClick={() => setHistoryAsCurrentCertificateHistory(field.history)}>Certificate History</a>
                                }
                            </div>
                        </div>

                        {
                            field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                        }

                        {
                            field.isACertificate && <>
                                {
                                    field.value[0].expiryDate && <p className={styles.expiryDateText}>{`Expiry date: ${field.value[0].expiryDate}`}</p>
                                }

                                {
                                    field.value && field.value[0].expiryDate && <>

                                        {
                                            getCertificateTimeValidity(field.value[0].expiryDate) === "expired" && <p className={styles.certificateExpiredText}>Certificate has expired</p>
                                        }

                                        {
                                            getCertificateTimeValidity(field.value[0].expiryDate) === "expiring" && <p className={styles.certificateToExpireText}>Certificate will soon expire</p>
                                        }


                                    </>
                                }


                            </>
                        }
                    </div>
                }
                break;
            case "multiSelectText":
                return <div className={styles.fieldItem}>
                    <p className={styles.fieldData}>
                        <label>{`${field.label}:`}</label>
                        {
                            field.value?.length > 0 && <p className={styles.multiSelectTextValues}>{field?.value?.map((item, index) => <p key={index}>{item.label}</p>)}</p>
                        }
                    </p>
                </div>



        }
    }



    useEffect(() => {
        fetchJobCategories()
    }, [pages])

    const fetchJobCategories = async () => {
        try {
            const jobCategoriesRequest = await getProtected("jobCategories", user.role)


            if (jobCategoriesRequest.status === "OK") {

                let tempJobCategories = [...jobCategories]
                tempJobCategories = jobCategoriesRequest.data
                setJobCategories(tempJobCategories)

                tempJobCategories = [...fixedJobCategories]
                tempJobCategories = jobCategoriesRequest.data
                setFixedJobCategoires(tempJobCategories)


            }

        } catch (error) {
            console.error({ error });

        }
    }


    const getExpiringAndExpiredCertificates = (pages) => {
        const tempExpiringCertificates = []
        const tempExpiredCertificates = []

        pages.forEach((page, pageIndex) => {
            page.sections.forEach((section, sectionIndex) => {
                section.fields.forEach((field, fieldIndex) => {

                    if (field.type === "file") {

                        if (field.value) {

                            if (getCertificateTimeValidity(field.value[0].expiryDate) === "expiring") {
                                tempExpiringCertificates.push(field)
                            }
                            if (getCertificateTimeValidity(field.value[0].expiryDate) === "expired") {
                                tempExpiredCertificates.push(field)
                            }
                        }
                    }
                })
            })
        })


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

    const clearSelectedCategories = () => {
        let tempSelectedCategories = [...selectedCategories]

        tempSelectedCategories = []

        setSelectedCategories(tempSelectedCategories)
    }

    const updateVendorCategories = async (updateCategories) => {
        setUpdatingVendorCategories(true)
        try {
            const updateVendorCategoriesRequest = await putProtected(`companies/job-categories/${vendorID}`, {
                categories: updateCategories ? updateCategories : selectedCategories
            }, user.role)

            setUpdatingVendorCategories(false)

            if (updateVendorCategoriesRequest.status === "OK") {
                // setVendorCategories(updateVendorCategoriesRequest.data.categories)
                let tempCurrentVendorCategories = [...currentVendorCategories]

                tempCurrentVendorCategories = updateVendorCategoriesRequest.data

                setCurrentVendorCategories(tempCurrentVendorCategories)
            }



        } catch (error) {
            console.error({ error })
        }
    }

    const toggleShowAddCategory = () => {
        setShowAddCategory(!showAddCategory)
    }



    const approveParkRequest = async () => {
        try {
            updateUpdateStatus("approving")
            const approveRequest = await getProtected(`approvals/hold/approve/${vendorID}`, user.role)

            if (approveRequest.status === "OK") {
                updateUpdateStatus("park action success", "Vendor application parked")

                const tempApprovalData = { ...approvalData }
                tempApprovalData.flags.status = "parked"
                setApprovalData(tempApprovalData)
            } else {
                updateUpdateStatus("park action error", approveRequest.error.message)
            }
        } catch (error) {
            console.error({ error })
        }
    }

    const rejectParkRequestAndRevertToL2 = async (from) => {

        try {
            updateUpdateStatus("rejecting")
            const revertRequest = await postProtected(`approvals/revert/l2/${vendorID}`, { from }, user.role)

            if (revertRequest.status === "OK") {
                updateUpdateStatus("park action success", "Park request declined. Vendor has been moved back to pending L2.")

                const tempApprovalData = { ...approvalData }
                tempApprovalData.flags.status = "pending"
                setApprovalData(tempApprovalData)
            } else {
                updateUpdateStatus("park action error", revertRequest.error.message)
            }


        } catch (error) {
            console.error({ error })
        }
    }

    //   const declineParkRequest = async () => {
    //     try {
    //         updateUpdateStatus("rejecting")
    //       const declineRequest = await getProtected(`approvals/hold/cancel/${vendorID}`)

    //       


    //       if (declineRequest.status === "OK") {
    //         updateUpdateStatus("park action success", "Park request declined. Vendor has been moved back to pending L2.")

    //         let tempApprovalData = {...approvalData}
    //         tempApprovalData.flags.status = "pending"
    //         setApprovalData(tempApprovalData)
    //       } else {
    //         updateUpdateStatus("park action error", declineRequest.error.message)
    //       }
    //     } catch (error) {
    //       console.error({error})
    //     }
    //   }

    const updateUpdateStatus = (status, message = "") => {
        const tempUpdateStatus = { ...updateStatus }
        tempUpdateStatus.status = status
        tempUpdateStatus.message = message
        setUpdateStatus(tempUpdateStatus)
    }





    return (
        <div className={styles.stageF}>
            {
                currentCertificateHistory.length > 0 && <CertificateHistoryModal clearCurrentCertificateHistory={() => clearCurrentCertificateHistory()} currentCertificateHistory={currentCertificateHistory} />
            }

            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <div>

                    <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>
                </div>




            </div>

            <h3 className={styles.subTitle}>Consider Contractor for Approved Contractors List</h3>

            <div className={styles.executiveApproverMainDiv}>
                <div>
                    <span>Executive Approver Decision</span>
                </div>

                <div>
                    <select onChange={(event) => setCurrentDecision(event.target.value)}>
                        <option selected disabled>Select a decision</option>
                        <option value={"approve"}>Add To Approved Contractors List</option>
                        <option value={"return"}>Return to C&P for additional research</option>
                        <option value={"complete"}>Do NOT consider contractor for now</option>
                    </select>
                </div>
            </div>

            {
                currentDecision === "approve" && <div className={styles.approveDecisionDiv}>
                    <button>APPROVE</button>
                </div>
            }

            {
                currentDecision === "return" && <div className={styles.returnDecisionDiv}>
                    <div>
                        <span>Please indicate research required</span>
                    </div>

                    <div>
                        <textarea rows={5} placeholder="Notes for Vendor"></textarea>

                        <div>
                            <button>RETURN</button>
                        </div>
                    </div>
                </div>
            }

            {
                currentDecision === "complete" && <div className={styles.completeL2DecisionDiv}>
                    <div>

                    </div>

                    <div>
                        <p>Complete registration for now without adding to &#39;Approved Contractors&#39; list.</p>

                        <div>
                            <button>COMPLETE</button>
                        </div>
                    </div>
                </div>
            }




            {
                !applicationProcessed && <>
                    <div className={styles.approvalContent}>

                        {
                            pages.map((item, index) => <Accordion defaultOpen={true} key={index} title={item.pageTitle}>
                                {
                                    item.sections.map((sectionItem, sectionIndex) => {
                                        if (!sectionItem.hideOnApproval) {
                                            return <div key={sectionIndex} className={styles.sectionItem}>
                                                <div>
                                                    <div className={styles.sectionHeader}>
                                                        <h6>{sectionItem.title}</h6>


                                                    </div>

                                                    <div>
                                                        {
                                                            sectionItem.fields.map((fieldItem, fieldIndex) => getFieldItemComponent(fieldItem, fieldIndex))
                                                        }
                                                    </div>

                                                    <div>


                                                        {
                                                            (sectionItem.remarks && sectionItem.remarks.length > 0) && <div className={styles.showCommentTriggerDiv}>
                                                                <p onClick={() => toggleHideSectionRemarks(index, sectionIndex)}>SHOW COMMENTS</p>
                                                            </div>
                                                        }

                                                        {
                                                            sectionRemarksToShow[index]?.includes(sectionIndex) && <div>
                                                                {
                                                                    sectionItem?.remarks && sectionItem?.remarks.length > 0 && <div className={styles.remarksContent}>
                                                                        <p>Notes for Vendor</p>

                                                                        <div>
                                                                            {
                                                                                sectionItem?.remarks?.map((remarkItem, remarkIndex) => <div key={remarkIndex} className={styles.remarksItem}>
                                                                                    <p>{remarkItem.remark}</p>
                                                                                    <p><span>{remarkItem.userName} </span><p>|</p> <p>{moment(remarkItem.date).format("DD/MM/YYYY")}</p></p>
                                                                                </div>)
                                                                            }
                                                                        </div>

                                                                    </div>
                                                                }

                                                                {
                                                                    sectionItem?.comments && sectionItem?.comments.length > 0 && <div className={styles.commentsContent}>
                                                                        <p>Comments</p>

                                                                        <div>
                                                                            {
                                                                                sectionItem?.comments?.map((commentItem, commentIndex) => <div key={commentIndex} className={styles.remarksItem}>
                                                                                    <p>{commentItem.comment}</p>
                                                                                    <p><span>{commentItem.userName} </span><p>|</p> <p>{moment(commentItem.date).format("DD/MM/YYYY")}</p></p>
                                                                                </div>)
                                                                            }
                                                                        </div>

                                                                    </div>
                                                                }
                                                            </div>
                                                        }
                                                    </div>



                                                    {
                                                        sectionIndex !== item.sections.length - 1 && <hr />
                                                    }
                                                </div>

                                            </div>
                                        }
                                    })
                                }
                            </Accordion>)
                        }

                    </div>

                    <div className={styles.approvalContent}>
                        <Accordion defaultOpen={true} title={"Contractor Categorization"}>
                            <div className={styles.sectionItem}>
                                <div className={styles.contractorCategorizationDiv}>
                                    <p onClick={() => toggleShowAddCategory()}>+ ADD CATEGORY</p>

                                    {
                                        showAddCategory && <>
                                            <p>Select the type of services you would consider this Contractor could provide to Amni.</p>

                                            <div ref={categoriesListDivRef}>
                                                <div className={styles.selectedCategoriesList}>
                                                    {
                                                        selectedCategories.map((item, index) => <div key={index} className={styles.selectedCategoriesItem}>
                                                            <div ><Image src={closeIcon} alt="close icon" width={10} height={10} onClick={() => removeCategoryFromSelectedCategories(item)} style={{ cursor: "pointer" }} /></div>
                                                            <p>{item.category}</p>

                                                        </div>)
                                                    }
                                                </div>
                                                <input placeholder="Select Job Categories" onClick={() => setShowCategoriesList(true)} onChange={(e) => filterCategoriesListByQueryString(e.target.value)} />

                                                <Image src={closeIcon} alt="close icon" width={10} height={10} onClick={() => { clearSelectedCategories() }} style={{ cursor: "pointer" }} />

                                                {
                                                    showCategoriesList && <div className={styles.jobCategoryList} >
                                                        {
                                                            jobCategories.map((item, index) => <div key={index} className={styles.jobCategoryItem}>
                                                                <p onClick={() => addCategoryToSelectedCategories(item)}>{item.category}</p>
                                                            </div>)
                                                        }
                                                    </div>
                                                }
                                            </div>

                                            <button className={styles.saveCategoriesButton} onClick={() => updateVendorCategories(null)}>Save {updatingVendorCategories && <ButtonLoadingIcon />}</button>
                                        </>
                                    }

                                    <table className={styles.currentCategoriesList}>
                                        <tbody>
                                            {
                                                currentVendorCategories.map((item, index) => <tr key={index}>
                                                    <td>{item.category}</td>
                                                    <td onClick={() => deleteCategoryFromCategoriesList(item)}>Delete</td>
                                                    <td>{`Added by: ${item?.addedBy?.name}`}</td>
                                                </tr>)
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Accordion>
                    </div>


                </>
            }

            <div className={styles.allApprovedDiv}>

            </div>


        </div>
    )
}

export default StageX