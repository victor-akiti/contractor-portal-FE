'use client'
import logo from "@/assets/images/logo.png"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import { useLoginContractorMutation } from "@/redux/apis/authApi"
import { useAppDispatch } from "@/redux/hooks"
import { setUserData } from "@/redux/reducers/user"
import { postProtected } from "@/requests/post"
import type { LoginDetails } from "@/types/auth.types"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import styles from "./styles/styles.module.css"

/**
 * Contractor Login Component
 * 
 * Features:
 * - RTK Query integration for modern API calls
 * - 100% backward compatible with existing postProtected implementation
 * - TypeScript support with proper typing
 * - Maintains all existing functionality
 */
const Login = () => {
    const [loginDetails, setLoginDetails] = useState<LoginDetails>({
        email: "",
        password: "",
        rememberMe: false
    })
    const [errorText, setErrorText] = useState("")
    const [loggingIn, setLoggingIn] = useState(false)
    const router = useRouter()
    const dispatch = useAppDispatch()

    // RTK Query hook - NEW
    const [loginContractor, { isLoading: isLoadingRTK }] = useLoginContractorMutation()

    useEffect(() => {
        // Any initialization logic
    }, [])

    const updateLoginDetails = ({ field, value }: { field: keyof LoginDetails, value: any }) => {
        setLoginDetails(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const validateLoginDetails = () => {
        if (!loginDetails.email) {
            setErrorText("Please enter your email address")
        } else if (!loginDetails.password) {
            setErrorText("Please enter your password")
        } else {
            setErrorText("")
            // Toggle between implementations
            // logUserInWithEmailAndPassword() // Original implementation
            logUserInWithRTKQuery() // New RTK Query implementation
        }
    }

    /**
     * ORIGINAL IMPLEMENTATION - Preserved for backward compatibility
     * Uses the existing postProtected function
     */
    const logUserInWithEmailAndPassword = async () => {
        try {
            setLoggingIn(true)
            const loginRequest = await postProtected("auth/login", { loginDetails }, null)

            if (loginRequest.status === "OK") {
                dispatch(setUserData({ user: loginRequest.data.user }));
                router.push("contractor/dashboard")
            } else {
                setErrorText(loginRequest.error.message)
                setLoggingIn(false)
            }

        } catch (error: any) {
            console.error({ error });
            setLoggingIn(false)
            setErrorText(error.message);
        }
    }

    /**
     * NEW RTK QUERY IMPLEMENTATION
     * Modern approach using RTK Query mutation
     */
    const logUserInWithRTKQuery = async () => {
        try {
            setLoggingIn(true)
            setErrorText("")

            const result = await loginContractor({
                loginDetails
            }).unwrap()

            if (result.status === "OK" && result.data?.user) {
                dispatch(setUserData({ user: result.data.user }))
                router.push("contractor/dashboard")
            } else {
                console.log({ result })
                setErrorText(result.error?.message || "Login failed")
                setLoggingIn(false)
            }

        } catch (error: any) {
            console.error({ error })
            setLoggingIn(false)

            // Handle RTK Query error format
            const errorMessage = error?.data?.error?.message
                || error?.data?.message
                || error?.error?.message
                || "An unexpected error occurred"

            setErrorText(errorMessage)
        }
    }

    // Use either the local loading state or RTK Query's loading state
    const isSubmitting = loggingIn || isLoadingRTK

    return (
        <div className={styles.login}>
            <div>
                <Image src={logo} alt="logo" width={70} height={89} style={{ marginBottom: "1.5rem" }} />

                <h5>Amni&#39;s Contractor Registration Portal Page.</h5>

                <div className={styles.content}>
                    <h3>Log In</h3>

                    {errorText && <ErrorText text={errorText} />}

                    <form
                        onSubmit={event => {
                            event.preventDefault()
                            validateLoginDetails()
                        }}
                        onChange={(event: React.ChangeEvent<HTMLFormElement>) => {
                            const target = event.target;
                            const value = target.type === 'checkbox' ? target.checked : target.value
                            updateLoginDetails({
                                field: target.name as keyof LoginDetails,
                                value
                            })
                        }}
                    >
                        <input
                            placeholder="Email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            disabled={isSubmitting}
                        />
                        <input
                            placeholder="Password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            disabled={isSubmitting}
                        />

                        <div>
                            <div>
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    disabled={isSubmitting}
                                />
                                <label>Remember me</label>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting}>
                            Login {isSubmitting && <ButtonLoadingIcon />}
                        </button>
                    </form>

                    <footer>
                        <span>Forgot password?</span>
                        <Link href={"/forgotPassword"}>Reset</Link>
                    </footer>
                </div>
            </div>
        </div>
    )
}

export default Login