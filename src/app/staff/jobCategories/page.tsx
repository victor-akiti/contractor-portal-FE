'use client'

import styles from "./styles/styles.module.css"
import Tabs from "@/components/tabs"
import { useEffect, useState } from "react"
import ManageEndUsers from "./manageEndUsers"
import ManageJobCategories from "./manageJobCategories"
import Modal from "@/components/modal"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { useSelector } from "react-redux"
import { putProtected } from "@/requests/put"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import { deleteProtected } from "@/requests/delete"

type Category = {
    category?: string,
    _id?: string,
    userName?: string,
    userID?: string,
}
const Tasks = () => {
    const [activeTab, setActiveTab] = useState("manage endusers")
    const [jobCategories, setJobCategories] = useState([])
    const [newCategoryLabel, setNewCategoryLabel] = useState("")
    const [updatingCategories, setUpdatingCategories] = useState(false)
    const [deletingCategory, setDeletingCategory] = useState(false)
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
    const [categoryToUpdate, setCategoryToUpdate] = useState<Category>({})
    const [categoryToDelete, setCategoryToDelete] = useState<Category>({})
    const user = useSelector((state:any) => state.user)
    

    const validateNewCategoryLabel = () => {
        if (!newCategoryLabel) {
            return false
        } else {

            if (categoryToUpdate.category) {
                updateExistingCategory()
            } else {
                createNewCategory()
            }
        }
    }

    console.log({categoryToUpdate});
    

    useEffect(() => {
        getAllJobCategories() 
    }, [])

    console.log({jobCategories});
    const getAllJobCategories = async () => {
        try {
            const getAllJobCategoriesRequest = await getProtected("jobCategories", user.role)

            if (getAllJobCategoriesRequest.status === "OK") {
                
                setJobCategories(sortJobCAtegoriesAlphabetically(getAllJobCategoriesRequest.data))
            }

            console.log({getAllJobCategoriesRequest});
            
        } catch (error) {
            console.log({error});
        }
    }

    const sortJobCAtegoriesAlphabetically = (jobCategories) => {
        let sortedJobCategories = [...jobCategories].sort((a,b) => a.category.localeCompare(b.category))
        return sortedJobCategories
    }
    

    const createNewCategory = async () => {
        setUpdatingCategories(true)
        try {
            let newJobCategory = {
                label: newCategoryLabel,
                userID: user?.user?.uid,
                userName: user?.user?.name,
                date: new Date()
            }

            const addNewJobCategoryRequest = await postProtected("jobCategories", newJobCategory, user.role)

            if (addNewJobCategoryRequest.status === "OK") {
                setUpdatingCategories(false)
                setShowAddCategoryModal(false)

                let tempJobCategories = [...jobCategories]
                tempJobCategories.push(addNewJobCategoryRequest.data)
                setJobCategories(tempJobCategories)
            }

            console.log({addNewJobCategoryRequest});
            
        } catch (error) {
            console.log({error}); 
        }
    }

    const updateExistingCategory = async () => {
        setUpdatingCategories(true)
        try {
            const updateExistingJobCategoryRequest = await putProtected(`jobCategories/${categoryToUpdate._id}`, {category: newCategoryLabel}, user.role)

            if (updateExistingJobCategoryRequest.status === "OK") {
                setUpdatingCategories(false)
                setShowAddCategoryModal(false)

                let tempJobCategories = [...jobCategories]

                tempJobCategories = tempJobCategories.map(jobCategory => {
                    if (jobCategory._id === categoryToUpdate._id) {
                        return {...jobCategory, category: updateExistingJobCategoryRequest.data.category}
                    } else {
                        return jobCategory
                    }
                })

                setJobCategories(tempJobCategories)
            }

            console.log({updateExistingJobCategoryRequest});
            
        } catch (error) {
            console.log({error});
        }
    }

    const closeAddCategoryModal = () => {
        setShowAddCategoryModal(false)
        setNewCategoryLabel("")
        setCategoryToUpdate({})
    }

    const closeDeleteCategoryModal = () => {
        setCategoryToDelete({})
        setDeletingCategory(false)
    }

    const deleteJobCategory = async () => {
        try {
            setDeletingCategory(true)
            const deleteJobCategoryRequest = await deleteProtected(`jobCategories/${categoryToDelete._id}`, {deleted: true}, user.role)

            if (deleteJobCategoryRequest.status === "OK") {
                let tempJobCategories = [...jobCategories]

                tempJobCategories = tempJobCategories.filter(jobCategory => jobCategory._id !== categoryToDelete._id)

                setJobCategories(tempJobCategories)

                closeDeleteCategoryModal()
            }

            console.log({deleteJobCategoryRequest});
            
        } catch (error) {
            console.log({error});
        }
    }

    return (
        <div className={styles.tasksPage}>

            {
                showAddCategoryModal && <Modal>
                <div className={styles.addJobCategoryModal}>
                    <header>
                        <h2>Add Job Category</h2>
                    </header>

                    <hr />

                    <div>

                        <label>Label</label>

                        <input placeholder="Job category label" onChange={event => setNewCategoryLabel(event.target.value)} value={newCategoryLabel} />
                        <p>Your category label should be short but descriptive</p>

                    </div>

                    <hr />
                    
                    <footer>
                        <button onClick={() => closeAddCategoryModal()}>CANCEL</button>

                        <button disabled={!newCategoryLabel && updatingCategories} className={(newCategoryLabel && !updatingCategories) ? styles.enabled : styles.disabled} onClick={validateNewCategoryLabel} >{categoryToUpdate.category ? "UPDATE" : "ADD"} { updatingCategories && <ButtonLoadingIcon />}</button>
                    </footer>
                </div>
            </Modal>
            }


            {
                Object.values(categoryToDelete).length > 0 && <Modal>
                <div className={styles.addJobCategoryModal}>
                    <header>
                        <h2>Delete Job Category</h2>
                    </header>

                    <hr />

                    <div>

                        <p className={styles.deleteCategoryWarning}>{`You are about to remove ${categoryToDelete.category} from the job category list. Click "CANCEL" if this is not what you want to do.`}</p>

                    </div>

                    <hr />
                    
                    <footer>
                        <button onClick={() => closeDeleteCategoryModal()}>CANCEL</button>

                        <button disabled={!newCategoryLabel && updatingCategories} className={styles.enabled} onClick={() => deleteJobCategory()} >DELETE { deletingCategory && <ButtonLoadingIcon />}</button>
                    </footer>
                </div>
            </Modal>
            }
            <h2>Job Categories</h2>


            <div className={styles.tab}>
            <header>
                <h3>Manage Job Categories</h3>

                <button onClick={() => setShowAddCategoryModal(true)}>ADD CATEGORY</button>


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
                        jobCategories.map((item, index) => <tr className={index%2 === 0 ? styles.dark : styles.light} key={index}>
                            <td>
                                <p>{item.category}</p>
                            </td>

                            <td>
                                <a onClick={() => {
                                    setNewCategoryLabel(item.category)
                                    setCategoryToUpdate(item)
                                    setShowAddCategoryModal(true)
                                }}>UPDATE</a>

                                <a onClick={() => setCategoryToDelete(item)}>DELETE</a>
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