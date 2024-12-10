import styles from "./styles/styles.module.css"

const InfoText = ({text}) => {
    return (
        <p className={styles.infoText}>{text}</p>
    )
}

export default InfoText