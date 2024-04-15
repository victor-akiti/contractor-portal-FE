import styles from "./styles/styles.module.css"

const CheckBoxes = ({onClick, label, options,  placeholder, type, highlighted}) => {
    return (
        <div className={[styles.checkBoxes, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>

            <div>
            {
                    options.map((item, index) => <div className={styles.checkboxItem} key={index}>
                        <input type="checkbox" value={item.value} />
                        <label>{item.label}</label>
                    </div>)

                }
            </div>
        </div>
    )
}

export default CheckBoxes