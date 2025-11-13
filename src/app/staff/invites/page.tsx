'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessText from "@/components/successText"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import _ from "underscore"
import styles from "./styles/styles.module.css"

type InvitedCompany = {
    fname: string
    lname: string
    email: string
    phone: string
    companyName: string
    recommendedBy?: {
        name: string
        department: string
        email?: string
        userId?: string
    }
    _id?: string
}

type StaffMember = {
    _id: string
    name: string
    email: string
    department?: string
    uid: string
}

const validateEmail = (email: string) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
    return emailRegex.test(email)
}

// Department list from your user management
const DEPARTMENTS = [
    "Contracts and Procurement",
    "Corporate Communications",
    "Drilling",
    "Finance",
    "Legal",
    "Human Resources",
    "Internal Control and Risk Management",
    "ICT",
    "Insurance",
    "Information Management",
    "Operations"
]

const Invites = () => {
    const invitedCompanyTemplate = {
        fname: "",
        lname: "",
        email: "",
        phone: "",
        companyName: "",
        recommendedBy: {
            name: "",
            department: ""
        }
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

    // States for staff autocomplete
    const [allStaff, setAllStaff] = useState<StaffMember[]>([])
    const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([])
    const [showStaffDropdown, setShowStaffDropdown] = useState(false)
    const [loadingStaff, setLoadingStaff] = useState(false)
    const staffDropdownRef = useRef(null)

    const [registrationStatus, setRegistrationStatus] = useState({
        status: 0,
        showReminderModal: false,
        reminderModalText: "",
        reminderModalButtonText: ""
    })

    const [validationErrors, setValidationErrors] = useState({
        fname: false,
        lname: false,
        email: false,
        phone: false,
        companyName: false
    })

    const user = useSelector((state: any) => state.user.user)

    useEffect(() => {
        fetchAllStaff()
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
                setShowStaffDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchAllStaff = async () => {
        try {
            setLoadingStaff(true)
            const staffRequest = await getProtected("users/staff/all", user.role)

            if (staffRequest.status === "OK") {
                setAllStaff(staffRequest.data)
            }
            setLoadingStaff(false)
        } catch (error) {
            console.error({ error })
            setLoadingStaff(false)
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
                setSimilarCompanyNames(findCompanyRequest.data.companies)
            }
            setSearchingCompanies(false)
        } catch (error) {
            console.error({ error })
            setSearchingCompanies(false)
        }
    }

    // THIS IS THE SMART FILTER - It filters staff as you type
    const filterStaff = (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 2) {
            setFilteredStaff([])
            setShowStaffDropdown(false)
            return
        }

        const filtered = allStaff.filter((staff) =>
            (staff.name && staff.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (staff.email && staff.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (staff.department && staff.department.toLowerCase().includes(searchTerm.toLowerCase()))
        ).slice(0, 10) // Limit to 10 suggestions

        setFilteredStaff(filtered)
        setShowStaffDropdown(filtered.length > 0)
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

    // THIS FUNCTION IS CALLED WHEN YOU TYPE IN THE NAME FIELD
    const updateRecommendedBy = (field: 'name' | 'department', value: string) => {
        setNewInvitee(prev => ({
            ...prev,
            recommendedBy: {
                ...prev.recommendedBy,
                [field]: value
            }
        }))

        // Auto-filter staff when typing in name field - THIS TRIGGERS THE AUTOCOMPLETE
        if (field === 'name') {
            filterStaff(value)
        }
    }

    // THIS FUNCTION IS CALLED WHEN YOU SELECT A STAFF MEMBER FROM THE DROPDOWN
    const selectStaffMember = (staff: StaffMember) => {
        setNewInvitee(prev => ({
            ...prev,
            recommendedBy: {
                name: staff.name,
                department: staff.department || "",
                email: staff.email,
                userId: staff.uid
            }
        }))
        setShowStaffDropdown(false)
        setFilteredStaff([])
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
            const getRegistrationStatusRequest = await postProtected(
                "companies/registrationstatus/get",
                { email: newInvitee.email, companyName: newInvitee.companyName },
                user.role
            )

            if (getRegistrationStatusRequest.status === "OK") {
                let tempRegistrationStatus = { ...registrationStatus }

                if (getRegistrationStatusRequest.data.inviteStatus === 2) {
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
            console.error({ error })
        }
    }

    const sendNewInvite = async () => {
        try {
            if (!submitting) {
                setErrorMessage("")
                setSuccessMessage("")
                setSubmitting(true)

                // Clean up recommendedBy - only send if name is provided
                const inviteData = {
                    ...newInvitee,
                    recommendedBy: newInvitee.recommendedBy?.name
                        ? newInvitee.recommendedBy
                        : undefined
                }

                const sendNewInviteRequest = await postProtected("invites/new", inviteData, user.role)

                if (sendNewInviteRequest.status === "OK") {
                    setSuccessMessage(`Invite sent to ${newInvitee.email} successfully.`)
                    // Reset form on success
                    setNewInvitee(invitedCompanyTemplate)
                    setSimilarCompanyNames([])
                    setSelectedExistingCompany(invitedCompanyTemplate)
                    setFilteredStaff([])
                } else {
                    setErrorMessage(sendNewInviteRequest.error.message)
                }

                setSubmitting(false)
            }
        } catch (error) {
            setSubmitting(false)
            console.error({ error })
        }
    }

    const selectSimilarCompanyName = (company: InvitedCompany) => {
        if (emailFieldRef.current) {
            emailFieldRef.current.value = company.companyName
        }

        setSelectedExistingCompany(company)
        setNewInvitee(prev => ({ ...prev, companyName: company.companyName }))
    }

    const closeNoticeModal = () => {
        setRegistrationStatus(prev => ({ ...prev, showReminderModal: false }))
    }

    const noticeModalAction = () => {
        if (registrationStatus.status === 5) {
            sendNewInvite()
        }
        closeNoticeModal()
    }

    return (
        <div className={styles.inviteContainer}>
            <div className={styles.inviteCard}>
                {/* Header */}
                <div className={styles.inviteHeader}>
                    <h5>Send Registration Invite</h5>
                    <p className={styles.inviteSubtitle}>Invite a new company to register on the platform</p>
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

                <div className={styles.inviteContent}>
                    {/* Form Section */}
                    <div className={styles.formSection}>
                        <form
                            onSubmit={event => {
                                event.preventDefault()
                                validateNewInviteeDetails()
                            }}
                        // onChange={updateNewInvitee}
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
                                        className={validationErrors.fname ? styles.inputError : ''}
                                        autoComplete="given-name"
                                        onChange={updateNewInvitee}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="lname">Last Name *</label>
                                    <input
                                        id="lname"
                                        placeholder="Enter last name"
                                        name="lname"
                                        value={newInvitee.lname}
                                        className={validationErrors.lname ? styles.inputError : ''}
                                        autoComplete="family-name"
                                        onChange={updateNewInvitee}
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
                                    className={validationErrors.email ? styles.inputError : ''}
                                    autoComplete="email"
                                    onChange={updateNewInvitee}
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
                                    value={newInvitee.phone}
                                    className={validationErrors.phone ? styles.inputError : ''}
                                    autoComplete="tel"
                                    onChange={updateNewInvitee}
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
                                    className={validationErrors.companyName ? styles.inputError : ''}
                                    onChange={event => {
                                        updateNewInvitee(event)
                                        _.debounce(() => findCompany(event.target.value), 500)()
                                    }}
                                    autoComplete="organization"
                                />
                                {searchingCompanies && (
                                    <span className={styles.searchingIndicator}>Searching...</span>
                                )}
                            </div>

                            {/* Recommended By Section */}
                            <div className={styles.formDivider}>
                                <span>Recommendation Details (Optional)</span>
                            </div>

                            <div className={styles.formRow}>
                                {/* Name field with autocomplete */}
                                <div className={styles.formGroup} ref={staffDropdownRef} style={{ position: 'relative' }}>
                                    <label htmlFor="recommendedByName">Recommended By</label>
                                    <input
                                        id="recommendedByName"
                                        placeholder="Type to search staff or enter name"
                                        value={newInvitee.recommendedBy?.name || ""}
                                        onChange={(e) => updateRecommendedBy('name', e.target.value)}
                                        autoComplete="off"
                                    />
                                    {loadingStaff && (
                                        <span className={styles.searchingIndicator}>Loading staff...</span>
                                    )}

                                    {/* Staff Autocomplete Dropdown - THIS IS WHERE SUGGESTIONS APPEAR */}
                                    {showStaffDropdown && filteredStaff.length > 0 && (
                                        <div className={styles.autocompleteDropdown}>
                                            {filteredStaff.map((staff) => (
                                                <div
                                                    key={staff._id}
                                                    className={styles.autocompleteItem}
                                                    onClick={() => selectStaffMember(staff)}
                                                >
                                                    <div className={styles.staffName}>{staff.name}</div>
                                                    <div className={styles.staffDetails}>
                                                        {staff.department && <span>{staff.department}</span>}
                                                        {staff.department && staff.email && <span> • </span>}
                                                        {staff.email && <span className={styles.staffEmail}>{staff.email}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Department dropdown - auto-populated when staff is selected */}
                                <div className={styles.formGroup}>
                                    <label htmlFor="recommendedByDepartment">Department</label>
                                    <select
                                        id="recommendedByDepartment"
                                        value={newInvitee.recommendedBy?.department || ""}
                                        onChange={(e) => updateRecommendedBy('department', e.target.value)}
                                        className={styles.departmentSelect}
                                    >
                                        <option value="">Select or auto-filled from staff</option>
                                        {DEPARTMENTS.map((dept) => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
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
                                        <span>Send Invite Link</span>
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
                            <h6>Quick Tip</h6>
                            <p>Start typing in the "Recommended By" field to see staff suggestions. The recommendation field helps track who suggested inviting this contractor.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Invites