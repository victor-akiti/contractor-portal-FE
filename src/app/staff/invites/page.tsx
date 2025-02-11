'use client'
import { useState, useEffect, useRef } from "react"
import styles from "./styles/styles.module.css"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import _ from "underscore"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessText from "@/components/successText"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { useSelector } from "react-redux"

type InvitedCompany = {
    fname: string,
    lname: string,
    email: string,
    phone: string,
    companyName: string,
    _id?: string
}

const validateEmail = (email: string) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/

    return emailRegex.test(email)
}

const Invites = () => {
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
    const emailFieldRef = useRef(null)
    const [registrationStatus, setRegistrationStatus] = useState({
        status: 0,
        showReminderModal: false,
        reminderModalText: "",
        reminderModalButtonText: ""
    })
    const user = useSelector((state: any) => state.user.user)


    useEffect(() => {
        fetchAllCompanies()
    }, [])

    console.log({similarCompanyNames});
    

    const fetchAllCompanies =async () => {
        try {
            // const fetchAllCompaniesRequest = await getProtected("companies/all")
            // // const migrateRegistrationRequests = await getProtected("migrations/registrationRequests")
            // const migrateNewRequests = await getProtected("migrations/newRequests")
        } catch (error) {
            console.log({error});
            
        }
    }

    const findCompany = async (queryString: String)  => {
        try {
            console.log({queryString});
            
            const findCompanyRequest = await postProtected("invites/find", {queryString}, user.role)

            if (findCompanyRequest.status === "OK") {
                console.log({findCompanyRequest});
                let tempSimilarCompanies = [...similarCompanyNames]
                tempSimilarCompanies = findCompanyRequest.data.companies
                setSimilarCompanyNames(tempSimilarCompanies)
            }
        } catch (error) {
            console.log({error});
            
        }
    }

    const updateNewInvitee = (event:any) => {
        const field:string = event.target.name
        const value:string = event.target.value
        console.log({field, value});
        let tempInvitee = {...newInvitee}
        //@ts-ignore
        tempInvitee[String(field)] = value
        setNewInvitee(tempInvitee)
        
    }

    const validateNewInviteeDetails = () => {
        if (!newInvitee.fname){
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
                    let tempRegistrationStatus = {...registrationStatus}
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
            const getRegistrationStatusRequest = await postProtected("companies/registrationstatus/get", {email: newInvitee.email, companyName: newInvitee.companyName}, user.role)
            if (getRegistrationStatusRequest.status === "OK") {
                let tempRegistrationStatus = {...registrationStatus}
                if (getRegistrationStatusRequest.data.inviteStatus === 2 || getRegistrationStatusRequest.data.inviteStatus === 2 ) {
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
            console.log({getRegistrationStatusRequest});
            
        } catch (error) {
            console.log({error});
            
        }
    }

    const sendNewInvite = async () => {
        try {
            if (!submitting) {
                setErrorMessage("")
                setSuccessMessage("")
                setSubmitting(true)
                const sendNewInviteRequest = await postProtected("invites/new", newInvitee, user.role)

                console.log({sendNewInviteRequest});
                

                if (sendNewInviteRequest.status === "OK") {
                    setSuccessMessage( `Invite sent to ${newInvitee.email} successfully.`)
                } else {
                    setErrorMessage(sendNewInviteRequest.error.message)
                }

                setSubmitting(false)
                console.log({sendNewInviteRequest});
            }

            
            
        } catch (error) {
            setSubmitting(false)
            console.log({error});
        }
    }

    const sendReminder = () => {

    }

    const resetExpiredInvite = () => {

    }

    const selectSimilarCompanyName = (company: InvitedCompany) => {
        emailFieldRef.current.value = company.companyName

        let tempSelectedSimilarcompany = {...selectedExistingCompany}
        tempSelectedSimilarcompany = company
        setSelectedExistingCompany(tempSelectedSimilarcompany)

        let tempInvitee = {...newInvitee}
        tempInvitee.companyName = company.companyName
        setNewInvitee(tempInvitee)
    }

    const closeNoticeModal = () => {
        let tempRegistrationStatus = {...registrationStatus}
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
    }

    console.log({newInvitee});
    

    return (
        <div className={styles.invite}>
            <h5>Send Registration Invite</h5>

            {
                errorMessage && <ErrorText text={String(errorMessage)} />
            }

{
                successMessage && <SuccessText text={String(successMessage)} />
            }

            {
                registrationStatus.showReminderModal && <Modal>
                <div className={styles.sendReminderDiv}>
                    <p>{registrationStatus.reminderModalText} </p>

                    <div>
                        <button onClick={() => noticeModalAction()}>{registrationStatus.reminderModalButtonText}</button>
                        <button onClick={() => closeNoticeModal()}>Cancel</button>
                    </div>
                </div>
            </Modal>
            }

            <div>
                <form onSubmit={event => {
                    event.preventDefault()
                    
                    validateNewInviteeDetails()
                }} onChange={event => updateNewInvitee(event)}>
                    <div>
                        <input placeholder="First Name" name="fname" />

                        <input placeholder="Last Name" name="lname" />
                    </div>
                    

                    <input placeholder="Email" name="email" />

                    <div>
                        <input placeholder="Phone Number" name="phone" />
                    </div>

                    

                    <input ref={emailFieldRef}  placeholder="Company Name" name="companyName" onChange={event => {
                        _.debounce(() => findCompany(event.target.value)
                        , 500)()
                    }} />

                    <button disabled={submitting}>{submitting ? "SENDING LINK" : "SEND LINK"} {submitting && <ButtonLoadingIcon />}</button>
                </form>

                <div className={styles.similarCompaniesDiv}>
                    <h6>Similar registered companies</h6>

                    <div className={styles.similarCompanyNamesDiv}>
                        {
                            similarCompanyNames.map((item:InvitedCompany, index) => <div onClick={() => {
                                selectSimilarCompanyName(item)
                            }} key={index}>
                            <p>{item.companyName}</p>
                        </div>)
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Invites