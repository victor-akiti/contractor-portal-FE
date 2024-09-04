import styles from "./styles/styles.module.css"

const FormErrorText = ({text}) => {
    return (
        <p className={styles.errorText}><span>Error: </span>{text}</p>
    )
}

export default FormErrorText