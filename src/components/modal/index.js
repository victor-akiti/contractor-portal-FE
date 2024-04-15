'use client'

import styles from "./styles/styles.module.css"

const Modal = ({children}) => {
    return (
        <div className={styles.modal}>
            {
                children
            }
        </div>
    )
}

export default Modal