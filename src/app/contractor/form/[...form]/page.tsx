'use client'
import { getProtected } from "@/requests/get";
import { postProtected } from "@/requests/post";
import { putProtected } from "@/requests/put";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import RegistrationFormBody from "./RegistrationFormBody";

type RegistrationForm = {
    _id?: String,
    vendorID?: String,
    files?: Array<any>,
    form?: {
        pages?: [{
            pageTitle?: String,
            sections?: [
                {
                    layout?: String,
                    title?: String,
                    description?: String,
                    allowMultiple?: Boolean,
                    addSectionText?: String,
                    isDuplicate?: Boolean,
                    fields?: [
                        {
                            value?: any,
                            type?: any,
                            placeholder?: any,
                            options?: any,
                            allowedFormats?: any,
                            required?: boolean,
                            maxAllowedFiles?: any,
                            isACertificate?: boolean,
                            hasExpiryDate?: any,
                            label?: any,
                            errorText?: any,
                            textType?: any,
                            infoText?: any,
                            option?: any,
                            text?: any,
                            maxLength?: any,
                            allowMultiple?: Boolean,
                            addFieldText?: String,
                            isDuplicate?: Boolean
                        }
                    ]
                }
            ]
        }]
    }
}

type FieldToUploadFor = {
    pageIndex?: number,
    sectionIndex?: number,
    fieldIndex?: number,
    maxFiles?: any,

}

type ActivePage = {
    page?: any,
    label?: any,
    index?: any
}

