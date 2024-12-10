'use client'

import Modal from "@/components/modal"
import styles from "./styles/styles.module.css"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import ErrorText from "@/components/errorText"
import SuccessMessage from "@/components/successMessage"
import SuccessText from "@/components/successText"

const AccountSettings = () => {
    const [showSetOutOfOfficeModal, setShowSetOutOfOfficeModal] = useState(false)
    const [showInOfficeModal, setShowInOfficeModal] = useState(false)
    const [settingBeingUpdated, setSettingBeingUpdated] = useState("")
    const [availableStaff, setAvailableStaff] = useState([])
    const user = useSelector((state: any) => state.user.user)
    const [outOfOfficeActionSuccessMessage, setOutOfOfficeActionSuccessMessage] = useState("")
    const [ooData, setOOData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        substitute: null
    })
    const [errorMessages, setErrorMessages] = useState({
        outOfOffice: ""
    })
    const [userOutOfOfficeStatus, setUserOutOfOfficeStatus] = useState(null)

    useEffect(() => {
        getAllAvailableStaff()

        let tempUserOutOfOfficeStatus = {...userOutOfOfficeStatus}
        tempUserOutOfOfficeStatus = user.outOfOffice
        setUserOutOfOfficeStatus(tempUserOutOfOfficeStatus)

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
            clearAllErrorMessages()
            setSettingBeingUpdated("out of office")
            const setOutOfOfficeRequest = await postProtected (`user/outOfOffice/set`, ooData)

            setSettingBeingUpdated("")

            if (setOutOfOfficeRequest.status === "OK") {
                console.log({setOutOfOfficeRequest});
                handleOutOfOfficeActionSuccess(setOutOfOfficeRequest.data.outOfOffice, "You have been set as out of office and tasks assigned to you will be routed to your selected substitute.")

                setShowSetOutOfOfficeModal(false)            
            } else {
                
                let tempErrorMessages = {...errorMessages}
                tempErrorMessages.outOfOffice = setOutOfOfficeRequest.error.message
                setErrorMessages(tempErrorMessages)
            }
        } catch (error) {
            console.log({error});
            
        }
    }

    const handleOutOfOfficeActionSuccess = (outOfOfficeNewData, message) => {
        setOutOfOfficeActionSuccessMessage(message)

        let tempUserOutOfOfficeStatus = {...userOutOfOfficeStatus}
        tempUserOutOfOfficeStatus = outOfOfficeNewData
        setUserOutOfOfficeStatus(tempUserOutOfOfficeStatus)
        setSettingBeingUpdated("")

        setTimeout(() => {
            setOutOfOfficeActionSuccessMessage("")
        }, 5000)
    }

    const setInOffice = async () => {
        try {
            clearAllErrorMessages()
            setSettingBeingUpdated("in office")

            const setInOfficeRequest = await postProtected (`user/outOfOffice/unset`)

            setSettingBeingUpdated("")  

            if (setInOfficeRequest.status === "OK") {
                console.log({setInOfficeRequest});

                handleOutOfOfficeActionSuccess(setInOfficeRequest.data , "You have successfully been set to in office.")
                setShowInOfficeModal(false)
                
                
            } else {
                
                let tempErrorMessages = {...errorMessages}
                tempErrorMessages.outOfOffice = setInOfficeRequest.error.message
                setErrorMessages(tempErrorMessages)
            }
        } catch (error) {
            console.log({error});
            
        }
    }

    const clearAllErrorMessages = () =>{
        let tempErrorMessages = {...errorMessages}
        tempErrorMessages.outOfOffice = ""
        setErrorMessages(tempErrorMessages)
    }

    console.log({userOutOfOfficeStatus});
    
    

    

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

                    {
                        errorMessages.outOfOffice && <ErrorText text={errorMessages.outOfOffice} />
                    }

                    <div className={styles.actionButtonsDiv}>
                        <button onClick={() => setShowSetOutOfOfficeModal(false)}>Cancel</button>

                        <button onClick={() => setOutOfOffice()}>Save {settingBeingUpdated === "out of office" && <ButtonLoadingIcon />}</button>
                    </div>
                </div>
            </Modal>
            }

            {
                showInOfficeModal && <Modal>
                    <div className={styles.setOutInOfficeDiv}>
                        <h3>Set as in office</h3>
                        <p>Are you sure you want to set yourself as in office? You will no longer be seen as being out of office and would be available for task assignments.</p>

                        <div className={styles.actionButtonsDiv}>
                            <button onClick={() => setShowInOfficeModal(false)}>Cancel</button>

                            <button onClick={() => setInOffice()}>Set as in office { settingBeingUpdated === "in office" && <ButtonLoadingIcon />}</button>
                        </div>
                    </div>
                </Modal>
            }

            <h2>Account Settings</h2>

            <div className={styles.settingsSection}>
                <h3>Out Of Office Settings</h3>

                {
                    outOfOfficeActionSuccessMessage && <SuccessText text={outOfOfficeActionSuccessMessage} />
                }
                <p>Current status: <span className={userOutOfOfficeStatus?.substitute ? styles.outOfOffice : styles.inOffice}>{userOutOfOfficeStatus?.substitute ? "Out of office" : "In office"}</span></p>

                

                {
                    userOutOfOfficeStatus?.substitute && <table>
                    <thead>
                        <tr>
                            <td>Start Date</td>

                            <td>End Date</td>

                            <td>Substitute</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                {userOutOfOfficeStatus?.startDate}
                            </td>

                            <td>
                                {userOutOfOfficeStatus?.endDate}
                            </td>

                            <td>
                                {userOutOfOfficeStatus?.substitute?.name}
                            </td>
                        </tr>
                    </tbody>
                </table>
                }

                {
                    !userOutOfOfficeStatus?.substitute && <button className={styles.setOOButton} onClick={() => setShowSetOutOfOfficeModal(true)}>Set as out of office</button>
                }

                {
                    userOutOfOfficeStatus?.substitute && <button className={styles.setInOfficeButton} onClick={() => setShowInOfficeModal(true)}>Set as in office</button>
                }

                

                <hr />
            </div>
        </div>
    )
}

export default AccountSettings