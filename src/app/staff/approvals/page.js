'use client'

import Link from "next/link"
import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs/index"
import { useState } from "react"

const Approvals = () => {
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

    const [invitedData, setInvitedData] = useState([
        {
            companyName: "Anderson lifting company",
            name: "Obialor Chidiebere Andrew",
            email: "andersonlifting@yahoo.com",
            phoneNumber: "08058262629",
            timeApproved: "March 11, 2021",
            used: 1615471132503,
            expiry: "March 11, 2021"
        },
        {
            companyName: "Tetratech Online",
            name: "Samson Adegbohun",
            email: "sammie.ad@tetratech.org",
            phoneNumber: "08058262629",
            timeApproved: "March 11, 2021",
            expiry: "March 11, 2021"
        },
        {
            companyName: "Second Test Company",
            name: "Obialor Chidiebere Andrew",
            email: "andersonlifting@yahoo.com",
            phoneNumber: "08058262629",
            timeApproved: "March 11, 2021",
            expiry: "March 11, 2024"
        }
    ])

    return (
        <div className={styles.approvals}>
            <header>
                <h3>C&P Officer Dashboard</h3>

                <h5>Registration Approvals</h5>
                
                <label>Quick Search</label>

                <input  placeholder="Type company name..."/>
            </header>

            <Tabs tabs={approvalsTabs} activeTab={activeTab} updateActiveTab={newActiveTab => setActiveTab(newActiveTab)} />

            <table>
                <thead>
                    { getActiveTable().map((item, index) => <td key={index}>{item}</td>)}
                </thead>

                <tbody>
                    {
                        activeTab === "invited" && invitedData.map((item, index) => <InvitedContractorItem key={index} inviteDetails={item} index={index} />)
                    }

                    {
                        activeTab === "in-progress" && invitedData.map((item, index) => <InProgressItem key={index} inviteDetails={item} index={index} />)
                    }


                    {
                        activeTab === "pending-l2" && invitedData.map((item, index) => <PendingL2Item key={index} inviteDetails={item} index={index} />)
                    }

                    {
                        activeTab === "l3" && invitedData.map((item, index) => <L3Item key={index} inviteDetails={item} index={index} />)
                    }

                    {
                        activeTab === "completed-l2" && invitedData.map((item, index) => <CompletedL2Item key={index} inviteDetails={item} index={index} />)
                    }

                    {
                        activeTab === "returned-to-contractor" && invitedData.map((item, index) => <ReturnedItem key={index} inviteDetails={item} index={index} />)
                    }
                </tbody>
            </table>

            
        </div>
    )
}

const InvitedContractorItem = ({inviteDetails, index}) => {
    const inviteHasExpired = () => {
        const currentDate = new Date()
        const expiryDate = new Date(inviteDetails.expiry)

        console.log({currentDate, expiryDate});

        if (currentDate > expiryDate) {
            return true
        } else {
            return false
        }

    }

    const getDateFromTimestamp = timestamp => {
        const date = new Date(timestamp)
        console.log({date});

        if (date) {
            return `${date.toDateString("en-NG")}`
        }

    }

    const getDateFromDateString = dateString => {
        const date = new Date(dateString)
        console.log({date});

        if (date) {
            return `${date.toDateString("en-NG")}`
        }

    }

    return (
        <tr className={index%2 === 0 && styles.rowDarkBackground}>
            <td>
                <p className={styles.contractorName}>{inviteDetails.companyName}</p>
            </td>
            
            <td className={styles.userDetails}>
                <p>{inviteDetails.name}</p>

                <p>{inviteDetails.email}</p>

                <p>{inviteDetails.phoneNumber}</p>
            </td>

            <td className={styles.status}>
                {/* Show if invite has expired */}
                {
                    inviteHasExpired() && !inviteDetails.used && <>
                        <p className={styles.expiredText}>EXPIRED</p>
                        <p className={styles.statusDateText}>Expired: {getDateFromDateString(inviteDetails.expiry)}</p>
                        <a className={styles.renewText}>RENEW</a>
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
                        <p className={styles.statusDateText}>Sent: {getDateFromDateString(inviteDetails.timeApproved)}</p>
                    </>
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

const PendingL2Item = ({index}) => {
    return (
        <tr className={[styles.pendingL2Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={"/"}>Vendor Name</Link>
                <p>contractor@vendoremail.com</p>
            </td>

            <td>
                <p>Stage C</p>
            </td>

            <td>
                <Link href={"/"}>PROCESS TO STAGE D</Link>
                <p>End User: App Dev</p>
                <p>Change end user(s)</p>
            </td>

            <td>
                <p>Nov 24, 2020</p>
            </td>
        </tr>
    )
}


const L3Item = ({index}) => {
    return (
        <tr className={[styles.l3Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={"/"}>Vendor Name</Link>
                <p>contractor@vendoremail.com</p>
            </td>



            <td>
                <p>Change end user(s)</p>
                <Link href={"/"}>MOVE TO L2</Link>                
            </td>

            <td>
                <p>Nov 24, 2020</p>
            </td>
        </tr>
    )
}

const CompletedL2Item = ({index}) => {
    return (
        <tr className={[styles.completedL2Item, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={"/"}>Vendor Name</Link>
                <p>contractor@vendoremail.com</p>
            </td>

            <td>
                <p>Stage C</p>
            </td>

            <td>
                <p>Change end user(s)</p>
                <Link href={"/"}>REVERT TO PENDING</Link>
                <br />
                <Link href={"/"}>APPROVE L2</Link>
                
            </td>

            <td>
                <p>Nov 24, 2020</p>
            </td>
        </tr>
    )
}

const ReturnedItem = ({index}) => {
    return (
        <tr className={[styles.returnedItem, index%2 === 0 && styles.rowDarkBackground].join(" ")}>
            <td>
                <Link href={"/"}>Vendor Name</Link>
                <p>contractor@vendoremail.com</p>
            </td>

            <td>
                <p>Stage C</p>
            </td>

            <td>
                <Link href={"/"}>VIEW</Link>
                
            </td>

            <td>
                <p>Nov 24, 2020</p>
            </td>
        </tr>
    )
}


export default Approvals