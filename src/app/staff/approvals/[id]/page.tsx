'use client'

import StageA from "@/components/approvalComponents/stageA"
import StageB from "@/components/approvalComponents/stageB"
import StageC from "@/components/approvalComponents/stageC"
import StageD from "@/components/approvalComponents/stageD"
import StageE from "@/components/approvalComponents/stageE"
import StageF from "@/components/approvalComponents/stageF"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

type ApprovalData = {
    companyName?: string,
    currentEndUsers?: Array<string>,
    vendor?: string,
    flags?: {
        level?: number,
        status?: string,
        stage?: string,
        approved?: boolean,
        approvals?: {
            level?: number
        }
    }
}

type Vendor = {
    approvalData?: ApprovalData,
    pages?: Array<any>
}

const Approval = () => {
    const params = useParams()
    const [fetchedVendorData, setFetchedVendorData] = useState(false)
    const [vendorData, setVendorData] = useState<Vendor>({
        approvalData: {},
        pages: []
    })
    const [updatingApplication, setUpdatingApplication] = useState(false)
    const [showReturnToL2Modal, setShowReturnToL2Modal] = useState(false)
    const [showRetrieveApplicationModal, setShowRetrieveApplicationModal] = useState(false)
    const [vendorID, setVendorID] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const user = useSelector((state: any) => state.user.user)

    const getCurrentStage = (companyRecord = vendorData?.approvalData) => {
        const level =
            companyRecord?.flags?.approvals?.level ??
            companyRecord?.flags?.level ??
            0; // fallback

        switch (level) {
            case 0:
                return "A";
            case 1:
                return "B";
            case 2:
                return "C";
            case 3:
                return "D";
            case 4:
                return "E";
            case 5:
                return "F";
            case 6:
                return "G";
            default:
                return "A";
        }
    };


    useEffect(() => {
        if (params.id) {
            fetchVendorData(params.id)
        }
    }, [params])


    const userHasApprovalPermissions = () => {
        let hasApprovalPermissions = false;
        const level =
            vendorData?.approvalData?.flags?.approvals?.level ??
            vendorData?.approvalData?.flags?.level ??
            0;

        if (user?.role === "user") return false;

        if (level === 0) {
            if (
                ["VRM", "C and P Staff", "CO", "GM", "Supervisor", "Executive Approver", "HOD", "Insurance Officer", "Admin"].includes(
                    user.role
                )
            ) {
                hasApprovalPermissions = true;
            }
        } else if (level === 1) {
            if (
                ["CO", "GM", "Supervisor", "Executive Approver", "HOD", "Insurance Officer", "Admin"].includes(
                    user.role
                )
            ) {
                hasApprovalPermissions = true;
            }
        } else if (level === 2) {
            if (["HOD", "Admin"].includes(user.role)) {
                hasApprovalPermissions = true;
            } else if (vendorData?.approvalData?.currentEndUsers?.includes(user._id)) {
                hasApprovalPermissions = true;
            }
        } else if (level === 3) {
            if (["VRM", "Executive Approver", "HOD", "Admin"].includes(user.role)) {
                hasApprovalPermissions = true;
            }
        } else if (level === 4) {
            if (
                ["GM", "Supervisor", "Executive Approver", "HOD", "Admin"].includes(
                    user.role
                )
            ) {
                hasApprovalPermissions = true;
            }
        } else if (level === 5) {
            if (["Executive Approver", "Admin"].includes(user.role)) {
                hasApprovalPermissions = true;
            }
        }

        return hasApprovalPermissions;
    };


    const hasAdminPermissions = (role) => {
        return (["Admin", "HOD"].includes(role))
    }

    const vendorIsParked = () => {
        return (vendorData?.approvalData?.flags?.status === "parked")
    }

    const vendorApplicationIsReturned = () => {
        return (vendorData?.approvalData?.flags?.status === "returned")
    }

    const fetchVendorData = async (vendorID) => {
        try {
            const fetchVendorDataRequest = await getProtected(`companies/approval-data/${vendorID}`, user.role)

            setVendorID(vendorID)

            if (fetchVendorDataRequest.status === "OK") {
                let tempVendorData = { ...vendorData }
                tempVendorData.approvalData = fetchVendorDataRequest.data.approvalData
                tempVendorData.pages = fetchVendorDataRequest.data.baseRegistrationForm.form.pages
                setVendorData(tempVendorData)
                setFetchedVendorData(true)
            }



        } catch (error) {
            console.error({ error });
        }
    }

    const revertApplicationToL2 = async (reason) => {
        if (!updatingApplication) {
            try {
                setUpdatingApplication(true)
                const revertRequest = await postProtected(`approvals/revert/l2/${vendorID}`, { from: "parked", reason }, user.role)

                setUpdatingApplication(false)
                setShowReturnToL2Modal(false)
                if (revertRequest.status === "OK") {
                    showSuccessMessage("Application has been returned to L2. Refreshing page...")
                } else {
                    showErrorMessage(revertRequest.error.message)
                }

            } catch (error) {
                console.error({ error });
            }
        }
    }

    const showSuccessMessage = message => {
        setSuccessMessage(message)

        setTimeout(() => {
            //Refresh page
            window.location.reload()
        }, 5000)
    }

    const showErrorMessage = message => {
        setErrorMessage(message)
    }

    const closeRevertToL2Modal = () => {
        setShowReturnToL2Modal(false)
        setErrorMessage("")
    }

    const retrieveApplicationFromVendor = async (reason) => {
        try {
            setUpdatingApplication(true)
            const retrieveApplicationFromVendorRequest = await postProtected(`approvals/retrieve/${vendorID}`, { reason }, user.role)

            setUpdatingApplication(false)

            if (retrieveApplicationFromVendorRequest.status === "OK") {
                setShowRetrieveApplicationModal(false)
                showSuccessMessage("Application has been retrieved from vendor. Refreshing page...")
            } else {
                setErrorMessage(retrieveApplicationFromVendorRequest.error.message)
            }
        } catch (error) {
            console.error({ error });

        }
    }

    return (
        <>
            {
                showReturnToL2Modal && <Modal>
                    <div className={styles.returnToL2Modal}>
                        <form onSubmit={event => {
                            event.preventDefault()
                            revertApplicationToL2(event.target[0].value)
                        }}>
                            <h3>Return Parked Application To L2</h3>

                            <p>You are about to return this parked application to L2</p>

                            <textarea rows={5} placeholder="Reason for returning to L2"></textarea>

                            {
                                errorMessage && <ErrorText text={errorMessage} />
                            }

                            <div>
                                <button>Return to L2 {updatingApplication && <ButtonLoadingIcon />}</button>
                                {
                                    !updatingApplication && <button onClick={() => closeRevertToL2Modal()}>Cancel</button>
                                }
                            </div>
                        </form>
                    </div>
                </Modal>
            }

            {
                showRetrieveApplicationModal && <Modal>
                    <div className={styles.returnToL2Modal}>
                        <form onSubmit={event => {
                            event.preventDefault()
                            retrieveApplicationFromVendor(event.target[0].value)
                        }}>
                            <h3>Retrieve Returned Application</h3>

                            <p>You are about to retrieve this returned application from the vendor. They will not be able to modify their application once retrieved unless returned again.</p>

                            <textarea rows={5} placeholder="Reason for retrieving application."></textarea>

                            {
                                errorMessage && <ErrorText text={errorMessage} />
                            }

                            <div>
                                <button>Retrieve Application {updatingApplication && <ButtonLoadingIcon />}</button>
                                {
                                    !updatingApplication && <button onClick={() => closeRevertToL2Modal()}>Cancel</button>
                                }
                            </div>
                        </form>
                    </div>
                </Modal>
            }

            {
                vendorApplicationIsReturned() && !successMessage && <div className={styles.noApprovalDiv}>
                    <h4>Application returned to Vendor</h4>

                    <p>This application has been returned to the vendor. You will be able to proceed with approvals when they re-submit their application</p>

                    <Link href={"/staff/approvals"}>Return to vendors list</Link>

                    {
                        hasAdminPermissions(user.role) && <div>
                            <a onClick={() => setShowRetrieveApplicationModal(true)}>Undo return</a>
                        </div>
                    }
                </div>
            }

            {
                !userHasApprovalPermissions() && <>

                    {
                        !vendorData?.approvalData?.flags?.approved && <div className={styles.noApprovalDiv}>
                            <h4>Access Denied</h4>

                            <p>You do not have the required permissions to carry out approvals at this stage</p>

                            <Link href={"/staff/approvals"}>Return to vendors list</Link>

                            <div>
                                <Link href={`/staff/vendor/${vendorID}`}>View vendor application</Link>
                            </div>
                        </div>
                    }

                    {
                        vendorData?.approvalData?.flags?.approved && <div className={styles.noApprovalDiv}>
                            <h4>No Further Approvals</h4>

                            <p>This vendor is at L3. There are no further approval actions available.</p>

                            <Link href={"/staff/approvals"}>Return to vendors list</Link>

                            <div>
                                <Link href={`/staff/vendor/${vendorID}`}>View vendor applciation</Link>
                            </div>
                        </div>
                    }




                </>




            }



            {
                vendorIsParked() && !successMessage && <div className={styles.noApprovalDiv}>
                    <h4>Application Parked</h4>

                    <p>This vendor&apos;s application has been parked at L2. Approval actions cannot be carried out for now</p>

                    <Link href={"/staff/approvals"}>Return to vendors list</Link>

                    {
                        hasAdminPermissions(user.role) && <div>
                            <a onClick={() => setShowReturnToL2Modal(true)}>Revert to L2</a>
                        </div>
                    }
                </div>
            }

            {
                successMessage && <div className={styles.actionCompletedDiv}>
                    <h4>Action Completed</h4>

                    <p>{successMessage}</p>
                </div>
            }




            {
                (fetchedVendorData && userHasApprovalPermissions() && !vendorIsParked() && !vendorApplicationIsReturned()) && <div>
                    {
                        getCurrentStage() === "A" && <StageA approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} />
                    }

                    {
                        getCurrentStage() === "B" && <StageB approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} />
                    }

                    {
                        getCurrentStage() === "C" && <StageC />
                    }

                    {
                        getCurrentStage() === "D" && <StageD approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} />
                    }

                    {
                        getCurrentStage() === "E" && <StageE approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} />
                    }

                    {
                        getCurrentStage() === "F" && <StageF />
                    }

                    {/* <StageB approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} /> */}

                    {/* <StageC approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} /> */}

                    {/* <StageD approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} /> */}

                    {/* <StageE approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} /> */}

                    {/* <StageF approvalData={vendorData.approvalData} formPages={vendorData.pages} vendorID={params.id} /> */}
                </div>
            }

            {
                !fetchedVendorData && <div>
                    <Loading message={"Fetching Vendor Data"} />
                </div>
            }


        </>
    )
}

export default Approval