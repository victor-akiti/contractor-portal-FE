'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { setUserData } from "@/redux/reducers/user"
import { postProtected } from "@/requests/post"
import { putProtected } from "@/requests/put"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

const VendorSettings = () => {
    const [errorMessage, setErrorMessage] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [updating, setUpdating] = useState(false)
    const [settingBeingUpdated, setSettingBeingUpdated] = useState("")
    const [administratorProfile, setAdministratorProfile] = useState({

    })
    const user = useSelector((state: any) => state.user.user)
    const dispatch = useDispatch()

    const vendorID = useParams().vendorID

    const updatePortalAdministratorProfile = async (key: string, value: string) => {
        let tempAdministratorProfile = { ...administratorProfile }
        tempAdministratorProfile[key] = value
        setAdministratorProfile(tempAdministratorProfile)
    }

    const setPortalAdministratorProfile = async () => {
        try {
            setUpdating(true)
            const setPortalAdministratorProfileRequest = await putProtected(`companies/portal-admin/update/${vendorID}`, administratorProfile, user.role)

            if (setPortalAdministratorProfileRequest.status === "OK") {
                //@ts-ignore
                dispatch(setUserData({ user: setPortalAdministratorProfileRequest.data }))
                setUpdating(false)
                setSuccessMessage("Updated profile successfully")
            }

        } catch (error) {
            console.error({ error });
        }
    }



    const closeSettingModals = () => {
        setErrorMessage("")
        setSuccessMessage("")
        setSettingBeingUpdated("")
    }

    const validateNewEmail = async (email) => {
        const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!emailRegex.test(email)) {
            console.error("invalid email");

            setErrorMessage("Please enter a valid email address")
        } else {
            setErrorMessage("")
            requestToReplaceAdministrator(email)
        }
    }

    const requestToReplaceAdministrator = async (email) => {
        try {
            setUpdating(true)
            const requestToReplaceAdministratorRequest = await postProtected(`companies/portal-admin/replace/${vendorID}`, { email }, user.role)

            if (requestToReplaceAdministratorRequest.status === "OK") {
                setUpdating(false)
                setSuccessMessage("Request sent successfully")
            } else {
                setUpdating(false)
                setErrorMessage(requestToReplaceAdministratorRequest.error.message)
            }

        } catch (error) {
            console.error({ error });
        }
    }


    return (
        <div className={styles.settings}>
            {
                settingBeingUpdated === "portalAdministrator" && <Modal>
                    <div className={styles.changePortalAdministratorModal}>
                        <form onSubmit={(event) => {
                            event.preventDefault()
                            validateNewEmail(event.target[0].value)
                        }}>
                            <h2>
                                Change Portal Administrator
                            </h2>

                            <p>Enter the email address of the new portal administrator</p>

                            <input placeholder="Email address" />

                            {
                                errorMessage && <ErrorText text={errorMessage} />
                            }

                            {
                                successMessage && <SuccessMessage message={successMessage} />
                            }

                            <div className={styles.modalActionButtons}>
                                <button onClick={() => closeSettingModals()} type="button">Close</button>
                                <button type="submit">Submit {updating && <ButtonLoadingIcon />}</button>
                            </div>
                        </form>
                    </div>
                </Modal>
            }


            {
                settingBeingUpdated === "administratorProfile" && <Modal>
                    <div className={styles.changePortalAdministratorModal}>
                        <h2>
                            Update Portal Administrator Profile
                        </h2>

                        <p>Update portal administrator profile</p>

                        <div>
                            <form onChange={(event: any) => updatePortalAdministratorProfile(event.target.name, event.target.value)} onSubmit={(event) => {
                                event.preventDefault()
                                setPortalAdministratorProfile()
                            }}>
                                <input placeholder="Full Name" name="name" defaultValue={user.name} />

                                <input placeholder="Phone Number" name="phone" defaultValue={typeof user.phone === "string" ? user.phone : user.phone.internationalNumber} />
                            </form>
                        </div>

                        {
                            errorMessage && <>
                                <div style={{ marginTop: "1rem" }}></div>
                                <ErrorText text={errorMessage} />
                            </>
                        }

                        {
                            successMessage && <>
                                <div style={{ marginTop: "1rem" }}></div>
                                <SuccessMessage message={successMessage} />
                            </>
                        }


                        <div className={styles.modalActionButtons}>
                            <button onClick={() => closeSettingModals()}>Close</button>
                            <button onClick={() => setPortalAdministratorProfile()}>Save {updating && <ButtonLoadingIcon />}</button>
                        </div>
                    </div>
                </Modal>
            }


            <h1>Settings</h1>

            <hr />

            <div>
                <h3>
                    Portal Administrator
                </h3>




                <h4>Current Portal Administrator</h4>

                <table>
                    <tr>
                        <td>Name</td>
                        <td>{user.name}</td>
                    </tr>

                    <tr>
                        <td>Email</td>
                        <td>{user.email}</td>
                    </tr>

                    <tr>
                        <td>Phone Number</td>
                        <td>{typeof user.phone === "string" ? user.phone : user.phone.internationalNumber}</td>
                    </tr>
                </table>

                <div className={styles.actionButtonsDiv}>
                    <button onClick={() => setSettingBeingUpdated("portalAdministrator")}>Change Portal Administrator</button>
                    <button onClick={() => setSettingBeingUpdated("administratorProfile")}>Update Profile</button>
                </div>
            </div>
        </div>
    )
}

export default VendorSettings