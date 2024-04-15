import styles from "./styles/styles.module.css"

const DateSelect = ({onClick, label,  placeholder, type, highlighted}) => {
    return (
        <div className={[styles.shortText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>
            <input placeholder={placeholder}  type={"datetime-local"} />
        </div>
    )
}

export default DateSelect