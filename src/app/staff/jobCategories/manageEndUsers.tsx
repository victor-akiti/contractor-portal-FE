'use client'

import styles from "./styles/styles.module.css"

const ManageEndUsers = () => {
    const sampleEndUser = {
        firstName: "firstName",
        lastName: "lastName",
        department: "Finance",
        email: "sampleEndUser@amni.com",
        login: "firstNameL",
        name: "FirstName LastName",
        role: "Admin"
    }

    const list = new Array(10)
    return (
        
        <div className={styles.tab}>
            <header>
                <h3>Manage End-users</h3>

                <label>Filter</label>

                <div>
                <input placeholder="Filter by name" />

                    <button>Add End-User</button>
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
                            <p>Actions</p>
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
                                <a>UPDATE</a>

                                <a>DELETE</a>
                            </td>
                        </tr>)
                    }
                </tbody>
            </table>
        </div>
    )
}

export default ManageEndUsers