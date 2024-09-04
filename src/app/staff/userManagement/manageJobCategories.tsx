'use client'

import styles from "./styles/styles.module.css"

const ManageJobCategories = () => {
    const sampleEndUser = {
        label: "Category",
        name: "category",
        uid: "adefr"
    }

    const list = new Array(10)
    return (
        
        <div className={styles.tab}>
            <header>
                <h3>Manage Job Categories</h3>


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
    )
}

export default ManageJobCategories