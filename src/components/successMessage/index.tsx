import styles from "./styles/styles.module.css"

const SuccessMessage = ({message}: {message: string}) => {
    return (
        <div className={styles.successMessage}>
            <p>{message}</p>
        </div>
    )
}

export default SuccessMessage