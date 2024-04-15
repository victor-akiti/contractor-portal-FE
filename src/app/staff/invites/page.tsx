'use client'
import { useState } from "react"
import styles from "./styles/styles.module.css"

const Invites = () => {
    const [newInvitee, setNewInvitee] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        companyName: ""
    })
    
    return (
        <div className={styles.invite}>
            <h5>Send Registration Invite</h5>

            <form>
                <div>
                    <input placeholder="first Name" />

                    <input placeholder="Last Name" />
                </div>
                

                <input placeholder="Email" />

                <div>
                    <input placeholder="Phone Number" />
                </div>

                

                <input placeholder="Company Name" />

                <button>SEND LINK</button>
            </form>
        </div>
    )
}

export default Invites