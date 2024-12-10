import styles from "./styles/styles.module.css"

const ErrorText = ({text}:{text: string}) => {
    return (
        <div className={styles.errorText}>
            {text}
        </div>
    )
}

export default ErrorText