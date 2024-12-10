import styles from "./styles/styles.module.css"
import fileIcon from "../../../assets/images/fileIcon.svg"
import Image from "next/image"
import InfoText from "@/components/infoText"
import FormErrorText from "@/components/formErrorText"
import Link from "next/link"

const FileSelector = ({onClick, label, highlighted, allowedFormats=["PDF", "JPG", "PNG"], infoText, errorText, value, clearValues, required, isACertificate, hasExpiryDate, updateIssueDate, updateExpiryDate, setErrorText, removeFile, removeCertificate}) => {

    const getallowedFormatsText = () => {
        let allowedFormatsText = []

        allowedFormats.forEach(item => {
            allowedFormatsText = allowedFormatsText + `${item} `
        })

        return allowedFormatsText
    }

    const setIssueDate = (newValue, index) => {
        let tempValues = [...value]
        tempValues[index]["issueDate"] = newValue

        updateIssueDate(tempValues)
    }

    const setExpiryDate = (newValue, index) => {
        let tempValues = [...value]
        tempValues[index]["expiryDate"] = newValue

        let currentDate = new Date()
        let selectedDate = new Date(newValue)

        
        
        updateExpiryDate(tempValues)
    }

    const removeSelectedFile = (fileID) => {
        console.log({fileID});
        removeFile(fileID)

        if (isACertificate) {
            removeCertificate(fileID)
        }
    }

    console.log({value});
    return (
        <>
        
        {
            (!value || (Array.isArray(value) && value.length === 0)) && <div className={[styles.selectFile, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
                event.stopPropagation()
                onClick()
            }}>
                <label className={styles.fieldLabel}>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
    
                <div>
                    <div>
                        <Image  src={fileIcon} alt="select file" style={{ width: "100px", height: "100px", marginBottom: "20px"}}/>
                        <p className={styles.selectFileText}>Select a file or drag and drop a file here</p>
                        <p className={styles.allowedFormatsText}>{`Allowed formats: ${getallowedFormatsText()}`}</p>
    
                        <div>
                            <button>Select File</button>
                        </div>
                    </div>
                </div>
    
                
            </div>
        }

        {
            (Array.isArray(value) && value.length !== 0) && <div className={styles.uploadedFilesList}>
                <label className={styles.fieldLabel}>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
                
                {
                    value.map((item, index) => <div key={index}>
                    <div>
                        <label>{item.name}</label>
                        <Link href={item.url} target="_blank">View</Link>
                    </div>

                    {
                        isACertificate && hasExpiryDate && <div>
                        <div>
                            <label>Issue date</label>
                            <input type="date" onChange={(e) => setIssueDate(e.target.value, index)} />
                        </div>

                        <div>
                            <label>Expiry date</label>
                            <input type="date" onChange={(e) => setExpiryDate(e.target.value, index)} min={new Date().toISOString().split('T')[0]}  />
                        </div>
                        
                    </div>
                    }

                    <p className={styles.removeFile} onClick={() => removeSelectedFile(item._id)}>Remove</p>
                </div>)
                }

                {/* <p onClick={() => clearValues()}>Clear all</p> */}
            </div>
        }

{
                    infoText && <InfoText text={infoText} />
                }
    
                {
                    errorText && <FormErrorText text={errorText} />
                }
        
        </>
    )
}

export default FileSelector