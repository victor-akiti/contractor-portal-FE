'use client'
import addIcon from "@/assets/images/add_primary.svg"
import closeIcon from "@/assets/images/closeGrey.svg"
import alertIcon from "@/assets/images/red_alert_circle.svg"
import successGreen from "@/assets/images/success_green.svg"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import FileUploader from "@/components/fileUploader"
import Modal from "@/components/modal"
import staffApi from "@/redux/apis/staffApi"
import { postProtected } from "@/requests/post"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

type Finding = {
    url?: string,
    name?: string
}
type ExposedPerson = {
    _id?: string,
    flagged?: boolean,
    flagMessage?: string,
    finding?: Finding[],
    entityType?: string,
    title?: string,
    firstName?: string,
    lastName?: string,
    otherName?: string,
    companyName?: string,
    role?: string,
    entryValid?: boolean,
    registrationNumber?: string
}

type DueDiligenceData = {
    registrationCheck: {
        flagged?: boolean,
        flagMessage?: string,
        finding?: Finding[],
        entryValid?: boolean
    },
    exposedPersons: ExposedPerson[],
    internetCheck: {
        flagged?: boolean,
        flagMessage?: string,
        finding?: Finding[],
        entryValid?: boolean
    },
    referenceCheck: {
        flagged?: boolean,
        flagMessage?: string,
        finding?: Finding[],
        entryValid?: boolean
    }
}

