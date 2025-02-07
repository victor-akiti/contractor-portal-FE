'use client'

import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs"
import { useEffect, useRef, useState } from "react"
import ManageEndUsers from "./manageEndUsers"
import ManageJobCategories from "./manageJobCategories"
import Modal from "@/components/modal"
import Switch from "react-switch"
import { getProtected } from "@/requests/get"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import SuccessMessage from "@/components/successMessage"
import { putProtected } from "@/requests/put"
import { useSelector } from "react-redux"

type User  = {
    firstName?: String,
    lastName?: String,
    department?: String,
    email?: String,
    login?: String,
    name?: String,
    role?: String,
    isOutOfOffice?: boolean,
    _id?: String
}

function useOutsideClick(ref, onClickOut, deps = []){
    useEffect(() => {
        const onClick = ({target}) => !ref?.contains(target) && onClickOut?.()
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, deps);
}

const Tasks = () => {
    const [activeTab, setActiveTab] = useState("amni-staff")
    const [fixedUsers, setFixedUsers] = useState([])
    const [users, setUsers] = useState([])
    const [optionToUpdate, setOptionToUpdate] = useState("")
    const [newRole, setNewRole] = useState("")
    const [newDepartment, setNewDepartment] = useState("")
    const [successMessages, setSuccessMessages] = useState<any>({})
    const [errorMessages, setErrorMessages] = useState({})
    const [userToReplaceRole, setUserToReplaceRole] = useState<any>({})
    const [fixedUsersList, setFixedUsersList] = useState<any>([])
    const [selectedUser, setSelectedUser] = useState<User>({})
    const manageUserModalRef = useRef(null)
    const user = useSelector((state: any) => state.user.user)

    const sampleEndUser: User = {
        firstName: "firstName",
        lastName: "lastName",
        department: "Finance",
        email: "sampleEndUser@amni.com",
        login: "firstNameL",
        name: "FirstName LastName",
        role: "End-user",
        isOutOfOffice: false,
        _id: ""
    }

    useEffect(() => {
        getAllStaff()
    }, [])

    // useOutsideClick(manageUserModalRef.current, () => {
    //     console.log("out click");

    //     let tempSelectedUser = {...selectedUser}
    //     tempSelectedUser = {}
    //     setSelectedUser(tempSelectedUser)
        
    // }, [selectedUser])

    

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

    const getAllStaff = async () => {
        try {
            const getAllStaffRequest = await getProtected("users/all", user.role)

            console.log({getAllStaffRequest});
            

            if (getAllStaffRequest.status === "OK") {
                console.log("fetched");
                

                console.log(sortUserAlphabetically(getAllStaffRequest.data));
                
                
                setUsers(sortUserAlphabetically(getAllStaffRequest.data.allStaff))
                setFixedUsersList(getAllStaffRequest.data)
            }

            console.log({getAllStaffRequest});
            
        } catch (error) {

        }
    }

    const sortUserAlphabetically = (users) => {
        console.log({theUsers: users});
        
        // let sortedUsers = [...users].sort((a,b) => a.name.localeCompare(b.name))
        // console.log({sortedUsers});
        
        return users
    }

    const updateUserRole = async ({replace}) => {
        try {
            setOptionToUpdate("role")
            if (replace) {
                setOptionToUpdate("replace")
            } else {
                setOptionToUpdate("role")
            }
            const updateUserRoleRequest = await putProtected(`users/role/${selectedUser._id}`, {role: newRole, replace}, user.role)

            if (updateUserRoleRequest.status === "OK") {
                setOptionToUpdate("")
                getAllStaff()

                if (replace === true) {
                    setUserToReplaceRole({})
                }

                showSuccessMessages("role", "Role updated successfully")

                
            } else {
                if (updateUserRoleRequest.error.message === "User with this role already exists") {
                    let tempUserToReplaceRole = {...userToReplaceRole}
                    tempUserToReplaceRole = updateUserRoleRequest.user
                    setUserToReplaceRole(tempUserToReplaceRole)
                }
            }

            console.log({updateUserRoleRequest});
            
        } catch (error) {
            console.log({error});
        }
    }

    const showSuccessMessages = (option, message) => {
        let tempSuccessMessages = {...successMessages}
        tempSuccessMessages[option] = message
        setOptionToUpdate("")

        setSuccessMessages(tempSuccessMessages)

        setTimeout(() => {
            let tempSuccessMessages = {...successMessages}
            tempSuccessMessages[option] = ""

            setSuccessMessages(tempSuccessMessages)
        }, 3000)
    }

    const closeReplaceRoleModal = () => {
        setUserToReplaceRole({})
    }

    console.log({users});
    

    const filterUsersByNameOrEmail = query => {
        console.log({query});
        
        if (query) {
            let tempUsers = [...users]
            console.log(fixedUsersList[activeTab === "amni-staff" ? "allStaff" : "allVendors"]);
            
            tempUsers = fixedUsersList[activeTab === "amni-staff" ? "allStaff" : "allVendors"].filter(user => {
                if (user.name && user.email) {
                    if (user?.name?.toLowerCase().includes(query.toLowerCase()) || user?.email?.toLowerCase().includes(query.toLowerCase())) {
                        return user
                    }
                }
            })
            setUsers(tempUsers)
        } else {
            setUsers(fixedUsersList[activeTab === "amni-staff" ? "allStaff" : "allVendors"])
        }
    }

    const updateUserDepartment = async () => {
        setOptionToUpdate("department")
        try {
            console.log("updating department");
            
            const updateUserDepartmentRequest = await putProtected(`users/department/${selectedUser._id}`, {department: newDepartment}, user.role)

            if (updateUserDepartmentRequest.status === "OK") {
                getAllStaff()
                
                showSuccessMessages("department", "Department updated successfully")
            }

            console.log({updateUserDepartmentRequest});
            
        } catch (error) {
            console.log({error});
        }
    }

    console.log({activeTab});
    console.log({newRole});
    console.log({newDepartment});
    const tabs = [
        {
            name: "amni-staff",
            label: "Amni Staff"
        },
        {
            name: "vendors",
            label: "Vendors"
        }
    ]

    const handleTabChange = newTab => {
        let tempUsers = [...users]
        if (newTab === "amni-staff") {
            tempUsers = fixedUsersList.allStaff
        } else {
            tempUsers = fixedUsersList.allVendors
        }
        setUsers(tempUsers)
        setActiveTab(newTab)
    }

    const filterUsersByRole = role => {
        let tempUsers = [...users]
        tempUsers = fixedUsersList["allStaff"].filter(user => user.role === role)
        setUsers(tempUsers)
    }

    const filterUsersByDepartment = department => {
        let tempUsers = [...users]
        tempUsers = fixedUsersList["allStaff"].filter(user => user.department === department)
        setUsers(tempUsers)
    }
    
    
    

    return (
        <div className={styles.userManagement}>
            {
                Object.values(selectedUser).length > 0 && <Modal>
                <div className={styles.manageUserModal} >

                <h2 className={styles.selectedUserName}>{`Manage ${selectedUser.name ? selectedUser.name : "User"}`}</h2>
                    {
                        selectedUser.role !== "Vendor" && <>
                        <div>
                            

                            <hr className={styles.topDivider} />
                            <h3>Update Department</h3>

                            <div>
                                    {/* <div className={styles.splitRow}>
                                        <input placeholder="First Name" />
                                        <input placeholder="Last Name" />
                                    </div>

                                    <div className={styles.splitRow}>
                                        <input placeholder="Email" />
                                        <input placeholder="Amni Login" />
                                    </div> */}

                                    {
                                        successMessages.department && <SuccessMessage message={successMessages.department} />
                                    }

                                    <select onChange={event => setNewDepartment(event.target.value)} >
                                        <option disabled selected>Department</option>
                                        <option value={"Contracts and Procurement"}>Contracts and Procurement</option>
                                        <option value={"Corporate Communications"}>Corporate Communications</option>
                                        <option value={"Drilling"}>Drilling</option>
                                        <option value={"Finance"}>Finance</option>
                                        <option value={"Legal"}>Legal</option>
                                        <option value={"Human Resources"}>Human Resources</option>
                                        <option value={"Internal Control and Risk Management"}>Internal Control and Risk Management</option>
                                        <option value={"ICT"}>ICT</option>
                                        <option value={"Insurance"}>Insurance</option>
                                        <option value={"Information Management"}>Information Management</option>
                                        <option value={"Operations"}>Operations</option>
                                    </select>

                                    <div className={styles.actionButtonDiv}>
                                        <button onClick={() => updateUserDepartment()}>Update { optionToUpdate === "department" && <ButtonLoadingIcon />}</button>
                                    </div>
                            </div>
                        </div>

                        <hr />
                        </>
                    }

                    {
                        <div>
                        <h3>Update Role</h3>

                        <div>
                                
                                {
                                    successMessages["role"] && <SuccessMessage message={successMessages.role} />
                                }
                                <select onChange={event => setNewRole(event.target.value)}>
                                    <option value={"Amni Staff"}>Amni Staff</option>
                                    <option value={"C and P Staff"}>C and P Staff</option>
                                    <option value={"Supervisor"}>C and P Supervisor</option>
                                    <option value={"HOD"}>C and P HOD</option>
                                    <option value={"Executive Approver"}>Executive Approver</option>
                                    <option value={"Insurance Officer"}>Insurance Officer</option>
                                    <option value={"VRM"}>VRM</option>
                                    <option value={"C&P Admin"}>C & P Administrator</option>
                                    <option value={"Admin"}>Admin</option>
                                </select>

                                <div className={styles.actionButtonDiv}>
                                    <button onClick={() => updateUserRole({replace: false})}>Update {optionToUpdate === "role" && <ButtonLoadingIcon />}</button>
                                </div>
                        </div>
                    </div>
                    }

                    <hr />


                    {/* <div>
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
                    </div> */}
{/* 
                    <hr /> */}


                    <div>
                        <h3>Disable user</h3>

                        <div>
                                

                                <button className={styles.disableUserButton}>Disable user account</button>
                        </div>
                    </div>

                    <hr />

                    <div>
                        <h3>Remove user</h3>

                        <div>
                                

                                <button className={styles.disableUserButton}>Remove user account</button>
                        </div>
                    </div>

                    <hr />

                    <div className={styles.closeButtonDiv}>
                        <button onClick={() => closeManageUserModal()}>Close</button>
                    </div>
                </div>
            </Modal>
            }

            {
                Object.values(userToReplaceRole).length > 0 && <Modal>
                <div className={styles.replaceRoleModal}>
                    <h2>Replace User Role</h2>

                    <p>{`${userToReplaceRole.name} currently holds the ${userToReplaceRole.role} role. Replace them as ${userToReplaceRole.role} with ${selectedUser.name}? They would automatically be moved to the C and P Staff Role.`}</p>

                    <div>

                        <div className={styles.actionButtonDiv}>
                            <button onClick={() => updateUserRole({replace: true})}>Replace Current Role Holder { optionToUpdate === "replace" && <ButtonLoadingIcon />}</button>
                            <button onClick={() => closeReplaceRoleModal()}>Cancel</button>
                        </div>
                    </div>
                </div>
            </Modal>
            }


            <h2>User Management</h2>

            <div className={styles.tab}>
            <header>
                <h3>Manage Users</h3>

                {/* <label>Filter</label> */}

                <div className={styles.tabs}>
                    <Tabs activeTab={activeTab} tabs={tabs} updateActiveTab={(newTab) => {handleTabChange(newTab)
                    }}  />
                </div>

                

                <div>
                    <div className={styles.filterSortDiv}>
                        <input placeholder="Filter by name" onChange={event => filterUsersByNameOrEmail(event.target.value)} />

                        {
                            activeTab === "amni-staff" && <>
                                            <select onChange={event => filterUsersByRole(event.target.value)}>
                            <option>Filter by role</option>


                            <option value={"Amni Staff"}>Amni Staff</option>
                            <option value={"C and P Staff"}>C and P Staff</option>
                            <option value={"Supervisor"}>C and P Supervisor</option>
                            <option value={"HOD"}>C and P HOD</option>
                            <option value={"Executive Approver"}>Executive Approver</option>
                            <option value={"Insurance Officer"}>Insurance Officer</option>
                            <option value={"VRM"}>VRM</option>
                            <option value={"C&P Admin"}>C & P Administrator</option>
                            <option value={"Admin"}>Admin</option>
                        </select>

                        <select onChange={event => filterUsersByDepartment(event.target.value)}>
                            <option>Filter by department</option>

                            <option value={"Contracts and Procurement"}>Contracts and Procurement</option>
                            <option value={"Corporate Communications"}>Corporate Communications</option>
                            <option value={"Drilling"}>Drilling</option>
                            <option value={"Finance"}>Finance</option>
                            <option value={"Legal"}>Legal</option>
                            <option value={"Human Resources"}>Human Resources</option>
                            <option value={"Internal Control and Risk Management"}>Internal Control and Risk Management</option>
                            <option value={"ICT"}>ICT</option>
                            <option value={"Insurance"}>Insurance</option>
                            <option value={"Information Management"}>Information Management</option>
                            <option value={"Operations"}>Operations</option>
                        </select>
                            </>
                        }
                        
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

                        {
                            activeTab === "amni-staff" && <td>
                            <p>Department</p>
                        </td>
                        }

                        {
                            activeTab === "amni-staff" && <td>
                            Role
                        </td>
                        }

                        <td>
                            <p>Action</p>
                        </td>
                    </tr>
                </thead>

                <tbody>
                    {
                        users.map((item, index) => <tr className={index%2 === 0 ? styles.dark : styles.light} key={index}>
                            <td>
                                <p>{ item.name}</p>
                            </td>

                            <td>
                                <p>{item.email}</p>
                            </td>

                            {
                                activeTab === "amni-staff" && <td>
                                <p>{item.department}</p>
                            </td>
                            }

                            {
                                activeTab === "amni-staff" && <td>
                                <p>{item.role}</p>
                            </td>
                            }

                            <td>
                                <a onClick={() => setUserAsSelected(item)}>MANAGE</a>
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