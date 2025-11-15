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
    const [validationError, setValidationError] = useState(false)
    const router = useRouter()

    const updateEmailDetails = ({ field, value }: { field: any, value: any }) => {
        let tempLoginDetals = { ...email }
        tempLoginDetals[field] = value
        setEmail(tempLoginDetals)

        // Clear validation error when user types
        setValidationError(false)
    }

    const validateEmail = () => {
        if (!email.email) {
            setErrorText("Please enter your email address")
            setValidationError(true)
        } else {
            setErrorText("")
            setValidationError(false)
            sendPasswordResetLink()
        }
    }

    const sendPasswordResetLink = async () => {
        try {
            setSendingResetLink(true)
            setSuccessMessage("")
            setErrorText("")

            const sendPasswordResetLinkRequest = await postProtected("auth/password/reset", { email }, null)

            setSendingResetLink(false)

            if (sendPasswordResetLinkRequest.status === "OK") {
                setSuccessMessage(`A password reset link has been sent to ${email.email}.`)
            } else {
                setErrorText(sendPasswordResetLinkRequest.error.message)
            }
        } catch (error) {
            console.error({ error });
            setSendingResetLink(false)
            setErrorText("An error occurred. Please try again.")
        }
    }

    return (
        <div className={styles.forgotPasswordContainer}>
            <div className={styles.forgotPasswordCard}>
                {/* Logo and Header */}
                <div className={styles.forgotPasswordHeader}>
                    <Image
                        src={logo}
                        alt="Amni Logo"
                        width={70}
                        height={90}
                        className={styles.logo}
                    />
                    <h3 className={styles.platformTitle}>Amni Contractor Portal</h3>
                </div>

                {/* Main Content */}
                <div className={styles.forgotPasswordContent}>
                    <h4 className={styles.formTitle}>Reset Your Password</h4>
                    <p className={styles.formSubtitle}>
                        Enter your email address and we'll send you a link to reset your password
                    </p>

                    {/* Error Message */}
                    {errorText && (
                        <div className={styles.errorContainer}>
                            <ErrorText text={errorText} />
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className={styles.successContainer}>
                            <div className={styles.successIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <SuccessMessage message={successMessage} />
                        </div>
                    )}

                    {/* Form */}
                    <form
                        onSubmit={event => {
                            event.preventDefault()
                            validateEmail()
                        }}
                        className={styles.forgotPasswordForm}
                    >
                        <div className={styles.formGroup}>
                            <label htmlFor="email">Email Address *</label>
                            <input
                                id="email"
                                placeholder="Enter your email address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                disabled={sendingResetLink}
                                onChange={(event) => updateEmailDetails({
                                    field: event.target.name,
                                    value: event.target.value
                                })}
                                className={validationError ? styles.inputError : ''}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sendingResetLink}
                            className={styles.submitButton}
                        >
                            {sendingResetLink ? (
                                <>
                                    Sending Reset Link
                                    <ButtonLoadingIcon />
                                </>
                            ) : (
                                <>
                                    Send Reset Link
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M2.5 7.5L10 2.5L17.5 7.5M2.5 7.5L10 12.5M2.5 7.5V12.5L10 17.5M17.5 7.5L10 12.5M17.5 7.5V12.5L10 17.5M10 12.5V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className={styles.footer}>
                        <span className={styles.footerText}>Remember your password?</span>
                        <Link href="/login" className={styles.footerLink}>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword