'use client'

import Modal from "@/components/modal"
import styles from "./styles/styles.module.css"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"

const AccountSettings = () => {
    const [showSetOutOfOfficeModal, setShowSetOutOfOfficeModal] = useState(false)
    const [settingBeingUpdated, setSettingBeingUpdated] = useState("")
    const [availableStaff, setAvailableStaff] = useState([])
    const user = useSelector((state: any) => state.user.user)
    const [ooData, setOOData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        substitute: null
    })

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

    const updateOOData = (field, value) => {
        let tempOOData = {...ooData}
        

        if (field === "substitute") {
            tempOOData[field] = JSON.parse(value)
        } else {
            tempOOData[field] = value
        }
        

        //if field is startDate, check if it's greater than the current end date. IF field is endDate, check if it is less than start date
        if (field === "startDate") {
            if (new Date(tempOOData.startDate).getTime() > new Date(tempOOData.endDate).getTime()) {
                tempOOData.endDate = tempOOData.startDate
                setOOData(tempOOData)
            } else if (new Date(tempOOData.endDate).getTime() < new Date(tempOOData.startDate).getTime()) {
                tempOOData.startDate = tempOOData.endDate
                setOOData(tempOOData)
            }


        } else {
            setOOData(tempOOData)
        }
    }

    console.log({ooData});

    const getEndDateMinimumDate = () => {
        const endDate = new Date(new Date(ooData.startDate).getTime() + 60 * 60 * 24 * 1000).toISOString().split('T')[0]

        console.log({endDate});

        return endDate
        
    }
    
    const setOutOfOffice = async () => {
        try {
            const setOutOfOfficeRequest = await postProtected (`user/outOfOffice/set`, ooData)
        } catch (error) {
            console.log({error});
            
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
                        <input min= {new Date().toISOString().split('T')[0]} type="date" onChange={(event) => updateOOData("startDate", event.target.value)} />
                    </div>

                    <div>
                        <label>End Date</label>
                        <input min= {getEndDateMinimumDate()} type="date" onChange={(event) => updateOOData("endDate", event.target.value)} />
                    </div>

                    <h4>Select Substitute</h4>
                    <p>Tasks assigned to you will be re-assigned to your substitute while you&#39;re out of office.</p>

                    <select onChange={(event) => updateOOData("substitute", event.target.value)}>
                        <option>Select a substitute</option>

                        {
                            availableStaff.map((staff: any) => {
                                return <option value={JSON.stringify(staff)} key={staff._id}>{`${staff.name} - ${staff.role}`} </option>
                            })
                        }
                    </select>

                    <div className={styles.actionButtonsDiv}>
                        <button onClick={() => setShowSetOutOfOfficeModal(false)}>Cancel</button>

                        <button onClick={() => setOutOfOffice()}>Save {settingBeingUpdated === "out of office" && <ButtonLoadingIcon />}</button>
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