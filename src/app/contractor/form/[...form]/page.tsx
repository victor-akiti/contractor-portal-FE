'use client'

import { useEffect, useRef, useState } from "react"
import styles from "./styles/styles.module.css"
import { getProtected } from "@/requests/get"
import ErrorText from "@/components/errorText"
import Tabs from "@/components/tabs"
import ShortText from "@/components/formComponents/shortText"
import LongText from "@/components/formComponents/longText"
import DropDown from "@/components/formComponents/dropDown"
import TextBlock from "@/components/formComponents/textBlock"
import MultiSelectText from "@/components/formComponents/multiSelectText"
import FileSelector from "@/components/formComponents/file"
import CheckBoxes from "@/components/formComponents/checkBoxes"
import DateSelect from "@/components/formComponents/date"
import RadioButtons from "@/components/formComponents/radioButtons"
import Modal from "@/components/modal"
import { postProtected, postProtectedMultipart } from "@/requests/post"
import FileUploader from "@/components/fileUploader"
import { putProtected } from "@/requests/put"
import { useParams } from "next/navigation"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import Link from "next/link"
import ButtonLoadingIconPrimary from "@/components/buttonLoadingPrimary"
import Image from "next/image"
import { useSelector } from "react-redux"

type RegistrationForm = {
    _id? : String,
    vendorID?: String,
    files?: Array<any>,
    form? : {
        pages? : [{
            pageTitle ?: String,
            sections? : [
                {   
                    layout? : String,
                    title? : String,
                    description? : String,
                    allowMultiple? : Boolean,
                    addSectionText?: String,
                    isDuplicate?: Boolean,
                    fields? : [
                        {
                            value? : any,
                            type?: any,
                            placeholder?: any,
                            options? : any,
                            allowedFormats?: any,
                            required? : boolean,
                            maxAllowedFiles? : any,
                            isACertificate? : boolean,
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
    pageIndex? : number,
    sectionIndex? : number,
    fieldIndex?: number,
    maxFiles? : any,
    
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
    const user = useSelector((state: any) => state.user.user)
    console.log({location});
    

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

            console.log({getRegistrationFormRequest});
            

            if (getRegistrationFormRequest.status === "OK") {
                let tempRegistrationForm = {...registrationForm}
                tempRegistrationForm = getRegistrationFormRequest.data
                setRegistrationForm(tempRegistrationForm)

                let tempBaseRegistrationForm = {...baseRegistrationForm}
                tempBaseRegistrationForm = getRegistrationFormRequest

                let tempTabs = [...tabs]
                tempTabs = getRegistrationFormRequest.data.form.pages.map((item) => {
                    return {
                        name: item.pageTitle,
                        label: item.pageTitle
                    }
                })
                setTabs(tempTabs)

                let tempActivePage = {...activePage}
                tempActivePage.index = 0
                tempActivePage.label = getRegistrationFormRequest.data.form.pages[0].pageTitle
                setActivePage(tempActivePage)
            } else {
                setErrorMessage(getRegistrationFormRequest.error.message)
            }

            console.log({getRegistrationFormRequest});
            
        } catch (error) {
            console.log({error})
        }
    }

    const getVendorForm = async (vendorId: String) => {
        try {
            console.log({vendorId});
            setVendorID(vendorId)
            
            const getVendorRegistrationFormRequest = await getProtected(`companies/register/form/${vendorId}`, user.role)

            if (getVendorRegistrationFormRequest.status === "OK") {
                let generalRegistrationForm = getVendorRegistrationFormRequest.data.generalRegistrationForm
                let vendorRegistrationForm = getVendorRegistrationFormRequest.data.vendorRegistrationForm

                let tempRegistrationForm = {...registrationForm}
                tempRegistrationForm = generalRegistrationForm
                setRegistrationForm(tempRegistrationForm)

                let tempBaseRegistrationForm = {...baseRegistrationForm}
                tempBaseRegistrationForm = getVendorRegistrationFormRequest.data.baseRegistrationForm
                setBaseRegistrationForm(tempBaseRegistrationForm)


                let tempTabs = [...tabs]
                tempTabs = generalRegistrationForm.form.pages.map((item) => {
                    return {
                        name: item.pageTitle,
                        label: item.pageTitle
                    }
                })
                setTabs(tempTabs)

                let tempActivePage = {...activePage}
                tempActivePage.index = 0
                tempActivePage.label = generalRegistrationForm.form.pages[0].pageTitle
                setActivePage(tempActivePage)
            } else {
                setErrorMessage(getVendorRegistrationFormRequest.error.message)
            }

            console.log({getVendorRegistrationFormRequest});
        } catch (error) {
            console.log({error});
            
        }
    }

    const setFieldToUploadFor = (pageIndex, sectionIndex, fieldIndex, maxFiles) => {
        let tempFieldToUploadFor = {...currentFieldToUploadFor}
        tempFieldToUploadFor.pageIndex = pageIndex
        tempFieldToUploadFor.sectionIndex = sectionIndex
        tempFieldToUploadFor.fieldIndex = fieldIndex
        tempFieldToUploadFor.maxFiles = maxFiles
        setCurrentFieldToUploadFor(tempFieldToUploadFor)
    }

    const closeUploadModal = () => {
        let tempFieldToUploadFor = {...currentFieldToUploadFor}
        tempFieldToUploadFor = {}
        setCurrentFieldToUploadFor(tempFieldToUploadFor)
    }

    const updateField = (pageIndex, sectionIndex, fieldIndex, valueField, value) => {
        console.log({sectionIndex});
        
        let tempRegistrationForm = {...registrationForm}
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex][valueField] = value
        setRegistrationForm(tempRegistrationForm)

        validateField(pageIndex, sectionIndex, fieldIndex, valueField, value)
    }

    const goToPreviousPage = () => {
        setShowFinish(false)
        setShowSuccess(false)
        if (activePage.index - 1 >= 0) {
            const tempActivePage = {...activePage}
        tempActivePage.index = tempActivePage.index - 1
        tempActivePage.label = registrationForm.form.pages[activePage.index - 1].pageTitle
        setActivePage(tempActivePage)
        }
    }

    const saveBeforeProgress = () => {
        const currentPageIsValid:boolean = validateCurrentPage()
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
            const tempActivePage = {...activePage}
            tempActivePage.index = tempActivePage.index + 1
            tempActivePage.label = registrationForm.form.pages[activePage.index + 1].pageTitle
            setActivePage(tempActivePage)    
        }
        
    }

    const createNewVendor = async () => {
        try {
            setSavingForm(true)
            const saveCurrentPageRequest = await postProtected("companies/vendor/create", {registrationForm, certificates}, user.role)

            console.log({saveCurrentPageRequest});

            if (saveCurrentPageRequest.status === "OK") {
                setSavingForm(false)
                let tempRegistrationForm = {...registrationForm}
                tempRegistrationForm = {...tempRegistrationForm, ...saveCurrentPageRequest.data}
                setRegistrationForm(tempRegistrationForm)

                goToNextPage()
            }
            
        } catch (error) {
            console.log({error});
        }
    }




    const saveCurrentVendor = async () => {
        setSavingForm(true)
        try {
            const saveCurrentPageRequest = await putProtected("companies/vendor/update", {registrationForm, certificates}, user.role)

            console.log({saveCurrentPageRequest});

            if (saveCurrentPageRequest.status === "OK") {
                setSavingForm(false)
                let tempRegistrationForm = {...registrationForm}
                tempRegistrationForm = {...tempRegistrationForm, ...saveCurrentPageRequest.data}
                setRegistrationForm(tempRegistrationForm)

                goToNextPage()
            }
        }
        catch (error) {
            console.log({error})
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
                    //     console.log({theValue: dateRegex.test(field.value)});
                        
                    //     setFieldError(pageIndex, sectionIndex, fieldIndex, "Please select a valid date")
                    // } 
                    else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "multiSelectText") {
                    if (field.required && field.value.length === 0) {
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required and you have to enter at least one value")
                    } else {
                        isValidated = true
                        setFieldValid(pageIndex, sectionIndex, fieldIndex)
                    }
                } else if (field.type === "file") {
                    
                    
                    if (field.label === "Upload CAC/BN Form 1") {
                        
                        //@ts-ignore
                        if (registrationForm.form.pages[0].sections[0].fields[1].value === "Business Name Registration" && field.value.length === 0) {
                            isValidated = false
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required")
                        } else {
                            isValidated = true  
                            setFieldValid(pageIndex, sectionIndex, fieldIndex)
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "")
                        }
                    } else if (field.label === "Upload CAC Form 2A" || field.label === "Upload CAC Form 7") {
                        //@ts-ignore
                        if (registrationForm.form.pages[0].sections[0].fields[1].value === "Company Registration" && field.value.length === 0) {
                            isValidated = false
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required")
                        } else {
                            isValidated = true  
                            setFieldValid(pageIndex, sectionIndex, fieldIndex)
                            setFieldError(pageIndex, sectionIndex, fieldIndex, "")
                        }
                    } else if (field.required && field.value.length === 0) {
                        console.log("Error: " ,field.label, field.value.length);
                        isValidated = false
                        setFieldError(pageIndex, sectionIndex, fieldIndex, "This field is required")
                    } else if (field.isACertificate) {
                        let certificateIsNotValid = false

                        if (field.hasExpiryDate) {
                            for (let index = 0; index < field.value.length; index++) {
                                const element = field.value[index];
                                
                                if (field.isACertificate && field.hasExpiryDate && !element.expiryDate) {
                                    console.log("Invalid certificate");
                                    
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
                        console.log(field.label, field.value.length);
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
                console.log({name: section.title, isValidated})
                break
            }
            
        }
        return isValidated
    }

    const validateField = (pageIndex, sectionIndex, fieldIndex, valueField, value) => {
        const field = registrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]

        console.log({field});
        

        console.log({validatedValue: value});
        

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
            console.log({date: date.toISOString()});
            
            if (String(value) === "" && field.required) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, "This field cannot be left empty")
            } else if (String(value).length > field.maxLength) {
                setFieldError(pageIndex, sectionIndex, fieldIndex, `This field can only be ${field.maxLength} ${field.maxLength === 1 ? "character" : "characters"} long`)
            }  else {
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
        console.log({errorText});
        
        let tempRegistrationForm = {...registrationForm}
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]["errorText"] = errorText
        console.log({tempRegistrationForm});
        
        setRegistrationForm(tempRegistrationForm)

    }

    const setFieldValid = (pageIndex, sectionIndex, fieldIndex) => {
        
        let tempRegistrationForm = {...registrationForm}
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]["errorText"] = ""
        console.log({tempRegistrationForm});
        
        setRegistrationForm(tempRegistrationForm)

    }
    

    const addCertificates = newCertificates => {
        console.log({newCertificates});
        
        let tempCertificates = [...certificates]
        tempCertificates = [...tempCertificates, ...newCertificates]
        setCertificates(tempCertificates)
    }

    console.log({certificates, currentFieldToUploadFor});

    const removeFileFromFileList = (pageIndex, sectionIndex, fieldIndex, fileID) => {
        let tempRegistrationForm = {...registrationForm}
        console.log({field: tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex]});
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].value = tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].value.filter(item => item._id !== fileID)
        console.log({temp: tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].value});
        
        setRegistrationForm(tempRegistrationForm)

        
    }

    const removeCertificate = (certificateID) => {
        let tempCertificates = [...certificates]
        tempCertificates = tempCertificates.filter(item => item._id !== certificateID)
        setCertificates(tempCertificates)
    }


    const addFieldToSection = (field, pageIndex, sectionIndex, index) => {
        let tempNewForm = {...registrationForm}

        let newField = {...field}
        console.log({newField});
        
        

        newField["allowMultiple"] = true
        newField["isDuplicate"] = true
        newField["label"] = field.addedFieldLabel

        tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields.splice(index, 0, newField)

        setRegistrationForm(tempNewForm)

        updateField(pageIndex, sectionIndex, index - 1, "allowMultiple", false)

        

        
    }

    const updateSection = (pageIndex, sectionIndex, valueField, value) => {
        console.log({pageIndex, sectionIndex, valueField, value});
        
        let tempRegistrationForm = {...registrationForm}
        tempRegistrationForm.form.pages[pageIndex].sections[sectionIndex][valueField] = value
        setRegistrationForm(tempRegistrationForm)

        // validateField(pageIndex, sectionIndex, fieldIndex, valueField, value)
    }

    const addSectionToPage = (section, pageIndex, sectionIndex) => {
        let tempNewForm = {...registrationForm}

        let createdSection = {}
        
        if (section.originalSectionIndex) {
            createdSection = baseRegistrationForm.form.pages[pageIndex].sections[section.originalSectionIndex]
        } else {
            createdSection = baseRegistrationForm.form.pages[pageIndex].sections[sectionIndex]
        }


        
        
        

        let newSection = {...createdSection}

        
        

        newSection["allowMultiple"] = true
        newSection["isDuplicate"] = true
        newSection["label"] = section.addedFieldLabel
        
        if (section.originalSectionIndex) {
            newSection["originalSectionIndex"] = section.originalSectionIndex
            
        } else {
            newSection["originalSectionIndex"] = sectionIndex
        }

        console.log({newSection});
        

        tempNewForm.form.pages[pageIndex].sections.splice(sectionIndex + 1, 0, newSection)

        setRegistrationForm(tempNewForm)

        updateSection(pageIndex, sectionIndex, "allowMultiple", false)
        
    }

    const removeFieldFromSection = (field, pageIndex, sectionIndex, index) => {
        let tempNewForm = {...registrationForm}



        tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields.splice(index, 1)

        setRegistrationForm(tempNewForm)

        if (tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields[index + 1]) {
            if (!tempNewForm.form.pages[pageIndex].sections[sectionIndex].fields[index + 1].isDuplicate) {
                updateField(pageIndex, sectionIndex, index - 1, "allowMultiple", true)
            }
        }
    }

    const removeSectionFromPage = (field, pageIndex, sectionIndex) => {
        let tempNewForm = {...registrationForm}



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

            const submitApplicationRequest = await putProtected("companies/vendor/submit", {vendorID: registrationForm.vendorID}, user.role)

            setSubmitting(false)
            
            if (submitApplicationRequest.status === "OK") {
                setShowSuccess(true)
            }
        } catch (error) {
            console.log({error});
            
        }
    }

    // console.log({currentPage: registrationForm.form.pages[activePage.index]});
    
    
    
    

    

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


