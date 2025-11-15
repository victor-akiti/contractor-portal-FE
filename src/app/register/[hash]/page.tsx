'use client'

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { useAppSelector } from "@/redux/hooks"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import logo from "../../../assets/images/logo.png"
import styles from "./styles/styles.module.css"

const Register = () => {
    const params = useParams()
    const [hashValid, setHashValid] = useState(null)
    const [registrationDetails, setRegistrationDetails] = useState({
        fname: "",
        lname: "",
        email: "",
        password: "",
        passwordConfirm: "",
        acceptedTerms: false,
        hash: params.hash,
        acceptedNDPR: false
    })
    const [errorMessage, setErrorMessage] = useState("")
    const [creatingAccount, setCreatingAccount] = useState(false)
    const [createdAccount, setCreatedAccount] = useState(false)
    const passwordRegex = /^(?=.*\d)(?=.*[#$@!%&*?_])[A-Za-z\d#$@!%&*?_]{8,}$/
    const [showAcceptNDPRModal, setShowAcceptNDPRModal] = useState(false)
    const [validationErrors, setValidationErrors] = useState({
        password: false,
        passwordConfirm: false,
        acceptedTerms: false
    })
    const [showPassword, setShowPassword] = useState(false)
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
    const reduxState = useAppSelector(state => state)

    useEffect(() => {
        validateHash()
    }, [params])

    const validateHash = async () => {
        try {
            const validateHashRequest = await getProtected(`auth/register/validate/${params.hash}`)

            if (validateHashRequest.status === "OK") {
                let tempRegistrationDetails = { ...registrationDetails }
                tempRegistrationDetails = validateHashRequest.data
                setRegistrationDetails(tempRegistrationDetails)
                setHashValid(true)
            } else {
                setErrorMessage(validateHashRequest.error.message)
                setHashValid(false)
            }
        } catch (error) {
            console.error({ error });
        }
    }

    const updateTermsAcceptance = newValue => {
        let tempRegistrationDetails = { ...registrationDetails }
        tempRegistrationDetails.acceptedTerms = newValue
        setRegistrationDetails(tempRegistrationDetails)

        updateRegistrationDetails("acceptedTerms", newValue)
        setValidationErrors(prev => ({ ...prev, acceptedTerms: false }))
    }

    const updateRegistrationDetails = (field: any, value: any) => {
        if (field) {
            let tempRegistrationDetails = { ...registrationDetails }
            tempRegistrationDetails[field] = value
            setRegistrationDetails(tempRegistrationDetails)

            // Clear validation error for this field
            if (field === 'password' || field === 'passwordConfirm') {
                setValidationErrors(prev => ({ ...prev, [field]: false }))
            }
        }
    }

    const validateForm = () => {
        const errors = {
            password: !registrationDetails.password || !passwordRegex.test(registrationDetails.password),
            passwordConfirm: registrationDetails.password !== registrationDetails.passwordConfirm,
            acceptedTerms: !registrationDetails.acceptedTerms
        }

        setValidationErrors(errors)

        if (!registrationDetails.password) {
            setErrorMessage("A password is required.")
        } else if (!passwordRegex.test(registrationDetails.password)) {
            setErrorMessage("Your password must be at least 8 characters long and contain at least one uppercase letter, one number and one special character.")
        } else if (registrationDetails.password !== registrationDetails.passwordConfirm) {
            setErrorMessage("The passwords you provided do not match.")
        } else if (!registrationDetails.acceptedTerms) {
            setErrorMessage("You have not accepted our terms and conditions.")
        } else {
            setErrorMessage("")
            setShowAcceptNDPRModal(true)
        }
    }

    const createNewAccount = async () => {
        try {
            setCreatingAccount(true)
            const createNewAccountRequest = await postProtected("auth/register", registrationDetails, null)

            setCreatingAccount(false)

            if (createNewAccountRequest.status === "OK") {
                setCreatedAccount(true)
                setCreatingAccount(false)
                setShowAcceptNDPRModal(false)
            } else {
                setCreatingAccount(false)
                setShowAcceptNDPRModal(false)
                setErrorMessage(createNewAccountRequest.error.message)
            }
        } catch (error) {
            setCreatingAccount(false)
            toast.error(error?.message || "An error occurred while creating your account. Please try again later.")
            console.error({ error });
        }
    }

    return (
        <div className={styles.registerContainer}>
            <div className={styles.registerCard}>
                {/* Logo and Header */}
                <div className={styles.registerHeader}>
                    <Image
                        src={logo}
                        alt="Amni Logo"
                        width={70}
                        height={90}
                        className={styles.logo}
                    />
                    <h3 className={styles.platformTitle}>Amni Contractor Registration Portal</h3>
                </div>

                {/* Main Content */}
                <div className={styles.registerContent}>
                    <h4 className={styles.formTitle}>Create Your Account</h4>

                    {/* NDPR Modal */}
                    {showAcceptNDPRModal && (
                        <Modal>
                            <div className={styles.ndprModal}>
                                <div className={styles.ndprModalHeader}>
                                    <div className={styles.ndprIcon}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <h3>Data Privacy Notice</h3>
                                </div>
                                <p className={styles.ndprText}>
                                    By proceeding with this registration, you agree with our Nigeria Data Protection Regulation (NDPR) policy.
                                    We are committed to protecting your personal information and ensuring data security.
                                </p>
                                <div className={styles.ndprActions}>
                                    <button
                                        onClick={() => setShowAcceptNDPRModal(false)}
                                        disabled={creatingAccount}
                                        className={styles.cancelButton}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => createNewAccount()}
                                        disabled={creatingAccount}
                                        className={styles.acceptButton}
                                    >
                                        {creatingAccount ? (
                                            <>
                                                Creating account
                                                <ButtonLoadingIcon />
                                            </>
                                        ) : (
                                            <>
                                                Accept and Continue
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )}

                    {/* Loading State */}
                    {hashValid === null && (
                        <div className={styles.loadingContainer}>
                            <Loading message="Validating your registration link..." />
                        </div>
                    )}

                    {/* Error Message */}
                    {errorMessage && (
                        <div className={styles.errorContainer}>
                            <ErrorText text={errorMessage} />
                        </div>
                    )}

                    {/* Registration Form */}
                    {hashValid && !createdAccount && (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault()
                                validateForm()
                            }}
                            className={styles.registrationForm}
                        >
                            {/* Name Fields - Disabled */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="fname">First Name</label>
                                    <input
                                        id="fname"
                                        className={styles.disabledInput}
                                        disabled
                                        value={registrationDetails.fname}
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="lname">Last Name</label>
                                    <input
                                        id="lname"
                                        className={styles.disabledInput}
                                        disabled
                                        value={registrationDetails.lname}
                                        autoComplete="family-name"
                                    />
                                </div>
                            </div>

                            {/* Email Field - Disabled */}
                            <div className={styles.formGroup}>
                                <label htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    className={styles.disabledInput}
                                    disabled
                                    value={registrationDetails.email}
                                    autoComplete="email"
                                />
                            </div>

                            {/* Password Field */}
                            <div className={styles.formGroup}>
                                <label htmlFor="password">Password *</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        id="password"
                                        disabled={creatingAccount}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a strong password"
                                        name="password"
                                        defaultValue={registrationDetails.password}
                                        onChange={(event) => updateRegistrationDetails(event.target.name, event.target.value)}
                                        className={validationErrors.password ? styles.inputError : ''}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M3 3L21 21M10.5 10.5C10.0353 10.9646 9.75 11.6022 9.75 12.3C9.75 13.7912 10.9588 15 12.45 15C13.1478 15 13.7854 14.7147 14.25 14.25M19.5 16.5C17.7 18.5 14.85 20 12 20C7.5 20 3.6 16.8 1.5 12C2.7 9.6 4.35 7.5 6.3 6M12 4C16.5 4 20.4 7.2 22.5 12C21.75 13.8 20.7 15.3 19.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M1.5 12C1.5 12 5.25 5.25 12 5.25C18.75 5.25 22.5 12 22.5 12C22.5 12 18.75 18.75 12 18.75C5.25 18.75 1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className={styles.passwordHint}>
                                    Must be at least 8 characters with one uppercase letter, one number, and one special character
                                </p>
                            </div>

                            {/* Confirm Password Field */}
                            <div className={styles.formGroup}>
                                <label htmlFor="passwordConfirm">Confirm Password *</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        id="passwordConfirm"
                                        disabled={creatingAccount}
                                        type={showPasswordConfirm ? "text" : "password"}
                                        placeholder="Re-enter your password"
                                        name="passwordConfirm"
                                        defaultValue={registrationDetails.passwordConfirm}
                                        onChange={(event) => updateRegistrationDetails(event.target.name, event.target.value)}
                                        className={validationErrors.passwordConfirm ? styles.inputError : ''}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                        tabIndex={-1}
                                    >
                                        {showPasswordConfirm ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M3 3L21 21M10.5 10.5C10.0353 10.9646 9.75 11.6022 9.75 12.3C9.75 13.7912 10.9588 15 12.45 15C13.1478 15 13.7854 14.7147 14.25 14.25M19.5 16.5C17.7 18.5 14.85 20 12 20C7.5 20 3.6 16.8 1.5 12C2.7 9.6 4.35 7.5 6.3 6M12 4C16.5 4 20.4 7.2 22.5 12C21.75 13.8 20.7 15.3 19.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M1.5 12C1.5 12 5.25 5.25 12 5.25C18.75 5.25 22.5 12 22.5 12C22.5 12 18.75 18.75 12 18.75C5.25 18.75 1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Terms Acceptance */}
                            <div className={styles.termsContainer}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        disabled={creatingAccount}
                                        onChange={(event) => updateTermsAcceptance(event.target.checked)}
                                        className={styles.checkbox}
                                    />
                                    <span className={styles.checkboxText}>
                                        I accept the <Link href="/">terms and conditions</Link>
                                    </span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={creatingAccount}
                                className={styles.submitButton}
                            >
                                {creatingAccount ? (
                                    <>
                                        Creating Account
                                        <ButtonLoadingIcon />
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M4.16667 10H15.8333M15.8333 10L10 4.16667M15.8333 10L10 15.8333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            {/* Login Link */}
                            <p className={styles.loginPrompt}>
                                Already have an account? <Link href="/login">Login here</Link>
                            </p>
                        </form>
                    )}

                    {/* Success State */}
                    {createdAccount && (
                        <div className={styles.successContainer}>
                            <div className={styles.successIcon}>
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
                                    <path d="M14 24L20 30L34 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <SuccessMessage message="Your contractor portal account has been created successfully." />
                            <p className={styles.successText}>
                                You can now proceed to login and access your contractor dashboard.
                            </p>
                            <Link href="/login" className={styles.loginButton}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 3.33334H5C4.07953 3.33334 3.33334 4.07954 3.33334 5.00001V15C3.33334 15.9205 4.07953 16.6667 5 16.6667H7.5M13.3333 13.3333L16.6667 10M16.6667 10L13.3333 6.66668M16.6667 10H7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Login to Your Account
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Register