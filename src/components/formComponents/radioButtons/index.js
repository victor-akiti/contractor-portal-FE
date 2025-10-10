import FormErrorText from "@/components/formErrorText"
import InfoText from "@/components/infoText"
import styles from "./styles/styles.module.css"

const RadioButtons = ({onClick, label, options, highlighted, name, infoText, errorText, required, value, setOptionAsValue}) => {
    
    return (
        <div className={[styles.radioButtons, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
            

            <div>
                {
                    options.map((item, index) => <div className={styles.checkboxItem} key={index}>
                        <input type="radio" name={name} value={item.value} checked={value === item.label} onClick={() => {setOptionAsValue(item.label)}} />
                        <label>{item.label}</label>
                    </div>)

                }
            </div>

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
        </div>
    )
}

export default RadioButtons