const RegistrationFormBody = ({registrationForm, 
    showFinish, 
    submitForm, 
    submitting, 
    showSuccess, 
    currentFieldToUploadFor, 
    savingForm,
    vendorID,
    updateField, addCertificates, closeUploadModal, errorMessage, activePage, goToPreviousPage, saveBeforeProgress, isComplete, tabs, setActivePage, addFieldToSection, removeFieldFromSection, setFieldToUploadFor, removeCertificate, removeFileFromFileList, addSectionToPage, removeSectionFromPage}) => {

    
    console.log({registrationForm});

    const getFieldPlaceholder = (field) => {
        if (field.type === "shortText" && field.label === "Registered Number") {
            if (registrationForm.form.pages[0].sections[0].fields[1].value === "Business Name Registration") {
                return "e.g. 12345678"
            } else if (registrationForm.form.pages[0].sections[0].fields[1].value === "Company Registration") {
                return "e.g. RC 12345678"
            } else {
                return "Please select a CAC registration type first"
            }
        } else {
            return field.placeholder
        }
    }

    console.log({fieldValue: registrationForm?.form?.pages[7]?.sections[0]?.fields[0]?.value});

    const [fileSampleURL, setFileSampleURL] = useState("")
    


    const getFileVisibility = (fieldIndex, fieldItem, sectionIndex) => {
        console.log({sectionIndex});
        
        if (registrationForm.form.pages[0].sections[0].fields[1].value === "Business Name Registration" && (fieldItem.label === "Upload CAC Form 7" || fieldItem.label === "Upload CAC Form 2A")) {
            return <span></span>
        } else if (registrationForm.form.pages[0].sections[0].fields[1].value !== "Business Name Registration" && fieldItem.label === "Upload CAC/BN Form 1") {
            return <span></span>
        } else {
            return <div key={fieldIndex} className={styles.fieldComponent}>
                <div className={styles.fileSelectorDiv}>
                    <FileSelector key={fieldIndex} required={fieldItem.required}  errorText={fieldItem.errorText} highlighted={""} infoText={fieldItem.infoText} label={fieldItem.label} onClick={() => {
                    setFieldToUploadFor(activePage.index, sectionIndex, fieldIndex, fieldItem.maxAllowedFiles)
                    }} allowedFormats={[fieldItem.allowedFormats]} value={fieldItem.value} isACertificate={fieldItem.isACertificate} 
                    hasExpiryDate={fieldItem.hasExpiryDate} 
                    clearValues={() => updateField(activePage.index, sectionIndex, fieldIndex, "value", "")}
                    updateIssueDate={(newValues) => updateField(activePage.index, sectionIndex, fieldIndex, "issueDate", "")}
                    setErrorText={errorText =>  updateField(activePage.index, sectionIndex, fieldIndex, "errorText", "")}
                    updateExpiryDate={(newValues) => updateField(activePage.index, sectionIndex, fieldIndex, "ExpiryDate", "")}
                    removeFile={fileID => {
                        removeFileFromFileList(activePage.index, sectionIndex, fieldIndex, fileID)
                    }}
                    removeCertificate={certificateID => removeCertificate(certificateID)
                    }
                    />

                    {
                        fieldItem?.fieldSample && <div className={styles.uploadSampleDiv}>
                        <Image src={fieldItem?.fieldSample[0]?.url} width={100} height={100}  alt="Upload Sample"  />
                        <button onClick={() => setFileSampleURL(fieldItem?.fieldSample[0]?.url)}>Show Sample</button>
                    </div>
                    }

                    
                </div>
                {
                    <div className={styles.addFieldText}>
                        {
                            fieldItem.allowMultiple && <div>
                                <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                            </div>
                        }

                        {
                            fieldItem.isDuplicate && <div>
                                <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                            </div>
                        }
                    </div>
                }
            </div>
        }
    }

    const getShortTextVisibility = (fieldIndex, fieldItem, sectionIndex) => {
        
        if (registrationForm?.form?.pages[7]?.sections[0]?.fields[0]?.value === "Company/Corporate Body" && (fieldItem.label === "First Name" || fieldItem.label === "Surname" || fieldItem.label === "Other Names")) {
            return <span></span>
        } else if (registrationForm?.form?.pages[7]?.sections[0]?.fields[sectionIndex]?.value !== "Company/Corporate Body" && (fieldItem.label === "Company Name" || fieldItem.label === "Registration Number")) { 
            return <span></span>
        } else {
            return <div key={fieldIndex} className={styles.fieldComponent}>
                <ShortText defaultValue={fieldItem.value} 
                    key={fieldIndex} 
                    errorText={fieldItem.errorText} 
                    required={fieldItem.required} 
                    infoText={""} 
                    value={fieldItem.value}
                    type={fieldItem.textType} 
                    label={fieldItem.label} 
                    onChange={(value) => {
                        updateField(activePage.index, sectionIndex, fieldIndex, "value", value)
                    }} 
                    onClick={() => {}} 
                    placeholder={getFieldPlaceholder(fieldItem)} 
                    highlighted={""} 
                />
                {
                    <div className={styles.addFieldText}>
                        {
                            fieldItem.allowMultiple && <div>
                                <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                            </div>
                        }

                        {
                            fieldItem.isDuplicate && <div>
                                <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                            </div>
                        }
                    </div>
                }
            </div>
        }
    }

    const getDropDownVisibility = (fieldIndex, fieldItem, sectionIndex) => {
        if (registrationForm?.form?.pages[7]?.sections[0]?.fields[0]?.value === "Company/Corporate Body" && (fieldItem.label === "Title")) {
            return <span></span>
        } else {
            return <div key={fieldIndex} className={styles.fieldComponent}>
            <DropDown key={fieldIndex} value={fieldItem.value} required={fieldItem.required} errorText={fieldItem.errorText} onSelect={value => updateField(activePage.index, sectionIndex, fieldIndex, "value", value)} infoText={fieldItem.infoText} highlighted={""} label={fieldItem.label} onClick={() => {}} options={fieldItem.options} />

            {
                <div className={styles.addFieldText}>
                    {
                        fieldItem.allowMultiple && <div>
                            <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                        </div>
                    }

                    {
                        fieldItem.isDuplicate && <div>
                            <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                        </div>
                    }
                </div>
            }
        </div>
        }
    }
    

    
    

    return (
        <div className={styles.newRegistration}>
            <h1>{vendorID ? "Update/Complete Registration" : "New Registration"}</h1>

            {
                fileSampleURL && <Modal>
                    <div className={styles.fileSampleModal}>
                        <Image src={fileSampleURL} width={1000} height={1000} objectFit="cover" alt="File Sample" style={{ maxHeight: "100%", objectFit: "contain"}} />

                        <div className={styles.closePreviewButtonDiv}>
                            <button onClick={() => setFileSampleURL(null)}>Close Preview</button>
                        </div>
                    </div>
                </Modal>
            }
            
            {
                Object.values(currentFieldToUploadFor).length > 0  && <Modal>
                    <FileUploader label={registrationForm.form.pages[currentFieldToUploadFor.pageIndex].sections[currentFieldToUploadFor.sectionIndex].fields[currentFieldToUploadFor.fieldIndex].label}
                     updateCode={registrationForm.form.pages[currentFieldToUploadFor.pageIndex].sections[currentFieldToUploadFor.sectionIndex].fields[currentFieldToUploadFor.fieldIndex].updateCode} 
                     updateUploadedFiles={fileUrlsArray => {
                        console.log({fileUrlsArray});
                        updateField(currentFieldToUploadFor.pageIndex, currentFieldToUploadFor.sectionIndex, currentFieldToUploadFor.fieldIndex, "value", fileUrlsArray)
                        const currentField = registrationForm.form.pages[currentFieldToUploadFor.pageIndex].sections[currentFieldToUploadFor.sectionIndex].fields[currentFieldToUploadFor.fieldIndex]
                        if (currentField.isACertificate) {
                            addCertificates(fileUrlsArray)
                        }
                        closeUploadModal()
                    }} files={registrationForm.files} maxFiles={currentFieldToUploadFor.maxFiles} closeUploader={() => closeUploadModal()} />
                </Modal>
            }



            {
                errorMessage && <ErrorText text={errorMessage} />
            }

            {
                registrationForm.form && <div>
                    <div className={styles.actionButtonsTop}>
                        {
                            activePage.index > 0 && <button onClick={() => goToPreviousPage()}>Previous</button>
                        }

                        {
                            activePage.index <= registrationForm.form.pages.length - 1 && !showFinish && !showSuccess && <button onClick={() => saveBeforeProgress()}>Save & go to next page {savingForm && <ButtonLoadingIconPrimary />}</button>
                        }

                        {isComplete && <button>Submit</button>}
                    </div>

                    {
                        !showSuccess && <Tabs activeTab={activePage.label} tabs={tabs} updateActiveTab={(label, index) => {
                            // let tempActivePage = {...activePage}
                            // tempActivePage.label = label
                            // tempActivePage.index = index
                            // setActivePage(tempActivePage)
                        }
                        } />
                    }
                </div>
            }
            
            

            {
                Object.values(registrationForm).length > 0 && !showFinish && <div className={styles.registrationFormContent}>
                    {
                        registrationForm.form.pages[activePage.index].sections.map((sectionItem, sectionIndex) => {
                            return <div className={[styles.section, sectionItem.layout === "single column" ? styles.singleColumn : styles.doubleColumn].join(" ")}  key={sectionIndex}>
                                <h3>{sectionItem.title}</h3>
                                <p>{sectionItem.description}</p>


                                <div>
                                    {
                                        sectionItem.fields.map((fieldItem, fieldIndex) => {
                                            if (fieldItem.type === "shortText") {
                                                return getShortTextVisibility(fieldIndex, fieldItem, sectionIndex)
                                            }

                                            if (fieldItem.type === "longText") {
                                                return <div key={fieldIndex} className={styles.fieldComponent}>
                                                    <LongText key={fieldIndex} 
                                                    required={fieldItem.required} 
                                                    errorText={fieldItem.errorText} 
                                                    infoText={""} 
                                                    type={fieldItem.textType} 
                                                    label={fieldItem.label} 
                                                    onClick={() => {}} 
                                                    placeholder={fieldItem.placeholder} 
                                                    highlighted={""} />

{
                                                        <div className={styles.addFieldText}>
                                                            {
                                                                fieldItem.allowMultiple && <div>
                                                                    <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                                                                </div>
                                                            }

                                                            {
                                                                fieldItem.isDuplicate && <div>
                                                                    <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                </div>
                                            }

                                            if (fieldItem.type === "dropDown") {
                                                return getDropDownVisibility(fieldIndex, fieldItem, sectionIndex)
                                            }

                                            if (fieldItem.type === "checkBoxes") {
                                                return <div key={fieldIndex} className={styles.fieldComponent}>
                                                    <CheckBoxes key={fieldIndex} required={fieldItem.required} errorText={fieldItem.errorText} infoText={""}  highlighted={""} label={fieldItem.label} onClick={() => {}} options={fieldItem.option} />

                                                    {
                                                        <div className={styles.addFieldText}>
                                                            {
                                                                fieldItem.allowMultiple && <div>
                                                                    <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                                                                </div>
                                                            }

                                                            {
                                                                fieldItem.isDuplicate && <div>
                                                                    <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                </div>
                                            }

                                            if (fieldItem.type === "radioButtons") {
                                                return <div key={fieldIndex} className={styles.fieldComponent}>
                                                     <RadioButtons key={fieldIndex} value={fieldItem.value} required={fieldItem.required} errorText={fieldItem.errorText} infoText={""} highlighted={""} label={fieldItem.label} setOptionAsValue={value => updateField(activePage.index, sectionIndex, fieldIndex, "value", value)} onClick={() => {}} options={fieldItem.options} name={fieldItem.label + fieldIndex}  />
                                                     {
                                                        <div className={styles.addFieldText}>
                                                            {
                                                                fieldItem.allowMultiple && <div>
                                                                    <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                                                                </div>
                                                            }

                                                            {
                                                                fieldItem.isDuplicate && <div>
                                                                    <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                </div>
                                            }

                                            if (fieldItem.type === "date") {
                                                return <div key={fieldIndex} className={styles.fieldComponent}>
                                                    <DateSelect required={fieldItem.required} key={fieldIndex} errorText={fieldItem.errorText} value={fieldItem.value} infoText={""} highlighted={""} label={fieldItem.label} onClick={() => {}} placeholder={""} 
                                                    onChange={(value) => {
                                                        updateField(activePage.index, sectionIndex, fieldIndex, "value", value)
                                                    }}/>
                                                    {
                                                        <div className={styles.addFieldText}>
                                                            {
                                                                fieldItem.allowMultiple && <div>
                                                                    <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                                                                </div>
                                                            }

                                                            {
                                                                fieldItem.isDuplicate && <div>
                                                                    <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                </div>
                                            }

                                            if (fieldItem.type === "file") {
                                                return getFileVisibility(fieldIndex, fieldItem, sectionIndex)
                                            }

                                            if (fieldItem.type === "multiSelectText") {
                                                return <div key={fieldIndex} className={styles.fieldComponent}>
                                                    <MultiSelectText key={fieldIndex} required={fieldItem.required} errorText={fieldItem.errorText} highlighted={""} onChange={(value) => {
                                                        updateField(activePage.index, sectionIndex, fieldIndex, "value", value)
                                                    }} infoText={fieldItem.infoText} label={fieldItem.label} onClick={() => {}} preSelectedOptions={fieldItem.value ? fieldItem.value : []} />
                                                    {
                                                        <div className={styles.addFieldText}>
                                                            {
                                                                fieldItem.allowMultiple && <div>
                                                                    <a onClick={() => addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex+1)}>{fieldItem.addFieldText}</a>
                                                                </div>
                                                            }

                                                            {
                                                                fieldItem.isDuplicate && <div>
                                                                    <a onClick={() => removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)}>{"Remove"}</a>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                </div>
                                            }

                                            if (fieldItem.type === "textBlock") {
                                                return <TextBlock key={fieldIndex} onClick={() => {}} text={fieldItem.text} />
                                            }

                                            if (fieldItem.type === "") {
                                                
                                            }

                                            if (fieldItem.type === "") {
                                                
                                            }
                                            
                                        })
                                    }
                                </div>

                                {
                                    <div className={styles.addSectionText}>
                                        {
                                            sectionItem.allowMultiple && <div>
                                                <a className={styles.addSectionText} onClick={() => {addSectionToPage(sectionItem, activePage.index, sectionIndex)}}>{sectionItem.addSectionText}</a>
                                            </div>
                                        }

                                        {
                                            sectionItem.isDuplicate && <div>
                                                <a className={styles.removeSectionText} onClick={() => {removeSectionFromPage(sectionItem, activePage.index, sectionIndex)}}>{"Remove"}</a>
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                            
                        })
                    }

                    {/* <footer className={styles.actionButtonsFooter}>
                    {
                            activePage.index > 0 && <button>Previous</button>
                        }

                        {
                            activePage.index < registrationForm.form.pages.length && <button>Next</button>
                        }
                        {
                            isComplete && <button>Submit</button>
                        }
                    </footer> */}
                </div>
            }

            {
                showFinish && !showSuccess && <div className={styles.finishDiv}>
                    <p>Please review your information before submitting.</p>

                    <p>You may still EDIT and save your information before you submit.</p>

                    <p>Once you are fully satisfied, click on the button below to have your information submitted to Amni.</p>

                    <p>An email notification will be sent to you to confirm receipt.</p>

                    <p>Note that your submitting this information does not oblige Amni to engage your company as a vendor.</p>

                    <button onClick={() => submitForm()}>SUBMIT APPLICATION {submitting && <ButtonLoadingIcon />}</button>
                </div>
            }

{
                showSuccess && <div className={styles.finishDiv}>
                    <h5 className="mb-4">Application Submitted!</h5>
                    <p>Your registration for {registrationForm.form.pages[0].sections[0].fields[0].value} has been submitted for assessment and approval.</p>
                    <p>An email notification will be sent to you about your approval status.</p>

                    <p>
                    <span>Please do not forget to read our</span>
                    <Link href={"/terms"} legacyBehavior><a href="/terms"  target="_blank">Terms & Conditions</a></Link> with regards to your use of this
                    platform
                    </p>
        
                    
                    <div className={styles.successActionLinks}>
                        <Link href={"/contractor/dashboard"} legacyBehavior><a>Back To Dashboard</a></Link>
                        <Link href={`/contractor/application/view/${registrationForm.vendorID}`} legacyBehavior><a>View Application</a></Link>
                    </div>


                </div>
            }
        </div>
    )
}

export default NewCompanyRegistration