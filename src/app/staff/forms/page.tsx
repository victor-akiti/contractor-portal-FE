'use client'
import Link from "next/link"
import styles from "./styles/styles.module.css"
import { useEffect, useState } from "react"
import { getProtected } from "@/requests/get"
import moment from "moment"

const Forms = () => {
    const [forms, setForms] = useState([])
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

            console.log({getAllFormsRequest});
            
        } catch (error) {
            console.log({error});
            
        }
    }

    console.log({forms});
    

    return (
        <div className={styles.forms}>
            <h1>Forms</h1>

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
                                <a>View Responses</a>

                                <Link href={`/staff/form-builder/edit/${item._id}`}>Edit</Link>

                                <a>Delete</a>
                            </td>
                        </tr>)
                    }
                </tbody>
            </table>
        </div>
    )
}

export default Forms