'use client'
import Image from "next/image"
import logo from "@/assets/images/logo.png"
import attach from "@/assets/images/attach.svg"
import styles from "./styles/styles.module.css"
import { useEffect, useRef, useState } from "react"
import { getPlain, getProtected } from "@/requests/get"
import { useParams } from "next/navigation"
import { StringDecoder } from "string_decoder"
import { postProtected, postProtectedMultipart } from "@/requests/post"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import Loading from "@/components/loading"
import deleteIcon from "@/assets/images/delete.svg"
import {pdf, Document, Page, View, Text, BlobProvider, StyleSheet, Font, Image as RPImage} from "@react-pdf/renderer"

type Invoice = {
    CONTRACTOR_NAME? : string,
    DOCUMENT_NUMBER?: string,
    DOCUMENT_TITLE?: string,
    CURRENCY?: string,
    AMNI_ENTITY?: string,
    DEPARTMENT?: string,
    INVOICED_AMOUNT?: number,
    TOTAL_INVOICED_AMOUNTS?: number,
    INVOICE_NUMBER?: string,
    CALL_OFF_NUMBER?: any,
    PAYMENT_OPTION?: string,
    INVOICE_ID?: string,
    TIN?: string,
    MILESTONE?: string,
    CONTRACTOR_EMAIL?: string,
    INVOICE_DATE?: Date,
    DOCUMENTS_ATTACHED?: Boolean,
    SERVICE_COMPLETED?: string,
    MARKUP_APPLICABLE? : Boolean,
    MARKUP?: any
}



