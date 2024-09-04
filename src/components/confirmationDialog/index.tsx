import ButtonLoadingIcon from "../buttonLoadingIcon"
import ErrorText from "../errorText"
import SuccessMessage from "../successMessage"
import styles from "./styles/styles.module.css"

const ConfirmationDialog = ({
    processing,
    errorMessage ,
    successMessage,
    confirmText,
    cancelText,
    headerText,
    bodyText,
    confirmAction,
    cancelAction
}) => {
    return (
        <div className={styles.deleteFormModal}>
                    <div>
                        <h5>{headerText}</h5>

                        {
                            !successMessage && <p>{bodyText}</p>
                        }

                        {
                            successMessage && <SuccessMessage message={successMessage} />
                        }

                        {
                            errorMessage && <ErrorText text={errorMessage} />
                        }
                        
                        <div>
                            <button onClick={() => confirmAction()}>{confirmText ? confirmText : "Confirm"} {processing && <ButtonLoadingIcon />}</button>

                            <button onClick={() => cancelAction()}>{cancelText ? cancelText : "Cancel"}</button>
                        </div>
                    </div>
                </div>
    )
}

export default ConfirmationDialog