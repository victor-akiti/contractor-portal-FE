import styles from "./styles/styles.module.css"

const SuccessText = ({text}:{text: string}) => {
    return (
        <div className={styles.errorText}>
            {text}
        </div>
    )
}

export default SuccessText