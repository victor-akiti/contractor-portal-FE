import styles from "./styles/styles.module.css"
import fileIcon from "../../../assets/images/fileIcon.svg"
import Image from "next/image"

const FileSelector = ({onClick, label, options,  placeholder, type, highlighted, allowedFormats=["PDF", "JPG", "PNG"]}) => {
    const getallowedFormatsText = () => {
        let allowedFormatsText = []

        allowedFormats.forEach(item => {
            allowedFormatsText = allowedFormatsText + `${item} `
        })

        return allowedFormatsText
    }
    return (
        <div className={[styles.selectFile, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>

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
    )
}

export default FileSelector