'use client'
import closeIcon from "@/assets/images/closeGrey.svg"
import Accordion from "@/components/accordion"
import { formatNumberAsCurrency } from "@/utilities/currency"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"


import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ButtonLoadingIconPrimary from "@/components/buttonLoadingPrimary"
import CertificateHistoryModal from "@/components/certificateHistory"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import Tabs from "@/components/tabs"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import moment from "moment"
import Image from "next/image"
import Link from "next/link"
import { useSelector } from "react-redux"



const ViewVendorPage = () => {

    const [approvalData, setApprovalData] = useState<any>({})
    const [currentPortalAdministrator, setCurrentPortalAdministrator] = useState<any>({})
    const [inviteDetails, setInviteDetails] = useState<any>({})
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
    const user = useSelector((state: any) => state.user)
    const [itemBeingUpdated, setItemBeingUpdated] = useState("")
    const [updateStatus, setUpdateStatus] = useState({
        status: "",
        message: ""
    })
    const router = useRouter()
    const [currentSelectedEndUsers, setCurrentSelectedEndUsers] = useState([])
    const [allAvailableEndUsers, setAllAvailableEndUsers] = useState([])


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
            const fetchVendorDataRequest = await getProtected(`companies/approval-data/${vendorID}`, user.role)



            if (fetchVendorDataRequest.status === "OK") {
                let tempVendorData = { ...vendorData }
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

                let tempCurrentPortalAdministrator = { ...currentPortalAdministrator }
                tempCurrentPortalAdministrator = fetchVendorDataRequest.data.portalAdministrator
                setCurrentPortalAdministrator(tempCurrentPortalAdministrator)

                let tempInviteDetails = { ...inviteDetails }
                tempInviteDetails = fetchVendorDataRequest.data.companyInvite
                setInviteDetails(tempInviteDetails)

                let tempCurrentSelectedEndUsers = [...currentSelectedEndUsers]
                tempCurrentSelectedEndUsers = fetchVendorDataRequest.data.currentEndUsers
                setCurrentSelectedEndUsers(tempCurrentSelectedEndUsers)

                let tempAllAvailableEndUsers = [...allAvailableEndUsers]
                tempAllAvailableEndUsers = fetchVendorDataRequest.data.allAmniStaff
                setAllAvailableEndUsers(tempAllAvailableEndUsers)

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


    const getFieldItemComponent = (field, index, section) => {
        switch (field.type) {
            case "shortText":
                return <div key={index} className={styles.fieldItem}>
                    <div>
                        <p className={styles.fieldData}>
                            <label>{`${field.label}:`}</label>

                            {
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
                                    field?.value[0]?.expiryDate && <p className={styles.expiryDateText}>{`Expiry date: ${field.value[0].expiryDate}`}</p>
                                }

                                {
                                    field.value && field?.value[0]?.expiryDate && <>

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
                            field?.value?.length > 0 && <p className={styles.multiSelectTextValues}>{field?.value?.map((item, index) => <p key={index}>{item.label}</p>)}</p>
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
        let tempSectionRemarksToShow = { ...sectionRemarksToShow }

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

    const approveParkRequest = async () => {
        try {
            updateUpdateStatus("approving")
            const approveRequest = await getProtected(`approvals/hold/approve/${vendorID}`, user.role)

            if (approveRequest.status === "OK") {
                updateUpdateStatus("park action success", "Vendor application parked")

                let tempApprovalData = { ...approvalData }
                tempApprovalData.flags.status = "parked"
                setApprovalData(tempApprovalData)
            } else {
                updateUpdateStatus("park action error", approveRequest.error.message)
            }
        } catch (error) {

        }
    }

    const rejectParkRequestAndRevertToL2 = async (from) => {

        try {
            updateUpdateStatus("rejecting")
            const revertRequest = await postProtected(`approvals/revert/l2/${vendorID}`, { from }, user.role)

            if (revertRequest.status === "OK") {
                updateUpdateStatus("park action success", "Park request declined. Vendor has been moved back to pending L2.")

                let tempApprovalData = { ...approvalData }
                tempApprovalData.flags.status = "pending"
                setApprovalData(tempApprovalData)
            } else {
                updateUpdateStatus("park action error", revertRequest.error.message)
            }


        } catch (error) {

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
        let tempUpdateStatus = { ...updateStatus }
        tempUpdateStatus.status = status
        tempUpdateStatus.message = message
        setUpdateStatus(tempUpdateStatus)
    }

    const [showSetAccountInactiveModal, setShowSetAccountInactiveModal] = useState(false)

    const [accountInactiveStatus, setAccountInactiveStatus] = useState({
        status: "active",
        responseType: "",
        message: ""
    })

    const toggleShowSetAccountInactiveModal = () => {
        if (showSetAccountInactiveModal) {
            setShowSetAccountInactiveModal(false)
            setAccountInactiveStatus({ ...accountInactiveStatus, responseType: "", message: "" })
        } else {
            setShowSetAccountInactiveModal(true)
        }
    }

    const makeVendorInactive = async () => {
        try {
            setAccountInactiveStatus({ ...accountInactiveStatus, status: "making inactive" })

            const makeVendorInactiveRequest = await getProtected(`companies/vendor/make-inactive/${vendorID}`, user.role)

            if (makeVendorInactiveRequest.status === "OK") {
                setAccountInactiveStatus({ ...accountInactiveStatus, responseType: "success", message: "Vendor has been marked as inactive and has been removed from the vendors list." })

                setTimeout(() => {
                    router.push("/staff/approvals")
                }, 4000)
            } else {
                setAccountInactiveStatus({ ...accountInactiveStatus, responseType: "error", message: makeVendorInactiveRequest.error.message })
            }
        } catch (error) {

        }
    }



    const [activeModifyContractorTab, setActiveModifyContractorTab] = useState("currentEndUsers")
    const modifyContractorModalTabs = [
        {
            label: "Change Current End Users",
            name: "currentEndUsers"
        },
        {
            label: "Change Portal Administrator",
            name: "portalAdmin"
        }
    ]

    const [endUserAction, setEndUserAction] = useState({
        action: "",
        index: null,
        status: "",
        response: {
            error: "",
            success: ""
        }
    })

    const [newPortalAdminAction, setNewPortalAdminAction] = useState({
        status: "",
        response: {
            error: "",
            success: ""
        }
    })

    const [showModifyContractorModal, setShowModifyContractorModal] = useState(false)

    const updateEndUserResponses = (responseField, responseMessage) => {
        let tempEndUserAction = { ...endUserAction }
        tempEndUserAction.response[responseField] = responseMessage
        setEndUserAction(tempEndUserAction)
    }

    const clearEndUserResponses = () => {
        let tempEndUserAction = { ...endUserAction }
        tempEndUserAction.response.error = ""
        tempEndUserAction.response.success = ""
        setEndUserAction(tempEndUserAction)
    }

    const validateEndUser = (event, previousEndUser, requestType) => {
        event.preventDefault()

        clearEndUserResponses()

        const value = event.target[0].value

        if (value === "") {
            updateEndUserResponses("error", "Please select a replacement end user.")
        } else if (approvalData.currentEndUsers.includes(value)) {
            updateEndUserResponses("error", "End user already exists for this contractor application. Please select a different end user.")

        } else {
            if (requestType === "replace") {
                replaceEndUserInCurrentEndUsers(value, previousEndUser)
            } else {
                addEndUser(value)
            }
        }

    }

    const replaceEndUserInCurrentEndUsers = (newEndUser, previousEndUser) => {
        let endUsersListWithoutPreviousEndUser = approvalData.currentEndUsers.filter((endUser) => endUser !== previousEndUser)
        endUsersListWithoutPreviousEndUser.push(newEndUser)


        replaceEndUser(endUsersListWithoutPreviousEndUser)
    }

    const replaceEndUser = async (updatedEndUsersList) => {
        const tempEndUserAction = { ...endUserAction }
        tempEndUserAction.status = "updating"
        setEndUserAction(tempEndUserAction)
        try {
            const replaceEndUserRequest = await putProtected(`companies/vendor/end-users/${vendorID}`, {
                updatedEndUsersList
            }, user.role)




            if (replaceEndUserRequest.status === "OK") {

                const { currentEndUsers, updatedEndUsersList } = replaceEndUserRequest.data

                const tempApprovalData = { ...approvalData }
                tempApprovalData.currentEndUsers = updatedEndUsersList
                setApprovalData(tempApprovalData)

                let tempCurrentSelectedEndUsers = [...currentSelectedEndUsers]
                tempCurrentSelectedEndUsers = currentEndUsers
                setCurrentSelectedEndUsers(tempCurrentSelectedEndUsers)

                updateEndUserResponses("success", "Successfully replaced end user.")
            } else {
                updateEndUserResponses("error", replaceEndUserRequest.error.message)
            }
        } catch (error) {
            console.error({ error });

        }
    }

    const removeEndUser = async (endUserID) => {


        try {
            const removeEndUserRequest = await postProtected(`companies/vendor/end-users/remove/${vendorID}`, {
                endUserID
            }, user.role)

            if (removeEndUserRequest.status === "OK") {
                const { updatedEndUsersList, currentEndUsers } = removeEndUserRequest.data

                const tempApprovalData = { ...approvalData }
                tempApprovalData.currentEndUsers = updatedEndUsersList
                setApprovalData(tempApprovalData)

                let tempCurrentSelectedEndUsers = [...currentSelectedEndUsers]
                tempCurrentSelectedEndUsers = currentEndUsers
                setCurrentSelectedEndUsers(tempCurrentSelectedEndUsers)

                updateEndUserResponses("success", "Successfully removed end user.")

                resetEndUserAction()
            } else {
                updateEndUserResponses("error", removeEndUserRequest.error.message)
            }

        } catch (error) {
            console.error({ error });
        }
    }

    const resetEndUserAction = () => {
        let tempEndUserAction = { ...endUserAction }
        tempEndUserAction.action = ""
        tempEndUserAction.index = null
        tempEndUserAction.status = ""
        tempEndUserAction.response.error = ""
        tempEndUserAction.response.success = ""
        setEndUserAction(tempEndUserAction)
    }



    const addEndUser = async (newEndUserID) => {

        try {
            let tempEndUserAction = { ...endUserAction }
            tempEndUserAction.status = "adding"
            setEndUserAction(tempEndUserAction)

            const addEndUserRequest = await postProtected(`companies/vendor/end-users/${vendorID}`, {
                newEndUserID
            }, user.role)

            if (addEndUserRequest.status === "OK") {
                let tempCurrentSelectedEndUsers = [...currentSelectedEndUsers]
                let tempApprovalData = { ...approvalData }

                const { updatedEndUsersList, currentEndUsers } = addEndUserRequest.data

                tempApprovalData.currentEndUsers = updatedEndUsersList
                setApprovalData(tempApprovalData)

                tempCurrentSelectedEndUsers = currentEndUsers
                setCurrentSelectedEndUsers(tempCurrentSelectedEndUsers)

                updateEndUserResponses("success", "Successfully added end user.")
            } else {
                updateEndUserResponses("error", addEndUserRequest.error.message)
            }



        } catch (error) {
            console.error({ error });
        }
    }

    const validateNewPortalAdminEmail = async (event) => {
        event.preventDefault()

        const email = event.target[0].value

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!email) {
            updateNewPortalAdminAction("error", "Please enter an email address.")
        } else if (!emailRegex.test(email)) {
            updateNewPortalAdminAction("error", "Please enter a valid email address.")
        } else {
            updateNewPortalAdminAction("error", "")
            requestNewPortalAdmin(email)
        }
    }

    const updateNewPortalAdminAction = (field, value) => {
        let tempNewPortalAdminAction = { ...newPortalAdminAction }

        if (field === "status") {
            tempNewPortalAdminAction[field] = value
        } else {
            tempNewPortalAdminAction.response[field] = value
        }

        setNewPortalAdminAction(tempNewPortalAdminAction)
    }

    const resetNewPortalAdminAction = () => {
        let tempNewPortalAdminAction = { ...newPortalAdminAction }

        tempNewPortalAdminAction.status = ""
        tempNewPortalAdminAction.response.error = ""
        tempNewPortalAdminAction.response.success = ""

        setNewPortalAdminAction(tempNewPortalAdminAction)
    }

    const requestNewPortalAdmin = async (email) => {
        updateNewPortalAdminAction("status", "requesting")
        try {
            const requestNewPortalAdminRequest = await postProtected(`companies/portal-admin/replace/${vendorID}`, { email }, user.role)
            updateNewPortalAdminAction("status", "")

            if (requestNewPortalAdminRequest.status === "OK") {
                updateNewPortalAdminAction("success", "Successfully requested new portal admin.")
            } else {
                updateNewPortalAdminAction("error", requestNewPortalAdminRequest.error.message)
            }
        } catch (error) {
            console.error({ error });
        }
    }

    const closeModifyContractorModal = () => {
        setShowModifyContractorModal(false)
        resetEndUserAction()
        resetNewPortalAdminAction()
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





    return (
        <div>
            <div className={styles.approvalHeader}>
                <h1>{approvalData.companyName}</h1>

                <div className={styles.vendorPageActions}>
                    <Link href={`/staff/approvals/${vendorID}`}>OPEN IN APPROVAL VIEW</Link>
                    <a onClick={() => hideAllRemarks()}>HIDE COMMENTS</a>

                    {
                        (user?.user?.role === "Admin" || user?.user?.role === "C&P Admin" || user?.user?.role === "HOD" || user?.user?.tempRole === "HOD") && <>
                            <a onClick={() => toggleShowSetAccountInactiveModal()}>MAKE INACTIVE</a>

                            <a onClick={() => setShowModifyContractorModal(true)}>MODIFY CONTRACTOR</a>
                        </>
                    }


                </div>

                {
                    showModifyContractorModal && <Modal>
                        <div className={styles.modifyContractorModal}>
                            <h2>Modify Contractor</h2>


                            <div className={styles.tabsContainer}>
                                <Tabs activeTab={activeModifyContractorTab} tabs={modifyContractorModalTabs} updateActiveTab={(newActiveTab) => {
                                    setActiveModifyContractorTab(newActiveTab)
                                }} />
                            </div>

                            {
                                activeModifyContractorTab === "currentEndUsers" && <div className={styles.currentEndUsersContainer}>
                                    <h4>Current End Users:</h4>



                                    {
                                        currentSelectedEndUsers.map((item, index) => <div key={index} className={styles.endUserItem}>
                                            <div className={styles.endUserDetailsContainer}>
                                                <label>{item.name}</label>

                                                <div>
                                                    <button onClick={() => {
                                                        setEndUserAction({ ...endUserAction, action: "remove", index: index })
                                                        removeEndUser(item._id)
                                                    }}>Remove</button>

                                                    {
                                                        endUserAction.action === "remove" && index === endUserAction.index && <ButtonLoadingIconPrimary />
                                                    }

                                                    <button onClick={() => setEndUserAction({ ...endUserAction, action: "replace", index: index })}>Replace</button>

                                                </div>
                                            </div>

                                            {
                                                endUserAction.action === "replace" && index === endUserAction.index && <form onSubmit={e => validateEndUser(e, item._id, "replace")}>
                                                    <div className={styles.replaceEndUserDiv}>
                                                        <select>
                                                            <option>Select a replacement end user</option>

                                                            {
                                                                allAvailableEndUsers.map((item, index) => <option value={item._id} key={index}>{item.name}</option>)
                                                            }
                                                        </select>

                                                        <button>Save {endUserAction.status === "updating" && <ButtonLoadingIcon />}</button>

                                                        <button onClick={() => setEndUserAction({ action: "", index: null, response: { error: "", success: "" }, status: "" })}>Cancel</button>
                                                    </div>
                                                </form>
                                            }

                                            <hr />



                                        </div>)
                                    }

                                    {
                                        endUserAction.response.error && <ErrorText text={endUserAction.response.error} />
                                    }

                                    {
                                        endUserAction.response.success && <SuccessMessage message={endUserAction.response.success} />
                                    }





                                    <div className={styles.addEndUserDiv}>
                                        <h3>Add End User</h3>

                                        <form onSubmit={e => validateEndUser(e, "", "add")}>
                                            <div>
                                                <select>
                                                    <option>Select an end user</option>

                                                    {
                                                        allAvailableEndUsers.map((item, index) => <option value={item._id} key={index}>{item.name}</option>)
                                                    }
                                                </select>

                                                <button>Add {endUserAction.status === "adding" && <ButtonLoadingIcon />}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            }

                            {
                                activeModifyContractorTab === "portalAdmin" && <div className={styles.portalAdminContainer}>
                                    <h3>Current Portal Administrator</h3>

                                    <div>
                                        <div className={styles.currentAdminInfoItem}>
                                            <label>Name</label>

                                            <p>{currentPortalAdministrator.name}</p>
                                        </div>

                                        <div className={styles.currentAdminInfoItem}>
                                            <label>Email</label>

                                            <p>{currentPortalAdministrator.email}</p>
                                        </div>

                                        <div className={styles.currentAdminInfoItem}>
                                            <label>Phone Number</label>

                                            <p>{currentPortalAdministrator?.phone?.number ? currentPortalAdministrator.phone.number : currentPortalAdministrator.phone}</p>
                                        </div>
                                    </div>


                                    <hr />


                                    <h3>Replace Portal Administrator</h3>

                                    {
                                        newPortalAdminAction.response.error && <ErrorText text={newPortalAdminAction.response.error} />
                                    }

                                    {
                                        newPortalAdminAction.response.success && <SuccessMessage message={newPortalAdminAction.response.success} />
                                    }

                                    <form onSubmit={e => validateNewPortalAdminEmail(e)}>
                                        <div className={styles.replaceAdministratorDiv}>
                                            <input placeholder="Enter the new portal administrator's email address" />
                                            <button>Send Replacement Request {newPortalAdminAction.status === "requesting" && <ButtonLoadingIcon />}</button>
                                        </div>
                                    </form>
                                </div>
                            }

                            <div className={styles.closeModifyContractorModalDiv}>
                                <button onClick={() => closeModifyContractorModal()}>Close</button>
                            </div>
                        </div>
                    </Modal>
                }

                {
                    showSetAccountInactiveModal && <Modal>
                        <div className={styles.makeInactiveModal}>
                            <h2>Make Vendor Inactive</h2>

                            <p>You are about to make this vendor account inactive. Their user account will be deleted and their vendor records archived. Continue?</p>

                            <div>
                                {
                                    accountInactiveStatus.responseType === "success" && <SuccessMessage message={"Vendor has been marked as inactive and has been removed from the vendors list. Returning to vendors list..."} />
                                }

                                {
                                    accountInactiveStatus.responseType === "error" && <ErrorText text={accountInactiveStatus.message} />
                                }
                            </div>

                            {
                                accountInactiveStatus.responseType !== "success" && <div className={styles.actionButtons}>
                                    <button onClick={() => toggleShowSetAccountInactiveModal()}>Cancel</button>
                                    <button onClick={() => makeVendorInactive()}>Confirm {accountInactiveStatus.status === "making inactive" && <ButtonLoadingIcon />}</button>
                                </div>
                            }
                        </div>
                    </Modal>
                }


                {
                    currentCertificateHistory?.length > 0 && <CertificateHistoryModal clearCurrentCertificateHistory={() => clearCurrentCertificateHistory()} currentCertificateHistory={currentCertificateHistory} />
                }


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
                        expiringCertificates?.length > 0 && <div className={styles.expiringCertificatesDiv}>
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
                        expiredCertificates?.length > 0 && <div className={styles.expiredCertificatesDiv}>
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

                        <Accordion defaultOpen={true} title="Contractor Details">
                            <div className={styles.sectionItem}>
                                <div>
                                    <div className={styles.sectionHeader}>
                                        <h6>{"Invite Details"}</h6>
                                    </div>

                                    <div>
                                        <div className={styles.fieldItem}>
                                            <div>
                                                <p className={styles.fieldData}>
                                                    <label>{`Invited Company Name:`}</label>
                                                    {
                                                        <p>{inviteDetails?.invitedCompanyName}</p>
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className={styles.fieldItem}>
                                            <div>
                                                <p className={styles.fieldData}>
                                                    <label>{`Invited by:`}</label>
                                                    {
                                                        <p>{inviteDetails?.name}</p>
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    <div className={styles.sectionHeader}>
                                        <h6 style={{ marginTop: "20px" }}>{"Portal Administrator"}</h6>
                                    </div>

                                    <div>
                                        <div className={styles.fieldItem}>
                                            <div>
                                                <p className={styles.fieldData}>
                                                    <label>{`Name:`}</label>
                                                    {
                                                        <p>{currentPortalAdministrator?.name}</p>
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className={styles.fieldItem}>
                                            <div>
                                                <p className={styles.fieldData}>
                                                    <label>{`Email:`}</label>
                                                    {
                                                        <p>{currentPortalAdministrator?.email}</p>
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </Accordion>

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
                                                            sectionItem.fields.map((fieldItem, fieldIndex) => getFieldItemComponent(fieldItem, fieldIndex, sectionItem))
                                                        }
                                                    </div>

                                                    <div>


                                                        {
                                                            (sectionItem.remarks && sectionItem.remarks?.length > 0) && <div className={styles.showCommentTriggerDiv}>
                                                                <p onClick={() => toggleHideSectionRemarks(index, sectionIndex)}>SHOW COMMENTS</p>
                                                            </div>
                                                        }

                                                        {
                                                            sectionRemarksToShow[index]?.includes(sectionIndex) && <div>
                                                                {
                                                                    sectionItem?.remarks && sectionItem?.remarks?.length > 0 && <div className={styles.remarksContent}>
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
                                                                    sectionItem?.comments && sectionItem?.comments?.length > 0 && <div className={styles.commentsContent}>
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
                                                        sectionIndex !== item.sections?.length - 1 && <hr />
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


                </>
            }


        </div>
    )
}

export default ViewVendorPage