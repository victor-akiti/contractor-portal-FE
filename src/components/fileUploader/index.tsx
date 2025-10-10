import doc from "@/assets/images/doc.svg"
import jpg from "@/assets/images/jpg.svg"
import pdf from "@/assets/images/pdf.svg"
import png from "@/assets/images/png.svg"
import pptx from "@/assets/images/pptx.svg"
import xlsx from "@/assets/images/xlsx.svg"
import { postProtectedMultipart } from "@/requests/post"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import ButtonLoadingIcon from "../buttonLoadingIcon"
import ErrorText from "../errorText"
import Tabs from "../tabs"
import styles from "./styles/styles.module.css"

const FileUploader = ({ updateUploadedFiles, updateCode, closeUploader, maxFiles, files, label, onlyNewFiles = false }) => {
    const uploadFileTabs = [{
        name: "Upload new file",
        label: "Upload new file"
    }, !onlyNewFiles && {
        name: "Select existing file",
        label: "Select existing file"
    }]
    const [userFiles, setUserFiles] = useState([])
    const [uploading, setUploading] = useState(false)

    const [activeUploadFileTab, setActiveUploadFileTab] = useState("Upload new file")
    const selectFileInputRef = useRef(null)
    const [selectedFiles, setSelectedFiles] = useState([])
    const [errorMessage, setErrorMessage] = useState("")
    const [selectedUploadedFiles, setSelectedUploadedFiles] = useState([])
    const user = useSelector((state: any) => state.user.user)






    useEffect(() => {
        setUserFiles(files)
    }, [files])


    const selectFile = () => {
        selectFileInputRef.current.click()
    }

    const handleFileSelected = event => {
        const files = event.target.files

        if (files.length > maxFiles) {
            setErrorMessage(`You can only select ${maxFiles} files`)
        } else {
            setErrorMessage("")
            let selectedFilesList = []
            let tempSelectedFiles = [...selectedFiles]

            for (let index = 0; index < files.length; index++) {
                const element = files[index];



                selectedFilesList.push(element)
            }

            tempSelectedFiles = selectedFilesList
            setSelectedFiles(tempSelectedFiles)
        }

    }

    const removeSelectedFile = (index) => {


        let tempSelectedFiles = [...selectedFiles]
        tempSelectedFiles = tempSelectedFiles.filter((fileITem, fileIndex) => index !== fileIndex)
        setSelectedFiles(tempSelectedFiles)
    }

    const uploadSelectedFiles = async () => {
        //Add files to FormData

        let formData = new FormData()
        for (let index = 0; index < selectedFiles.length; index++) {
            const element = selectedFiles[index];
            formData.append(`file`, element)
        }
        formData.append("label", label)
        formData.append("updateCode", updateCode)
        setUploading(true)

        const uploadFiles = await postProtectedMultipart("files/upload", formData, user.role)

        setUploading(false)





        if (uploadFiles.status === "OK") {
            let tempSelectedFiles = [...selectedFiles]
            tempSelectedFiles = []
            setSelectedFiles(tempSelectedFiles)
            setFilesSelectedByUser(uploadFiles.data)
        } else {
            setErrorMessage(uploadFiles.error.message)
        }
    }

    const allowMultipleFiles = () => {
        if (maxFiles > 1) {
            return true
        } else {
            return false
        }
    }

    const setFilesSelectedByUser = filesArray => {


        if (activeUploadFileTab === "Upload new file") {
            updateUploadedFiles(filesArray)
        } else {
            updateUploadedFiles(selectedFiles)
        }


    }

    const getFileIcon = (type) => {
        switch (type) {
            case "image/png":
                return png
            case "image/jpeg":
                return jpg
            case "application/pdf":
                return pdf
            case "application/msword":
                return doc
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                return xlsx
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                return pptx
            default: {
                return jpg
            }
        }

    }

    const toggleSelectedUploadedFiles = (file, index) => {
        let tempFiles = [...selectedUploadedFiles]

        if (selectedUploadedFiles.includes(file._id)) {
            setErrorMessage("")
            tempFiles = tempFiles.filter((item) => item !== file._id)
            let tempSelectedFiles = [...selectedFiles]
            tempSelectedFiles = tempSelectedFiles.filter(item => item._id !== file._id)
            setSelectedFiles(tempSelectedFiles)
        } else {
            if (selectedUploadedFiles.length + 1 > maxFiles) {
                setErrorMessage("You cannot select more files")
            } else {
                setErrorMessage("")
                tempFiles.push(file._id)
                let tempSelectedFiles = [...selectedFiles]
                tempSelectedFiles.push({
                    _id: file._id,
                    url: file.downloadURL,
                    name: file.name,
                    label,
                    updateCode
                })
                setSelectedFiles(tempSelectedFiles)
            }

        }

        setSelectedUploadedFiles(tempFiles)

    }

    const switchTabs = (newTab) => {
        let temp = [...selectedFiles]
        temp = []
        setSelectedFiles(temp)
        temp = [...selectedUploadedFiles]
        temp = []
        setSelectedUploadedFiles(temp)
        setErrorMessage("")
        setActiveUploadFileTab(newTab)
    }




    return (
        <div className={styles.uploadFileModal}>
            <div>
                <Tabs tabs={uploadFileTabs} activeTab={activeUploadFileTab} updateActiveTab={newTab => switchTabs(newTab)} />

                <div>
                    {
                        errorMessage && <ErrorText text={errorMessage} />
                    }
                </div>

                {activeUploadFileTab === "Upload new file" &&
                    <div className={styles.selectUploadFileDiv}>
                        <div>
                            <button onClick={() => { selectFile() }}>Select File</button>
                            <input ref={selectFileInputRef} type="file" multiple onChange={event => handleFileSelected(event)} />
                            <label>Select a file or drag and drop a file here</label>

                            <table className={styles.selectedFilesTable}>
                                <tbody>


                                    {
                                        selectedFiles.map((item, index) => <tr key={index}>
                                            <td>{item.name}</td>
                                            <td>{item.size}</td>
                                            <td><a onClick={() => removeSelectedFile(index)}>Remove</a></td>
                                        </tr>)
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                }



                {
                    activeUploadFileTab !== "Upload new file" && <div className={styles.selectFileDiv}>
                        {
                            userFiles.map((item, index) => {
                                return <div key={index} onClick={() => toggleSelectedUploadedFiles(item, index)}>
                                    <div className={selectedUploadedFiles.includes(item._id) && styles.active}>
                                        <Image src={getFileIcon(item.type)} alt="file icon" width={100} height={100} />
                                        <p>{item.name}</p>
                                    </div>
                                </div>
                            })
                        }
                    </div>
                }



                <footer>
                    {
                        selectedFiles.length > 0 && selectedFiles.length <= maxFiles && activeUploadFileTab === "Upload new file" && <button onClick={() => uploadSelectedFiles()}>{selectedFiles.length > 1 ? "Upload all files and select" : "Upload file and select"} {uploading && <ButtonLoadingIcon />}</button>
                    }

                    {
                        selectedUploadedFiles.length > 0 && <button onClick={() => setFilesSelectedByUser(selectedUploadedFiles)}>Select and close</button>
                    }

                    <button onClick={() => closeUploader()}>Cancel</button>
                </footer>
            </div>

        </div>
    )
}

export default FileUploader