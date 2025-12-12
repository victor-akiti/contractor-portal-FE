'use client'
import checkedBox from "@/assets/images/checkedBox.svg"
import closeIcon from "@/assets/images/closeGrey.svg"
import closeIconWhite from "@/assets/images/close_icon_white.svg"
import uncheckedBox from "@/assets/images/uncheckedBox.svg"
import Accordion from "@/components/accordion"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"


import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ButtonLoadingIconPrimary from "@/components/buttonLoadingPrimary"
import CertificateHistoryModal from "@/components/certificateHistory"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import staffApi from "@/redux/apis/staffApi"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import { formatNumberAsCurrency } from "@/utilities/currency"
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

const StageB = ({ approvalData, formPages, vendorID }) => {



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
    const containerDivRef = useRef(null)

    const user = useSelector((state: any) => state.user)
    const [itemBeingUpdated, setItemBeingUpdated] = useState("")
    const router = useRouter()
    const [endUsers, setEndUsers] = useState([])
    const [selectedEndUsers, setSelectedEndUsers] = useState([])
    const [selectEndUsers, setSelectEndUsers] = useState(false)
    const [currentApprovalStatus, setCurrentApprovalStatus] = useState("")






    useOutsideClick(categoriesListDivRef.current, () => {


        setShowCategoriesList(false)

    }, [showCategoriesList])

    const fetchAllEndUsers = async () => {

        try {
            const fetchAllEndUsersRequest = await getProtected("users/staff/all", user.role)

            if (fetchAllEndUsersRequest.status === "OK") {
                let tempEndUsers = [...endUsers]
                tempEndUsers = fetchAllEndUsersRequest.data
                setEndUsers(tempEndUsers)
            }

        } catch (error) {
            console.error({ error });

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
                                    field?.value[0]?.url && <div>
                                        <Link href={field?.value[0]?.url} target="_blank"><p>View</p></Link>
                                    </div>
                                }


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
        setFormPages(formPages)
        fetchJobCategories()
        fetchAllEndUsers()
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

    const [isProcessing, setIsProcessing] = useState(false);
    const processToStageC = async () => {
        try {
            setItemBeingUpdated("approve")
            const processToStageCRequest = await postProtected(`approvals/process/${vendorID}`, {
                pages,
                selectedEndUsers
            }, user.role)

            if (processToStageCRequest.status === "OK") {
                invalidateApprovalCache();
                actionCompleted()
            }
        } catch (error) {

        }
    }

    const [noApprovalErrorMessage, setNoApprovalErrorMessage] = useState("")

    const showNoApprovalErrorMessage = errorMessage => {
        setItemBeingUpdated("")
        setNoApprovalErrorMessage(errorMessage)
    }

    const returnToContractor = async () => {
        setItemBeingUpdated("return")
        setNoApprovalErrorMessage("")
        try {
            const returnToContractorRequest: any = await postProtected(`approvals/return/${vendorID}`, {
                pages,
                newRemarks
            }, user.role)



            if (returnToContractorRequest.status === "OK") {
                actionCompleted()
            } else {
                showNoApprovalErrorMessage(returnToContractorRequest.error.message)
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

    const recommendForHold = async (reason) => {

        setItemBeingUpdated("hold")
        setNoApprovalErrorMessage("")

        try {
            const recommendForHoldRequest = await postProtected(`approvals/hold/recommend/${vendorID}`, {
                pages,
                newRemarks,
                stage: 0,
                reason
            }, user.role)

            if (recommendForHoldRequest.status === "OK") {
                setShowSetReasonForHoldModal(false)
                actionCompleted()
            } else {
                showNoApprovalErrorMessage(recommendForHoldRequest.error.message)
            }



        } catch (error) {

        }
    }

    const addEndUserToEndUsersList = endUser => {

        if (!selectedEndUsers.some(item => {
            return item._id === endUser._id
        })) {
            const tempSelectedEndUsers = [...selectedEndUsers]
            tempSelectedEndUsers.push(endUser)
            setSelectedEndUsers(tempSelectedEndUsers)
        }


    }

    const removeEndUser = endUserId => {
        let tempSelectedEndUsers = [...selectedEndUsers]

        tempSelectedEndUsers = tempSelectedEndUsers.filter(item => item._id !== endUserId)

        setSelectedEndUsers(tempSelectedEndUsers)
    }

    const getEmailsList = () => {
        let emailsList = ""

        selectedEndUsers.forEach((item, index) => {
            if (index === 0) {
                emailsList = emailsList + `${item.email}`
            } else if (index > 0 && index < selectedEndUsers.length - 1) {
                emailsList = emailsList + `, ${item.email} `
            } else if (index === selectedEndUsers.length - 1) {
                emailsList = emailsList + ` and ${item.email} `
            }
        })



        return emailsList
    }







    return (
        <div >
            {
                sectionToRemarkOn && <Modal>
                    <form onSubmit={e => {
                        e.preventDefault()
                        addRemarkToSection(sectionToRemarkOn.pageIndex, sectionToRemarkOn.sectionIndex, e.target[0].value)
                    }}>
                        <div className={styles.addRemarkModal}>
                            <div>
                                <header>
                                    <h2>Notes for Vendor</h2>

                                    <Image src={closeIcon} alt="close modal icon" width={20} height={20} style={{ cursor: "pointer" }} onClick={() => closeAddRemarkModal()} />
                                </header>

                                <h4><span>{pages[sectionToRemarkOn.pageIndex].pageTitle}</span> - <span>{pages[sectionToRemarkOn.pageIndex].sections[sectionToRemarkOn.sectionIndex].title}</span></h4>

                                <p className={styles.runnerText}>The contractor will be sent your notes if you choose to return the registration to them.</p>
                            </div>

                            <hr />

                            <div className={styles.addRemarkMidsection}>
                                <div>
                                    {
                                        pages[sectionToRemarkOn.pageIndex].sections[sectionToRemarkOn.sectionIndex].remarks && <div>
                                            {
                                                pages[sectionToRemarkOn.pageIndex].sections[sectionToRemarkOn.sectionIndex].remarks?.map((remark, index) => {
                                                    return <div className={styles.remarkItem} key={index}>
                                                        <p className={styles.remarkTitle}>{remark.remark}</p>
                                                        <p className={styles.remarkMeta}><span>{remark.userName}</span><p>|</p> <p>{new Date(remark.date).toLocaleDateString()}</p></p>
                                                    </div>
                                                })
                                            }
                                        </div>
                                    }

                                </div>

                                <textarea className={styles.remarkTextArea} placeholder="Type your notes here..." rows={6}></textarea>
                            </div>

                            <hr />

                            <div className={styles.submitButtonDiv}>
                                <button>Submit</button>
                            </div>
                        </div>
                    </form>
                </Modal>
            }



            {
                sectionToCommentOn && <Modal>
                    <form onSubmit={e => {
                        e.preventDefault()
                        addCommentToSection(sectionToCommentOn.pageIndex, sectionToCommentOn.sectionIndex, e.target[0].value)
                    }}>
                        <div className={styles.addRemarkModal}>
                            <div>
                                <header>
                                    <h2>Comments</h2>

                                    <Image src={closeIcon} alt="close modal icon" width={20} height={20} style={{ cursor: "pointer" }} onClick={() => closeAddCommentModal()} />
                                </header>

                                <h4><span>{pages[sectionToCommentOn.pageIndex].pageTitle}</span> - <span>{pages[sectionToCommentOn.pageIndex].sections[sectionToCommentOn.sectionIndex].title}</span></h4>

                                <p className={styles.runnerText}>Internal comments will only be visible to members of the C&P team.</p>
                            </div>

                            <hr />

                            <div className={styles.addRemarkMidsection}>
                                <div>
                                    {
                                        pages[sectionToCommentOn.pageIndex].sections[sectionToCommentOn.sectionIndex].comments?.map((item, index) => <div key={index} className={styles.remarkItem}>
                                            <p className={styles.remarkTitle}>{item.comment}</p>
                                            <p className={styles.remarkMeta}><span>{item.userName}</span><p>|</p> <p>{new Date(item.date).toDateString()}</p></p>
                                        </div>)
                                    }
                                </div>

                                <textarea className={styles.remarkTextArea} placeholder="Type your notes here..." rows={6}></textarea>
                            </div>

                            <hr />

                            <div className={styles.submitButtonDiv}>
                                <button>Submit</button>
                            </div>
                        </div>
                    </form>
                </Modal>
            }

            {
                currentCertificateHistory.length > 0 && <CertificateHistoryModal clearCurrentCertificateHistory={() => clearCurrentCertificateHistory()} currentCertificateHistory={currentCertificateHistory} />
            }

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
                                <button>Recommend for hold {itemBeingUpdated === "hold" && <ButtonLoadingIcon />}</button>
                            </div>
                        </form>
                    </div>
                </Modal>
            }

            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>
            </div>

            <h3 className={styles.subTitle}>Carry out Stage C</h3>

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

                            {/* <a><p>Notify contractor</p></a> */}
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

                            {/* <a><p>Ask contractor to update</p></a> */}
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

                                                    <div className={styles.sectionFooter}>
                                                        <p className={styles.commentsAndRemarksText} onClick={() => openAddCommentModal(index, sectionIndex)}>ADD INTERNAL COMMENT</p>

                                                        {
                                                            !sectionItem.approved && <p className={styles.commentsAndRemarksText} onClick={() => openAddRemarkModal(index, sectionIndex)}>ADD NOTES FOR VENDOR</p>
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

                    <div className={styles.finishButtonDiv}>
                        <button onClick={() => {
                            validateSectionApproval(null)
                            setShowApprovalActions(true)
                        }}>FINISH</button>
                    </div>
                </>
            }

            {
                showApprovalActions && <div className={styles.approvalActionsDiv}>
                    <h4>Approval Actions</h4>

                    {
                        noApprovalErrorMessage && <ErrorText text={noApprovalErrorMessage} />
                    }

                    {
                        (unaprovedSectionsWithNoRemarks.length > 0 && !applicationProcessed) && <div className={styles.unapprovedSectionsDiv}>
                            <p>The following unapproved sections have no notes for the vendor. Vendor notes are required to inform the vendor what they need to add/modify in the relevant section:</p>

                            {
                                unaprovedSectionsWithNoRemarks.map((item, index) => <p key={index}>{item}</p>)
                            }


                        </div>
                    }

                    {
                        (!approvedAll && unaprovedSectionsWithNoRemarks.length === 0 && !applicationProcessed) && <div className={styles.notApprovedDiv}>
                            <p>You have NOT approved all the items in the list for <span className={styles.companyName}>{approvalData?.companyName}</span>. Do not forget to comment on the items you have NOT approved.</p>

                            <p>To proceed. please take either of the following actions:</p>

                            <p className={styles.actionText}>1. Send automated email to applicant. This will move the company out of the registration process till the applicant corrects and re-submits. <button onClick={() => returnToContractor()}>PROCEED {itemBeingUpdated === "return" && <ButtonLoadingIconPrimary />}</button></p>

                            <p className={styles.actionText}>2. Recommend this application for hold by C&P Supervisor. The application will remain at L2 till the supervisor says otherwise. <button onClick={() => setShowSetReasonForHoldModal(true)}>PROCEED {itemBeingUpdated === "hold" && <ButtonLoadingIconPrimary />}</button> </p>
                        </div>
                    }

                    {
                        approvedAll && !applicationProcessed && <div className={styles.allApprovedDiv}>
                            {
                                !currentApprovalStatus && <>
                                    <p>You have reviewed all the approved items in the list.</p>

                                    <p>Please take either of the following actions:</p>

                                    <p>1. Select the Amni end user that should be notified about this company&#39;s registration. <a onClick={() => setCurrentApprovalStatus("select endusers")}>PROCEED</a></p>

                                    <p>2. Complete this application at L2. <a onClick={() => setShowSetReasonForHoldModal(true)}>PROCEED</a></p>
                                </>
                            }

                            {
                                currentApprovalStatus === "select endusers" && <div>
                                    <p>Select End User(s)</p>

                                    <div>
                                        {
                                            selectedEndUsers.map((item, index) => <div key={index}>
                                                <label>{item.name}</label>
                                                <Image onClick={() => removeEndUser(item._id)} src={closeIconWhite} alt="remove end user icon" width={10} height={10} style={{ cursor: "pointer", marginLeft: "10px" }} />
                                            </div>)
                                        }
                                    </div>

                                    <select onChange={event => addEndUserToEndUsersList(JSON.parse(event.target.value))
                                    }>
                                        <option selected disabled>Select an end user</option>

                                        {
                                            endUsers.map((item, index) => <option key={index} value={JSON.stringify(item)}>{item.name}</option>)
                                        }
                                    </select>

                                    {
                                        selectedEndUsers.length > 0 && <div className={styles.actionButtons}>
                                            <button onClick={() => setCurrentApprovalStatus("confirm")}>CONFIRM END USERS</button>
                                            <button onClick={() => setCurrentApprovalStatus("")}>Cancel</button>
                                        </div>
                                    }

                                </div>
                            }



                            {
                                currentApprovalStatus === "confirm" && <div className={styles.confirmApprovalDiv}>
                                    <p>Please confirm <span>Stage C Approval</span> for <span>{String(approvalData.companyName).toUpperCase()}</span> :</p>

                                    <p>{`On confirmation, notifications will be sent to ${getEmailsList()}`} </p>

                                    {
                                        selectedEndUsers.length > 0 && <div className={styles.actionButtons}>
                                            <button disabled={itemBeingUpdated === "approve"} onClick={() => { processToStageC() }}>CONFIRM APPROVAL STAGE C {itemBeingUpdated === "approve" && <ButtonLoadingIcon />}</button>
                                            <button onClick={() => setCurrentApprovalStatus("select endusers")}>CANCEL</button>
                                        </div>
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
            }
        </div>
    )
}

export default StageB