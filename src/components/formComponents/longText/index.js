import InfoText from "@/components/infoText"
import styles from "./styles/styles.module.css"
import FormErrorText from "@/components/formErrorText"

const LongText = ({onClick, label,  placeholder, type, highlighted, infoText, errorText, required}) => {
    return (
        <div className={[styles.longText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
            <textarea  placeholder={placeholder}  type={type} rows={5}></textarea>

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
        </div>
    )
}

export default LongText