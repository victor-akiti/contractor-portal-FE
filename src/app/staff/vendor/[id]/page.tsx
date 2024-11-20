'use client'
import { useEffect, useMemo, useRef, useState } from "react"
import checkedBox from "@/assets/images/checkedBox.svg"
import uncheckedBox from "@/assets/images/uncheckedBox.svg"
import styles from "./styles/styles.module.css"
import { useParams, usePathname, useRouter } from "next/navigation"
import Accordion from "@/components/accordion"
import closeIcon from "@/assets/images/closeGrey.svg"


import Image from "next/image"
import Link from "next/link"
import moment from "moment"
import Modal from "@/components/modal"
import { useSelector } from "react-redux"
import { getProtected } from "@/requests/get"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { putProtected } from "@/requests/put"
import { postProtected } from "@/requests/post"
import ButtonLoadingIconPrimary from "@/components/buttonLoadingPrimary"
import SuccessMessage from "@/components/successMessage"
import ErrorText from "@/components/errorText"



const ViewVendorPage = () => {
    
    const [approvalData, setApprovalData] = useState<any>({})
    const [pages, setPages] = useState([])
    const [selectedCategories, setSelectedCategories] = useState([])
    const [vendorID, setVendorID] = useState("")
    const [sectionRemarksToShow, setSectionRemarksToShow] = useState({

    })
    const [showCategoriesList, setShowCategoriesList] = useState(false)
    const [expiringCertificates, setExpiringCertificates] = useState([])
    const [expiredCertificates, setExpiredCertificates] = useState([])
    const [jobCategories, setJobCategories] = useState([])
    const [fixedJobCategories, setFixedJobCategoires] = useState([])
    const [updatingVendorCategories, setUpdatingVendorCategories] = useState(false)
    const [currentVendorCategories, setCurrentVendorCategories] = useState([])
    const [showAddCategory, setShowAddCategory] = useState(false)
    const categoriesListDivRef = useRef(null)
    const [applicationProcessed, setApplicationProcessed] = useState(false)
    console.log({pages});
    const user = useSelector((state:any) => state.user)
    const [itemBeingUpdated, setItemBeingUpdated] = useState("")
    const [updateStatus, setUpdateStatus] = useState({
        status: "",
        message: ""
    })
    const router = useRouter()
    
    console.log({user});
    const params = useParams()
    const [vendorData, setVendorData] = useState({
        approvalData:{},
        pages: []
    })
    

    console.log({pathname: params.id});
    
    useEffect(() => {
        if (params.id) {
            fetchVendorData(params.id)
        }
    }, [params])

    const fetchVendorData = async (vendorID) => {
        setVendorID(vendorID)
        try {
            const fetchVendorDataRequest = await getProtected(`companies//approval-data/${vendorID}`)

            console.log({fetchVendorDataRequest});

            if (fetchVendorDataRequest.status === "OK") {
                let tempVendorData = {...vendorData}
                tempVendorData.approvalData = fetchVendorDataRequest.data.approvalData
                tempVendorData.pages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setVendorData(tempVendorData)

                let tempPages = [...pages]
                tempPages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setPages(tempPages)

                if (fetchVendorDataRequest.data.approvalData.jobCategories) {
                    let tempSelectedCategories  = [...selectedCategories]
                tempSelectedCategories = fetchVendorDataRequest.data.approvalData.jobCategories
                setSelectedCategories(tempSelectedCategories)

                let tempCurrentCategories = [...currentVendorCategories]
                tempCurrentCategories = fetchVendorDataRequest.data.approvalData.jobCategories
                setCurrentVendorCategories(tempCurrentCategories)
                }

                let tempApprovalData = {...approvalData}
                tempApprovalData = fetchVendorDataRequest.data.approvalData
                setApprovalData(tempApprovalData)

                getExpiringAndExpiredCertificates(tempPages)
            }

            
            
        } catch (error) {
            console.log({error});
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
        } else if ((expiryDateObject.getTime() - currentDateObject.getTime())/1000 < 7884000) {
            // let tempExpiringCertificates = [...expiringCertificates]
            // tempExpiringCertificates.push(expiryDate)
            // setExpiringCertificates(tempExpiringCertificates)   
            return "expiring"
        } else {
            return ""
        }
    }

    const addCategoryToSelectedCategories = (category) => {
        let tempSelectedCategories = [...selectedCategories]

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
        console.log({fixedJobCategories});
        
        tempCategoriesList  = tempCategoriesList.filter(item => item.category.toLowerCase().includes(queryString.toLowerCase()))

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
    

    const getFieldItemComponent = (field, index) => {
        switch (field.type) {
            case "shortText": 
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
            case "date":
                return <div key={index} className={styles.fieldItem}>
                <div>
                    <p className={styles.fieldData}>
                        <label>{`${field.label}:`}</label>
                        <p>{moment(field.value).format("MMMM Do YYYY")}</p>
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

                            <a style={{marginLeft: "20px"}}>Certificate History</a>
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
            case "multiSelectText":
                return <div className={styles.fieldItem}>
                    <p className={styles.fieldData}>
                    <label>{`${field.label}:`}</label>
                    {
                        field.value.length > 0 && <p className={styles.multiSelectTextValues}>{field?.value?.map((item, index) => <p key={index}>{item.label}</p>)}</p>
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
            const jobCategoriesRequest = await getProtected("jobCategories")
            console.log({jobCategoriesRequest});

            if (jobCategoriesRequest.status === "OK") {

                let tempJobCategories = [...jobCategories]
                tempJobCategories = jobCategoriesRequest.data
                setJobCategories(tempJobCategories)

                tempJobCategories = [...fixedJobCategories]
                tempJobCategories = jobCategoriesRequest.data
                setFixedJobCategoires(tempJobCategories)


            }
            
        } catch (error) {
            console.log({error});
            
        }
    }


    const getExpiringAndExpiredCertificates = (pages) => {
        let tempExpiringCertificates = []
        let tempExpiredCertificates = []

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

        setExpiringCertificates(tempExpiringCertificates)
        setExpiredCertificates(tempExpiredCertificates)
    }




    const toggleHideSectionRemarks = (pageIndex, sectionIndex) => {
        let tempSectionRemarksToShow = {...sectionRemarksToShow}

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
            })

            setUpdatingVendorCategories(false)

            if (updateVendorCategoriesRequest.status === "OK") {
                // setVendorCategories(updateVendorCategoriesRequest.data.categories)
                let tempCurrentVendorCategories = [...currentVendorCategories]

                tempCurrentVendorCategories = updateVendorCategoriesRequest.data

                setCurrentVendorCategories(tempCurrentVendorCategories)
            }


            
        } catch (error) {
            console.log({error})
        }
    }

    const toggleShowAddCategory = () => {
        setShowAddCategory(!showAddCategory)
    }

    console.log({currentVendorCategories});

    const approveParkRequest = async () => {
        try {
            updateUpdateStatus("approving")
          const approveRequest = await getProtected(`approvals/hold/approve/${vendorID}`)
          
          if (approveRequest.status === "OK") {
            updateUpdateStatus("park action success", "Vendor application parked")

            let tempApprovalData = {...approvalData}
            tempApprovalData.flags.status = "parked"
            setApprovalData(tempApprovalData)
          } else {
            updateUpdateStatus("park action error", approveRequest.error.message)
          }
        } catch (error) {
          console.log({error})
        }
      }

      const rejectParkRequestAndRevertToL2 = async (from) => {

        try {
            updateUpdateStatus("rejecting")
            const revertRequest = await postProtected(`approvals/revert/l2/${vendorID}`, {from})

            if (revertRequest.status === "OK") {
                updateUpdateStatus("park action success", "Park request declined. Vendor has been moved back to pending L2.")

                let tempApprovalData = {...approvalData}
                tempApprovalData.flags.status = "pending"
                setApprovalData(tempApprovalData)
            } else {
                updateUpdateStatus("park action error", revertRequest.error.message)
            }

            
          } catch (error) {
            console.log({error})
          }
      }

    //   const declineParkRequest = async () => {
    //     try {
    //         updateUpdateStatus("rejecting")
    //       const declineRequest = await getProtected(`approvals/hold/cancel/${vendorID}`)

    //       console.log({declineParkRequest});
          
          
    //       if (declineRequest.status === "OK") {
    //         updateUpdateStatus("park action success", "Park request declined. Vendor has been moved back to pending L2.")

    //         let tempApprovalData = {...approvalData}
    //         tempApprovalData.flags.status = "pending"
    //         setApprovalData(tempApprovalData)
    //       } else {
    //         updateUpdateStatus("park action error", declineRequest.error.message)
    //       }
    //     } catch (error) {
    //       console.log({error})
    //     }
    //   }

      const updateUpdateStatus = (status, message = "") => {
        let tempUpdateStatus = {...updateStatus}
        tempUpdateStatus.status = status
        tempUpdateStatus.message = message
        setUpdateStatus(tempUpdateStatus)
      }
    

    
    

    return (
        <div>
            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <div>
                    <Link href={`/staff/approvals/${vendorID}`} target="_blank">OPEN IN APPROVAL VIEW</Link>
                    <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>
                </div>

                
            </div>

            {/* <h3 className={styles.subTitle}>Carry out Stage B</h3> */}
            {
                approvalData?.flags?.status === "park requested" && <div className={styles.holdRequestDiv}>
                <h5>Hold Requested</h5>
                <p>{`${approvalData?.flags?.hold?.requestedBy?.name} has recommended that this vendor application should be put on hold`}</p>
                <p className={styles.holdRequestReasonLabel}>Reason:</p>
                <p className={styles.holdRequestReason}>{approvalData?.flags?.hold?.reason}</p>

                <div>
                    <button onClick={() => approveParkRequest()}>Approve hold and park at L2 {updateStatus.status === "approving" && <ButtonLoadingIcon />}</button>
                    <button onClick={() => rejectParkRequestAndRevertToL2("park requests")}>Cancel hold request {updateStatus.status === "rejecting" && <ButtonLoadingIconPrimary />}</button>
                </div>
            </div>
            }

            {
                updateStatus.status === "park action success" && <SuccessMessage message={updateStatus.message} />
            }

            {
                updateStatus.status === "park action error" && <ErrorText text={updateStatus.message} />
            }
            

            {
                !applicationProcessed && <div>
                {
                    expiringCertificates.length > 0 && <div className={styles.expiringCertificatesDiv}>
                    <h3>Expiring Certificates/Permits</h3>
                    <p>The following certificates/permit are expiring within the next 3 months</p>

                    <div>
                        {
                            expiringCertificates.map((item, index) => <div key={index} className={styles.expiringCertificatesItem}>
                                <h4>{item.approvalLabel}</h4>
                                <p>{item.expiryDate}</p>
                            </div>)
                        }
                    </div>

                    <a><p>Notify vendor</p></a>
                </div>
                }

                {
                    expiredCertificates.length > 0 && <div className={styles.expiredCertificatesDiv}>
                    <h3>Expired Certificates/Permits</h3>
                    <p>The following certificates/permits have expired</p>

                    <div>
                        {
                            expiredCertificates.map((item, index) => <div key={index} className={styles.expiringCertificatesItem}>
                                <h4>{item.approvalLabel}</h4>
                                <p>{item.expiryDate}</p>
                            </div>)
                        }
                    </div>

                    <a><p>Notify vendor</p></a>
                </div>
                }
            </div>
            }

            {
                !applicationProcessed && <>
                        <div className={styles.approvalContent}>

                        {
                            pages.map((item, index) => <Accordion defaultOpen={index === 0} key={index} title={item.pageTitle}>
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
                                                        (sectionItem.remarks && sectionItem.remarks.length > 0  ) && <div className={styles.showCommentTriggerDiv}>
                                                            <p onClick={() => toggleHideSectionRemarks(index, sectionIndex)}>SHOW COMMENTS</p>
                                                        </div>
                                                    }
    
                                                    {
                                                        sectionRemarksToShow[index]?.includes(sectionIndex) && <div>
                                                        {
                                                            sectionItem?.remarks && sectionItem?.remarks.length > 0  && <div className={styles.remarksContent}>
                                                            <p>Remarks</p>
    
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
                                                            sectionItem?.comments && sectionItem?.comments.length > 0  && <div className={styles.commentsContent}>
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
                        <Accordion defaultOpen={false} title={"Contractor Categorization"}>
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
                                                                <div ><Image src={closeIcon} alt="close icon" width={10} height={10} onClick={() => removeCategoryFromSelectedCategories(item)} style={{cursor: "pointer"}} /></div>
                                                                <p>{item.category}</p>
                                                                
                                                            </div>)
                                                        }
                                                    </div>
                                                    <input placeholder="Select Job Categories" onClick={() => setShowCategoriesList(true)} onChange={(e) => filterCategoriesListByQueryString(e.target.value)} />

                                                    <Image src={closeIcon} alt="close icon" width={10} height={10} onClick={() => {clearSelectedCategories()}} style={{cursor: "pointer"}} />

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

                                                <button className={styles.saveCategoriesButton } onClick={() => updateVendorCategories(null)}>Save {updatingVendorCategories && <ButtonLoadingIcon />}</button>
                                        </>
                                    }

                                    <table className={styles.currentCategoriesList}>
                                        <tbody>
                                            {
                                                currentVendorCategories.map((item, index) => <tr key={index}>
                                                    <td>{item.category}</td>
                                                    <td onClick={() => deleteCategoryFromCategoriesList(item)}>Delete</td>
                                                    <td>{`Added by: ${item.addedBy.name}`}</td>
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


        </div>
    )
}

export default ViewVendorPage