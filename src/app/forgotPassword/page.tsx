'use client'
import logo from "@/assets/images/logo.png"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import SuccessMessage from "@/components/successMessage"
import { postProtected } from "@/requests/post"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import styles from "./styles/styles.module.css"

const ForgotPassword = () => {
    const [email, setEmail] = useState({
        email: ""
    })
    const [errorText, setErrorText] = useState("")
    const [sendingResetLink, setSendingResetLink] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const router = useRouter()


    const updateEmailDetails = ({ field, value }: { field: any, value: any }) => {

        let tempLoginDetals = { ...email }
        tempLoginDetals[field] = value
        setEmail(tempLoginDetals)
    }

    const validateEmail = () => {
        if (!email.email) {
            setErrorText("Please enter your email address")
        } else {
            setErrorText("")
            sendPasswordResetLink()
        }
    }

    const sendPasswordResetLink = async () => {
        try {
            setSendingResetLink(true)
            const sendPasswordResetLinkRequest = await postProtected("auth/password/reset", { email }, null)

            setSendingResetLink(false)

            if (sendPasswordResetLinkRequest.status === "OK") {
                setSuccessMessage(`A password reset link has been sent to ${email.email}.`)
            } else {
                setErrorText(sendPasswordResetLinkRequest.error.message)
            }
        } catch (error) {
            console.error({ error });
        }
    }

    return (
        <div className={styles.forgotPassword}>
            <div>
                <Image src={logo} alt="logo" width={70} height={89} style={{ marginBottom: "1.5rem" }} />

                <h5>Amni&#39;s Contractor Portal.</h5>

                <div className={styles.content}>
                    <h3>Forgot Password</h3>

                    {
                        errorText && <ErrorText text={errorText} />

                    }

                    {
                        successMessage && <SuccessMessage message={successMessage} />
                    }
                    <form onSubmit={event => {
                        event.preventDefault()
                        validateEmail()
                    }} onChange={(event: any) => updateEmailDetails({ field: event.target.name, value: event.target.value })}>
                        <input placeholder="Email" name="email" />


                        <button>Send Password Reset Link {sendingResetLink && <ButtonLoadingIcon />}</button>
                    </form>

                    <footer>
                        <span>Have an account?</span>


                        <Link href={"/login"}>Login</Link>
                    </footer>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword