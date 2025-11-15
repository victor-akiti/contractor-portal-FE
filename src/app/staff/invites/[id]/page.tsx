'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import SuccessText from "@/components/successText"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import _ from "underscore"
import styles from "./styles/styles.module.css"

type InvitedCompany = {
    fname: string,
    lname: string,
    email: string,
    phone: any,
    companyName: string,
    _id?: string
}

const validateEmail = (email: string) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
    return emailRegex.test(email)
}

const ResendInvite = () => {
    const invitedCompanyTemplate = {
        fname: "",
        lname: "",
        email: "",
        phone: "",
        companyName: ""
    }
    const [submitting, setSubmitting] = useState(false)
    const [newInvitee, setNewInvitee] = useState<InvitedCompany>(invitedCompanyTemplate)
    const [selectedExistingCompany, setSelectedExistingCompany] = useState<InvitedCompany>(invitedCompanyTemplate)

    const [errorMessage, setErrorMessage] = useState<String>("")
    const [successMessage, setSuccessMessage] = useState<String>("")
    const [similarCompanyNames, setSimilarCompanyNames] = useState([])
    const [currentQueryString, setCurrentQueryString] = useState("")
    const [searchingCompanies, setSearchingCompanies] = useState(false)
    const emailFieldRef = useRef(null)
    const [registrationStatus, setRegistrationStatus] = useState({
        status: 0,
        showReminderModal: false,
        reminderModalText: "",
        reminderModalButtonText: ""
    })
    const [inviteRequestStatus, setInviteRequestStatus] = useState({
        fetchingInvite: true,
        fetchedInvite: false,
        fetchingRelatedCompanies: false,
        fetchedRelatedCompanies: false
    })
    const [validationErrors, setValidationErrors] = useState({
        fname: false,
        lname: false,
        email: false,
        phone: false,
        companyName: false
    })
    const user = useSelector((state: any) => state.user.user)
    const params = useParams()

    useEffect(() => {
        fetchInvite()
    }, [params])

    useEffect(() => {
        fetchAllCompanies()
    }, [])

    const fetchInvite = async () => {
        const { id } = params
        if (id) {
            const fetchInviteRequest = await getProtected(`invites/invite/${id}`, user.role)

            if (fetchInviteRequest.status === "OK") {
                let tempInvitee = { ...newInvitee }
                tempInvitee = fetchInviteRequest.data
                setNewInvitee(tempInvitee)

                let tempInviteRequestStatus = { ...inviteRequestStatus }
                tempInviteRequestStatus.fetchedInvite = true
                tempInviteRequestStatus.fetchingInvite = false
                setInviteRequestStatus(tempInviteRequestStatus)
            }
        }
    }

    const fetchAllCompanies = async () => {
        try {
            // const fetchAllCompaniesRequest = await getProtected("companies/all")
            // const migrateRegistrationRequests = await getProtected("migrations/registrationRequests")
            // const migrateNewRequests = await getProtected("migrations/newRequests")
        } catch (error) {
            console.error({ error });
        }
    }

    const findCompany = async (queryString: String) => {
        try {
            if (queryString.length < 2) {
                setSimilarCompanyNames([])
                return
            }

            setSearchingCompanies(true)
            const findCompanyRequest = await postProtected("invites/find", { queryString }, user.role)

            if (findCompanyRequest.status === "OK") {
                let tempSimilarCompanies = [...similarCompanyNames]
                tempSimilarCompanies = findCompanyRequest.data.companies
                setSimilarCompanyNames(tempSimilarCompanies)
            }
            setSearchingCompanies(false)
        } catch (error) {
            console.error({ error });
            setSearchingCompanies(false)
        }
    }

    const updateNewInvitee = (event: any) => {
        const field: string = event.target.name
        const value: string = event.target.value

        let tempInvitee = { ...newInvitee }
        //@ts-ignore
        tempInvitee[String(field)] = value
        setNewInvitee(tempInvitee)

        // Clear validation error for this field
        setValidationErrors(prev => ({ ...prev, [field]: false }))
    }

    const validateNewInviteeDetails = () => {
        const errors = {
            fname: !newInvitee.fname,
            lname: !newInvitee.lname,
            email: !newInvitee.email || !validateEmail(newInvitee.email),
            phone: !newInvitee.phone,
            companyName: !newInvitee.companyName
        }

        setValidationErrors(errors)

        if (!newInvitee.fname) {
            setErrorMessage("Please enter a first name")
        } else if (!newInvitee.lname) {
            setErrorMessage("Please enter a last name")
        } else if (!newInvitee.email) {
            setErrorMessage("Please enter an email address")
        } else if (!validateEmail(newInvitee.email)) {
            setErrorMessage("Please enter a valid email address")
        } else if (!newInvitee.phone) {
            setErrorMessage("Please enter a phone number")
        } else if (!newInvitee.companyName) {
            setErrorMessage("Please enter a company name")
        } else {
            setErrorMessage("")
            if (selectedExistingCompany._id) {
                getCompanyRegistrationStatus()
            } else {
                if (similarCompanyNames.length > 0) {
                    let tempRegistrationStatus = { ...registrationStatus }
                    tempRegistrationStatus.status = 5
                    tempRegistrationStatus.reminderModalText = "There is at least one company with a similar name to the one you're trying to invite. Continue?"
                    tempRegistrationStatus.reminderModalButtonText = "Send Invite"
                    tempRegistrationStatus.showReminderModal = true
                    setRegistrationStatus(tempRegistrationStatus)
                } else {
                    sendNewInvite()
                }
            }
        }
    }

    const getCompanyRegistrationStatus = async () => {
        try {
            const getRegistrationStatusRequest = await postProtected("companies/registrationstatus/get", { email: newInvitee.email, companyName: newInvitee.companyName, type: "resend", inviteID: params.id }, user.role)
            if (getRegistrationStatusRequest.status === "OK") {
                let tempRegistrationStatus = { ...registrationStatus }
                if (getRegistrationStatusRequest.data.inviteStatus === 2 || getRegistrationStatusRequest.data.inviteStatus === 2) {
                    tempRegistrationStatus.status = getRegistrationStatusRequest.data.inviteStatus
                    tempRegistrationStatus.reminderModalText = "A company has already been invited with this same name and email address. Would you like to send them an invite reminder?"
                    tempRegistrationStatus.reminderModalButtonText = "Send Reminder"
                    tempRegistrationStatus.showReminderModal = true
                } else {
                    tempRegistrationStatus.status = getRegistrationStatusRequest.data.inviteStatus
                    tempRegistrationStatus.reminderModalText = "A company has already been invited with this same name but a different email address. Would you like to update their invite details and resend their invite?"
                    tempRegistrationStatus.reminderModalButtonText = "Update & Resend"
                    tempRegistrationStatus.showReminderModal = true
                }
                setRegistrationStatus(tempRegistrationStatus)
            } else {
                setErrorMessage(getRegistrationStatusRequest?.error?.message)
            }
        } catch (error) {
            console.error({ error });
        }
    }

    const sendNewInvite = async () => {
        try {
            if (!submitting) {
                setSubmitting(true)
                setSuccessMessage("")
                setErrorMessage("")
                const sendNewInviteRequest = await postProtected("invites/resend", { ...newInvitee, inviteID: params.id }, user.role)

                if (sendNewInviteRequest.status === "OK") {
                    setSuccessMessage(`Invite sent to ${newInvitee.email} successfully.`)
                } else {
                    setErrorMessage(sendNewInviteRequest.error.message)
                }

                setSubmitting(false)
            }
        } catch (error) {
            setSubmitting(false)
            console.error({ error });
        }
    }

    const sendReminder = () => {
        // Implementation for sending reminder
    }

    const resetExpiredInvite = () => {
        // Implementation for resetting expired invite
    }

    const selectSimilarCompanyName = (company: InvitedCompany) => {
        if (emailFieldRef.current) {
            emailFieldRef.current.value = company.companyName
        }

        let tempSelectedSimilarcompany = { ...selectedExistingCompany }
        tempSelectedSimilarcompany = company
        setSelectedExistingCompany(tempSelectedSimilarcompany)

        let tempInvitee = { ...newInvitee }
        tempInvitee.companyName = company.companyName
        setNewInvitee(tempInvitee)
    }

    const closeNoticeModal = () => {
        let tempRegistrationStatus = { ...registrationStatus }
        tempRegistrationStatus.showReminderModal = false
        setRegistrationStatus(tempRegistrationStatus)
    }

    const noticeModalAction = () => {
        switch (registrationStatus.status) {
            case 1:
                break;
            case 2:
                break;
            case 3:
                break;
            case 4:
                break;
            case 5:
                return sendNewInvite()
            default: {
            }
        }
        closeNoticeModal()
    }

    return (
        <div className={styles.inviteContainer}>
            <div className={styles.inviteCard}>
                {/* Header */}
                <div className={styles.inviteHeader}>
                    <h5>Re-send Registration Invite</h5>
                    <p className={styles.inviteSubtitle}>Update and resend the registration invite to this company</p>
                </div>

                {/* Status Messages */}
                {errorMessage && (
                    <div className={styles.statusMessage}>
                        <ErrorText text={String(errorMessage)} />
                    </div>
                )}

                {successMessage && (
                    <div className={styles.statusMessage}>
                        <SuccessText text={String(successMessage)} />
                    </div>
                )}

                {/* Confirmation Modal */}
                {registrationStatus.showReminderModal && (
                    <Modal>
                        <div className={styles.confirmModal}>
                            <div className={styles.confirmModalHeader}>
                                <h3>Confirmation Required</h3>
                            </div>
                            <p className={styles.confirmModalText}>{registrationStatus.reminderModalText}</p>
                            <div className={styles.confirmModalActions}>
                                <button
                                    className={styles.confirmButton}
                                    onClick={noticeModalAction}
                                >
                                    {registrationStatus.reminderModalButtonText}
                                </button>
                                <button
                                    className={styles.cancelButton}
                                    onClick={closeNoticeModal}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Loading State */}
                {inviteRequestStatus.fetchingInvite && (
                    <div className={styles.loadingContainer}>
                        <Loading message={"Fetching Invite Details"} />
                    </div>
                )}

                {/* Main Content */}
                {inviteRequestStatus.fetchedInvite && (
                    <div className={styles.inviteContent}>
                        {/* Form Section */}
                        <div className={styles.formSection}>
                            <form
                                onSubmit={event => {
                                    event.preventDefault()
                                    validateNewInviteeDetails()
                                }}
                            >
                                {/* Name Fields */}
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="fname">First Name *</label>
                                        <input
                                            id="fname"
                                            placeholder="Enter first name"
                                            name="fname"
                                            value={newInvitee.fname}
                                            onChange={updateNewInvitee}
                                            className={validationErrors.fname ? styles.inputError : ''}
                                            autoComplete="given-name"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="lname">Last Name *</label>
                                        <input
                                            id="lname"
                                            placeholder="Enter last name"
                                            name="lname"
                                            value={newInvitee.lname}
                                            onChange={updateNewInvitee}
                                            className={validationErrors.lname ? styles.inputError : ''}
                                            autoComplete="family-name"
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className={styles.formGroup}>
                                    <label htmlFor="email">Email Address *</label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="company@example.com"
                                        name="email"
                                        value={newInvitee.email}
                                        onChange={updateNewInvitee}
                                        className={validationErrors.email ? styles.inputError : ''}
                                        autoComplete="email"
                                    />
                                </div>

                                {/* Phone Field */}
                                <div className={styles.formGroup}>
                                    <label htmlFor="phone">Phone Number *</label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        placeholder="+234 XXX XXX XXXX"
                                        name="phone"
                                        value={newInvitee.phone?.number || newInvitee.phone || ""}
                                        onChange={updateNewInvitee}
                                        className={validationErrors.phone ? styles.inputError : ''}
                                        autoComplete="tel"
                                    />
                                </div>

                                {/* Company Name Field */}
                                <div className={styles.formGroup}>
                                    <label htmlFor="companyName">Company Name *</label>
                                    <input
                                        id="companyName"
                                        ref={emailFieldRef}
                                        placeholder="Enter company name"
                                        name="companyName"
                                        value={newInvitee.companyName}
                                        onChange={event => {
                                            updateNewInvitee(event)
                                            _.debounce(() => findCompany(event.target.value), 500)()
                                        }}
                                        className={validationErrors.companyName ? styles.inputError : ''}
                                        autoComplete="organization"
                                    />
                                    {searchingCompanies && (
                                        <span className={styles.searchingIndicator}>Searching...</span>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span>Sending Invite</span>
                                            <ButtonLoadingIcon />
                                        </>
                                    ) : (
                                        <>
                                            <svg className={styles.buttonIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path d="M2.5 7.5L10 2.5L17.5 7.5M2.5 7.5L10 12.5M2.5 7.5V12.5L10 17.5M17.5 7.5L10 12.5M17.5 7.5V12.5L10 17.5M10 12.5V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>Re-send Invite Link</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Similar Companies Sidebar */}
                        <div className={styles.sidebarSection}>
                            <div className={styles.similarCompaniesCard}>
                                <div className={styles.sidebarHeader}>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 2.5C5.86 2.5 2.5 5.86 2.5 10C2.5 14.14 5.86 17.5 10 17.5C14.14 17.5 17.5 14.14 17.5 10C17.5 5.86 14.14 2.5 10 2.5ZM10 12.5C8.62 12.5 7.5 11.38 7.5 10C7.5 8.62 8.62 7.5 10 7.5C11.38 7.5 12.5 8.62 12.5 10C12.5 11.38 11.38 12.5 10 12.5Z" fill="currentColor" />
                                    </svg>
                                    <h6>Similar Registered Companies</h6>
                                </div>

                                {similarCompanyNames.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>No similar companies found</p>
                                        <span>Start typing a company name to see matches</span>
                                    </div>
                                ) : (
                                    <div className={styles.similarCompaniesList}>
                                        {similarCompanyNames.map((item: InvitedCompany, index) => (
                                            <div
                                                key={index}
                                                className={`${styles.companyItem} ${selectedExistingCompany._id === item._id ? styles.selected : ''}`}
                                                onClick={() => selectSimilarCompanyName(item)}
                                            >
                                                <div className={styles.companyIcon}>
                                                    {item.companyName.charAt(0).toUpperCase()}
                                                </div>
                                                <p>{item.companyName}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Info Card */}
                            <div className={styles.infoCard}>
                                <div className={styles.infoIcon}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
                                    </svg>
                                </div>
                                <h6>Re-sending Invite</h6>
                                <p>You can update the invite details and resend the registration link. The company will receive a new email with updated information.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ResendInvite