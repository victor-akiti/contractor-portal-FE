'use client'

import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs"
import { useState } from "react"
import ManageEndUsers from "./manageEndUsers"
import ManageJobCategories from "./manageJobCategories"

const Tasks = () => {
    const [activeTab, setActiveTab] = useState("manage endusers")
    const sampleEndUser = {
        label: "Category",
        name: "category",
        uid: "adefr"
    }
    return (
        <div className={styles.tasksPage}>
            <h2>Job Categories</h2>


            <div className={styles.tab}>
            <header>
                <h3>Manage Job Categories</h3>

                <button>ADD CATEGORY</button>


            </header>



            <table>
                <thead>
                    <tr>
                        <td>
                            <p>Job Category</p>
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
                                <a>UPDATE</a>

                                <a>DELETE</a>
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