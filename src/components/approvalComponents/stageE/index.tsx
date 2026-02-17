'use client'
import checkedBox from "@/assets/images/checkedBox.svg"
import closeIcon from "@/assets/images/closeGrey.svg"
import uncheckedBox from "@/assets/images/uncheckedBox.svg"
import Accordion from "@/components/accordion"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"


import errorIcon from "@/assets/images/red_alert_circle.svg"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import CertificateHistoryModal from "@/components/certificateHistory"
import Modal from "@/components/modal"
import staffApi from "@/redux/apis/staffApi"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import { formatNumberAsCurrency } from "@/utilities/currency"
import FileLink from "@/components/fileLink"
import moment from "moment"
import Image from "next/image"
import Link from "next/link"
import { useDispatch, useSelector } from "react-redux"


function useOutsideClick(ref: any, onClickOut: () => void, deps = []) {
    useEffect(() => {
        const onClick = ({ target }: any) => !ref?.contains(target) && onClickOut?.()
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, deps);
}

const StageE = ({ approvalData, formPages, vendorID }) => {



    const [pages, setPages] = useState([])
    const [newRemarks, setNewRemarks] = useState({})
    const [newComments, setNewComments] = useState({})
    const [selectedCategories, setSelectedCategories] = useState([])
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
    const [showApprovalActions, setShowApprovalActions] = useState(false)
    const [approvedAll, setApprovedAll] = useState(false)
    const [applicationProcessed, setApplicationProcessed] = useState(false)
    const [sectionToCommentOn, setSectionToCommentOn] = useState(null)
    const [sectionToRemarkOn, setSectionToRemarkOn] = useState(null)
    const [unaprovedSectionsWithNoRemarks, setUnapprovedSectionsWithNoRemarks] = useState([])
    const [showSetReasonForHoldModal, setShowSetReasonForHoldModal] = useState(false)
    const [dueDiligenceApprovals, setDueDiligenceApprovals] = useState({
        internetCheck: false,
        registrationCheck: false,
        referenceCheck: false,
        exposedPersonsCheck: false
    })
    const containerDivRef = useRef(null)

    const user = useSelector((state: any) => state.user)
    const [itemBeingUpdated, setItemBeingUpdated] = useState("")
    const router = useRouter()
    const [showSendToEA, setShowSendToEA] = useState(false)
    const [hodRemarkForEA, setHODRemarkForEA] = useState("")






    useOutsideClick(categoriesListDivRef.current, () => {


        setShowCategoriesList(false)

    }, [showCategoriesList])


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


    const getFieldItemComponent = (field, index, section) => {
        switch (field.type) {
            case "shortText":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>

                            {typeof field.value !== "string" ? <div></div> :
                                field.textType === "number" && field.isCurrency ? (
                                    // For currency fields, find the corresponding currency selection
                                    (() => {
                                        // Find the currency field in the same section

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

                                {
                                    field?.value[0]?.url && <FileLink url={field?.value[0]?.url} name={field?.value[0]?.name} type={field?.value[0]?.type}><p>View</p></FileLink>
                                }
                                <div>

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
                                    field?.value[0]?.expiryDate && <p className={styles.expiryDateText}>{`Expiry date: ${field?.value[0]?.expiryDate}`}</p>
                                }

                                {
                                    field.value && field?.value[0]?.expiryDate && <>

                                        {
                                            getCertificateTimeValidity(field?.value[0]?.expiryDate) === "expired" && <p className={styles.certificateExpiredText}>Certificate has expired</p>
                                        }

                                        {
                                            getCertificateTimeValidity(field?.value[0]?.expiryDate) === "expiring" && <p className={styles.certificateToExpireText}>Certificate will soon expire</p>
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
                            field?.value?.length > 0 && <p className={styles.multiSelectTextValues}>{field?.value?.map((item, index) => <p key={index}>{item.label}</p>)}</p>
                        }
                    </p>
                </div>



        }
    }



    useEffect(() => {
        setFormPages(formPages)
        fetchJobCategories()
    }, [formPages])

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



    const setFormPages = formPages => {
        let tempPages = [...pages]
        tempPages = formPages
        setPages(tempPages)

        if (approvalData.jobCategories) {
            let tempSelectedCategories = [...selectedCategories]
            tempSelectedCategories = approvalData.jobCategories
            setSelectedCategories(tempSelectedCategories)

            let tempCurrentCategories = [...currentVendorCategories]
            tempCurrentCategories = approvalData.jobCategories
            setCurrentVendorCategories(tempCurrentCategories)
        }

        getExpiringAndExpiredCertificates(tempPages)
    }

    const getExpiringAndExpiredCertificates = (pages) => {
        const tempExpiringCertificates = []
        const tempExpiredCertificates = []

        pages.forEach((page, pageIndex) => {
            page.sections.forEach((section, sectionIndex) => {
                section.fields.forEach((field, fieldIndex) => {

                    if (field.type === "file") {

                        if (field.value) {

                            if (getCertificateTimeValidity(field?.value[0]?.expiryDate) === "expiring") {
                                tempExpiringCertificates.push(field)
                            }
                            if (getCertificateTimeValidity(field?.value[0]?.expiryDate) === "expired") {
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




    const toggleSectionApproval = (pageIndex, sectionIndex) => {
        const tempPages = [...pages]
        if (tempPages[pageIndex].sections[sectionIndex]["approved"]) {
            tempPages[pageIndex].sections[sectionIndex]["approved"] = false
        } else {
            tempPages[pageIndex].sections[sectionIndex]["approved"] = true
        }
        setPages(tempPages)
        validateSectionApproval(null)
    }

    const closeAddRemarkModal = () => {
        let tempSectionToRemarkOn = { ...sectionToRemarkOn }
        tempSectionToRemarkOn = null
        setSectionToRemarkOn(tempSectionToRemarkOn)
    }

    const closeAddCommentModal = () => {
        let tempSectionToCommentOn = { ...sectionToCommentOn }
        tempSectionToCommentOn = null
        setSectionToCommentOn(tempSectionToCommentOn)
    }

    const openAddRemarkModal = (pageIndex, sectionIndex) => {
        const tempSectionToRemarkOn = { ...sectionToRemarkOn }
        tempSectionToRemarkOn["pageIndex"] = pageIndex
        tempSectionToRemarkOn["sectionIndex"] = sectionIndex
        setSectionToRemarkOn(tempSectionToRemarkOn)
    }

    const openAddCommentModal = (pageIndex, sectionIndex) => {
        const tempSectionToCommentOn = { ...sectionToCommentOn }
        tempSectionToCommentOn["pageIndex"] = pageIndex
        tempSectionToCommentOn["sectionIndex"] = sectionIndex
        setSectionToCommentOn(tempSectionToCommentOn)
    }

    const addRemarkToSection = (pageIndex, sectionIndex, remark) => {
        if (!remark) {
            return
        }
        const tempPages = [...pages]


        if (!tempPages[pageIndex].sections[sectionIndex].remarks) {

            tempPages[pageIndex].sections[sectionIndex]["remarks"] = []
            tempPages[pageIndex].sections[sectionIndex].remarks.push({
                remark,
                userID: user.user.uid,
                userName: user.user.name,
                date: Date.now()
            })
        } else {
            tempPages[pageIndex].sections[sectionIndex].remarks.push({
                remark,
                userID: user.user.uid,
                userName: user.user.name,
                date: Date.now()
            })
        }
        setPages(tempPages)

        const tempNewRemarks = { ...newRemarks }

        if (!tempNewRemarks[pages[pageIndex].pageTitle]) {
            tempNewRemarks[pages[pageIndex].pageTitle] = {}
        }

        if (!tempNewRemarks[pages[pageIndex].pageTitle][pages[pageIndex].sections[sectionIndex].title]) {
            tempNewRemarks[pages[pageIndex].pageTitle][pages[pageIndex].sections[sectionIndex].title] = []
        }

        tempNewRemarks[pages[pageIndex].pageTitle][pages[pageIndex].sections[sectionIndex].title].push({
            remark,
            userID: user.user.uid,
            userName: user.user.name,
            date: Date.now()
        })

        setNewRemarks(tempNewRemarks)



        validateSectionApproval(tempNewRemarks)

        closeAddRemarkModal()


    }



    const addCommentToSection = (pageIndex, sectionIndex, comment) => {


        const tempPages = [...pages]





        if (!tempPages[pageIndex].sections[sectionIndex].comments) {

            tempPages[pageIndex].sections[sectionIndex]["comments"] = []
            tempPages[pageIndex].sections[sectionIndex].comments.push({
                comment,
                userID: user.user.uid,
                userName: user.user.name,
                date: Date.now()
            })
        } else {
            tempPages[pageIndex].sections[sectionIndex].comments.push({
                comment,
                userID: user.user.uid,
                userName: user.user.name,
                date: Date.now()
            })
        }


        setPages(tempPages)

        const tempNewComments = { ...newComments }

        if (!tempNewComments[pages[pageIndex].pageTitle]) {
            tempNewComments[pages[pageIndex].pageTitle] = {}
        }

        if (!tempNewComments[pages[pageIndex].pageTitle][pages[pageIndex].sections[sectionIndex].title]) {
            tempNewComments[pages[pageIndex].pageTitle][pages[pageIndex].sections[sectionIndex].title] = []
        }

        tempNewComments[pages[pageIndex].pageTitle][pages[pageIndex].sections[sectionIndex].title].push({
            comment,
            userID: user.user.uid,
            userName: user.user.name,
            date: Date.now()
        })




        setNewComments(tempNewComments)

        closeAddCommentModal()
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

        }
    }

    const toggleShowAddCategory = () => {
        setShowAddCategory(!showAddCategory)
    }

    const validateSectionApproval = (remarks) => {
        let approvedAllSections = true
        const unapprovedSectionsWithoutRemarks = []

        // pages.forEach((item, index) => {
        //     item.sections.forEach((sectionItem, sectionIndex) => {
        //         if (sectionItem.approved) {
        //             approvedAll = false
        //         }
        //     })
        // })


        for (let index = 0; index < pages.length; index++) {
            const element = pages[index];

            for (let sectionIndex = 0; sectionIndex < element.sections.length; sectionIndex++) {
                const section = element.sections[sectionIndex];

                //Only validate sections that are visible
                if (!section.hideOnApproval) {
                    if (!section.approved) {
                        approvedAllSections = false

                        const remarksForValidation = remarks ? remarks : newRemarks




                        if (!remarksForValidation[element.pageTitle]) {
                            unapprovedSectionsWithoutRemarks.push(section.title)
                        } else if (!remarksForValidation[element.pageTitle][section.title]) {
                            unapprovedSectionsWithoutRemarks.push(section.title)
                        }
                    }
                }



            }

        }







        setApprovedAll(approvedAllSections)

        let tempUnapprovedSectionsWithNoRemarks = [...unaprovedSectionsWithNoRemarks]
        tempUnapprovedSectionsWithNoRemarks = unapprovedSectionsWithoutRemarks
        setUnapprovedSectionsWithNoRemarks(tempUnapprovedSectionsWithNoRemarks)

        closeAddRemarkModal()
    }


    const dispatch = useDispatch();

    // Reusable function to invalidate approval-related cache
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
    const processToStageF = async () => {
        try {
            setItemBeingUpdated("approve")
            const processToStageFRequest = await postProtected(`approvals/process/${vendorID}`, {
                pages,
                hodRemarkForEA
            }, user.role)

            if (processToStageFRequest.status === "OK") {
                invalidateApprovalCache();
                actionCompleted()
            }
        } catch (error) {

        }
    }

    const returnToContractsOfficer = async () => {
        setItemBeingUpdated("return")
        try {
            const returnToContractsOfficerRequest: any = await postProtected(`approvals/return/previous-stage/${vendorID}`, {
                pages
            }, user?.user?.role)

            if (returnToContractsOfficerRequest.status === "OK") {
                actionCompleted()
            }

        } catch (error) {

        }
    }



    const actionCompleted = () => {
        setApplicationProcessed(true)

        setTimeout(() => {
            router.push("/staff/approvals")
        }, 5000)
    }

    const parkAtL2 = async (reason) => {

        setItemBeingUpdated("hold")

        try {
            const recommendForHoldRequest = await postProtected(`approvals/hold/direct/${vendorID}`, {
                reason
            }, user.role)

            if (recommendForHoldRequest.status === "OK") {
                setShowSetReasonForHoldModal(false)
                actionCompleted()
            }



        } catch (error) {

        }
    }

    const toggleDDApproval = (field) => {
        const tempDDApproval = { ...dueDiligenceApprovals }
        tempDDApproval[field] = !tempDDApproval[field]
        setDueDiligenceApprovals(tempDDApproval)
    }

    const updateHODRemarks = (pageIndex, sectionIndex, remark) => {
        const tempPages = [...pages]
        tempPages[pageIndex].sections[sectionIndex]["hodRemarks"] = remark
        setPages(tempPages)
    }

    const validatedAllSections = () => {
        let approvedAllSections = true

        for (let index = 0; index < pages.length; index++) {
            const element = pages[index];

            for (let sectionIndex = 0; sectionIndex < element.sections.length; sectionIndex++) {
                const section = element.sections[sectionIndex];

                //Only validate sections that are visible
                if (!section.hideOnApproval) {
                    if (!section.approved) {
                        approvedAllSections = false
                    }
                }



            }

        }

        if (!dueDiligenceApprovals.exposedPersonsCheck || !dueDiligenceApprovals.internetCheck || !dueDiligenceApprovals.referenceCheck || !dueDiligenceApprovals.registrationCheck) {
            approvedAllSections = false
        }

        return approvedAllSections
    }









    return (
        <div className={styles.stageE}>
            {
                showSetReasonForHoldModal && <Modal>
                    <div className={styles.recommendForHoldModal}>
                        <form onSubmit={e => {
                            e.preventDefault()
                            parkAtL2(e.target[0].value)
                        }}>
                            <h3>Reason for Completion</h3>



                            <textarea placeholder="Type your reason..." rows={5}></textarea>

                            <div>
                                <button type="button" onClick={() => setShowSetReasonForHoldModal(false)}>Cancel</button>
                                <button>Submit {itemBeingUpdated === "hold" && <ButtonLoadingIcon />}</button>
                            </div>
                        </form>
                    </div>
                </Modal>
            }

            {
                currentCertificateHistory.length > 0 && <CertificateHistoryModal clearCurrentCertificateHistory={() => clearCurrentCertificateHistory()} currentCertificateHistory={currentCertificateHistory} />
            }

            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>
            </div>

            <h3 className={styles.subTitle}>Carry out HOD Review</h3>



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

                                                        <Image src={sectionItem.approved ? checkedBox : uncheckedBox} alt="approval checkbox" width={40} height={40} style={{ cursor: "pointer" }} onClick={() => toggleSectionApproval(index, sectionIndex)} />
                                                    </div>

                                                    <div>
                                                        {
                                                            sectionItem.fields.map((fieldItem, fieldIndex) => getFieldItemComponent(fieldItem, fieldIndex, sectionItem))
                                                        }
                                                    </div>

                                                    <div>


                                                        {
                                                            ((sectionItem.comments && sectionItem.comments.length > 0) || (sectionItem.remarks && sectionItem.remarks.length > 0)) && <div className={styles.showCommentTriggerDiv}>
                                                                <p onClick={() => toggleHideSectionRemarks(index, sectionIndex)}>SHOW COMMENTS</p>
                                                            </div>
                                                        }

                                                        {
                                                            !sectionItem.approved && <div className={[styles.remarksDiv, sectionItem.hodRemarks ? styles.hasValidText : styles.noValidText].join(" ")}>
                                                                <textarea onChange={(event) => updateHODRemarks(index, sectionIndex, event.target.value)} placeholder="Type your notes here" rows={5}></textarea>

                                                                {!sectionItem.hodRemarks && <Image src={errorIcon} alt="remark error" width={20} height={20} />}

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

                        <Accordion defaultOpen={true} title={"Due Diligence"}>
                            <div className={styles.dueDiligenceView}>
                                <div className={styles.ddCheckDiv}>
                                    <h5>Company Registration</h5>

                                    {
                                        approvalData?.dueDiligence?.registrationCheck?.finding[0]?.url && <FileLink url={approvalData?.dueDiligence?.registrationCheck?.finding[0]?.url} name={approvalData?.dueDiligence?.registrationCheck?.finding[0]?.name}>VIEW FINDINGS</FileLink>
                                    }

                                </div>

                                <div className={styles.ddCheckDiv}>
                                    <h5>Internet Check</h5>

                                    {
                                        approvalData?.dueDiligence?.internetCheck?.finding[0]?.url && <FileLink url={approvalData?.dueDiligence?.internetCheck?.finding[0]?.url} name={approvalData?.dueDiligence?.internetCheck?.finding[0]?.name}>VIEW FINDINGS</FileLink>
                                    }

                                </div>

                                <div className={styles.ddCheckDiv}>
                                    <h5>Reference Check</h5>

                                    {
                                        approvalData?.dueDiligence?.referenceCheck?.finding[0]?.url && <FileLink url={approvalData?.dueDiligence?.referenceCheck?.finding[0]?.url} name={approvalData?.dueDiligence?.referenceCheck?.finding[0]?.name}>VIEW FINDINGS</FileLink>
                                    }

                                </div>

                                <div className={styles.directorsAndShareholdersDiv}>
                                    <h5>Directors and Shareholders</h5>

                                    <table>
                                        <thead>
                                            <tr>
                                                <td>
                                                    Type
                                                </td>

                                                <td>
                                                    Title
                                                </td>

                                                <td>
                                                    Name
                                                </td>

                                                <td>
                                                    Role (Director/Shareholder)
                                                </td>

                                                <td>
                                                    Findings
                                                </td>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {
                                                approvalData.dueDiligence?.exposedPersons && approvalData.dueDiligence?.exposedPersons.map((item, index) => <tr className={index / 2 == 0 && styles.darkBackground} key={index}>
                                                    <td>
                                                        {item.entityType === "individual" ? "Individual" : "Company"}
                                                    </td>

                                                    <td>
                                                        {item.entityType === "individual" ? item.title : ""}
                                                    </td>

                                                    <td>
                                                        {item.entityType === "individual" ? `${item.firstName} ${item.otherName} ${item.lastName}` : item.companyName}
                                                    </td>

                                                    <td>
                                                        <div>
                                                            <p>{item.role}</p>
                                                            <p><span>{item.flagMessage}</span></p>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {
                                                            item.finding[0].url && <FileLink url={item.finding[0].url} name={item.finding[0].name}>VIEW FINDINGS</FileLink>
                                                        }

                                                    </td>
                                                </tr>)
                                            }
                                        </tbody>
                                    </table>
                                </div>

                                <p className={styles.checksDoneByText}>Checks carried out by - <span>{approvalData.flags.approvals.level3.approver.name}</span></p>
                            </div>
                        </Accordion>
                    </div>

                    <div className={styles.approvalContent}>
                        <Accordion defaultOpen={true} title={""} noHeader={true}>
                            <div className={styles.checksDiv}>
                                <div>
                                    <h5>Contractor’s CAC registration check</h5>

                                    {
                                        approvalData?.dueDiligence?.registrationCheck?.finding[0]?.url && <FileLink url={approvalData?.dueDiligence?.registrationCheck?.finding[0]?.url} name={approvalData?.dueDiligence?.registrationCheck?.finding[0]?.name}>VIEW FINDINGS</FileLink>
                                    }


                                </div>

                                <Image src={dueDiligenceApprovals.registrationCheck ? checkedBox : uncheckedBox} alt="approval checkbox" width={30} height={30} onClick={() => toggleDDApproval("registrationCheck")} />
                            </div>
                        </Accordion>

                        <Accordion defaultOpen={true} title={""} noHeader={true}>
                            <div className={styles.checksDiv}>
                                <div>
                                    <h5>Internet search on the Contractor</h5>

                                    {
                                        approvalData?.dueDiligence?.internetCheck?.finding[0]?.url && <FileLink url={approvalData.dueDiligence.internetCheck.finding[0].url} name={approvalData.dueDiligence.internetCheck.finding[0].name}>VIEW FINDINGS</FileLink>
                                    }


                                </div>
                                <Image src={dueDiligenceApprovals.internetCheck ? checkedBox : uncheckedBox} alt="approval checkbox" width={30} height={30} onClick={() => toggleDDApproval("internetCheck")} />
                            </div>
                        </Accordion>

                        <Accordion defaultOpen={true} title={""} noHeader={true}>
                            <div className={styles.checksDiv}>
                                <div>
                                    <h5>Search on current (and any former) Directors and Shareholders</h5>

                                    {
                                        approvalData?.dueDiligence?.exposedPersons && approvalData.dueDiligence?.exposedPersons.map((item, index) => <div key={index}>
                                            <p>{`Person ${index + 1} : ${item.companyName ? item.companyName : item.firstName + " " + item.lastName} - ${item.role === "Both" ? "Director & Shareholder" : item.role}`}</p>
                                            <FileLink url={approvalData?.dueDiligence?.exposedPersons[index]?.finding[0]?.url} name={approvalData?.dueDiligence?.exposedPersons[index]?.finding[0]?.name}>VIEW FINDINGS</FileLink>
                                        </div>)
                                    }
                                </div>
                                <Image src={dueDiligenceApprovals.exposedPersonsCheck ? checkedBox : uncheckedBox} alt="approval checkbox" width={30} height={30} onClick={() => toggleDDApproval("exposedPersonsCheck")} />
                            </div>
                        </Accordion>

                        <Accordion defaultOpen={true} title={""} noHeader={true}>
                            <div className={styles.checksDiv}>
                                <div>
                                    <h5>Reference check</h5>

                                    {
                                        approvalData?.dueDiligence?.referenceCheck?.finding[0]?.url && <FileLink url={approvalData?.dueDiligence?.referenceCheck?.finding[0]?.url} name={approvalData?.dueDiligence?.referenceCheck?.finding[0]?.name}>VIEW FINDINGS</FileLink>
                                    }


                                </div>
                                <Image src={dueDiligenceApprovals.referenceCheck ? checkedBox : uncheckedBox} alt="approval checkbox" width={30} height={30} onClick={() => toggleDDApproval("referenceCheck")} />
                            </div>
                        </Accordion>
                    </div>


                </>
            }

            {
                !showSendToEA && !applicationProcessed && <div className={styles.approvalActionsDiv}>
                    <h5>Actions</h5>

                    {
                        !validatedAllSections() && <button disabled={itemBeingUpdated === "return"} onClick={() => returnToContractsOfficer()}>RETURN TO CO {itemBeingUpdated === "return" && <ButtonLoadingIcon />}</button>
                    }

                    <button onClick={() => setShowSetReasonForHoldModal(true)}>COMPLETE AT L2</button>

                    {
                        validatedAllSections() && <button onClick={() => setShowSendToEA(true)}>TAKE TO EXECUTIVE APPROVER</button>
                    }
                </div>
            }

            {
                showSendToEA && !applicationProcessed && <div className={styles.takeToExecutiveApproverDiv}>
                    <h3>Remark for Executive Approver (optional)</h3>

                    <div>
                        <textarea placeholder="Type in your remark for the executive approver here" rows={5} onChange={event => setHODRemarkForEA(event.target.value)}></textarea>
                    </div>

                    <div>
                        <button onClick={() => setShowSendToEA(false)}>CANCEL</button>

                        <button disabled={itemBeingUpdated === "approve"} onClick={() => processToStageF()}>{itemBeingUpdated === "approve" ? "SUBMITTING" : "SUBMIT"}</button>
                    </div>
                </div>
            }

            {
                showApprovalActions && !applicationProcessed && <div className={styles.approvalActionsDiv}>
                    <h4>Approval Actions</h4>

                    {
                        (unaprovedSectionsWithNoRemarks.length > 0 && !applicationProcessed) && <div className={styles.unapprovedSectionsDiv}>
                            <p>The following unapproved sections have no notes for the vendor. Vendor notes are required to inform the vendor what they need to add/modify in the relevant section:</p>

                            {
                                unaprovedSectionsWithNoRemarks.map((item, index) => <p key={index}>{item}</p>)
                            }


                        </div>
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

export default StageE