'use client'
import Link from "next/link"
import styles from "./styles/styles.module.css"
import { useEffect, useState } from "react"
import { getProtected } from "@/requests/get"
import Modal from "@/components/modal"
import FileUploader from "@/components/fileUploader"
import ErrorText from "@/components/errorText"
import { putProtected } from "@/requests/put"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import SuccessMessage from "@/components/successMessage"

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        companies: [],
        expiringCertificates: [],
        expiredCertificates: [],
        files: []
    })
    const [fetchedDashboardData, setFetchedDashboardData] = useState(false)
    const [fetchingDashboardData, setFetchingDashboardData] = useState(true)
    const [selectedCertificate, setSelectedCertificate] = useState<any>({})
    const [updateCertificateError, setUpdateCertificateError] = useState("")
    const [updatingCertificate, setUpdatingCertificate] = useState(false)
    const [updateCertificateSuccess, setUpdateCertificateSuccess] = useState("")

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setFetchingDashboardData(true)
            setFetchedDashboardData(false)
            const fetchDashboardDataRequest = await getProtected("companies/dashboard/data")

            console.log({fetchDashboardDataRequest});
            if (fetchDashboardDataRequest.status === "OK") {
                setFetchedDashboardData(true)
                setFetchingDashboardData(false)
                let tempDashboardData = {...dashboardData}
                tempDashboardData = fetchDashboardDataRequest.data
                setDashboardData(tempDashboardData)
            } else {

            }
            
        } catch (error) {
            console.log({error});
            
        }
    }

    console.log({dashboardData});
    console.log({todayDate: new Date().toLocaleDateString().replace(/\//g, '-')});
    

    const setCertificateToUpdate = (certificate, certificateCategory, certificateIndex) => {
        console.log({certificate});
        
        let tempCertificateToUpdate = {...selectedCertificate}
        tempCertificateToUpdate = {...certificate, certificateCategory, certificateIndex}
        setSelectedCertificate(tempCertificateToUpdate)
    }

    const setNewCertificate = newCertificate => {
        let tempSelectedCertificate = {...selectedCertificate}
        tempSelectedCertificate["newCertificate"] = newCertificate
        setSelectedCertificate(tempSelectedCertificate)
    }

    const validateNewCertificate = () => {
        if (!selectedCertificate?.newCertificate?.expiryDate) {
            setUpdateCertificateError("Please set an expiry date for this certificate")
        } else {
            setUpdateCertificateError("")
            updateCertificate()
        }
    }

    const updateCertificate = async () => {
        try {
            setUpdatingCertificate(true)
            const updateCertificateRequest = await putProtected(`companies/certificates/${selectedCertificate._id}`, selectedCertificate)
            setUpdatingCertificate(false)
            if (updateCertificateRequest.status === "OK") {
                setUpdateCertificateSuccess("Certificate updated successfully!")
                
            } else {
                setUpdateCertificateError(updateCertificateRequest.error.message)
            }
        } catch (error) {
            console.log({error});
            
        }
    }

    const setNewCertificateExpiry = expiryDate => {
        const tempSelectedCertificate = {...selectedCertificate}
        tempSelectedCertificate.newCertificate["expiryDate"] = expiryDate
        setSelectedCertificate(tempSelectedCertificate)
    }

    console.log({selectedCertificate});

    const closeUploader = () => {
        let tempSelectedCertificate = {...selectedCertificate}
        tempSelectedCertificate = {}
        setSelectedCertificate(tempSelectedCertificate)
        setUpdateCertificateError("")
        

        if (updateCertificateSuccess) {
            fetchDashboardData()
            setUpdateCertificateSuccess("")
        }
    }

    const backToFileSelection = () => {
        let tempSelectedCertificate = {...selectedCertificate}
        delete tempSelectedCertificate.newCertificate
        setSelectedCertificate(tempSelectedCertificate)
    }
    
    

    return (
        <div className={styles.dashboard}>
            <h3>Your Dashboard</h3>

            

            {
                !fetchingDashboardData && <>
                



                <div>
                 {
                    Object.values(selectedCertificate).length > 0 && !selectedCertificate.newCertificate && <Modal>
                        <FileUploader closeUploader={() => {closeUploader()}} label={selectedCertificate.label} maxFiles={1} updateCode={selectedCertificate.updateCode} updateUploadedFiles={(newFiles) => {setNewCertificate(newFiles[0])
                        }} files={dashboardData.files}/>
                    </Modal>
                }

                {
                    selectedCertificate.newCertificate && <Modal>
                    <div className={styles.updateCertificateModal}>
                        <h3>Update Certificate</h3>
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        Certificate Title
                                    </td>

                                    <td>
                                        {selectedCertificate.label}
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        File name
                                    </td>

                                    <td>
                                        {selectedCertificate.newCertificate.name}
                                    </td>
                                </tr>

                                {/* <tr>
                                    <td>
                                        File Size
                                    </td>

                                    <td>
                                        234 kb
                                    </td>
                                </tr> */}

                                <tr>
                                    <td>
                                        Expiry Date
                                    </td>

                                    <td>
                                        <input type="date" min={new Date().toISOString().split('T')[0]} onChange={event => setNewCertificateExpiry(event.target.value)} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {
                            updateCertificateError && <ErrorText text={updateCertificateError} />
                        }

                        <div className={styles.updateCertificateSuccessDiv}>
                        {
                            updateCertificateSuccess && <SuccessMessage message={updateCertificateSuccess} />
                        }
                        </div>

                        <div>
                            <button onClick={() => {closeUploader()}}>
                                {
                                    updateCertificateSuccess ? "Close" : "Cancel"
                                }
                            </button>
                            {
                                !updateCertificateSuccess && <button onClick={() => backToFileSelection()}>
                                Back to file selection
                            </button>
                            }

                            {
                                !updateCertificateSuccess && <button onClick={() => validateNewCertificate()}>
                                Update Certificate
                                {updatingCertificate && <ButtonLoadingIcon />}
                            </button>
                            }
                        </div>
                    </div>
                </Modal>
                }
            
                <h5>Your Company Registration</h5>

                {
                    dashboardData.companies.length > 0 && <div>
                        {
                            dashboardData.companies.map((item, index) => <div key={index} className={styles.companyApplicationDiv}>
                            <div>
                                <p>{String(item.companyName).toLocaleUpperCase()}</p>
                                <p>Status: {item.flags.stage}</p>
                            </div>
        
                            <div className={styles.actionItems}>
                                <Link href={`/contractor/application/view/${item.vendor}`}>VIEW</Link>

                                {
                                    !item.flags.submitted || item.flags.stage === "returned" && <Link href={`/contractor/form/${item.vendor}`}>CONTINUE & SUBMIT</Link>
                                }
                            </div>
                        </div>)
                        }
                    </div>
                }

                {
                    dashboardData.companies.length === 0 && <div className={styles.noRegisteredCompaniesDiv}>
                        <p>You have not started your company registration.</p>

                        <Link href={"/contractor/form"}>
                        <button>Start company registration</button>
                        </Link>
                    </div>
                }
            </div>

            <hr />

            <div className={styles.certificatesDiv}>
                <h5>Your Expiring Certificates</h5>

                {
                    dashboardData.expiringCertificates.length === 0 && <div className={styles.noCertificates}>
                        <p>You do not have any expiring certificates</p>
                    </div>
                }

                {
                    dashboardData.expiringCertificates.length > 0 && <div>
                    <table>
                        <thead>
                            <tr>
                                <td>Certificate Type</td>
                                <td>Expiry Date</td>
                                <td>Action</td>
                            </tr>
                        </thead>

                        <tbody>
                            {
                                dashboardData.expiringCertificates.map((item, index) => <tr key={index}>
                                <td>{item.label}</td>

                                <td>{(new Date(item.expiryDate)).toLocaleDateString("en-NG")}</td>

                                <td>
                                    <Link href={item.url} target="_blank"><button>View</button></Link>

                                    <button onClick={() => setCertificateToUpdate(item, "expiring", index)}>Update Certificate</button>
                                </td>
                            </tr>)
                            }
                        </tbody>
                    </table>
                </div>
                }
            </div>

            <hr />

            <div className={styles.certificatesDiv}>
                <h5>Your Expired Certificates</h5>

                {
                    dashboardData.expiredCertificates.length === 0 && <div className={styles.noCertificates}>
                        <p>You do not have any expiring certificates</p>
                    </div>
                }


                {
                    dashboardData.expiredCertificates.length > 0 && <div>
                    <table>
                        <thead>
                            <tr>
                                <td>Certificate Type</td>
                                <td>Expiry Date</td>
                                <td>Action</td>
                            </tr>
                        </thead>

                        <tbody>
                            {
                                dashboardData.expiredCertificates.map((item, index) => <tr key={index}>
                                <td>{item.label}</td>

                                <td>{(new Date(item.expiryDate)).toLocaleDateString("en-NG")}</td>

                                <td>
                                    <Link href={item.url} target="_blank"><button>View</button></Link>

                                    <button onClick={() => setCertificateToUpdate(item, "expired", index)}>Update Certificate</button>
                                </td>
                            </tr>)
                            }
                        </tbody>
                    </table>
                </div>
                }

                
            </div>





                </>
            }

        </div>
    )
}

export default Dashboard