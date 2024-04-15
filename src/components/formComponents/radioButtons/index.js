import styles from "./styles/styles.module.css"

const RadioButtons = ({onClick, label, options,  placeholder, type, highlighted, name}) => {
    return (
        <div className={[styles.radioButtons, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>
            

            <div>
                {
                    options.map((item, index) => <div className={styles.checkboxItem} key={index}>
                        <input type="radio" name={name} value={item.value} />
                        <label>{item.label}</label>
                    </div>)

                }
            </div>
        </div>
    )
}

export default RadioButtons