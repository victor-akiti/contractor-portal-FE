'use client'
import { useEffect, useState } from "react"
import styles from "./styles/styles.module.css"
import { getProtected } from "@/requests/get"
import { useParams } from "next/navigation"
import Accordion from "@/components/accordion"
import Link from "next/link"

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

const ViewPage = () => {
    const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({})
    const location = useParams()

    useEffect(() => {
        console.log({location});
        
        const vendorID = location?.id

        if (vendorID) {
            getVendorForm(vendorID)
        }
    }, [location])

    const getVendorForm = async (vendorID: any) => {
        try {
            console.log({vendorID});
            
            const getVendorRegistrationFormRequest = await getProtected(`companies/register/form/${vendorID}`)

            if (getVendorRegistrationFormRequest.status === "OK") {
                let generalRegistrationForm = getVendorRegistrationFormRequest.data.generalRegistrationForm
                let vendorRegistrationForm = getVendorRegistrationFormRequest.data.vendorRegistrationForm

                let tempRegistrationForm = {...registrationForm}
                tempRegistrationForm = generalRegistrationForm
                setRegistrationForm(tempRegistrationForm)
            } else {
                // setErrorMessage(getVendorRegistrationFormRequest.error.message)
            }

            console.log({getVendorRegistrationFormRequest});
        } catch (error) {
            console.log({error});
            
        }
    }


    
    const getFileComponent = file => {
        console.log({file});
        
        if (file.value.length > 0) {
            console.log("Has files");
            
            return <div>
            {
                file.value.map((item, index) => <div key={index} className={styles.fieldItem}>
                <label className={styles.fieldLabel}>{`${file.label} ${index > 1 ? index : ""}`}</label>

                <div className={styles.fileDetailsDiv}>
                <p>{item.name}</p>

                {
                    item.expiryDate && <div className={styles.expiryDateDiv}>Expires: <span>{item.expiryDate}</span></div>
                }
                
                <Link href={item.url} target="_blank">View</Link>
                </div>
            </div>)
            }   
            </div>
        } else {
            return <p></p>
        }
    }

    const getMultiSelectComponent = field => {

        
        if (field.value.length > 0) {
            console.log("Has files");
            
            return <div className={styles.fieldItem}>
                <label className={styles.fieldLabel}>{`${field.label}:`}</label>
            <div className={styles.multiSelectItemsDiv}>
            {
                field.value.map((item, index) => <p key={index} className={styles.fieldItem}>
                {
                    item.value
                }
            </p>)
            } 
                </div>  
            </div>
        } else {
            return <p></p>
        }
    }

    const getFieldComponent = field => {
        switch (field.type) {
            case "shortText": 
            return <div className={styles.fieldItem}>
                <label className={styles.fieldLabel}>{`${field.label}: `}</label>
                <p className={styles.fieldValue}>{field.value}</p>
            </div>
            case "dropDown": 
            return <div className={styles.fieldItem}>
                <label className={styles.fieldLabel}>{`${field.label}: `}</label>
                <p className={styles.fieldValue}>{field.value}</p>
            </div>
            case "radioButtons": 
            return <div className={styles.fieldItem}>
                <label className={styles.fieldLabel}>{`${field.label}: `}</label>
                <p className={styles.fieldValue}>{field.value}</p>
            </div>
            case "file": 
            return getFileComponent(field)
            case "multiSelectText": 
            return getMultiSelectComponent(field)
        }
    }
    return (
        <div className={styles.view}>
            {
                Object.values(registrationForm).length > 0 && <>
                    <h1>{registrationForm.form.pages[0].sections[0].fields[0].value}</h1>

<div className={styles.viewContent}>
    {
        registrationForm.form.pages.map((item, index) => <Accordion key={index} title={item.pageTitle}>
        <div>
            {
                item.sections.map((section, sectionIndex) => <div key={sectionIndex}>
                    <h6>{section.title}</h6>

                    {
                        section.fields.map((field, fieldIndex) => getFieldComponent(field))
                    }
                    <hr />
                </div>)
            }
        </div>
    </Accordion>)
    }
</div>
                </>
            }
        </div>
    )
}

export default ViewPage