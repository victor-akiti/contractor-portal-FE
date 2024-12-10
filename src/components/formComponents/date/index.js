import InfoText from "@/components/infoText"
import styles from "./styles/styles.module.css"
import FormErrorText from "@/components/formErrorText"

const DateSelect = ({onClick, label,  placeholder, highlighted, infoText, errorText, required, onChange, value}) => {
    return (
        <div className={[styles.shortText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
            <input placeholder={placeholder} value={value}  type={"datetime-local"} onChange={(event) => {
                onChange(event.target.value)
            }} />

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
        </div>
    )
}

export default DateSelect