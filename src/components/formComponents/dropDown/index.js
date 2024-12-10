import InfoText from "@/components/infoText"
import styles from "./styles/styles.module.css"
import FormErrorText from "@/components/formErrorText"

const DropDown = ({onClick, label, options, highlighted, infoText, errorText, required, value, onSelect}) => {
    return (
        <div className={[styles.dropDown, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
            
            <select defaultChecked={value} defaultValue={value} onChange={event => onSelect(event.target.value)}>
                <option selected disabled>Select an option</option>
                {
                    options.map((item, index) => <option key={index} selected={value === item.label} value={item.value}>{item.label}</option>)
                }
            </select>

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
        </div>
    )
}

export default DropDown