import styles from "./styles/styles.module.css"

const DropDown = ({onClick, label, options,  placeholder, type, highlighted}) => {
    return (
        <div className={[styles.dropDown, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>
            
            <select>
                <option selected disabled>Select an option</option>
                {
                    options.map((item, index) => <option key={index} value={item.value}>{item.label}</option>)
                }
            </select>
        </div>
    )
}

export default DropDown