'use client'
import Image from "next/image"
import ButtonLoadingIcon from "../buttonLoadingIcon"
import styles from "./styles/styles.module.css"
import errorIcon from "@/assets/images/error_white_new.svg"
import successIcon from "@/assets/images/success_white.svg"

const FloatingProgressIndicator = ({status="success" , statusMessage}) => {
    const getCurrentStyle = () => {
        if (status === "success" ) {
            return styles.success
        } else if (status === "error") {
            return styles.error
        } else {
            return styles.processing
        }
    }

    const getCurrentIcon = () => {
        if (status === "success" ) {
            return <Image src={successIcon} alt="success icon" width={24} height={24} />
        } else if (status === "error") {
            return <Image src={errorIcon} alt="error icon" width={24} height={24} />
        } else {
            return <ButtonLoadingIcon />
        }
    }

    const getStatusMessage = () => {
        if (statusMessage) {
            return statusMessage
        } else {
            if (status === "success" ) {
                return "Success"
            } else if (status === "error") {
                return "An error occured"
            } else {
                return "Processing"
            }
        }
    }

    return <div className={[styles.fpi, getCurrentStyle()].join(" ")}>
        {
            getCurrentIcon()
        }
        <p>{getStatusMessage()}</p>
    </div>
}

export default FloatingProgressIndicator