const InvoiceForm = () => {
    const [invoiceDetails, setInvoiceDetails] = useState<Invoice>({})
    const [fixedInvoiceDetails, setFixedInvoiceDetails] = useState<Invoice>({})
    const [formErrors, setFormErrors] = useState({
        INVOICED_AMOUNT: "",
        INVOICE_DATE: "",
        MILESTONE: "",
        CONTRACTOR_EMAIL: "",
        PAYMENT_OPTION: "",
        TIN: "",
        INVOICE_NUMBER: "",
        INVOICE: "",
        CALLOFF:"",
        MARKUP: "",
        MARKUP_APPLICABLE: ""
    })
    const params = useParams()
    const invoiceInputRef = useRef(null)
    const jobCompletionInputRef = useRef(null)
    const callOfInputRef = useRef(null)
    const [filesToUpload, setFilesToUpload] = useState({
        invoice: null,
        jobCompletionCertificate: null,
        callOff: null
    })
    const [submittingInvoice, setSubmittingInvoice] = useState(false)
    const [invoiceFetchStatus, setInvoiceFetchStatus] = useState("fetching")
    const [invoiceFormErrorMessage, setInvoiceFormErrorMessage] = useState("")
    const [submissionErrorMessage, setSubmissionErrorMessage] = useState("")
    const [submissionChecks, setSubmissionChecks] = useState({
        confirmedRequiredDocuments: false,
        hasSubmittedBefore: false
    })
    const [invoiceSubmitted, setInvoiceSubmitted] = useState(false)

    console.log({invoiceDetails});
    console.log({formErrors});

    Font.register({
        family: "Inter",
        fonts: [
            {
                src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            },
            {
                src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
                fontWeight: "bold"
            },
            {
                src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuOKfMZhrib2Bg-4.ttf",
                fontWeight: "light"
            },
            {
                src: "https://fonts.gstatic.com/s/inter/v18/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxhjZ-Ek-7MeA.ttf",
                fontWeight: "bold",
                fontStyle: "italic"
            }
        ]
    })

    Font.register({
        family: "Roboto Mono",
        fonts: [
            {
                src: "https://fonts.gstatic.com/s/robotomono/v23/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_Of2PQ--5Ip2sSQ.ttf",
                fontWeight: "bold"
            }
        ]
    })

    const style = StyleSheet.create({
        page: {
            width: 1500,
            height: 100,
            padding: 40

        },
        logo: {
            width: 66,
            height: 80
        },
        logoContainer: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        },
        row: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 30
        },
        left: {
            width: "48%",
            paddingRight: 20
        },
        right: {
            width: "48%"
        },
        title: {
            textAlign: "center",
            fontSize: "36px",
            fontFamily: "Roboto Mono",
            fontWeight: "bold"
        },
        runner: {
            textAlign: "center",
            fontSize: "14px",
            fontFamily: "Inter",
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: "40px"
        },
        itemLabel: {
            fontSize: "16px",
            fontFamily: "Inter",
            fontWeight: 700,
            marginBottom: 5
        },
        itemValue: {
            fontFamily: "Inter",
            fontWeight: "light",
            fontSize: "14px"
        },
        fileTextView: {
            backgroundColor: "rgb(196, 196, 196)",
            padding: 5,
            marginRight: 20
        }
    })

    let currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    })

    const myPDF = <Document >
        <Page size={"A3"} style={style.page}>
            <View >
                {/* @ts-ignore */}
                <View style={style.logoContainer}>
                    <RPImage  src={"/logo.png"} style={style.logo}/>
                </View>
                <Text style={style.title}>AMNI PETROLEUM</Text>
                <Text style={style.runner}>Contractor Invoice Processing Form</Text>
            </View>

            <View>
                <View style={style.row}>
                    <View style={style.left}>
                        <Text style={style.itemLabel}>Contractor Name</Text>
                        <Text style={style.itemValue}>{invoiceDetails.CONTRACTOR_NAME}</Text>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>PO/Contract No./L.O.E</Text>
                        <Text style={style.itemValue}>{invoiceDetails.DOCUMENT_NUMBER}</Text>
                    </View>

                    <View style={style.left}>
                        <Text style={style.itemLabel}>Amni Entity</Text>
                        <Text style={style.itemValue}>{invoiceDetails.AMNI_ENTITY}</Text>
                    </View>
                </View>



                <View style={style.row}>
                    

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Invoice/Service Title</Text>
                        <Text style={style.itemValue}>{invoiceDetails.DOCUMENT_TITLE}</Text>
                    </View>

                    <View style={style.left}>
                        <Text style={style.itemLabel}>Call-Off Number</Text>
                        <Text style={style.itemValue}>{invoiceDetails.CALL_OFF_NUMBER}</Text>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Contractor Email</Text>
                        <Text style={style.itemValue}>{invoiceDetails.CONTRACTOR_EMAIL}</Text>
                    </View>
                </View>


                



                <View style={style.row}>
                    
                </View>




                <View style={style.row}>
                    <View style={style.left}>
                        <Text style={style.itemLabel}>Invoice Number</Text>
                        <Text style={style.itemValue}>{invoiceDetails.INVOICE_NUMBER}</Text>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Invoice Amount</Text>
                        <Text style={style.itemValue} render={({  }) => (
                            `${String(currencyFormatter.format(2500)).replace("$", "")}`
                        )} />
                    </View>

                    <View style={style.left}>
                        <Text style={style.itemLabel}>Currency</Text>
                        <Text style={style.itemValue}>{invoiceDetails.CURRENCY}</Text>
                    </View>
                </View>




                <View style={style.row}>
                    

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Invoice Date</Text>
                        <Text style={style.itemValue}>{String(invoiceDetails.INVOICE_DATE)}</Text>
                    </View>

                    <View style={style.left}>
                        <Text style={style.itemLabel}>Markup/Service Charge Applicable</Text>
                        <Text style={style.itemValue}>{String(invoiceDetails.MARKUP_APPLICABLE ? "Yes": "No")}</Text>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Payment Option</Text>
                        <Text style={style.itemValue}>{invoiceDetails.PAYMENT_OPTION}</Text>
                    </View>
                </View>





                <View style={style.row}>
                    <View style={style.left}>
                        <Text style={style.itemLabel}>Markup Amount</Text>
                        <Text style={style.itemValue}>{invoiceDetails.MARKUP}</Text>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Service Completed/Milestone</Text>
                        <Text style={style.itemValue}>{invoiceDetails.MILESTONE}</Text>
                    </View>
                </View>




                <View style={style.row}>
                    <View style={style.left}>
                        <Text style={style.itemLabel}>Serviced Department</Text>
                        <Text style={style.itemValue}>{invoiceDetails.DEPARTMENT}</Text>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>TIN</Text>
                        <Text style={style.itemValue}>{invoiceDetails.TIN}</Text>
                    </View>
                </View>


                <View style={style.row}>
                    

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Attached Invoice</Text>
                        <View style={style.fileTextView}>
                            <Text style={style.itemValue}>{filesToUpload?.invoice?.name}</Text>
                        </View>
                        
                    </View>

                    <View style={style.left}>
                        <Text style={style.itemLabel}>Attached Contract/Purchase Order or Call-Off</Text>
                        <View style={style.fileTextView}>
                            <Text style={style.itemValue}>{filesToUpload?.callOff?.name}</Text>
                        </View>
                    </View>

                    <View style={style.right}>
                        <Text style={style.itemLabel}>Attached Job Completion Certificate/Duly Signed Delivery Form</Text>
                        <View style={style.fileTextView}>
                            <Text style={style.itemValue}>{filesToUpload?.jobCompletionCertificate?.name}</Text>
                        </View>
                    </View>
                </View>
            </View>
            

        </Page>
        </Document>
    

    
    
    

    useEffect(() => {
        const {id} = params

        if (id) {
            fetchInvoiceDetails(id)
        }

        

        
        
        
    }, [params])

    const fetchInvoiceDetails = async (invoiceRecordID) => {
        

        try {
            const fetchInvoiceDetailsRequest = await getProtected(`docuware/invoice/record/${invoiceRecordID}`)

            if (fetchInvoiceDetailsRequest.status === "OK") {
                setInvoiceFetchStatus("fetched")
                let tempInvoiceDetails = {...invoiceDetails}
                tempInvoiceDetails = fetchInvoiceDetailsRequest.data
                setInvoiceDetails(tempInvoiceDetails)
                tempInvoiceDetails = {...fixedInvoiceDetails}
                tempInvoiceDetails = fetchInvoiceDetailsRequest.data
                setFixedInvoiceDetails(tempInvoiceDetails)
            } else {
                setInvoiceFetchStatus("failed")
                setInvoiceFormErrorMessage(fetchInvoiceDetailsRequest.error.message)
            }

            console.log({fetchInvoiceDetailsRequest});
            
        } catch (error) {
            console.log({error});
        }
    }

    const updateInvoiceDetails = (field, value) => {
        let tempInvoiceDetails = {...invoiceDetails}
        tempInvoiceDetails[field] = value
        setInvoiceDetails(tempInvoiceDetails)
    }

    const displayFieldErrors = foundErrors => {
        let tempFormErrors = {...formErrors}
        tempFormErrors = foundErrors
        setFormErrors(tempFormErrors)
    }

    const clearFieldErrors = () => {
        let tempFormErrors = {...formErrors}
        tempFormErrors = {
            INVOICED_AMOUNT: "",
            INVOICE_DATE: "",
            MILESTONE: "",
            CONTRACTOR_EMAIL: "",
            PAYMENT_OPTION: "",
            INVOICE_NUMBER: "",
            TIN: "",
            INVOICE: "",
            CALLOFF:"",
            MARKUP: "",
            MARKUP_APPLICABLE: ""
        }
        setFormErrors(tempFormErrors)
    }

    const validateForm = () => {
        let foundErrors = {}
        let allRequiredFieldsValid = true

        if (!invoiceDetails.CONTRACTOR_EMAIL) {
            foundErrors["CONTRACTOR_EMAIL"] = "Please enter your email address"
            allRequiredFieldsValid = false
        }

        if (!invoiceDetails.INVOICE_NUMBER) {
            foundErrors["INVOICE_NUMBER"] = "Please supply your invoice number"
            allRequiredFieldsValid = false
        }

        if (!invoiceDetails.INVOICED_AMOUNT) {
            foundErrors["INVOICED_AMOUNT"] = "Please enter the amount you're invoicing for"
            allRequiredFieldsValid = false
        }

        if (!invoiceDetails.TIN) {
            foundErrors["TIN"] = "Please enter your tax identification number"
            allRequiredFieldsValid = false
        }

        if (!invoiceDetails.INVOICE_DATE) {
            foundErrors["INVOICE_DATE"] = "Please enter your invoice date"
            allRequiredFieldsValid = false
        }

        if (!invoiceDetails.PAYMENT_OPTION) {
            foundErrors["PAYMENT_OPTION"] = "Please select a payment option"
            allRequiredFieldsValid = false
        }

        if (invoiceDetails.MARKUP_APPLICABLE !== true && invoiceDetails.MARKUP_APPLICABLE !== false) {
            foundErrors["MARKUP_APPLICABLE"] = "Please select if a markup or service charge is applicable"
            allRequiredFieldsValid = false
        } else if (invoiceDetails.MARKUP_APPLICABLE === true && !invoiceDetails.MARKUP) {
            foundErrors["MARKUP"] = "Please enter a markup amount"
            allRequiredFieldsValid = false
        }

        if (invoiceDetails.PAYMENT_OPTION === "Milestone" && !invoiceDetails.MILESTONE) {
            foundErrors["MILESTONE"] = "Please enter the milestone/service completed"
            allRequiredFieldsValid = false
        }

        if (!filesToUpload.invoice) {
            foundErrors["INVOICE"] = "Please select your invoice."
            allRequiredFieldsValid = false
        }

        if (!filesToUpload.callOff) {
            foundErrors["CALLOFF"] = "Please select your contract/purchase order or call-off."
            allRequiredFieldsValid = false
        }

        

        if (allRequiredFieldsValid) {
            clearFieldErrors()
            if (!submissionChecks.confirmedRequiredDocuments) {
                setSubmissionErrorMessage("Please confirm that all the required documents have been attached")
                allRequiredFieldsValid = false
            } else {
                if (submissionChecks.hasSubmittedBefore) {
                    setSubmissionErrorMessage("Invoices already submitted are being processed. Please do not submit a duplicate invoice.")
                    allRequiredFieldsValid = false
                } else {
                    
                    createInvoice()
                }
            }
            
        } else {
            displayFieldErrors(foundErrors)
        }
    }
    

    const createInvoice = async () => {
        try {
            console.log("Creating invoice");
            setSubmittingInvoice(true)
            setSubmissionErrorMessage("")
            
            const createInvoiceRequest = await postProtected("docuware/invoice/new", invoiceDetails)

            console.log({createInvoiceRequest});
            

            if (createInvoiceRequest.status === "OK") {
                let completionID = createInvoiceRequest.data.completionID

                completeInvoiceSubmission(completionID)
            } else {
                setSubmissionErrorMessage(createInvoiceRequest.error.message)
            }

            
            
        } catch (error) {
            console.log({error});
            
        }
    }

    const completeInvoiceSubmission = async completionID => {
        try {
            const blob = await pdf(myPDF).toBlob()

            const file = new File([blob], 'invoice', { type: blob.type })

            let formData = new FormData()
            formData.append("file", file)
            formData.append("file", filesToUpload.invoice)
            formData.append("file", filesToUpload.callOff)

            if (filesToUpload.jobCompletionCertificate) {
                formData.append("file", filesToUpload.jobCompletionCertificate)
            }

            const completeInvoiceSubmissionRequest = await postProtectedMultipart(`docuware/invoice/attachFiles/${completionID}`, formData)

            if (completeInvoiceSubmissionRequest) {
                setInvoiceSubmitted(true)
                setSubmittingInvoice(false)
            }
        } catch (error) {
            console.log({error});
        }
    }

    const handleFileClick = fileType => {
        switch (fileType) {
            case "invoice":
                invoiceInputRef.current.click()
                break;
            case "job completion":
                jobCompletionInputRef.current.click()
                break;
            case "call off":
                callOfInputRef.current.click()
                break
        }
    }

    const handleFileSelected = event => {
        
        const field = event.target.name
        const file = event.target.files[0]

        console.log({field, file});

        if (file) {
            let tempFilesToUpload = {...filesToUpload}
            tempFilesToUpload[field] = file
            setFilesToUpload(tempFilesToUpload)
        }
        
        
    }


    const handleFileDeselected = field => {
    

        let tempFilesToUpload = {...filesToUpload}
            tempFilesToUpload[field] = null
            setFilesToUpload(tempFilesToUpload)
        
        
    }

    console.log({filesToUpload});
    console.log({submissionChecks});
    
    

    return (
        <div className={styles.invoiceForm}>
            {
                !invoiceSubmitted && invoiceFetchStatus === "fetching" && <div>
                    <Loading message={"Loading Invoice Form"} />
                </div>
            }

            {
                !invoiceSubmitted && invoiceFetchStatus === "fetched" && <div>
                <Image src={logo} alt="amni logo" width={200} height={200} style={{width: "66px", height: "80px"}} />

                <h1>AMNI PETROLEUM</h1>

                <h5>Contractor Invoice Processing Form</h5>

                <BlobProvider document={myPDF}>
      {({ blob, url, loading, error }) => {
        // Do whatever you need with blob here
        console.log({theBlob: blob})
        console.log({url});
        
        
        return <div></div>
      }}
    </BlobProvider>


                <form onChange={(event: any) => updateInvoiceDetails(event.target.name, event.target.value)} onSubmit={(event) => {
                    event.preventDefault()
                    validateForm()
                }}>
                    <div className={styles.mainContent}>
                        <div>
                            <label>Contractor Name</label>

                            <input value={invoiceDetails.CONTRACTOR_NAME} name="CONTRACTOR_NAME" disabled />

                            
                        </div>



                        <div>
                            <label>PO/Contract No./L.O.E</label>

                            <input value={invoiceDetails.DOCUMENT_NUMBER} name="DOCUMENT_NUMBER" disabled />
                        </div>

                        <div>
                            <label>Select Company*</label>

                            <input value={invoiceDetails.AMNI_ENTITY} name="AMNI_ENTITY" disabled />
                        </div>

                        <div>
                            <label>Invoice/Service Title</label>

                            <input value={invoiceDetails.DOCUMENT_TITLE} name="DOCUMENT_TITLE" disabled />
                        </div>

                        <div>
                            <label>CALL-OFF NUMBER</label>

                            <input value={invoiceDetails.CALL_OFF_NUMBER} name="CALL_OFF_NUMBER" disabled={fixedInvoiceDetails.CALL_OFF_NUMBER} />
                        </div>

                        <div>
                            <label>Contractor Email *</label>

                            <input name="CONTRACTOR_EMAIL" />

                            {formErrors.CONTRACTOR_EMAIL && <p className={styles.formErrorMesage}>{formErrors.CONTRACTOR_EMAIL}</p>}
                        </div>

                        <div>
                            <label>Invoice Number*</label>

                            <input name="INVOICE_NUMBER" />

                            {formErrors.INVOICE_NUMBER && <p className={styles.formErrorMesage}>{formErrors.INVOICE_NUMBER}</p>}
                        </div>

                        <div>
                            <label>Invoice Amount</label>

                            <input name="INVOICED_AMOUNT" />

                            {formErrors.INVOICED_AMOUNT && <p className={styles.formErrorMesage}>{formErrors.INVOICED_AMOUNT}</p>}
                        </div>

                        <div>
                            <label>Currency*</label>

                            <input value={invoiceDetails.CURRENCY} name="CURRENCY" disabled />
                        </div>

                        <div>
                            <label>Invoice Date *</label>

                            <input type="date" name="INVOICE_DATE" />

                            {formErrors.INVOICE_DATE && <p className={styles.formErrorMesage}>{formErrors.INVOICE_DATE}</p>}
                        </div>

                        <div>
                            <label>Markup/Service Charge Applicable</label>

                            <div className={styles.invoiceRadioButtons}>
                                <div onClick={() => {
                                        let tempInvoiceDetails = {...invoiceDetails}
                                        tempInvoiceDetails["MARKUP_APPLICABLE"] = true
                                        setInvoiceDetails(tempInvoiceDetails)
                                    }}>
                                    <input type="radio" name="markup" checked={invoiceDetails.MARKUP_APPLICABLE === true} onChange={event => event.preventDefault()}  />
                                    <label>Yes</label>
                                </div>

                                <div onClick={() => {
                                        let tempInvoiceDetails = {...invoiceDetails}
                                        tempInvoiceDetails["MARKUP_APPLICABLE"] = false
                                        setInvoiceDetails(tempInvoiceDetails)
                                    }}>
                                    <input type="radio" name="markup" checked={invoiceDetails.MARKUP_APPLICABLE === false} onChange={event => event.preventDefault()}  />
                                    <label>No</label>
                                </div>
                            </div>

                            {formErrors.MARKUP_APPLICABLE && <p className={styles.formErrorMesage}>{formErrors.MARKUP_APPLICABLE}</p>}
                        </div>

                        {
                            invoiceDetails.MARKUP_APPLICABLE && <div>
                            <label>Markup Amount *</label>

                            <input type="number" name="MARKUP" />

                            {formErrors.MARKUP && <p className={styles.formErrorMesage}>{formErrors.MARKUP}</p>}
                        </div>
                        }

                        <div>
                            <label>Payment Option*</label>

                            <select name="PAYMENT_OPTION">
                                <option disabled selected>Select a payment option</option>
                                <option>Advance</option>
                                <option>Arrears</option>
                                <option>Milestone</option>
                                <option>Retirement</option>
                            </select>

                            {formErrors.PAYMENT_OPTION && <p className={styles.formErrorMesage}>{formErrors.PAYMENT_OPTION}</p>}
                        </div>

                        {
                            invoiceDetails.PAYMENT_OPTION === "Milestone" && <div>
                            <label>Service Completed/Milestone</label>

                            <input name="MILESTONE" />

                            {formErrors.MILESTONE && <p className={styles.formErrorMesage}>{formErrors.MILESTONE}</p>}
                        </div>
                        }

                        {/* <div>
                            <label>Invoice ID</label>

                            <input name="INVOICE_ID" />
                        </div> */}

                        <div>
                            <label>Serviced Department</label>

                            <input value={invoiceDetails.DEPARTMENT} name="DEPARTMENT" />
                        </div>



                        <div>
                            <label>TIN *</label>

                            <input name="TIN" />

                            {formErrors.TIN && <p className={styles.formErrorMesage}>{formErrors.TIN}</p>}
                        </div>



                        

                    </div>
                </form>


                <div className={styles.uploads}>
                    <div className={styles.uploadItem}>
                        <label>Attach invoice*</label>

                        <div >
                            <div className={styles.uploadItemBody}>
                                <Image src={attach} alt="attach file logo" width={100} height={100} style={{width: "30px", height: "30px"}} />

                                <input type="file" className={styles.fileUploadInput} ref={invoiceInputRef} name="invoice" onChange={event => handleFileSelected(event)} />

                                <div >
                                    <p onClick={() => {
                                        handleFileClick("invoice")
                                    }}>Click to browse</p>

                                    {/* <p>or drag a file here</p> */}
                                    {
                                        filesToUpload.invoice && <div className={styles.selectedFileItem}>
                                        <label>{String(filesToUpload.invoice.name).slice(0,12) + "..."}</label>

                                        <div >
                                            <label>({Number(filesToUpload.invoice.size/1000000).toPrecision(2)} MB)</label>
                                            <Image src={deleteIcon} alt="delete image" width={15} height={15} onClick={() => handleFileDeselected("invoice")} />
                                        </div>
                                    </div>
                                    }
                                </div>
                            </div>
                        </div>

                        {formErrors.INVOICE && <p className={styles.formErrorMesage}>{formErrors.INVOICE}</p>}
                    </div>



                    <div className={styles.uploadItem}>
                        <label>Attach Job Completion Certificate/Duly Signed Delivery Form</label>

                        <div >
                            <div className={styles.uploadItemBody}>
                                <Image src={attach} alt="attach file logo" width={100} height={100} style={{width: "50px", height: "50px"}} />

                                <input type="file" className={styles.fileUploadInput} ref={jobCompletionInputRef} name="jobCompletionCertificate" onChange={event => handleFileSelected(event)} />

                                <div>
                                    <p onClick={() => {
                            handleFileClick("job completion")
                        }}>Click to browse</p>

                                    {
                                        filesToUpload.jobCompletionCertificate && <div className={styles.selectedFileItem}>
                                        <label>{String(filesToUpload.jobCompletionCertificate.name).slice(0,12) + "..."}</label>

                                        <div >
                                            <label>({Number(filesToUpload.jobCompletionCertificate.size/1000000).toPrecision(2)} MB)</label>
                                            <Image src={deleteIcon} alt="delete image" width={15} height={15} onClick={() => handleFileDeselected("jobCompletionCertificate")} />
                                        </div>
                                    </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>




                    <div className={styles.uploadItem}>
                        <label>Attach Contract/Purchase Order or Call-Off *</label>

                        <div >
                            <div className={styles.uploadItemBody}>
                                <Image src={attach} alt="attach file logo" width={100} height={100} style={{width: "50px", height: "50px"}} />

                                <input type="file" className={styles.fileUploadInput} ref={callOfInputRef} name="callOff" onChange={event => handleFileSelected(event)} />

                                <div>
                                    <p onClick={() => {
                            handleFileClick("call off")
                        }}>Click to browse</p>

                                    {
                                        filesToUpload.callOff && <div className={styles.selectedFileItem}>
                                        <label>{String(filesToUpload.callOff.name).slice(0,12) + "..."}</label>

                                        <div >
                                            <label>({Number(filesToUpload.callOff.size/1000000).toPrecision(2)} MB)</label>
                                            <Image src={deleteIcon} alt="delete image" width={15} height={15} onClick={() => handleFileDeselected("callOff")} />
                                        </div>
                                    </div>
                                    }
                                </div>
                            </div>
                        </div>

                        {formErrors.CALLOFF && <p className={styles.formErrorMesage}>{formErrors.CALLOFF}</p>}
                    </div>
                </div>

                <div className={styles.confirmationDiv}>
                    <label>Confirm that all required documents are attached*</label>

                    <select onChange={event => {
                        let tempSubmissionChecks = {...submissionChecks}
                        tempSubmissionChecks.confirmedRequiredDocuments = JSON.parse(event.target.value)
                        setSubmissionChecks(tempSubmissionChecks)
                    }}>
                        <option selected value={"false"}>No</option>
                        <option value={"true"}>Yes</option>
                    </select>

                    <p>Select from the list</p>
                </div>

                {
                    submissionChecks.confirmedRequiredDocuments && <div className={styles.confirmationDiv}>
                    <label>Have you submitted this invoice before?</label>

                    <select onChange={event => {
                        let tempSubmissionChecks = {...submissionChecks}
                        tempSubmissionChecks.hasSubmittedBefore = JSON.parse(event.target.value)
                        setSubmissionChecks(tempSubmissionChecks)
                    }}>
                        <option selected value={"false"}>No</option>
                        <option value={"true"}>Yes</option>
                    </select>

                    <p>Select from the list</p>
                </div>
                }

                <div className={styles.note}>
                    <p>Note: Kindly Cross check all information provided before Submitting.</p>
                </div>

                <div className={styles.submitDiv}>
                    {
                        submissionErrorMessage && <p className={styles.invoiceSubmitErrorMessage}>{submissionErrorMessage}</p>
                    }
                    <button  className={styles.enabled} onClick={() => validateForm()}>Submit {submittingInvoice && <ButtonLoadingIcon />}</button>
                </div>
                </div>
            }

            {
                !invoiceSubmitted && invoiceFetchStatus === "failed" && <div className={styles.invoiceFormErrorDiv}>
                    <Image src={logo} alt="amni logo" width={200} height={200} style={{width: "66px", height: "80px", marginBottom: "0px"}} />
                    <h1 style={{marginBottom: "50px"}}>Invoice Form</h1>
                    <p>{invoiceFormErrorMessage}</p>
                </div>
            }

            {
                invoiceSubmitted && <div className={styles.invoiceSubmitted}>
                <Image src={logo} alt="amni logo" width={200} height={200} style={{width: "66px", height: "80px", marginBottom: "0px"}} />
                <h1 style={{marginBottom: "50px"}}>Invoice Form</h1>
                <p>Form submitted will only be processed if Company is an Amni Contractor. Please check your email for necessary information</p>
        </div>
            }

        </div>
    )
}

export default InvoiceForm