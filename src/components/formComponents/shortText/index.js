import InfoText from "@/components/infoText"
import styles from "./styles/styles.module.css"
import FormErrorText from "@/components/formErrorText"

const ShortText = ({onClick, label,  placeholder, type, highlighted, infoText, errorText, defaultValue, onChange, required, value}) => {
    return (
        <div key={"shortText"} className={[styles.shortText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
            <input placeholder={placeholder} type={type} value={value} onChange={event => onChange(event.target.value)} />

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
        </div>
    )
}

export default ShortText