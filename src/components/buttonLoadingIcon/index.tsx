import styles from "./styles/styles.module.css"

// Simple modern button spinner: 14px circle with a 2px ring and one
// transparent arc that rotates. Inherits currentColor so it blends with
// whatever button colour it sits inside.
const ButtonLoadingIcon = () => {
    return <span className={styles.spinner} role="status" aria-label="Loading" />
}

export default ButtonLoadingIcon
