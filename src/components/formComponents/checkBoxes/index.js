import InfoText from "@/components/infoText"
import styles from "./styles/styles.module.css"
import FormErrorText from "@/components/formErrorText"

const CheckBoxes = ({onClick, label, options, highlighted, infoText, errorText, required}) => {
    return (
        <div className={[styles.checkBoxes, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>

            <div>
                {
                    options.map((item, index) => <div className={styles.checkboxItem} key={index}>
                        <input type="checkbox" value={item.value} />
                        <label>{item.label}</label>
                    </div>)

                }

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
            </div>
        </div>
    )
}

export default CheckBoxes