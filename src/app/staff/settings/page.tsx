'use client'

import Modal from "@/components/modal"
import styles from "./styles/styles.module.css"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { getProtected } from "@/requests/get"

const AccountSettings = () => {
    const [showSetOutOfOfficeModal, setShowSetOutOfOfficeModal] = useState(false)
    const [settingBeingUpdated, setSettingBeingUpdated] = useState("")
    const [availableStaff, setAvailableStaff] = useState([])
    const user = useSelector((state: any) => state.user.user)

    useEffect(() => {
        getAllAvailableStaff()
    }, [])

    const getAllAvailableStaff = async () => {
        try {
            const getAllStaffRequest = await getProtected("users/cnpstaff/all")

            console.log({getAllStaffRequest});
            

            if (getAllStaffRequest.status === "OK") {
                // console.log("fetched");
                

                // console.log(sortUserAlphabetically(getAllStaffRequest.data));
                
                
                setAvailableStaff(getAllStaffRequest.data)
                // setFixedUsersList(sortUserAlphabetically(getAllStaffRequest.data))
            }

            console.log({getAllStaffRequest});
            
        } catch (error) {

        }
    }

    

    return (
        <div className={styles.settingsPage}>
            {
                showSetOutOfOfficeModal && <Modal>
                <div className={styles.setOutOfOfficeDiv}>
                    <h3>Set Out of Office</h3>

                    <h4>Set Duration</h4>

                    <div>
                        <label>Start Date</label>
                        <input type="date" />
                    </div>

                    <div>
                        <label>End Date</label>
                        <input type="date" />
                    </div>

                    <h4>Select Substitute</h4>
                    <p>Tasks assigned to you will be re-assigned to your substitute while you&#39;re out of office.</p>

                    <select>
                        <option>Select a substitute</option>

                        {
                            availableStaff.map((staff: any) => {
                                return <option key={staff._id}>{`${staff.name} - ${staff.role}`} </option>
                            })
                        }
                    </select>

                    <div className={styles.actionButtonsDiv}>
                        <button onClick={() => setShowSetOutOfOfficeModal(false)}>Cancel</button>

                        <button>Save {settingBeingUpdated === "out of office" && <ButtonLoadingIcon />}</button>
                    </div>
                </div>
            </Modal>
            }
            <h2>Account Settings</h2>

            <div className={styles.settingsSection}>
                <h3>Out Of Office Settings</h3>
                <p>Current status: <span className={styles.inOffice}>In Office</span></p>

                {
                    !user.substitute && <button className={styles.setOOButton} onClick={() => setShowSetOutOfOfficeModal(true)}>Set out of office</button>
                }

                {
                    user.substitute && <button className={styles.setInOfficeButton} onClick={() => setShowSetOutOfOfficeModal(true)}>Set as in office</button>
                }

                

                <hr />
            </div>
        </div>
    )
}

export default AccountSettings