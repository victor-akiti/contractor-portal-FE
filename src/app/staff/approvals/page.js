'use client'

import Link from "next/link"
import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs/index"
import { useEffect, useState } from "react"
import { getProtected } from "@/requests/get"
import moment from "moment"
import { useAppSelector } from "@/redux/hooks"
import Modal from "@/components/modal"
import Loading from "@/components/loading"
import { postProtected } from "@/requests/post"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import SuccessMessage from "@/components/successMessage"
import PrimaryColorSmallLoadingIcon from "@/components/primaryColorLoadingIcon"

const Approvals = () => {
    useEffect(() => {
        fetchAllApprovalsData()

        // triggerInviteMigration()
    }, [])

    

    const [approvals, setApprovals] = useState({
        completedL2: [],
        inProgress: [],
        invites: [],
        l3: [],
        pendingL2: [],
        returned: []
    })

    const [fixedApprovals, setFixedApprovals] = useState({
        completedL2: [],
        inProgress: [],
        invites: [],
        l3: [],
        pendingL2: [],
        returned: []
    })

    const [inviteToArchive, setInviteToArchive] = useState({})

    console.log({approvals});
    const user= useAppSelector(state => state?.user?.user)

    console.log({user});

    const triggerInviteMigration = async () => {
        try {
            const triggerMigration = await getProtected("migrations/newRequests")
        } catch (error) {
            console.log({error});
        }
    }

    const setInviteToArchiveObject = invite => {
        let tempInviteToArchive = {...inviteToArchive}
        tempInviteToArchive = invite
        setInviteToArchive(tempInviteToArchive)
    }

    const unsetInviteToArchiveObject = () => {
        let tempInviteToArchive = {...inviteToArchive}
        tempInviteToArchive = {}
        setInviteToArchive(tempInviteToArchive)

        let tempArchiveStatusMessages = {...archiveStatusMessages}
        tempArchiveStatusMessages = {
            successMessage: "",
            errorMessage: ""
        }
        setArchiveStatusMessages(tempArchiveStatusMessages)
        setArchivingInvite(false)
    }

    const triggerMigration = async () => {
        const migrate = await getProtected("migrations/newRequests")
    }

    const fetchAllApprovalsData = async () => {
        console.log("Fetching approvals data");
        try {
            const fetchAllApprovalsDataRequest = await getProtected("companies/approvals/all")

            console.log({fetchAllApprovalsDataRequest});
            setFetchingContractors(false)

            if (fetchAllApprovalsDataRequest.status === "OK") {
                let tempApprovals = {...approvals}
                tempApprovals = fetchAllApprovalsDataRequest.data
                setApprovals(tempApprovals)

                tempApprovals = {...fixedApprovals}
                tempApprovals = fetchAllApprovalsDataRequest.data
                setFixedApprovals(tempApprovals)
            }
        } catch (error) {
            console.log({error});
        }
    }

    const approvalsTabs = [
        {
            label: "Invited",
            name: "invited"
        },
        {
            label: "In Progress",
            name: "in-progress"
        },
        {
            label: "Pending L2",
            name: "pending-l2"
        },
        {
            label: "L3",
            name: "l3"
        },
        {
            label: "Completed L2",
            name: "completed-l2"
        },
        {
            label: "Returned To Contractor",
            name: "returned-to-contractor"
        }
    ]

    const tableHeaders = {
        invited: ["Company Name", "User Details", "Status"],
        inProgress: ["Contractor Name", "Last Contractor Update"],
        pendingL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        l3: ["Contractor Name", "Action", "Last Contractor Update"],
        completedL2: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
        returned: ["Contractor Name", "Approval Stage", "Action", "Last Contractor Update"],
    }

    const [activeTab, setActiveTab] = useState("invited")
    const [activeFilter, setActiveFilter] = useState("All")
    const inviteFilters = ["All", "Active", "Used", "Expired", "Archived"]
    const approvalStages = ["A", "B", "C", "D", "E", "F"]
    const[fetchingContractors, setFetchingContractors] = useState(true)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const getActiveTable = () => {
        switch (activeTab) {
            case "invited": 
                return tableHeaders["invited"]
            case "in-progress":
                return tableHeaders["inProgress"]
            case "pendingL2":
                return tableHeaders["pendingL2"]
            case "l3":
                return tableHeaders["l3"]
            case "completed-l2":
                return tableHeaders["completedL2"]
            default:
                return tableHeaders["returned"]
        }
    }

    const getActiveTableData = () => {
        switch (activeTab) {
            case "invited": 
                return invitedData
            case "in-progress":
                return tableHeaders["inProgress"]
            case "pendingL2":
                return tableHeaders["pendingL2"]
            case "l3":
                return tableHeaders["l3"]
            case "completed-l2":
                return tableHeaders["completedL2"]
            default:
                return tableHeaders["returned"]
        }
    }



    const filterInvites = newFilter => {
        if (newFilter === "All") {
            let tempApprovals = {...approvals}
            tempApprovals = fixedApprovals
            setApprovals(tempApprovals)
        } else if (newFilter === "Used") {
            let tempApprovals = {...approvals}
            tempApprovals.invites = fixedApprovals.invites.filter(item => item.used)
            setApprovals(tempApprovals)
        } else if (newFilter === "Expired") {
                let tempApprovals = {...approvals}
                let expiredInvites = []

                for (let index = 0; index < fixedApprovals.invites.length; index++) {
                    const element = fixedApprovals.invites[index];

                    let currentDate = new Date()
                    let expiryDate = ""

                    if (element?.expiry?._seconds ) {
                        expiryDate = new Date(element?.expiry?._seconds * 1000)
                    } else {
                        expiryDate = new Date(element?.expiry)
                    }

                    if ((currentDate.getTime() > expiryDate.getTime()) && !element.used) {
                        expiredInvites.push(element)
                    }
                }

                console.log({expiredInvites});

                tempApprovals.invites = expiredInvites
            setApprovals(tempApprovals)
        } else if (newFilter === "Active") {
            let tempApprovals = {...approvals}
                let activeInvites = []

                for (let index = 0; index < fixedApprovals.invites.length; index++) {
                    const element = fixedApprovals.invites[index];

                    let currentDate = new Date()
                    let expiryDate = ""

                    

                    if (element?.expiry?._seconds ) {
                        expiryDate = new Date(element?.expiry?._seconds * 1000)
                    } else {
                        expiryDate = new Date(element?.expiry)
                    }

                    if (element.email === "testotesta@amni.com") {
                        console.log({expiryDate, element, expiry: element.expiry});
                    }

                    if ((currentDate.getTime() < expiryDate.getTime()) && !element.used) {
                        activeInvites.push(element)
                    }
                }

                console.log({activeInvites});

                tempApprovals.invites = activeInvites
            setApprovals(tempApprovals)
        }
    }

    const filterL2Companies = stage => {
        let tempApprovals = {...approvals}

        console.log({stage});
        let filteredArray = []

        if (stage === "All") {
            tempApprovals.pendingL2 = fixedApprovals.pendingL2
        } else if (stage === "A") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (!element?.flags?.approvals?.level) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "B") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 1) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "C") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 2) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "D") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 3) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "E") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 4) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "F") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 5) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        } else if (stage === "G") {
            console.log({fixedApprovals});
            tempApprovals.pendingl2 = fixedApprovals.pendingL2.filter(item => !item?.flags?.approvals?.level)

            for (let index = 0; index < fixedApprovals.pendingL2.length; index++) {
                const element = fixedApprovals.pendingL2[index];

                if (element?.flags?.approvals?.level === 6) {
                    filteredArray.push(element)
                }
                
            }

            tempApprovals.pendingL2 = filteredArray
        }
        
        setApprovals(tempApprovals)
    }

    const filterInvitedCompaniesByNameOrEmail = name => {
        setActiveFilter("")
        let tempApprovals = {...approvals}
        tempApprovals.invites = fixedApprovals.invites.filter(item => String(item.companyName).toLocaleLowerCase().includes(String(name).toLocaleLowerCase()) || String(item.email).toLocaleLowerCase().includes(String(name).toLocaleLowerCase()) )
        setApprovals(tempApprovals)
    }

    const [archivingInvite, setArchivingInvite] = useState()
    const [archiveStatusMessages, setArchiveStatusMessages] = useState({
        errorMessage: "",
        successMessage: ""
    })

    const archiveInvite = async () => {
        try {
            setArchivingInvite(true)
            const archiveInviteRequest = await postProtected("invites/archive", inviteToArchive)

            setArchivingInvite(false)

            let tempArchiveStatusMessages = {...archiveStatusMessages}
            if (archiveInviteRequest.status === "OK") {
                
                tempArchiveStatusMessages.successMessage = "Invite archived successfully."
            } else {
                tempArchiveStatusMessages.errorMessage = archiveInviteRequest.error.message
            }
            setArchiveStatusMessages(tempArchiveStatusMessages)

            let tempApprovals = {...approvals}
            tempApprovals.invites = tempApprovals.invites.filter(item => item._id !== inviteToArchive._id)
            setApprovals(tempApprovals)
        } catch (error) {
            console.log({error});
        }
    }

    const removeInviteFromExpiredList = inviteID => {
        console.log({inviteID});
    }

    

    return (
        <div className={styles.approvals}>
            <header>
                <h3>C&P Officer Dashboard</h3>

                <h5>Registration Approvals</h5>
                
                {
                    !fetchingContractors && <>
                        <label>Quick Search</label>

                        <input  placeholder="Type company name..."/>
                    </>
                }
            </header>


            {
                Object.values(inviteToArchive).length > 0 && <Modal>
                <div className={styles.confirmArchiveModalDiv}>
                    {
                        !archiveStatusMessages.successMessage && <p>You are about to archive this invite. You would only be able to restore the invite if the email is still unused.</p> 
                    }

                    <div className={styles.archiveStatusMessages}>
                    {
                        archiveStatusMessages.errorMessage && <ErrorText text={archiveStatusMessages.errorMessage} />
                    }

                    {
                        archiveStatusMessages.successMessage && <SuccessMessage message={archiveStatusMessages.successMessage} />
                    }
                    </div>

                    <div>
                        {!archiveStatusMessages.successMessage && <button disabled={archivingInvite} onClick={() => archiveInvite()}>Continue {archivingInvite && <ButtonLoadingIcon />}</button>}
                        <button disabled={archivingInvite} onClick={() => unsetInviteToArchiveObject()}>{archiveStatusMessages.successMessage ? "Close" : "Cancel"}</button>
                    </div>
                </div>
            </Modal>
            }

            {
                fetchingContractors && <div className={styles.loading}>
                    <Loading />
                    <p>Fetching Contractors...</p>
                </div>
            }

            {
                !fetchingContractors && <>
                        <Tabs tabs={approvalsTabs} activeTab={activeTab} updateActiveTab={newActiveTab => {
                            setActiveTab(newActiveTab)
                            setActiveFilter("All")
                        }} />

                    <div className={styles.inviteFilters}>
                        <label>Filter: </label>

                        {
                            activeTab === "invited" && <div>
                            {
                                inviteFilters.map((item, index) => <p className={item === activeFilter && styles.active} key={index} onClick={() => {
                                    setActiveFilter(item)
                                    filterInvites(item)
                                }}>{item}</p>)
                            }

                            <input placeholder="Filter by company name or email address" onChange={event => filterInvitedCompaniesByNameOrEmail(event.target.value)} />
                            </div>
                        }



                        {
                            activeTab === "pending-l2" && <div>
                                <p className={activeFilter === "All" && styles.active}  onClick={() => {
                                    setActiveFilter("All")
                                    filterL2Companies("All")
                                }}>{`All ${"All" === activeFilter ? `(${approvals.pendingL2.length})` : ``}`}</p>
                            {
                                approvalStages.map((item, index) => <p className={item === activeFilter && styles.active} key={index} onClick={() => {
                                    setActiveFilter(item)
                                    filterL2Companies(item)
                                }}>{`Stage ${item} ${item === activeFilter ? `(${approvals.pendingL2.length})` : ``}`}</p>)
                            }
                        </div>
                        }

                    </div>

                    {
                        errorMessage && <ErrorText />
                    }

                    {
                        successMessage && <SuccessMessage />
                    }

                    <table>
                        <thead>
                            { getActiveTable().map((item, index) => <td key={index}>{item}</td>)}
                        </thead>

                        <tbody>
                            {
                                activeTab === "invited" && approvals.invites.map((item, index) => <InvitedContractorItem 
                                setInviteToArchiveObject={invite => setInviteToArchiveObject(invite)} 
                                key={index} inviteDetails={item} 
                                index={index} user={user} 
                                activeFilter={activeFilter}
                                removeInviteFromExpired={inviteID => removeInviteFromExpiredList(inviteID)}
                                 />)
                            }

                            {
                                activeTab === "in-progress" && approvals.inProgress.map((item, index) => <InProgressItem key={index} companyRecord={item} index={index} />)
                            }


                            {
                                activeTab === "pending-l2" && approvals.pendingL2.map((item, index) => <PendingL2Item key={index} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "l3" && approvals.l3.map((item, index) => <L3Item key={index} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "completed-l2" && approvals.completedL2.map((item, index) => <CompletedL2Item key={index} companyRecord={item} index={index} />)
                            }

                            {
                                activeTab === "returned-to-contractor" && approvals.returned.map((item, index) => <ReturnedItem key={index} companyRecord={item} index={index} />)
                            }
                        </tbody>
                    </table>
                </>
            }

            

            
        </div>
    )
}

const InvitedContractorItem = ({inviteDetails, index, user, setInviteToArchiveObject, activeFilter, removeInviteFromExpired}) => {
    const inviteHasExpired = () => {
        const currentDate = new Date()
        let expiryDate = ""

        if (inviteDetails?.expiry?._seconds) {
            expiryDate = new Date(inviteDetails?.expiry?._seconds * 1000)
        } else {
            expiryDate = new Date(inviteDetails?.expiry)
        }
        


        if (currentDate.getTime() > expiryDate.getTime()) {
            return true
        } else {
            return false
        }

    }

    const getDateFromTimestamp = timestamp => {
        const date = new Date(timestamp)


        if (date) {
            return `${date.toDateString("en-NG")}`
        }

    }

    const getDateFromDateString = dateString => {


        if (dateString?._seconds) {
            const date = new Date(dateString?._seconds * 1000)

            if (date) {
                return `${date.toDateString("en-NG")}`
            }
        } else {
            const date = new Date(dateString)

            if (date) {
                return `${date.toDateString("en-NG")}`
            }
        }
        // console.log({date});

        

    }

    const [sendReminderText, setSendReminderText] = useState("SEND REMINDER")
    const [renewText, setRenewText] = useState("RENEW")

    const sendReminder = async () => {
        try {
            setSendReminderText("SENDING REMINDER")
            const sendReminderRequest = await getProtected(`invites/remind/${inviteDetails._id}`)

            if (sendReminderRequest.status === "OK") {
                setSendReminderText("REMINDER SENT")

                if (activeFilter === "Expired") {
                    removeInviteFromExpired(inviteDetails._id)
                }
            }
        } catch (error) {
            console.log({error});
        }
    }

    const [renewing, setRenewing] = useState(false)

    const renewRequest = async () => {
        try {
            console.log("Renewing");
            setRenewText("RENEWING INVITE...")

            const renewInviteRequest = await getProtected(`invites/renew/${inviteDetails._id}`)

            console.log({renewInviteRequest});

            if (renewInviteRequest.status === "OK") {
                console.log("renewed");
                setRenewText("RENEWED")
            }
        } catch (error) {
            console.log({error});
            setRenewText("RENEW")
        }
    }

    

    return (
        <tr className={index%2 === 0 && styles.rowDarkBackground}>
            <td>
                <p className={styles.contractorName}>{String(inviteDetails.companyName).toLocaleUpperCase()}</p>
            </td>
            
            <td className={styles.userDetails}>
                <p>{`${inviteDetails.fname} ${inviteDetails.lname}`.toLocaleUpperCase()}</p>

                <p>{inviteDetails.email}</p>

                <p>{inviteDetails?.phone?.number ? inviteDetails?.phone?.number : inviteDetails?.phone}</p>
            </td>

            <td className={styles.status}>
                {/* Show if invite has expired */}
                {
                    inviteHasExpired() && !inviteDetails.used && <>
                        <p className={styles.expiredText}>EXPIRED</p>
                        <p className={styles.statusDateText}>Expired: {getDateFromDateString(inviteDetails.expiry)}</p>
                        <div className={styles.renewRequestTextDiv}>
                            {
                                renewText !== "RENEWED" && <a className={styles.renewText} onClick={() => renewRequest()}>{renewText}</a>
                            }
                            {
                                renewText === "RENEWING INVITE..."  && <PrimaryColorSmallLoadingIcon />
                            }

                        {
                            renewText === "RENEWED" && <p className={styles.reminderSentText}>INVITE RENEWED</p>
                        }
                        </div>
                        
                        <div></div>
                        <Link href={`invites/${inviteDetails._id}`}>RESEND INVITE</Link>
                        
                    </>
                }

                {/* Show if invite has been used */}
                {
                    inviteDetails.used && <>
                        <p className={styles.usedText}>USED</p>
                        <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved)}</p>
                        <p className={styles.statusDateText}>Used: {getDateFromTimestamp(inviteDetails.used)}</p>
                    </>
                }

                {/* Show if invite has not expired and has not been used */}
                {
                    !inviteHasExpired() && !inviteDetails.used && <>
                        <p className={styles.activeText}>ACTIVE</p>
                        <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved ? inviteDetails.timeApproved : inviteDetails.createdAt)}</p>
                        {
                            inviteDetails.lastReminderSent && <p className={styles.statusDateText}>Last Reminder Sent: {getDateFromDateString(inviteDetails.lastReminderSent)}</p>
                        }
                        {
                            sendReminderText !== "REMINDER SENT" && <div className={styles.reminderDiv}>
                            <a onClick={() => sendReminder()} className={styles.renewText}>{sendReminderText}</a>
                            {
                                sendReminderText === "SENDING REMINDER" && <PrimaryColorSmallLoadingIcon />
                            }
                        </div>
                        }
                        {
                            sendReminderText === "REMINDER SENT" && <p className={styles.reminderSentText}>REMINDER SENT</p>
                        }
                        <div></div>
                        <Link href={`invites/${inviteDetails._id}`}>RESEND INVITE</Link>
                    </>
                }

                {
                    user.role === "Admin" && !inviteDetails.used && <p className={styles.deleteInviteText} onClick={() => setInviteToArchiveObject(inviteDetails)}>Archive Invite</p>
                }

                <p></p>
                <p></p>
            </td>
        </tr>
    )
}