const StageD = ({ approvalData, formPages, vendorID }) => {

    const [vendorDueDiligenceData, setVendorDueDiligenceData] = useState<DueDiligenceData>({
        registrationCheck: {
            flagged: false,
            flagMessage: "",
            finding: [],
            entryValid: false
        },
        exposedPersons: [
            {
                flagged: false,
                flagMessage: "",
                finding: [],
                entityType: "",
                title: "Mr",
                firstName: "",
                lastName: "",
                companyName: "",
                role: "Shareholder",
                entryValid: false
            }
        ],
        internetCheck: {
            flagged: false,
            flagMessage: "",
            finding: [],
            entryValid: false
        },
        referenceCheck: {
            flagged: false,
            flagMessage: "",
            finding: [],
            entryValid: false
        }
    })
    const [currentUpload, setCurrentUpload] = useState({
        field: "",
        index: 0
    })
    const [showFinishSection, setShowFinishSection] = useState(false)
    const [approvalStatus, setApprovalStatus] = useState("")
    const router = useRouter()
    const user = useSelector((state: any) => state.user.user)




    useEffect(() => {
        if (approvalData.dueDiligence) {


            const tempVendorData = { ...vendorDueDiligenceData }
            if (approvalData.dueDiligence.registrationCheck) {
                tempVendorData.registrationCheck = approvalData.dueDiligence.registrationCheck
            }

            if (approvalData.dueDiligence.internetCheck) {
                tempVendorData.internetCheck = approvalData.dueDiligence.internetCheck
            }

            if (approvalData.dueDiligence.referenceCheck) {
                tempVendorData.referenceCheck = approvalData.dueDiligence.referenceCheck
            }

            if (approvalData.dueDiligence?.exposedPersons && approvalData.dueDiligence?.exposedPersons.length > 0) {
                tempVendorData.exposedPersons = approvalData.dueDiligence?.exposedPersons
            } else {
                tempVendorData.exposedPersons = [{
                    flagged: false,
                    flagMessage: "",
                    finding: [],
                    entityType: "",
                    title: "Mr",
                    firstName: "",
                    lastName: "",
                    companyName: "",
                    role: "Shareholder",
                    entryValid: false
                }]
            }

            setVendorDueDiligenceData(tempVendorData)
        }
    }, [approvalData])

    const toggleFlagForHODReview = (field, newValue, index) => {
        const tempVendorDueDiligence = { ...vendorDueDiligenceData }

        if (field === "exposedPersons") {
            tempVendorDueDiligence.exposedPersons[index].flagged = newValue
        } else {
            tempVendorDueDiligence[field].flagged = newValue
        }

        setVendorDueDiligenceData(tempVendorDueDiligence)
    }

    const updateFlagMessage = (field, message, index) => {
        const tempVendorDueDiligence = { ...vendorDueDiligenceData }

        if (field === "exposedPersons") {
            tempVendorDueDiligence.exposedPersons[index].flagMessage = message
        } else {
            tempVendorDueDiligence[field].flagMessage = message
        }

        setVendorDueDiligenceData(tempVendorDueDiligence)
    }

    const setFieldToUploadFor = (field, index) => {
        const tempCurrentUpload = { ...currentUpload }

        if (field === "exposedPersons") {
            tempCurrentUpload.field = field
            tempCurrentUpload.index = index
        } else {
            tempCurrentUpload.field = field
        }

        setCurrentUpload(tempCurrentUpload)
    }

    const closeUploadModal = () => {
        let tempCurrentUpload = { ...currentUpload }

        tempCurrentUpload = {
            field: "",
            index: 0
        }

        setCurrentUpload(tempCurrentUpload)
    }

    const updateUploadedField = (field, fileData, index) => {
        const tempVendorDueDiligence = { ...vendorDueDiligenceData }

        if (field === "exposedPersons") {
            tempVendorDueDiligence.exposedPersons[index].finding = fileData
        } else {
            tempVendorDueDiligence[field].finding = fileData
        }

        setVendorDueDiligenceData(tempVendorDueDiligence)

        closeUploadModal()
    }

    const clearUploadedField = (field, index) => {
        const tempVendorDueDiligence = { ...vendorDueDiligenceData }

        if (field === "exposedPersons") {
            tempVendorDueDiligence.exposedPersons[index].finding = []
        } else {
            tempVendorDueDiligence[field].finding = []
        }

        setVendorDueDiligenceData(tempVendorDueDiligence)

        closeUploadModal()
    }

    const updateExposedPersonsField = (field, value, index) => {
        const tempVendorDueDiligence = { ...vendorDueDiligenceData }

        tempVendorDueDiligence.exposedPersons[index][field] = value

        setVendorDueDiligenceData(tempVendorDueDiligence)
    }

    const addExposedPerson = () => {
        //Validate most recent exposed person before adding another

        const exposedPersonError = validateExposedPerson(vendorDueDiligenceData?.exposedPersons[vendorDueDiligenceData?.exposedPersons.length - 1])

        if (exposedPersonError) {
            return showExposedPersonError("You have to fill all the required fields for this exposed person before adding another", vendorDueDiligenceData?.exposedPersons.length - 1)
        } else {
            hideExposedPersonError()
        }

        const tempVendorDueDiligence = { ...vendorDueDiligenceData }

        tempVendorDueDiligence?.exposedPersons.push({
            flagged: false,
            flagMessage: "",
            finding: [],
            entityType: "",
            title: "Mr",
            firstName: "",
            lastName: "",
            companyName: "",
            role: "Shareholder",
            entryValid: false
        })

        setVendorDueDiligenceData(tempVendorDueDiligence)
    }

    const saveExposedPerson = async (exposedPerson, index) => {
        const exposedPersonError = validateExposedPerson(exposedPerson)

        if (exposedPersonError) {
            return showExposedPersonError(exposedPersonError, index)
        } else {
            hideExposedPersonError()
        }

        try {
            const saveExposedPersonRequest = await postProtected(`approvals/exposed-person/save/${vendorID}`, { exposedPerson }, user.role)

            if (saveExposedPersonRequest.status === "OK") {
                if (saveExposedPersonRequest.data._id) {
                    const tempVendorData = { ...vendorDueDiligenceData }
                    tempVendorData.exposedPersons[index]["_id"] = saveExposedPersonRequest.data._id
                    setVendorDueDiligenceData(tempVendorData)
                }

            } else {
                const tempPageErrors = { ...pageErrors }
                tempPageErrors["submission"] = saveExposedPersonRequest.error.message
                setPageErrors(tempPageErrors)
            }



        } catch (error) {

        }
    }

    const [pageErrors, setPageErrors] = useState({
        exposedPerson: {
            index: null,
            message: null
        },
        submission: null
    })

    const removeExposedPerson = async (exposedPerson, index) => {




        try {
            if (exposedPerson._id) {
                const removeExposedPersonRequest = await postProtected(`approvals/exposed-person/remove/${vendorID}`, { exposedPersonID: exposedPerson._id }, user.role)




                if (removeExposedPersonRequest.status !== "OK") {
                    showExposedPersonError(removeExposedPersonRequest.error.message, index)

                }
            }

            const tempVendorData = { ...vendorDueDiligenceData }

            tempVendorData.exposedPersons = tempVendorData?.exposedPersons.filter((item, personIndex) => personIndex !== index)

            setVendorDueDiligenceData(tempVendorData)
        } catch (error) {
            console.error({ error });

        }

    }

    const validateExposedPerson = (exposedPerson) => {
        if (!exposedPerson.entityType) {
            return "Please select an entity type"
        }
        if (exposedPerson.entityType === "individual") {
            if (!exposedPerson.firstName) {
                return "Please enter this person's first name"
            }

            if (!exposedPerson.lastName) {
                return "Please enter this person's last name"
            }
        } else if (exposedPerson.entityType !== "individual") {
            if (!exposedPerson.companyName) {
                return "Please enter this company's name"
            }

            if (!exposedPerson.registrationNumber) {
                return "Please enter this company's registration number"
            }
        }




        if (exposedPerson.flagged && !exposedPerson.flagMessage) {
            return "Please enter remark for this flagged entry"
        }

        if (Array.isArray(exposedPerson.finding) && exposedPerson.finding.length === 0) {
            return "Please upload your findings for this exposed person"
        }

        return ""
    }

    const showExposedPersonError = (message, index) => {
        const tempPageErrors = { ...pageErrors }
        tempPageErrors.exposedPerson.index = index
        tempPageErrors.exposedPerson.message = message
        setPageErrors(tempPageErrors)
    }

    const hideExposedPersonError = () => {
        const tempPageErrors = { ...pageErrors }
        tempPageErrors.exposedPerson.index = null
        tempPageErrors.exposedPerson.message = null
        setPageErrors(tempPageErrors)
    }

    const sectionValidated = (sectionData) => {





        if (Array.isArray(sectionData.finding) && sectionData.finding.length === 0) {
            return false
        }

        if (sectionData.flagged && !sectionData.flagMessage) {
            return false
        }

        return true
    }



    const allSectionsValidated = () => {
        const allValidated = false

        if (!sectionValidated(vendorDueDiligenceData.internetCheck)) {
            return false
        }

        if (!sectionValidated(vendorDueDiligenceData.referenceCheck)) {
            return false
        }

        if (!sectionValidated(vendorDueDiligenceData.registrationCheck)) {
            return false
        }

        for (let index = 0; index < vendorDueDiligenceData?.exposedPersons.length; index++) {
            const element = vendorDueDiligenceData?.exposedPersons[index];
            if (validateExposedPerson(element)) {
                return false
            }

        }

        return true
    }

    const dispatch = useDispatch();

    // Reusable function to invalidate approval-related cache
    const invalidateApprovalCache = () => {
        dispatch(staffApi.util.invalidateTags([
            'Counts',
            { type: 'Tab', id: 'pending-l2' },
            { type: 'Tab', id: 'l3' },
            { type: 'Tab', id: 'completed-l2' },
            { type: 'Tab', id: 'in-progress' },
            { type: 'Tab', id: 'returned' },
            { type: 'Tab', id: 'park-requests' }
        ]));
    };

    const processToStageE = async () => {
        setApprovalStatus("approving")
        try {
            const processToStageERequest = await postProtected(`approvals/process/${vendorID}`, {
                dueDiligence: vendorDueDiligenceData
            }, user.role)

            if (processToStageERequest.status === "OK") {
                invalidateApprovalCache();
                // actionCompleted()

                setApprovalStatus("approved")

                setTimeout(() => {
                    router.push("/staff/approvals")
                }, 3000)

            } else {
                const tempPageErrors = { ...pageErrors }
                tempPageErrors.submission = processToStageERequest.error.message
            }
        } catch (error) {

        }
    }




    return (
        <div className={styles.dueDiligencePage}>
            {
                currentUpload.field && <Modal>
                    <FileUploader closeUploader={() => { closeUploadModal() }} files={[]} onlyNewFiles={true} maxFiles={1} label={"Upload File"} updateCode={""} updateUploadedFiles={response => updateUploadedField(currentUpload.field, response, currentUpload.index)
                    } companyUID={vendorID} />
                </Modal>
            }

            <div className={styles.titleDiv}>
                <h2>{approvalData.companyName}</h2>
                <Link href={`/staff/vendor/${vendorID}`}>Open in view only mode</Link>
            </div>

            <h3>Carry Out Stage E</h3>

            {
                approvalStatus !== "approved" && <>
                    <header>
                        <h3>Due Diligence Checks</h3>

                        <p>
                            The purpose of the Due Diligence check is to see if there is any interesting information about the contractor that Amni should be aware of before conducting business with the contractor. The C&P HOD and Amni senior management will review the information flagged during these checks.
                        </p>
                    </header>

                    <div className={styles.dueDiligenceCheckDiv}>
                        <div>
                            <h3>Contractors Company Registration Check</h3>

                            <p>Please search for the contractors company name and RC on the CAC website. If anything unusual is found (different name or RC), flag for the HOD to review and enter a note.</p>


                            {
                                !vendorDueDiligenceData.registrationCheck.flagged && <button onClick={() => toggleFlagForHODReview("registrationCheck", !vendorDueDiligenceData.registrationCheck.flagged, 0)}>Flag for HOD review</button>
                            }

                            {
                                vendorDueDiligenceData.registrationCheck.flagged && <div className={styles.flagEntryDiv}>
                                    <button onClick={() => toggleFlagForHODReview("registrationCheck", !vendorDueDiligenceData.registrationCheck.flagged, 0)}>UNFLAG</button>

                                    <div>
                                        <textarea onChange={event => updateFlagMessage("registrationCheck", event.target.value, 0)} rows={5} placeholder="Type your notes here" defaultValue={vendorDueDiligenceData.registrationCheck.flagMessage}></textarea>
                                        {
                                            !vendorDueDiligenceData.registrationCheck.flagMessage && <Image src={alertIcon} alt="alert" width={20} height={20} />
                                        }
                                    </div>
                                </div>
                            }

                            <h5>Upload Findings<span>*</span></h5>


                            {
                                (Array.isArray(vendorDueDiligenceData.registrationCheck.finding) && vendorDueDiligenceData.registrationCheck.finding.length === 0) && <>
                                    <p>Upload a screenshot of the CAC website listing.</p>
                                    <button onClick={() => { setFieldToUploadFor("registrationCheck", 0) }}>UPLOAD</button>
                                </>

                            }

                            {
                                (Array.isArray(vendorDueDiligenceData.registrationCheck.finding) && vendorDueDiligenceData.registrationCheck.finding.length > 0) && <div className={styles.actionButtons}>
                                    <button onClick={() => { setFieldToUploadFor("registrationCheck", 0) }}>Change</button>
                                    <button className={styles.clearButton} onClick={() => clearUploadedField("registrationCheck", currentUpload.index)}>Clear</button>


                                    {
                                        vendorDueDiligenceData?.registrationCheck?.finding[0]?.url && <Link href={vendorDueDiligenceData?.registrationCheck?.finding[0]?.url} target="_blank"><button>View</button></Link>
                                    }

                                    <label>{vendorDueDiligenceData?.registrationCheck?.finding[0]?.name}</label>
                                </div>
                            }
                        </div>

                        {
                            sectionValidated(vendorDueDiligenceData.registrationCheck) && <Image src={successGreen} alt="section validated" width={30} />
                        }
                    </div>




                    <div className={styles.dueDiligenceCheckDiv}>
                        <div>
                            <h3>Internet Check</h3>

                            <p>Please perform a google search to see if there are any articles about the contractor, eg press coverage of disputes, involvement with politicians, court cases, accidents etc. If anything is found, flag for the HOD to review and enter a note.</p>


                            {
                                !vendorDueDiligenceData.internetCheck.flagged && <button onClick={() => toggleFlagForHODReview("internetCheck", !vendorDueDiligenceData.internetCheck.flagged, 0)}>Flag for HOD review</button>
                            }

                            {
                                vendorDueDiligenceData.internetCheck.flagged && <div className={styles.flagEntryDiv}>
                                    <button onClick={() => toggleFlagForHODReview("internetCheck", !vendorDueDiligenceData.internetCheck.flagged, 0)}>UNFLAG</button>

                                    <div>
                                        <textarea onChange={event => updateFlagMessage("internetCheck", event.target.value, 0)} rows={5} placeholder="Type your notes here" defaultValue={vendorDueDiligenceData.internetCheck.flagMessage}></textarea>
                                        {
                                            !vendorDueDiligenceData.internetCheck.flagMessage && <Image src={alertIcon} alt="alert" width={20} height={20} />
                                        }
                                    </div>
                                </div>
                            }

                            <h5>Upload Findings<span>*</span></h5>


                            {
                                (Array.isArray(vendorDueDiligenceData.internetCheck.finding) && vendorDueDiligenceData.internetCheck.finding.length === 0) && <>
                                    <p>Upload a pdf of your google search results.</p>
                                    <button onClick={() => { setFieldToUploadFor("internetCheck", 0) }}>UPLOAD</button>
                                </>
                            }


                            {
                                (Array.isArray(vendorDueDiligenceData.internetCheck.finding) && vendorDueDiligenceData.internetCheck.finding.length > 0) && <div className={styles.actionButtons}>
                                    <button onClick={() => { setFieldToUploadFor("internetCheck", 0) }}>Change</button>
                                    <button className={styles.clearButton} onClick={() => clearUploadedField("internetCheck", currentUpload.index)}>Clear</button>


                                    {
                                        vendorDueDiligenceData?.internetCheck?.finding[0]?.url && <Link href={vendorDueDiligenceData?.internetCheck?.finding[0]?.url} target="_blank"><button>View</button></Link>
                                    }

                                    <label>{vendorDueDiligenceData?.internetCheck?.finding[0]?.name}</label>
                                </div>
                            }
                        </div>

                        {
                            sectionValidated(vendorDueDiligenceData.internetCheck) && <Image src={successGreen} alt="section validated" width={30} />
                        }
                    </div>




                    <div className={[styles.exposedPersonsDiv, styles.dueDiligenceCheckDiv].join(" ")}>
                        <h3>Exposed Person/Shareholder Check</h3>

                        <p>For each director, shareholder and former director or shareholder of the contractor (from the CAC documents) please perform a google search to see if the person is a politically exposed person, involved in politics or involved with politicians or involved in court cases or scandal. For each person, if anything is found, flag for the HOD to review and enter a note. Also for each person put the search results into one word document, pdf and upload.</p>

                        {
                            vendorDueDiligenceData?.exposedPersons.map((item, index) => <div className={styles.exposedPersonContainerDiv} key={index}>
                                <div>
                                    <form onChange={(event: any) => updateExposedPersonsField(event.target.name, event.target.value, index)}>
                                        <div className={styles.exposedPersonItem}>

                                            <div className={styles.exposedPersonHeaderDiv}>
                                                <p>{`Person ${index + 1}`}</p>

                                                {
                                                    vendorDueDiligenceData?.exposedPersons.length > 1 && <Image src={closeIcon} alt="remove exposed person" width={15} height={15} style={{ cursor: "pointer" }} onClick={() => removeExposedPerson(item, index)} />
                                                }
                                            </div>

                                            <select className={styles.entityTypeSelect} name="entityType" defaultValue={item.entityType}>
                                                <option>Select entity type</option>
                                                <option value={"individual"} selected={item.entityType === "individual"}>Individual</option>
                                                <option value={"company"} selected={item.entityType === "company"}>Corporate Body/Company</option>
                                            </select>

                                            {
                                                vendorDueDiligenceData?.exposedPersons[index].entityType === "company" && <div className={styles.companyDetailsDiv}>
                                                    <div>
                                                        <label>Company Name<span>*</span></label>
                                                        <input name="companyName" defaultValue={item.companyName} />
                                                    </div>

                                                    <div>
                                                        <label>Registration Number<span>*</span></label>
                                                        <input name="registrationNumber" defaultValue={item.registrationNumber} />
                                                    </div>
                                                </div>
                                            }

                                            {
                                                vendorDueDiligenceData?.exposedPersons[index].entityType === "individual" && <div className={styles.individualDetailsDiv}>
                                                    <div>
                                                        <label>Title<span>*</span></label>
                                                        <select name="title" >
                                                            <option selected={item.title === "Mr"}>Mr</option>
                                                            <option selected={item.title === "Mrs"}>Mrs</option>
                                                            <option selected={item.title === "Ms"}>Ms</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label>First Name<span>*</span></label>
                                                        <input name="firstName" defaultValue={item.firstName} />
                                                    </div>

                                                    <div>
                                                        <label>Surname<span>*</span></label>
                                                        <input name="lastName" defaultValue={item.lastName} />
                                                    </div>
                                                </div>
                                            }

                                            <div className={styles.roleDiv}>
                                                {
                                                    vendorDueDiligenceData?.exposedPersons[index].entityType === "individual" && <div>
                                                        <label>Other Names</label>
                                                        <input name="otherName" defaultValue={item.otherName} />
                                                    </div>
                                                }

                                                <div>
                                                    <label>Role<span>*</span></label>
                                                    <select name="role" defaultValue={item.role}>
                                                        <option selected={item.role === "Shareholder"}>Shareholder</option>
                                                        <option selected={item.role === "Director"}>Director</option>
                                                        <option selected={item.role === "Both"}>Both</option>
                                                        <option selected={item.role === "Former"}>Former</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </form>



                                    {
                                        !vendorDueDiligenceData?.exposedPersons[index].flagged && <button className={styles.flagButton} onClick={() => toggleFlagForHODReview("exposedPersons", !vendorDueDiligenceData?.exposedPersons[index].flagged, index)}>Flag for HOD review</button>
                                    }

                                    {
                                        vendorDueDiligenceData?.exposedPersons[index].flagged && <div className={styles.flagEntryDiv}>
                                            <button onClick={() => toggleFlagForHODReview("exposedPersons", !vendorDueDiligenceData?.exposedPersons[index].flagged, index)}>UNFLAG</button>

                                            <div>
                                                <textarea onChange={event => updateFlagMessage("exposedPersons", event.target.value, index)} rows={5} placeholder="Type your notes here" defaultValue={vendorDueDiligenceData?.exposedPersons[index].flagMessage}></textarea>
                                                {
                                                    !vendorDueDiligenceData?.exposedPersons[index].flagMessage && <Image src={alertIcon} alt="alert" width={20} height={20} />
                                                }

                                            </div>
                                        </div>
                                    }

                                    <div className={styles.uploadFindingsDiv}>
                                        <div>
                                            <h5>Upload Findings<span>*</span></h5>

                                            {
                                                (Array.isArray(vendorDueDiligenceData?.exposedPersons[index].finding) && vendorDueDiligenceData?.exposedPersons[index].finding.length === 0) && <>
                                                    <p>Upload a screenshot of the CAC website listing.</p>
                                                    <button onClick={() => { setFieldToUploadFor("exposedPersons", index) }}>UPLOAD</button>
                                                </>
                                            }

                                            {
                                                (Array.isArray(vendorDueDiligenceData?.exposedPersons[index].finding) && vendorDueDiligenceData?.exposedPersons[index].finding.length > 0) && <div className={styles.actionButtons}>
                                                    <button onClick={() => { setFieldToUploadFor("exposedPersons", index) }}>Change</button>
                                                    <button className={styles.clearButton} onClick={() => clearUploadedField("exposedPersons", currentUpload.index)}>Clear</button>


                                                    {
                                                        vendorDueDiligenceData?.exposedPersons[index]?.finding[0]?.url && <Link href={vendorDueDiligenceData?.exposedPersons[index]?.finding[0]?.url} target="_blank"><button>View</button></Link>
                                                    }

                                                    <label>{vendorDueDiligenceData?.exposedPersons[index]?.finding[0]?.name}</label>
                                                </div>
                                            }

                                        </div>

                                        <button className={!validateExposedPerson(item) ? styles.activeButton : styles.inactiveButton} onClick={() => saveExposedPerson(vendorDueDiligenceData?.exposedPersons[index], index)}>{vendorDueDiligenceData?.exposedPersons[index]._id ? "UPDATE PERSON" : "SAVE PERSON"}</button>
                                    </div>

                                    {
                                        pageErrors.exposedPerson.index === index && <ErrorText text={pageErrors.exposedPerson.message} />
                                    }

                                    <hr />
                                </div>

                                {
                                    !validateExposedPerson(item) && <Image src={successGreen} alt="section validated" width={30} />
                                }


                            </div>)
                        }

                        <div className={styles.addPersonDiv}>
                            <p onClick={() => addExposedPerson()}>Add Another Person</p>

                            <Image src={addIcon} width={15} height={15} alt="add person icon" />
                        </div>
                    </div>




                    <div className={styles.dueDiligenceCheckDiv}>
                        <div>
                            <h3>Reference Check</h3>

                            <p>Where the contractor provides recent business history, the most recent and relevant experience (always in the last 3 years) is to be checked. Where possible this should be done independently of any contact information provided by the contractor. So please avoid using phone numbers and or e-mails provided by the contractor. If anything unusual is found flag for the HOD to review and enter a note.</p>

                            {
                                !vendorDueDiligenceData.referenceCheck.flagged && <button onClick={() => toggleFlagForHODReview("referenceCheck", !vendorDueDiligenceData.referenceCheck.flagged, 0)}>Flag for HOD review</button>
                            }

                            {
                                vendorDueDiligenceData.referenceCheck.flagged && <div className={styles.flagEntryDiv}>
                                    <button onClick={() => toggleFlagForHODReview("referenceCheck", !vendorDueDiligenceData.referenceCheck.flagged, 0)}>UNFLAG</button>

                                    <div>
                                        <textarea onChange={event => updateFlagMessage("referenceCheck", event.target.value, 0)} rows={5} defaultValue={vendorDueDiligenceData.referenceCheck.flagMessage}></textarea>
                                        {
                                            !vendorDueDiligenceData.referenceCheck.flagMessage && <Image src={alertIcon} alt="alert" width={20} height={20} />
                                        }

                                    </div>
                                </div>
                            }

                            <h5>Upload Findings<span>*</span></h5>


                            {
                                (Array.isArray(vendorDueDiligenceData.referenceCheck.finding) && vendorDueDiligenceData.referenceCheck.finding.length === 0) && <>
                                    <p>Upload a pdf of the e-mail trail or record of discussion of the reference checks.</p>
                                    <button onClick={() => { setFieldToUploadFor("referenceCheck", 0) }}>UPLOAD</button>
                                </>
                            }

                            {
                                (Array.isArray(vendorDueDiligenceData.referenceCheck.finding) && vendorDueDiligenceData.referenceCheck.finding.length > 0) && <div className={styles.actionButtons}>
                                    <button onClick={() => { setFieldToUploadFor("referenceCheck", 0) }}>Change</button>
                                    <button className={styles.clearButton} onClick={() => clearUploadedField("referenceCheck", currentUpload.index)}>Clear</button>

                                    {
                                        vendorDueDiligenceData?.referenceCheck?.finding[0]?.url && <Link href={vendorDueDiligenceData?.referenceCheck?.finding[0]?.url} target="_blank"><button>View</button></Link>
                                    }

                                    <label>{vendorDueDiligenceData?.referenceCheck?.finding[0]?.name}</label>
                                </div>
                            }
                        </div>

                        {
                            sectionValidated(vendorDueDiligenceData.referenceCheck) && <Image src={successGreen} alt="section validated" width={30} />
                        }
                    </div>

                    {
                        !showFinishSection && <footer>
                            <button className={allSectionsValidated() ? styles.validated : styles.notValidated} onClick={() => {
                                if (allSectionsValidated()) {
                                    setShowFinishSection(true)
                                }
                            }}>FINISH </button>
                        </footer>
                    }

                    {
                        showFinishSection && <div className={styles.finishDiv}>
                            <p>Please confirm that you have flagged for HOD review all interesting items found and made a note for the HOD to review.</p>

                            <div>
                                <button onClick={() => setShowFinishSection(false)}>CANCEL</button>
                                <button disabled={approvalStatus === "approving"} onClick={() => processToStageE()}>SUBMIT {approvalStatus === "approving" && <ButtonLoadingIcon />}</button>
                            </div>
                        </div>
                    }
                </>
            }

            {
                approvalStatus === "approved" && <div className={styles.allApprovedDiv}>
                    <p>Success!</p>
                    <p>The contractor&#39;s registration has now been passed to the HOD for their review. Returning you to the vendors list ...</p>
                </div>
            }


        </div>
    )
}

export default StageD