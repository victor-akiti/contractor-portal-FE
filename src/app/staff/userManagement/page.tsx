'use client'

import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs"
import { useState } from "react"
import ManageEndUsers from "./manageEndUsers"
import ManageJobCategories from "./manageJobCategories"
import Modal from "@/components/modal"
import Switch from "react-switch"

type User  = {
    firstName?: String,
    lastName?: String,
    department?: String,
    email?: String,
    login?: String,
    name?: String,
    role?: String,
    isOutOfOffice?: boolean
}

const Tasks = () => {
    const [activeTab, setActiveTab] = useState("manage endusers")

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
        console.log({user});
        
        let tempSelectedUser = {...selectedUser}
        tempSelectedUser = user
        setSelectedUser(tempSelectedUser)
    }

    const closeManageUserModal = () => {
        removeSelectedUser()
    }

    const removeSelectedUser = () => {
        let tempSelectedUser = {...selectedUser}
        tempSelectedUser = {}
        setSelectedUser(tempSelectedUser)
    }

    console.log({selectedUser});
    

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
                                    <option>GMD</option>
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

                                <select style={{marginTop: "10px"}}>
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


            <h2>User Management</h2>

            <div className={styles.tab}>
            <header>
                <h3>Manage Users</h3>

                <label>Filter</label>

                

                <div>
                    <div>
                        <input placeholder="Filter by name" />

                        <select>
                            <option>Filter by role</option>

                            <option value={"user"}>Contractor</option>
                            <option value={"user"}>End User</option>
                            <option value={"user"}>CnP Staff</option>
                            <option value={"user"}>Contracts Officer</option>
                            <option value={"user"}>CnP GM</option>
                            <option value={"user"}>CnP HOD</option>
                            <option value={"user"}>GMD</option>
                            <option value={"user"}>Admin</option>
                        </select>
                    </div>

                    {/* <button>Add End-User</button> */}
                </div>
            </header>



            <table>
                <thead>
                    <tr>
                        <td>
                            <p>Name</p>
                        </td>

                        <td>
                            <p>Email</p>
                        </td>

                        <td>
                            <p>Department</p>
                        </td>

                        <td>
                            Role
                        </td>

                        <td>
                            <p>Action</p>
                        </td>
                    </tr>
                </thead>

                <tbody>
                    {
                        ["", "", "", "", "", "", "", "", "", ""].map((item, index) => <tr className={index%2 === 0 ? styles.dark : styles.light} key={index}>
                            <td>
                                <p>{sampleEndUser.name}</p>
                            </td>

                            <td>
                                <p>{sampleEndUser.email}</p>
                            </td>

                            <td>
                                <p>{sampleEndUser.department}</p>
                            </td>

                            <td>
                                <p>{sampleEndUser.role}</p>
                            </td>

                            <td>
                                <a onClick={() => setUserAsSelected(sampleEndUser)}>MANAGE</a>
                            </td>
                        </tr>)
                    }
                </tbody>
            </table>
        </div>

            
        </div>
    )
}

export default Tasks