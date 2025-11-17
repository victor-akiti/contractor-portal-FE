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

/**
 * VENDOR SETTINGS (MODERNIZED)
 * - Portal administrator management
 * - Profile updates
 * - Elegant, responsive design
 * - 100% BACKWARD-COMPATIBLE - NO FUNCTIONAL CHANGES
 */
const VendorSettings = () => {
    const [errorMessage, setErrorMessage] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [updating, setUpdating] = useState(false)
    const [settingBeingUpdated, setSettingBeingUpdated] = useState("")
    const [administratorProfile, setAdministratorProfile] = useState({})

    const user = useSelector((state: any) => state.user.user)
    const dispatch = useDispatch()
    const vendorID = useParams().vendorID

    // UNCHANGED: Update administrator profile state
    const updatePortalAdministratorProfile = async (key: string, value: string) => {
        let tempAdministratorProfile = { ...administratorProfile }
        tempAdministratorProfile[key] = value
        setAdministratorProfile(tempAdministratorProfile)
    }

    // UNCHANGED: Save administrator profile
    const setPortalAdministratorProfile = async () => {
        try {
            setUpdating(true)
            const setPortalAdministratorProfileRequest = await putProtected(
                `companies/portal-admin/update/${vendorID}`,
                administratorProfile,
                user.role
            )

            if (setPortalAdministratorProfileRequest.status === "OK") {
                //@ts-ignore
                dispatch(setUserData({ user: setPortalAdministratorProfileRequest.data }))
                setUpdating(false)
                setSuccessMessage("Updated profile successfully")
            }
        } catch (error) {
            console.error({ error })
        }
    }

    // UNCHANGED: Close modals and reset messages
    const closeSettingModals = () => {
        setErrorMessage("")
        setSuccessMessage("")
        setSettingBeingUpdated("")
    }

    // UNCHANGED: Validate email format
    const validateNewEmail = async (email: string) => {
        const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

        if (!emailRegex.test(email)) {
            console.error("invalid email")
            setErrorMessage("Please enter a valid email address")
        } else {
            setErrorMessage("")
            requestToReplaceAdministrator(email)
        }
    }

    // UNCHANGED: Request administrator replacement
    const requestToReplaceAdministrator = async (email: string) => {
        try {
            setUpdating(true)
            const requestToReplaceAdministratorRequest = await postProtected(
                `companies/portal-admin/replace/${vendorID}`,
                { email },
                user.role
            )

            if (requestToReplaceAdministratorRequest.status === "OK") {
                setUpdating(false)
                setSuccessMessage("Request sent successfully")
            } else {
                setUpdating(false)
                setErrorMessage(requestToReplaceAdministratorRequest.error.message)
            }
        } catch (error) {
            console.error({ error })
        }
    }

    return (
        <div className={styles.settings}>
            {/* UNCHANGED LOGIC: Change Portal Administrator Modal */}
            {settingBeingUpdated === "portalAdministrator" && (
                <Modal>
                    <div className={styles.changePortalAdministratorModal}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Change Portal Administrator</h2>
                            <p className={styles.modalSubtitle}>
                                Enter the email address of the new portal administrator
                            </p>
                        </div>

                        <div className={styles.modalContent}>
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    validateNewEmail(event.target[0].value)
                                }}
                                className={styles.modalForm}
                            >
                                <div className={styles.modalFormGroup}>
                                    <label className={styles.modalFormLabel}>Email Address</label>
                                    <input
                                        placeholder="Enter email address"
                                        className={styles.modalFormInput}
                                        type="email"
                                    />
                                </div>

                                {errorMessage && (
                                    <div className={styles.modalError}>
                                        <ErrorText text={errorMessage} />
                                    </div>
                                )}

                                {successMessage && (
                                    <div className={styles.modalSuccess}>
                                        <SuccessMessage message={successMessage} />
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className={styles.modalActionButtons}>
                            <button
                                onClick={() => closeSettingModals()}
                                type="button"
                                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                onClick={(e) => {
                                    const form = e.currentTarget.closest(`.${styles.changePortalAdministratorModal}`)?.querySelector('form')
                                    form?.requestSubmit()
                                }}
                                className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                                disabled={updating}
                            >
                                Submit
                                {updating && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* UNCHANGED LOGIC: Update Administrator Profile Modal */}
            {settingBeingUpdated === "administratorProfile" && (
                <Modal>
                    <div className={styles.changePortalAdministratorModal}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Update Portal Administrator Profile</h2>
                            <p className={styles.modalSubtitle}>
                                Update your portal administrator profile information
                            </p>
                        </div>

                        <div className={styles.modalContent}>
                            <form
                                onChange={(event: any) =>
                                    updatePortalAdministratorProfile(event.target.name, event.target.value)
                                }
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    setPortalAdministratorProfile()
                                }}
                                className={styles.modalForm}
                            >
                                <div className={styles.modalFormGroup}>
                                    <label className={styles.modalFormLabel}>Full Name</label>
                                    <input
                                        placeholder="Full Name"
                                        name="name"
                                        defaultValue={user.name}
                                        className={styles.modalFormInput}
                                    />
                                </div>

                                <div className={styles.modalFormGroup}>
                                    <label className={styles.modalFormLabel}>Phone Number</label>
                                    <input
                                        placeholder="Phone Number"
                                        name="phone"
                                        defaultValue={
                                            typeof user.phone === "string"
                                                ? user.phone
                                                : user.phone.internationalNumber
                                        }
                                        className={styles.modalFormInput}
                                    />
                                </div>
                            </form>

                            {errorMessage && (
                                <div className={styles.modalError}>
                                    <ErrorText text={errorMessage} />
                                </div>
                            )}

                            {successMessage && (
                                <div className={styles.modalSuccess}>
                                    <SuccessMessage message={successMessage} />
                                </div>
                            )}
                        </div>

                        <div className={styles.modalActionButtons}>
                            <button
                                onClick={() => closeSettingModals()}
                                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => setPortalAdministratorProfile()}
                                className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                                disabled={updating}
                            >
                                Save
                                {updating && <ButtonLoadingIcon />}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Header */}
            <div className={styles.settingsHeader}>
                <h1 className={styles.settingsTitle}>Settings</h1>
            </div>

            <hr className={styles.settingsDivider} />

            {/* Portal Administrator Section */}
            <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    Portal Administrator
                </h3>

                <div className={styles.infoCard}>
                    <svg className={styles.infoIcon} viewBox="0 0 24 24" fill="none">
                        <path
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <p className={styles.infoText}>
                        The portal administrator has full access to manage company registration and settings.
                    </p>
                </div>

                <h4 className={styles.sectionSubtitle}>Current Portal Administrator</h4>

                <table className={styles.adminTable}>
                    <tbody>
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
                            <td>
                                {typeof user.phone === "string"
                                    ? user.phone
                                    : user.phone.internationalNumber}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className={styles.actionButtonsDiv}>
                    <button
                        onClick={() => setSettingBeingUpdated("portalAdministrator")}
                        className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path
                                d="M13.333 5.833a3.333 3.333 0 11-6.666 0 3.333 3.333 0 016.666 0zM10 11.667A5.833 5.833 0 004.167 17.5h11.666A5.833 5.833 0 0010 11.667z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Change Portal Administrator
                    </button>
                    <button
                        onClick={() => setSettingBeingUpdated("administratorProfile")}
                        className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path
                                d="M14.166 2.5a2.357 2.357 0 013.334 3.333L6.249 17.083l-4.583 1.25 1.25-4.583L14.166 2.5z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Update Profile
                    </button>
                </div>
            </div>
        </div>
    )
}

export default VendorSettings