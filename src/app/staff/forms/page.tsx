'use client'
import Link from "next/link"
import styles from "./styles/styles.module.css"
import { useEffect, useState } from "react"
import { getProtected } from "@/requests/get"
import moment from "moment"
import Modal from "@/components/modal"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ConfirmationModal from "@/components/confirmationDialog"
import ConfirmationDialog from "@/components/confirmationDialog"
import { deleteProtected } from "@/requests/delete"
import Loading from "@/components/loading"

type FormToDelete = {
    _id ? : String
}

const Forms = () => {
    const [forms, setForms] = useState([])
    const [fetchingForms, setFetchingForms] = useState(true)

    useEffect(() => {
        fetchAllForms()
    }, [])

    const fetchAllForms = async () => {
        try {
            const getAllFormsRequest = await getProtected("forms/all")

            if (getAllFormsRequest.status === "OK") {
                let tempForms = [...forms]
                tempForms = getAllFormsRequest.data
                setForms(tempForms)
            }

           setFetchingForms(false)

            console.log({getAllFormsRequest});
            
        } catch (error) {
            console.log({error});
            
        }
    }

    console.log({forms});

    const [showDeleteFormModal, setShowDeleteFormModal] = useState(false)
    const [formToDelete, setFormToDelete] = useState<FormToDelete>({})
    const [confirmationDialogSettings, setConfirmationDialogSettings] = useState({
        processing: false,
        errorMessage : "",
        successMessage: "",
        confirmText: "Continue",
        cancelText: "",
        headerText: "Delete form?",
        bodyText: "You are about to delete this form. This action cannot be reversed. Continue?"
    })

    const selectFormForDeletion = form => {
        let tempFormToDelete = {...formToDelete}
        tempFormToDelete = form
        setFormToDelete(tempFormToDelete)
    }

    const deleteForm = async () => {
        try {
            let tempConfirmationDialogSettings = {...confirmationDialogSettings}
            tempConfirmationDialogSettings.processing = true
            console.log({tempConfirmationDialogSettings});
            
            setConfirmationDialogSettings(tempConfirmationDialogSettings)

            const deleteFormRequest:any = await deleteProtected(`forms/form/${formToDelete._id}`, {})

            console.log({deleteFormRequest});
            

            if (deleteFormRequest.status === "OK") {
                tempConfirmationDialogSettings.successMessage = "Form deleted successfully."
            } else {
                tempConfirmationDialogSettings.errorMessage = deleteFormRequest.error.message
            }
            tempConfirmationDialogSettings.processing = false

            setConfirmationDialogSettings(tempConfirmationDialogSettings)
        } catch (error) {
            console.log({error});
        }
    }

    

    return (
        <div className={styles.forms}>
            <h1>Forms</h1>

            {
                Object.entries(formToDelete).length > 0 && 
                    <Modal >
                        <ConfirmationDialog
                        processing={confirmationDialogSettings.processing}
                        errorMessage={confirmationDialogSettings.errorMessage}
                        successMessage={confirmationDialogSettings.successMessage}
                        cancelText={confirmationDialogSettings.cancelText}
                        confirmText={confirmationDialogSettings.confirmText}
                        headerText={confirmationDialogSettings.headerText}
                        bodyText={confirmationDialogSettings.bodyText}
                        confirmAction={() => deleteForm()}
                        cancelAction={() => {
                            let tempFormToDelete = {...formToDelete}
                            tempFormToDelete = {}
                            setFormToDelete(tempFormToDelete)
                        }}

                        />
                    </Modal>
            }

            {
                fetchingForms && <div>
                    <Loading message={"Fetching forms..."} />
                </div>
            }

            {
                !fetchingForms && forms.length === 0 && <div className={styles.noFormsDiv}>
                <div>
                    <p>There are currently no forms.</p>
                    <Link href={"/staff/form-builder/new"}>
                        <button>Create one</button>
                    </Link>
                </div>
            </div>
            }

            {
                !fetchingForms && forms.length > 0 && <>
                <div className={styles.formsSortAndFilterDiv}>
                <div>
                    <input placeholder="Find form..." />

                    <select>
                        <option>Oldest first</option>
                        <option>Newest First</option>
                        <option>Recently modified first</option>
                        <option>Recently modified last</option>
                    </select>

                    <select>
                        <option>All</option>
                        <option>Created by me</option>
                    </select>
                </div>

                <Link href={"/staff/form-builder/new"}>
                    <button>Create new form</button>
                </Link>
            </div>

            

            <table>
                <thead>
                    <tr>
                        <td>
                            Form Name
                        </td>

                        <td>
                            Created by
                        </td>

                        <td>
                            Created
                        </td>

                        <td>
                            Last Modified
                        </td>

                        <td>
                            Responses Count
                        </td>

                        <td>
                            Action
                        </td>
                    </tr>
                </thead>

                <tbody>
                    {
                        forms.map((item: any, index) => <tr key={index}>
                            <td>{item?.form?.name}</td>

                            <td>{item?.formCreator?.name}</td>

                            <td>{moment(item?.createdAt).format('Do MMMM  YYYY, h:mm:ss a')}</td>

                            <td>{moment(item?.item?.updatedAt).format('Do MMMM  YYYY, h:mm:ss a')}</td>

                            <td>0</td>

                            <td>
                                <Link href={item?.form?.settings?.isContractorApplicationForm ? "/staff/approvals" : `/staff/forms/responses/${item._id}`}>View Responses</Link>

                                <Link href={`/staff/form-builder/edit/${item._id}`}>Edit</Link>

                                <a onClick={() => selectFormForDeletion(item)}>Delete</a>
                            </td>
                        </tr>)
                    }
                </tbody>
            </table>
            </>
            }
        </div>
    )
}

export default Forms