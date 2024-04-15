'use client'
import { useState } from "react"
import styles from "./styles/styles.module.css"

const FormsList = () => {
    const [form, setForms] = useState([])

    return (
        <div className={styles.formBuilder}>
            Form Builder

            <header>
                <input placeholder="Search Forms" />
                
                <button>Create Form</button>
            </header>

            <table>
                <thead>
                    <tr>
                        <td>
                            Name
                        </td>

                        <td>
                            Date Created
                        </td>

                        <td>
                            Last Modified
                        </td>

                        <td>Creator</td>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td>

                        </td>

                        <td>

                        </td>

                        <td>

                        </td>

                        <td>

                        </td>
                    </tr>
                </tbody>
            </table>

            <div className={styles.noForms}>
                <p>You have no forms yet. <span>Create One</span></p>
            </div>
        </div>
    )
}

export default FormsList