const NewCompanyRegistration = () => {
    const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({})
    const [baseRegistrationForm, setBaseRegistrationForm] = useState<RegistrationForm>({})
    const [errorMessage, setErrorMessage] = useState("")
    const [tabs, setTabs] = useState([])
    const [activePage, setActivePage] = useState<ActivePage>({
        label: "",
        index: 0
    })
    const [certificates, setCertificates] = useState([])
    const [isComplete, setIsComplete] = useState(false)
    const [showFinish, setShowFinish] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const [currentFieldToUploadFor, setCurrentFieldToUploadFor] = useState<FieldToUploadFor>({})
    const location = useParams()
    const [submitting, setSubmitting] = useState(false)
    const [savingForm, setSavingForm] = useState(false)
    const [vendorID, setVendorID] = useState<String>("")
    const [companyStatus, setCompanyStatus] = useState<string>("")
    const user = useSelector((state: any) => state.user.user)



    useEffect(() => {
        const vendorId = location?.form[1]

        if (vendorId) {
            getVendorForm(vendorId)
        } else {
            getRegistrationForm()
        }

    }, [])


    const getRegistrationForm = async () => {
        try {
            const getRegistrationFormRequest = await getProtected("companies/register/form", user.role)




            if (getRegistrationFormRequest.status === "OK") {
                let tempRegistrationForm = { ...registrationForm }
                tempRegistrationForm = getRegistrationFormRequest.data
                setRegistrationForm(tempRegistrationForm)

                let tempBaseRegistrationForm = { ...baseRegistrationForm }
                tempBaseRegistrationForm = getRegistrationFormRequest

                let tempTabs = [...tabs]
                tempTabs = getRegistrationFormRequest.data.form.pages.map((item) => {
                    return {
                        name: item.pageTitle,
                        label: item.pageTitle
                    }
                })
                setTabs(tempTabs)

                let tempActivePage = { ...activePage }
                tempActivePage.index = 0
                tempActivePage.label = getRegistrationFormRequest.data.form.pages[0].pageTitle
                setActivePage(tempActivePage)
            } else {
                setErrorMessage(getRegistrationFormRequest.error.message)
            }



        } catch (error) {
            console.error({ error })
        }
    }

    const getVendorForm = async (vendorId: String) => {
        try {

            setVendorID(vendorId)

            const getVendorRegistrationFormRequest = await getProtected(`companies/register/form/${vendorId}`, user.role)

            if (getVendorRegistrationFormRequest.status === "OK") {
                let generalRegistrationForm = getVendorRegistrationFormRequest.data.generalRegistrationForm
                let vendorRegistrationForm = getVendorRegistrationFormRequest.data.vendorRegistrationForm

                let tempRegistrationForm = { ...registrationForm }
                tempRegistrationForm = generalRegistrationForm
                setRegistrationForm(tempRegistrationForm)

                let tempBaseRegistrationForm = { ...baseRegistrationForm }
                tempBaseRegistrationForm = getVendorRegistrationFormRequest.data.baseRegistrationForm
                setBaseRegistrationForm(tempBaseRegistrationForm)

                // Extract company status for returned remarks display
                // Check multiple possible paths since the API response structure may vary
                const responseData = getVendorRegistrationFormRequest.data
                const status =
                    vendorRegistrationForm?.flags?.status ||
                    vendorRegistrationForm?.flags?.stage ||
                    responseData?.approvalData?.flags?.status ||
                    responseData?.flags?.status ||
                    responseData?.companyStatus ||
                    ""
                console.log("[VendorForm] API response data keys:", Object.keys(responseData))
                console.log("[VendorForm] vendorRegistrationForm:", vendorRegistrationForm)
                console.log("[VendorForm] Resolved companyStatus:", status)
                setCompanyStatus(status)

                let tempTabs = [...tabs]
                tempTabs = generalRegistrationForm.form.pages.map((item) => {
                    return {
                        name: item.pageTitle,
                        label: item.pageTitle
                    }
                })
                setTabs(tempTabs)

                let tempActivePage = { ...activePage }
                tempActivePage.index = 0
                tempActivePage.label = generalRegistrationForm.form.pages[0].pageTitle
                setActivePage(tempActivePage)
            } else {
                setErrorMessage(getVendorRegistrationFormRequest.error.message)
            }


        } catch (error) {
            console.error({ error });

        }
    }

    const setFieldToUploadFor = (pageIndex, sectionIndex, fieldIndex, maxFiles) => {
        let tempFieldToUploadFor = { ...currentFieldToUploadFor }
        tempFieldToUploadFor.pageIndex = pageIndex
        tempFieldToUploadFor.sectionIndex = sectionIndex
        tempFieldToUploadFor.fieldIndex = fieldIndex
        tempFieldToUploadFor.maxFiles = maxFiles
        setCurrentFieldToUploadFor(tempFieldToUploadFor)
    }

    const closeUploadModal = () => {
        let tempFieldToUploadFor = { ...currentFieldToUploadFor }
        tempFieldToUploadFor = {}
        setCurrentFieldToUploadFor(tempFieldToUploadFor)
    }

    const updateField = (pageIndex, sectionIndex, fieldIndex, valueField, value) => {


        let tempRegistrationForm = { ...registrationForm }
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex][valueField] = value
        setRegistrationForm(tempRegistrationForm)

        validateField(pageIndex, sectionIndex, fieldIndex, valueField, value)
    }

    const goToPreviousPage = () => {
        setShowFinish(false)
        setShowSuccess(false)
        if (activePage.index - 1 >= 0) {
            const tempActivePage = { ...activePage }
            tempActivePage.index = tempActivePage.index - 1
            tempActivePage.label = registrationForm.form.pages[activePage.index - 1].pageTitle
            setActivePage(tempActivePage)
        }
    }

    const saveBeforeProgress = () => {
        const currentPageIsValid: boolean = validateCurrentPage()
        if (currentPageIsValid) {
            if (registrationForm.vendorID) {
                saveCurrentVendor()
            } else {
                createNewVendor()
            }
        }



    }

    const goToNextPage = () => {
        if (activePage.index + 1 >= registrationForm.form.pages.length) {
            setShowFinish(true)
        } else {
            const tempActivePage = { ...activePage }
            tempActivePage.index = tempActivePage.index + 1
            tempActivePage.label = registrationForm.form.pages[activePage.index + 1].pageTitle
            setActivePage(tempActivePage)
        }

    }

    const createNewVendor = async () => {
        try {
            setSavingForm(true)
            const saveCurrentPageRequest = await postProtected("companies/vendor/create", { registrationForm, certificates }, user.role)



            if (saveCurrentPageRequest.status === "OK") {
                setSavingForm(false)
                let tempRegistrationForm = { ...registrationForm }
                tempRegistrationForm = { ...tempRegistrationForm, ...saveCurrentPageRequest.data }
                setRegistrationForm(tempRegistrationForm)

                goToNextPage()
            }

        } catch (error) {
            console.error({ error });
        }
    }




    const saveCurrentVendor = async () => {
        setSavingForm(true)
        try {
            const saveCurrentPageRequest = await putProtected("companies/vendor/update", { registrationForm, certificates }, user.role)



            if (saveCurrentPageRequest.status === "OK") {
                setSavingForm(false)
                let tempRegistrationForm = { ...registrationForm }
                tempRegistrationForm = { ...tempRegistrationForm, ...saveCurrentPageRequest.data }
                setRegistrationForm(tempRegistrationForm)

                goToNextPage()
            }
        }
        catch (error) {
            console.error({ error })
        }
    }

    const validateCurrentPage = () => {
        const sections = registrationForm.form.pages[activePage.index].sections
        const pageIndex = activePage.index
        let isValidated = true

        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            const section = sections[sectionIndex];

            for (let fieldIndex = 0; fieldIndex < section.fields.length; fieldIndex++) {
                const field = section.fields[fieldIndex]

                if (field.type === "shortText") {
                    if (String(field.value) === "" && field.required) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
                    } else if (String(field.value).length > field.maxLength) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
                    } else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "radioButtons") {
                    if (String(field.value) === "" && field.required) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "You have to select a value for this field.")
                    } else if (String(field.value).length > field.maxLength) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
                    } else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "longText") {
                    if (String(field.value) === "" && field.required) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
                    } else if (String(field.value).length > field.maxLength) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
                    } else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "date") {
                    const dateRegex = /"([1|2]\d{3})-((0[1-9])|(1[0-2]))-([0][1-9]|([1-2]\d)|(3[0-1]))T(([0-1]\d)|(2[0-3])):([0-5][0-9])"g/
                    const date = new Date(field.value)


                    if (String(field.value) === "" && field.required) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
                    } else if (String(field.value).length > field.maxLength) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
                    }
                    // else if (!dateRegex.test(field.value)) {
                    //     isValidated = false
                    //     

                    //     setFieldError(pageIndex, sectionIndex, fieldIndex, "Please select a valid date")
                    // } 
                    else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "multiSelectText") {
                    if (field.required && field.value?.length === 0) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required and you have to enter at least one value")
                    } else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "file") {


                    if (field.label === "Upload CAC/BN Form 1") {

                        //@ts-ignore
                        if (registrationForm.form.pages[0].sections[0].fields[1].value === "Business Name Registration" && field.value?.length === 0) {
                            isValidated = false
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required")
                        } else {
                            isValidated = true
                            setFieldValid(pageIndex, sectionIndex, fieldIndex)
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "")
                        }
                    } else if (field.label === "Upload CAC Form 2A" || field.label === "Upload CAC Form 7") {
                        //@ts-ignore
                        if (registrationForm.form.pages[0].sections[0].fields[1].value === "Company Registration" && field.value?.length === 0) {
                            isValidated = false
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required")
                        } else {
                            isValidated = true
                            setFieldValid(pageIndex, sectionIndex, fieldIndex)
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "")
                        }
                    } else if (field.required && field.value?.length === 0) {

                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required")
                    } else if (field.isACertificate) {
                        let certificateIsNotValid = false

                        if (field.hasExpiryDate) {
                            for (let index = 0; index < field.value?.length; index++) {
                                const element = field.value[index];

                                if (field.isACertificate && field.hasExpiryDate && !element.expiryDate) {


                                    setFieldError(pageIndex, sectionIndex, fieldIndex, `Set an expiry date for ${element.label}`)
                                    certificateIsNotValid = true
                                }

                            }

                            if (certificateIsNotValid) {
                                isValidated = false
                            }
                        } else {
                            isValidated = true
                            setFieldValid(pageIndex, sectionIndex, fieldIndex)
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "")
                        }


                    } else {

                        isValidated = true

                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "")
                    }


                }



                if (!isValidated) {
                    break
                }

            }

            if (!isValidated) {

                break
            }

        }
        return isValidated
    }

    const validateField = (pageIndex, sectionIndex, fieldIndex, valueField, value) => {
        const field = registrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]







        if (field.type === "shortText") {
            if (String(value) === "" && field.required) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
            } else if (String(value).length > field.maxLength) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
            } else {
                setFieldValid(pageIndex, sectionIndex, fieldIndex)
            }
        } else if (field.type === "longText") {
            if (String(value) === "" && field.required) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
            } else if (String(value).length > field.maxLength) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
            } else {
                setFieldValid(pageIndex, sectionIndex, fieldIndex)
            }
        } else if (field.type === "date") {
            const dateRegex = /"([1|2]\d{3})-((0[1-9])|(1[0-2]))-([0][1-9]|([1-2]\d)|(3[0-1]))T(([0-1]\d)|(2[0-3])):([0-5][0-9])"g/
            const date = new Date(value)


            if (String(value) === "" && field.required) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
            } else if (String(value).length > field.maxLength) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
            } else {
                setFieldValid(pageIndex, sectionIndex, fieldIndex)
            }
        } else if (field.type === "multiSelectText") {
            if (field.required && value.length === 0) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required and you have to enter at least one value")
            } else {
                setFieldValid(pageIndex, sectionIndex, fieldIndex)
            }
        }

    }

    const setFieldError = (pageIndex, sectionIndex, fieldIndex, errorText) => {


        let tempRegistrationForm = { ...registrationForm }
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]["errorText"] = errorText


        setRegistrationForm(tempRegistrationForm)

    }

    const setFieldValid = (pageIndex, sectionIndex, fieldIndex) => {

        let tempRegistrationForm = { ...registrationForm }
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]["errorText"] = ""


        setRegistrationForm(tempRegistrationForm)

    }


    const addCertificates = newCertificates => {


        let tempCertificates = [...certificates]
        tempCertificates = [...tempCertificates, ...newCertificates]
        setCertificates(tempCertificates)
    }



    const removeFileFromFileList = (pageIndex, sectionIndex, fieldIndex, fileID) => {
        let tempRegistrationForm = { ...registrationForm }

        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].value = tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].value.filter(item => item._id !== fileID)


        setRegistrationForm(tempRegistrationForm)


    }

    const removeCertificate = (certificateID) => {
        let tempCertificates = [...certificates]
        tempCertificates = tempCertificates.filter(item => item._id !== certificateID)
        setCertificates(tempCertificates)
    }


    const addFieldToSection = (field, pageIndex, sectionIndex, index) => {
        let tempNewForm = { ...registrationForm }

        let newField = { ...field }




        newField["allowMultiple"] = true
        newField["isDuplicate"] = true
        newField["label"] = field.addedFieldLabel

        tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields.splice(index, 0, newField)

        setRegistrationForm(tempNewForm)

        updateField(pageIndex, sectionIndex, index - 1, "allowMultiple", false)




    }

    const updateSection = (pageIndex, sectionIndex, valueField, value) => {


        let tempRegistrationForm = { ...registrationForm }
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex][valueField] = value
        setRegistrationForm(tempRegistrationForm)

        // validateField(pageIndex, sectionIndex, fieldIndex, valueField, value)
    }

    // const addSectionToPage = (section, pageIndex, sectionIndex) => {
    //     let tempNewForm = {...registrationForm}

    //     let createdSection = {}

    //     if (section.originalSectionIndex) {
    //         createdSection = baseRegistrationForm.form.pages[pageIndex].sections[section.originalSectionIndex]
    //     } else {
    //         createdSection = baseRegistrationForm.form.pages[pageIndex].sections[sectionIndex]
    //     }






    //     let newSection = {...createdSection}




    //     newSection["allowMultiple"] = true
    //     newSection["isDuplicate"] = true
    //     newSection["label"] = section.addedFieldLabel

    //     if (section.originalSectionIndex) {
    //         newSection["originalSectionIndex"] = section.originalSectionIndex

    //     } else {
    //         newSection["originalSectionIndex"] = sectionIndex
    //     }

    //     


    //     tempNewForm.form.pages[pageIndex].sections.splice(sectionIndex + 1, 0, newSection)

    //     setRegistrationForm(tempNewForm)

    //     updateSection(pageIndex, sectionIndex, "allowMultiple", false)

    // }

    const addSectionToPage = (section, pageIndex, sectionIndex) => {
        let tempNewForm = { ...registrationForm }

        let createdSection = {}

        if (section.originalSectionIndex) {
            createdSection = baseRegistrationForm.form.pages[pageIndex].sections[section.originalSectionIndex]
        } else {
            createdSection = baseRegistrationForm.form.pages[pageIndex].sections[sectionIndex]
        }

        // Create a deep copy of the entire section to avoid reference sharing
        let newSection = JSON.parse(JSON.stringify(createdSection))

        // Reset all field values to ensure independence
        newSection.fields = newSection.fields.map(field => {
            // Reset field values based on type
            if (field.type === "file") {
                field.value = []
            } else if (field.type === "multiSelectText") {
                field.value = []
            } else {
                field.value = ""
            }

            // Clear any error text
            field.errorText = ""

            return field
        })

        newSection["allowMultiple"] = true
        newSection["isDuplicate"] = true
        newSection["label"] = section.addedSectionLabel

        if (section.originalSectionIndex) {
            newSection["originalSectionIndex"] = section.originalSectionIndex
        } else {
            newSection["originalSectionIndex"] = sectionIndex
        }



        tempNewForm.form.pages[pageIndex].sections.splice(sectionIndex + 1, 0, newSection)

        setRegistrationForm(tempNewForm)

        updateSection(pageIndex, sectionIndex, "allowMultiple", false)
    }

    const removeFieldFromSection = (field, pageIndex, sectionIndex, index) => {
        let tempNewForm = { ...registrationForm }



        tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields.splice(index, 1)

        setRegistrationForm(tempNewForm)

        if (tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields[index + 1]) {
            if (!tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields[index + 1].isDuplicate) {
                updateField(pageIndex, sectionIndex, index - 1, "allowMultiple", true)
            }
        }
    }

    const removeSectionFromPage = (field, pageIndex, sectionIndex) => {
        let tempNewForm = { ...registrationForm }



        tempNewForm.form.pages[pageIndex].sections.splice(sectionIndex, 1)

        setRegistrationForm(tempNewForm)

        if (tempNewForm.form.pages[pageIndex].sections[sectionIndex + 1]) {
            if (!tempNewForm.form.pages[pageIndex].sections[sectionIndex + 1].isDuplicate) {
                updateSection(pageIndex, sectionIndex - 1, "allowMultiple", true)
            }
        }
    }

    const submitForm = async () => {
        try {
            setSubmitting(true)

            const submitApplicationRequest = await putProtected("companies/vendor/submit", { vendorID: registrationForm.vendorID }, user.role)

            setSubmitting(false)

            if (submitApplicationRequest.status === "OK") {
                setShowSuccess(true)
            }
        } catch (error) {
            console.error({ error });

        }
    }

    // 







    return (


        <RegistrationFormBody
            registrationForm={registrationForm}
            currentFieldToUploadFor={currentFieldToUploadFor}
            updateField={(pageIndex, sectionIndex, fieldIndex, valueField, value) => updateField(pageIndex, sectionIndex, fieldIndex, valueField, value)}
            addCertificates={(newCertificates) => addCertificates(newCertificates)}
            closeUploadModal={() => closeUploadModal()}
            errorMessage={errorMessage}
            activePage={activePage}
            goToPreviousPage={() => goToPreviousPage()}
            saveBeforeProgress={() => saveBeforeProgress()}
            isComplete={isComplete}
            tabs={tabs}
            submitting={submitting}
            submitForm={() => submitForm()}
            showFinish={showFinish}
            vendorID={vendorID}
            showSuccess={showSuccess}
            companyStatus={companyStatus}
            addSectionToPage={(section, pageIndex, sectionIndex, index) => addSectionToPage(section, pageIndex, sectionIndex)}
            removeSectionFromPage={(section, pageIndex, sectionIndex) => removeSectionFromPage(section, pageIndex, sectionIndex)}
            setActivePage={(newActivePAge) => setActivePage(newActivePAge)}
            addFieldToSection={(field, pageIndex, sectionIndex, index) => addFieldToSection(field, pageIndex, sectionIndex, index)}
            removeFieldFromSection={(field, pageIndex, sectionIndex, index) => removeFieldFromSection(field, pageIndex, sectionIndex, index)}
            setFieldToUploadFor={(pageIndex, sectionIndex, fieldIndex, maxFiles) => setFieldToUploadFor(pageIndex, sectionIndex, fieldIndex, maxFiles)}
            removeCertificate={(certificateID) => removeCertificate(certificateID)}
            removeFileFromFileList={(pageIndex, sectionIndex, fieldIndex, fileID) => removeFileFromFileList(pageIndex, sectionIndex, fieldIndex, fileID)}
            savingForm={savingForm}
        />
    )
}




export default NewCompanyRegistration