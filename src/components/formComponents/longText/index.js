import styles from "./styles/styles.module.css"

const LongText = ({onClick, label,  placeholder, type, highlighted}) => {
    return (
        <div className={[styles.longText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>
            <textarea  placeholder={placeholder}  type={type} rows={5}></textarea>
        </div>
    )
}

export default LongText