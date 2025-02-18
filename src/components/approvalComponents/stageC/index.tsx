'use client'
import { useEffect, useMemo, useRef, useState } from "react"
import styles from "./styles/styles.module.css"
import { useParams, usePathname, useRouter } from "next/navigation"
import Accordion from "@/components/accordion"

import Image from "next/image"
import Link from "next/link"
import moment from "moment"
import { useSelector } from "react-redux"
import { getProtected } from "@/requests/get"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { putProtected } from "@/requests/put"
import { postProtected } from "@/requests/post"
import checkboxIconUnchecked from "@/assets/images/checkbox_unchecked.svg"
import checkboxIconChecked from "@/assets/images/checkbox_checked.svg"
import roundCheckboxIconUnchecked from "@/assets/images/rounde_checkbox_unchecked.svg"
import roundCheckboxIconChecked from "@/assets/images/round_checkbox_checked.svg"
import closeIconWhite from "@/assets/images/close_icon_white.svg"
import Modal from "@/components/modal"




const StageC = () => {
    
    const [approvalData, setApprovalData] = useState<any>({})
    const [pages, setPages] = useState([])
    const [selectedCategories, setSelectedCategories] = useState([])
    const [vendorID, setVendorID] = useState("")
    const [sectionRemarksToShow, setSectionRemarksToShow] = useState({

    })
    const [showSetReasonForHoldModal, setShowSetReasonForHoldModal] = useState(false)
    const [approvalChoice, setApprovalChoice] = useState("complete")
    const [jobCategories, setJobCategories] = useState([])
    const [fixedJobCategories, setFixedJobCategoires] = useState([])
    const [currentVendorCategories, setCurrentVendorCategories] = useState([])
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [applicationProcessed, setApplicationProcessed] = useState(false)
    const user = useSelector((state:any) => state.user)
    const [itemBeingUpdated, setItemBeingUpdated] = useState("")
    const [updateStatus, setUpdateStatus] = useState({
        status: "",
        message: ""
    })
    const [selectedServices, setSelectedServices] = useState([])
    const [siteVisitRequired, setSiteVisitRequired] = useState(false)
    const router = useRouter()
    const params = useParams()
    const [vendorData, setVendorData] = useState({
        approvalData:{},
        pages: []
    })
    const [showApprovalActions, setShowApprovalActions] = useState(false)
    const [services, setServices] = useState([])

    useEffect(() => {
        if (params.id) {
            fetchVendorData(params.id)
            getAllServices()
        }
    }, [params])

    useEffect(() => {
        fetchJobCategories()
    }, [pages])

    const getAllServices = async () => {
        try {
            const allServicesRequest = await getProtected("jobCategories", user.role)

            if (allServicesRequest.status === "OK") {
                let tempServices = [...services]
                tempServices = allServicesRequest.data
                setServices(tempServices)
            }
            
        } catch (error) {
            console.log({error});
        }
    }
    
    
    

    const fetchVendorData = async (vendorID) => {
        setVendorID(vendorID)
        try {
            const fetchVendorDataRequest = await getProtected(`companies//approval-data/${vendorID}`, user.role)

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


    const toggleApprovalChoice = () => {
        if (approvalChoice === "approve")  {
            setApprovalChoice("complete")
        } else {
            setApprovalChoice("approve")
        }
    }

    const toggleSiteVisitRequiredStatus = () => {
        if (siteVisitRequired) {
            setSiteVisitRequired(false)
        } else {
            setSiteVisitRequired(true)
        }
    }

    const formatNumberAsCurrency = (number) => {
        console.log({number});
        
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(number);
    }
    

    const getFieldItemComponent = (field, index) => {
        switch (field.type) {
            case "shortText": 
            return <div key={index} className={styles.fieldItem}>
                <div>
                    <p className={styles.fieldData}>
                        <label>{`${field.label}:`}</label>
                        
                        {
                            field.textType === "number" && <p>{field?.isCurrency ? formatNumberAsCurrency(field.value) : field.value}</p>
                        }

                        {
                            field.textType !== "number" && <p>{field?.value?.e164Number ? field.value.number : field.value}</p>
                        }
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
                            {
                                field?.value[0]?.url && <div>
                                <Link href={field?.value[0]?.url} target="_blank"><p>View</p></Link>
                            </div>
                            }
                            

                            {
                                field.hasExpiryDate && <a style={{marginLeft: "20px"}}>Certificate History</a>
                            }
                        </div>
                    </div>

                    {
                        field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                    }

                    {
                        field.isACertificate && <>
                            {
                                field.value[0]?.expiryDate && <p className={styles.expiryDateText}>{`Expiry date: ${field.value[0]?.expiryDate}`}</p>
                            }

                            {
                                field.value && field.value[0]?.expiryDate && <>
                                
                                        {
                                            getCertificateTimeValidity(field.value[0]?.expiryDate) === "expired" && <p className={styles.certificateExpiredText}>Certificate has expired</p>
                                        }

                                        {
                                            getCertificateTimeValidity(field.value[0]?.expiryDate) === "expiring" && <p className={styles.certificateToExpireText}>Certificate will soon expire</p>
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



    

    const fetchJobCategories = async () => {
        try {
            const jobCategoriesRequest = await getProtected("jobCategories", user.role)
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

                            if (getCertificateTimeValidity(field.value[0]?.expiryDate) === "expiring") {
                                tempExpiringCertificates.push(field)
                            }
                            if (getCertificateTimeValidity(field.value[0]?.expiryDate) === "expired") {
                                tempExpiredCertificates.push(field)
                            }
                        }
                    }
                })
            })
        })

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


    const recommendForHold = async (reason) => {
        setItemBeingUpdated("hold")
        
        try {
            const recommendForHoldRequest = await postProtected(`approvals/hold/direct/${vendorID}`, {
                reason
            }, user.role)

            if (recommendForHoldRequest.status === "OK") {
                setShowSetReasonForHoldModal(false)
                actionCompleted()
            }

            console.log({recommendForHoldRequest});
            
        } catch (error) {
            
        }
    }
    const actionCompleted = () => {
        setApplicationProcessed(true)

        setTimeout(() => {
            router.push("/staff/approvals")
        }, 5000)
    }
    

    const addServiceToServicesList = service => {
        //Check if object is contained in array of objects
        

        if (!selectedServices.some(item => {
            return item._id === service._id
        })) {
            let tempSelectedServices = [...selectedServices]
            tempSelectedServices.push(service)
            setSelectedServices(tempSelectedServices)
        }
        

    }

    const removeServiceFromServicesList = serviceId => {
        let tempSelectedServices = [...selectedServices]

        tempSelectedServices = tempSelectedServices.filter(item => item._id !== serviceId)

        setSelectedServices(tempSelectedServices)
    }
    
    const processToStageD = async () => {
        try {
            setItemBeingUpdated("approve")
            const processToStageDRequest = await postProtected(`approvals/process/${vendorID}`, {
                pages,
                selectedServices,
                siteVisitRequired
            }, user.role)

            if (processToStageDRequest.status === "OK") {
                actionCompleted()
            }
        } catch (error) {
            
        }
    }
    
    

    return (
        <div className={styles.stageC}>
            {
                showSetReasonForHoldModal && <Modal>
                    <div className={styles.recommendForHoldModal}>
                        <form onSubmit={e => {
                            e.preventDefault()
                            recommendForHold(e.target[0].value)
                        }}>
                            <h3>Recommend application for hold</h3>

                            <p>Please include a reason why this application should be held</p>

                            <textarea placeholder="Reason for hold..." rows={5}></textarea>

                            <div>
                                <button type="button" onClick={() => setShowSetReasonForHoldModal(false)}>Cancel</button>
                                <button>SUBMIT {itemBeingUpdated === "hold" && <ButtonLoadingIcon />}</button>
                            </div>
                        </form>
                    </div>
                </Modal>
            }
            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <div>
                    
                    <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>
                </div>

                

                
            </div>

            <h3 className={styles.subTitle}>Carry out Stage D</h3>




            {
                !applicationProcessed && <>
                        <div className={styles.topNotice}>
                            <p>You have been identified as a possible end user of this contractor. You need to assess whether or not the contractor is suitable to be used by Amni.</p>

                            <p>Please click on the relevant tabs to view the information provided by the contractor.</p>
                        </div>

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

                        

                        {
                            !showApprovalActions && 
                            <>
                                <div className={styles.bottomNotice}>
                                    <p>Once you have reviewed the contractor&#39;s registration information, please click &#34;Continue&#34; to proceed to the next step.</p>
                                </div>
                                <footer>
                                    <button onClick={() => setShowApprovalActions(true)}>CONTINUE</button>
                                </footer>
                            </>
                        }

                    
                </>
            }


                {
                    showApprovalActions && !applicationProcessed && <div className={styles.allApprovedDiv}>

                    <div className={styles.stageCApprovals}>
                        <div>
                            <div>
                                <h5>Option 1 - Progress Registration</h5>
                                <p>Select if you think this contractor would be a suitable contractor for your Department.</p>

                                {
                                    approvalChoice === "approve" && <>
                                    <div>
                                        <h6>You must select a service</h6>
                                        <p><span>a&#41;</span> Select the type of services this contractor could provide to your Department.</p>

                                        <div className={styles.selectedServicesDiv}>
                                        {
                                            selectedServices.map((item, index) => <div key={index}>
                                                    <label>{item.category}</label>
                                                    <Image onClick={() => removeServiceFromServicesList(item._id)} src={closeIconWhite} alt="remove end user icon" width={10} height={10} style={{cursor: "pointer", marginLeft: "10px"}} />
                                                </div>)
                                            }
                                        </div>

                                        <select onChange={event => addServiceToServicesList(JSON.parse(event.target.value))
                                        }>
                                            <option>Add services</option>

                                            {
                                                services.map((item, index) => <option key={index} value={JSON.stringify(item)}>{item.category}</option>)
                                            }
                                        </select>
                                    </div>

                                    <div className={styles.siteVisitRequiredDiv}>
                                        <p><span>b&#41;</span> Indicate, by checking the box, if a site visit is required by an Amni Team to verify the capacity of Test Company Leidi Jack</p>

                                        <Image src={siteVisitRequired ? checkboxIconChecked :  checkboxIconUnchecked} alt="checkbox" width={30} height={30} onClick={() => toggleSiteVisitRequiredStatus()} />
                                    </div>
                                </>
                                }
                            </div>

                            <Image src={approvalChoice === "approve" ? roundCheckboxIconChecked : roundCheckboxIconUnchecked } alt="checkbox" width={30} height={30} style={{cursor: "pointer"}} onClick={() => toggleApprovalChoice()} />
                        </div>

                        <div>
                            <div>
                                <h5>Option 2 – Take no Further Action at this Point.</h5>

                                {
                                    approvalChoice === "complete" && <p>If, after reviewing the information uploaded on the portal, you think that this contractor
                                    is NOT a needed or suitable contractor for your Department at this time, 
                                    please select this option <span>and no further action will be taken on the registration at this point.</span>
                                A Contractor’s registration can always be progressed further at a later time.</p>
                                }
                            </div>

                            <Image src={approvalChoice === "complete" ? roundCheckboxIconChecked :roundCheckboxIconUnchecked } alt="checkbox" width={30} height={30} style={{cursor: "pointer"}} onClick={() => toggleApprovalChoice()} />
                        </div>
                    </div>
                    

                    {
                        approvalChoice === "approve" && <button onClick={() => {processToStageD()}}>CONFIRM YOUR APPROVAL {itemBeingUpdated === "approve" && <ButtonLoadingIcon />}</button>
                    }

                    {
                        approvalChoice === "complete" && <button onClick={() => {setShowSetReasonForHoldModal(true)}}>SUBMIT {itemBeingUpdated === "approve" && <ButtonLoadingIcon />}</button>
                    }
                </div>
                }

{
                    applicationProcessed && <div className={styles.allApprovedDiv}>
                        <p>Success!</p>

                        <p>All approval actions have been completed successfully. Redirecting you to the approvals list.</p>
                    </div>
                }


        </div>
    )
}

export default StageC