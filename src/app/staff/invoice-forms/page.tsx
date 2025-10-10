'use client'

import Modal from "@/components/modal"
import { getProtected } from "@/requests/get"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import Switch from "react-switch"
import styles from "./styles/styles.module.css"

type User = {
    firstName?: String,
    lastName?: String,
    department?: String,
    email?: String,
    login?: String,
    name?: String,
    role?: String,
    isOutOfOffice?: boolean
}

const InvoiceForms = () => {
    const [activeTab, setActiveTab] = useState("manage endusers")

    const [invoiceForms, setInvoiceForms] = useState([])
    const [fixedInvoiceForms, setFixedInvoiceForms] = useState([])
    const [filterParameter, setFilterParameter] = useState("Contract Number")

    const [copiedFields, setCopiedFields] = useState([])

    const user = useSelector((state: any) => state.user.user)


    useEffect(() => {
        fetchAllInvoiceForms()
    }, [])

    const fetchAllInvoiceForms = async () => {
        try {
            const fetchAllInvoiceFormsRequest = await getProtected("docuware/invoice-forms/all", user.role)

            if (fetchAllInvoiceFormsRequest.status === "OK") {
                let tempInvoiceForms = [...invoiceForms]
                tempInvoiceForms = fetchAllInvoiceFormsRequest.data
                setInvoiceForms(tempInvoiceForms.reverse())
                tempInvoiceForms = [...fixedInvoiceForms]
                tempInvoiceForms = fetchAllInvoiceFormsRequest.data
                setFixedInvoiceForms(tempInvoiceForms)
            }



        } catch (error) {
            console.error({ error });
        }
    }

    const sampleEndUser: User = {
        firstName: "firstName",
        lastName: "lastName",
        department: "Finance",
        email: "sampleEndUser@amni.com",
        login: "firstNameL",
        name: "FirstName LastName",
        role: "End-user",
        isOutOfOffice: false
    }

    const [selectedUser, setSelectedUser] = useState<User>({})

    const setUserAsSelected = user => {


        let tempSelectedUser = { ...selectedUser }
        tempSelectedUser = user
        setSelectedUser(tempSelectedUser)
    }

    const closeManageUserModal = () => {
        removeSelectedUser()
    }

    const removeSelectedUser = () => {
        let tempSelectedUser = { ...selectedUser }
        tempSelectedUser = {}
        setSelectedUser(tempSelectedUser)
    }

    const addToCopiedField = index => {
        let tempCopiedFields = [...copiedFields]
        if (!tempCopiedFields.includes(index)) {
            tempCopiedFields.push(index)
            setCopiedFields(tempCopiedFields)

            setTimeout(() => {
                if (tempCopiedFields.includes(index)) {
                    tempCopiedFields = tempCopiedFields.filter((item) => item !== index)
                    setCopiedFields(tempCopiedFields)
                }
            }, 3000)
        }
    }


    // const removeCopiedField = index => {        
    //     let tempCopiedFields = [...copiedFields]
    //     
    //     


    //     

    //     if (tempCopiedFields.includes(index)){
    //         tempCopiedFields = tempCopiedFields.filter((item) => item !== index)
    //         setCopiedFields(tempCopiedFields)
    //     }
    // }


    const filterInvoiceForms = filterText => {
        let tempInvoiceForms = [...invoiceForms]

        tempInvoiceForms = fixedInvoiceForms.filter((item, index) => {
            switch (filterParameter) {
                case "Contract Number":
                    if (String(item.DOCUMENT_NUMBER).toLowerCase().includes(filterText.toLowerCase())) {
                        return item
                    }
                case "Contractor":
                    if (String(item.CONTRACTOR_NAME).toLowerCase().includes(filterText.toLowerCase())) {
                        return item
                    }
                case "Department":
                    if (String(item.DEPARTMENT).toLowerCase().includes(filterText.toLowerCase())) {
                        return item
                    }
            }
        })

        setInvoiceForms(tempInvoiceForms)
    }


    return (
        <div className={styles.userManagement}>
            {
                Object.values(selectedUser).length > 0 && <Modal>
                    <div className={styles.manageUserModal}>
                        {
                            selectedUser.role === "End-user" && <>
                                <div>
                                    <h3>Update End User</h3>

                                    <div>
                                        <div className={styles.splitRow}>
                                            <input placeholder="First Name" />
                                            <input placeholder="Last Name" />
                                        </div>

                                        <div className={styles.splitRow}>
                                            <input placeholder="Email" />
                                            <input placeholder="Amni Login" />
                                        </div>

                                        <select>
                                            <option>Department</option>
                                        </select>

                                        <div className={styles.actionButtonDiv}>
                                            <button>Update</button>
                                        </div>
                                    </div>
                                </div>

                                <hr />
                            </>
                        }

                        <div>
                            <h3>Update Permissions</h3>

                            <div>


                                <select>
                                    <option>Vendor</option>
                                    <option>End-user</option>
                                    <option>CnP Staff</option>
                                    <option>Contract Officer</option>
                                    <option>CnP GM</option>
                                    <option>CnP HOD</option>
                                    <option>Executive Approver</option>
                                    <option>Admin</option>
                                </select>

                                <div className={styles.actionButtonDiv}>
                                    <button>Update</button>
                                </div>
                            </div>
                        </div>

                        <hr />


                        <div>
                            <h3>Out Of Office</h3>

                            <div>


                                <div className={styles.switchLabel}>
                                    <label>Is out of office</label>
                                    <Switch
                                        onChange={() => {
                                            if (sampleEndUser.isOutOfOffice) {
                                                true
                                            } else {
                                                false
                                            }
                                        }}
                                        checked={sampleEndUser.isOutOfOffice} />
                                </div>

                                <label>Forward tasks to</label>

                                <select style={{ marginTop: "10px" }}>
                                    <option>Select user to forward tasks to</option>
                                </select>

                                <div className={styles.actionButtonDiv}>
                                    <button>Save</button>
                                </div>
                            </div>
                        </div>

                        <hr />


                        <div>
                            <h3>Disable user</h3>

                            <div>


                                <button className={styles.disableUserButton}>Disable user account</button>
                            </div>
                        </div>

                        <hr />

                        <div className={styles.closeButtonDiv}>
                            <button onClick={() => closeManageUserModal()}>Close</button>
                        </div>
                    </div>
                </Modal>
            }


            <h2>Invoice Forms</h2>

            <div className={styles.tab}>
                <header>


                    <label>Filter</label>



                    <div>
                        <div>
                            <input placeholder="Filter" onChange={event => filterInvoiceForms(event.target.value)} />

                            <select onChange={event => setFilterParameter(event.target.value)
                            }>
                                <option>Filter by:</option>

                                <option value={"Contract Number"}>Contract/PO Number</option>
                                <option value={"Contractor"}>Contractor Name</option>
                                <option value={"Department"}>Department</option>
                            </select>
                        </div>

                        {/* <button>Add End-User</button> */}
                    </div>
                </header>



                <table>
                    <thead>
                        <tr>
                            <td>
                                <p>Contract/PO Number</p>
                            </td>

                            <td>
                                Contractor
                            </td>

                            <td>
                                <p>Total Value</p>
                            </td>

                            <td>
                                <p>Department</p>
                            </td>

                            <td>
                                Currency
                            </td>

                            <td>
                                Created Date & Time
                            </td>

                            <td>
                                <p>Action</p>
                            </td>
                        </tr>
                    </thead>

                    <tbody>
                        {
                            invoiceForms.map((item, index) => <tr className={index % 2 === 0 ? styles.dark : styles.light} key={index}>
                                <td>
                                    <p>{item.DOCUMENT_NUMBER}</p>
                                </td>

                                <td>
                                    <p>{item.CONTRACTOR_NAME}</p>
                                </td>

                                <td>
                                    <p>{item.CONTRACT_VALUE}</p>
                                </td>

                                <td>
                                    <p>{item.DEPARTMENT}</p>
                                </td>

                                <td>
                                    <p>{item.CURRENCY}</p>
                                </td>

                                <td>
                                    <p>{String((new Date(item.createdAt).toUTCString()))}</p>
                                </td>

                                <td className={styles.actionCell}>
                                    <a onClick={() => {
                                        navigator.clipboard.writeText(`https://amni-invoices-five.vercel.app/invoice/${item.INVOICE_CODE}`)
                                        addToCopiedField(index)
                                    }}>Copy Form Link</a>

                                    {
                                        copiedFields.includes(index) && <p className={styles.notification}>Copied</p>
                                    }

                                    {/* <a onClick={() => setUserAsSelected(sampleEndUser)}>View Submitted Invoices</a> */}
                                </td>
                            </tr>)
                        }
                    </tbody>
                </table>
            </div>


        </div>
    )
}

export default InvoiceForms