'use client'
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ButtonLoadingIconPrimary from "@/components/buttonLoadingPrimary"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { deleteProtected } from "@/requests/delete"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import moment from "moment"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

type FormToDelete = {
    _id?: String
}

const Forms = () => {
    const [forms, setForms] = useState([])
    const [fetchingForms, setFetchingForms] = useState(true)
    const [formToDuplicate, setFormToDuplicate] = useState("")

    useEffect(() => {
        fetchAllForms()
    }, [])

    const fetchAllForms = async () => {
        try {
            const getAllFormsRequest = await getProtected("forms/all", user.role)

            if (getAllFormsRequest.status === "OK") {
                let tempForms = [...forms]
                tempForms = getAllFormsRequest.data
                setForms(tempForms)
            }

            setFetchingForms(false)



        } catch (error) {
            console.error({ error });

        }
    }



    const [showDeleteFormModal, setShowDeleteFormModal] = useState(false)
    const [formToDelete, setFormToDelete] = useState<FormToDelete>({})
    const [confirmationDialogSettings, setConfirmationDialogSettings] = useState({
        processing: false,
        errorMessage: "",
        successMessage: "",
        confirmText: "Continue",
        cancelText: "",
        headerText: "Delete form?",
        bodyText: "You are about to delete this form. This action cannot be reversed. Continue?"
    })
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [processing, setProcessing] = useState(false)
    const user = useSelector((state: any) => state.user.user)

    const selectFormForDeletion = form => {
        let tempFormToDelete = { ...formToDelete }
        tempFormToDelete = form
        setFormToDelete(tempFormToDelete)
    }

    const deleteForm = async () => {
        try {
            setProcessing(true)

            const deleteFormRequest: any = await deleteProtected(`forms/form/${formToDelete._id}`, {}, user.role)




            if (deleteFormRequest.status === "OK") {


                setSuccessMessage("Form deleted successfully.")

                let tempForms = [...forms]
                tempForms = deleteFormRequest.data
                setForms(tempForms)
            } else {
                setErrorMessage(deleteFormRequest.error.message)
            }

            setProcessing(false)

        } catch (error) {
            console.error({ error });
        }
    }





    const duplicateForm = async formID => {
        try {
            setFormToDuplicate(formID)
            const duplicateFormRequest = await postProtected(`forms/duplicate/${formID}`, {}, user.role)
            setFormToDuplicate("")

            if (duplicateFormRequest.status === "OK") {
                let tempForms = [...forms]
                tempForms = duplicateFormRequest.data
                setForms(tempForms)
            }
        } catch (error) {
            console.error({ error });
        }


    }

    const closeDeleteFormModal = () => {
        setShowDeleteFormModal(false)
        setFormToDelete({})
        setErrorMessage("")
        setSuccessMessage("")
    }



    return (
        <div className={styles.forms}>
            <h1>Forms</h1>

            {
                Object.entries(formToDelete).length > 0 &&
                <Modal >
                    <div className={styles.deleteFormModal}>
                        <div>
                            <h5>Delete Form</h5>

                            {
                                !successMessage && <p>{"You are about to delete this form. Continue?"}</p>
                            }

                            {
                                successMessage && <SuccessMessage message={successMessage} />
                            }

                            {
                                errorMessage && <ErrorText text={errorMessage} />
                            }

                            <div>
                                {!successMessage && <button onClick={() => deleteForm()}>Confirm {processing && <ButtonLoadingIcon />}</button>}

                                <button onClick={() => closeDeleteFormModal()}>{!successMessage ? "Cancel and Close" : "Close"}</button>
                            </div>
                        </div>
                    </div>
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

                                {/* <td>
                            Responses Count
                        </td> */}

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

                                    {/* <td>0</td> */}

                                    <td className={styles.actions}>
                                        {/* <Link href={item?.form?.settings?.isContractorApplicationForm ? "/staff/approvals" : `/staff/forms/responses/${item._id}`}>View Responses</Link> */}

                                        <span><span><a onClick={() => duplicateForm(item._id)}>Duplicate {formToDuplicate === item._id && <ButtonLoadingIconPrimary />}</a></span></span>

                                        <div><Link href={`/staff/form-builder/edit/${item._id}`}>Edit</Link></div>

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