const InProgressItem = ({index}) => {
    return (
        <tr className={[styles.inProgressItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <a>Contractor Name</a>
                <p>contractor@email.com</p>
            </td>

            <td>
                <p>24 Sep 2023</p>
            </td>
        </tr>
    )
}

const PendingL2Item = ({index, companyRecord}) => {
    const getCurrentStage = () => {
        if (!companyRecord?.flags?.approvals?.level) {
            return "A"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
            return "G"
        }
    }

    const getNextStage = () => {
        if (!companyRecord?.flags?.approvals?.level) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "G"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
            return "H"
        }
    }

    const getLastUpdated = () => {
        if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        }
    }

    return (
        <tr className={[styles.pendingL2Item, companyRecord.needsAttention ? styles.needsAttendionBackground : index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord.vendor}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                <Link href={`/staff/approvals/${companyRecord.vendor}`}>{`PROCESS TO STAGE ${getNextStage()}`}</Link>
                {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers.length > 0 && <>
                        <p>End User: App Dev</p>
                        <p>Change end user(s)</p>
                    </>
                }
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}


const L3Item = ({index, companyRecord}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        }
    }

    return (
        <tr className={[styles.l3Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord.vendor}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{String(companyRecord?.contractorDetails?.email)}</p>
            </td>



            {/* <td>
            {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers.length > 0 && <>
                        <p>End User: App Dev</p>
                        <p>Change end user(s)</p>
                    </>
                }             
            </td> */}

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}

const CompletedL2Item = ({index, companyRecord}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        }
    }

    const getCurrentStage = () => {
        if (!companyRecord?.flags?.approvals?.level) {
            return "A"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
            return "G"
        }
    }

    return (
        <tr className={[styles.completedL2Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord.vendor}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                {
                    companyRecord.endUsers && Array.isArray(companyRecord.endUsers) && companyRecord.endUsers.length > 0 && <>
                        {/* <p>End User: App Dev</p>
                        <p>Change end user(s)</p> */}
                    </>
                }  
                <Link href={"/"}>REVERT TO PENDING</Link>
                <br />
                <Link href={"/"}>APPROVE L2</Link>
                
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}

const ReturnedItem = ({index, companyRecord}) => {
    const getLastUpdated = () => {
        if (companyRecord.lastApproved) {
            const lastUpdatedDate = new Date(companyRecord.lastApproved)

            return lastUpdatedDate.toISOString()
        } else if (companyRecord.approvalActivityHistory) {
            const lastUpdatedDate = new Date(companyRecord.approvalActivityHistory[0].date)

            return lastUpdatedDate.toISOString()
        }
    }

    const getCurrentStage = () => {
        if (!companyRecord?.flags?.approvals?.level) {
            return "A"
        } else if (companyRecord?.flags?.approvals?.level === 1) {
            return "B"
        } else if (companyRecord?.flags?.approvals?.level === 2) {
            return "C"
        } else if (companyRecord?.flags?.approvals?.level === 3) {
            return "D"
        } else if (companyRecord?.flags?.approvals?.level === 4) {
            return "E"
        } else if (companyRecord?.flags?.approvals?.level === 5) {
            return "F"
        } else if (companyRecord?.flags?.approvals?.level === 6) {
            return "G"
        }
    }

    return (
        <tr className={[styles.returnedItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={`/staff/vendor/${companyRecord.vendor}`}>{String(companyRecord.companyName).toLocaleUpperCase()}</Link>
                <p>{companyRecord?.contractorDetails?.email}</p>
            </td>

            <td>
                <p>{`Stage ${getCurrentStage()}`}</p>
            </td>

            <td>
                <Link href={`/staff/vendor/${companyRecord.vendor}`}>VIEW</Link>
                
            </td>

            <td>
                <p>{moment(getLastUpdated()).format("LL")}</p>
            </td>
        </tr>
    )
}


export default Approvals