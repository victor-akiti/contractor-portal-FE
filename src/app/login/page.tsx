"use client";
import logo from "@/assets/images/logo.png";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import ErrorText from "@/components/errorText";
import { auth } from "@/lib/firebase";
import { useLoginContractorMutation } from "@/redux/apis/authApi";
import { useAppDispatch } from "@/redux/hooks";
import { setUserData } from "@/redux/reducers/user";
import { postProtected } from "@/requests/post";
import type { LoginDetails } from "@/types/auth.types";
import { signInWithCustomToken } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./styles/styles.module.css";

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
        rememberMe: false,
    });
    const [errorText, setErrorText] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({
        email: false,
        password: false,
    });
    const router = useRouter();
    const dispatch = useAppDispatch();

    // RTK Query hook - NEW
    const [loginContractor, { isLoading: isLoadingRTK }] = useLoginContractorMutation();

    useEffect(() => {
        // Any initialization logic
    }, []);

    const updateLoginDetails = ({ field, value }: { field: keyof LoginDetails; value: any }) => {
        setLoginDetails((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Clear validation error for this field
        if (field === "email" || field === "password") {
            setValidationErrors((prev) => ({ ...prev, [field]: false }));
        }
    };

    const validateLoginDetails = () => {
        const errors = {
            email: !loginDetails.email,
            password: !loginDetails.password,
        };

        setValidationErrors(errors);

        if (!loginDetails.email) {
            setErrorText("Please enter your email address");
        } else if (!loginDetails.password) {
            setErrorText("Please enter your password");
        } else if (loginDetails?.email?.includes("amni.com")) {
            setErrorText("Please use your registered contractor email to login");
        } else {
            setErrorText("");
            // Toggle between implementations
            // logUserInWithEmailAndPassword() // Original implementation
            logUserInWithRTKQuery(); // New RTK Query implementation
        }
    };

    /**
     * ORIGINAL IMPLEMENTATION - Preserved for backward compatibility
     * Uses the existing postProtected function
     */
    const logUserInWithEmailAndPassword = async () => {
        try {
            setLoggingIn(true);
            const loginRequest = await postProtected("auth/login", { loginDetails }, null);

            if (loginRequest.status === "OK") {
                dispatch(setUserData({ user: loginRequest.data.user }));
                router.push("contractor/dashboard");
            } else {
                setErrorText(loginRequest.error.message);
                setLoggingIn(false);
            }
        } catch (error: any) {
            console.error({ error });
            setLoggingIn(false);
            setErrorText(error.message);
        }
    };

    /**
     * NEW RTK QUERY IMPLEMENTATION
     * Modern approach using RTK Query mutation
     */
    const logUserInWithRTKQuery = async () => {
        try {
            setLoggingIn(true);
            setErrorText("");

            const result = await loginContractor({
                loginDetails,
            }).unwrap();

            if (result.status === "OK" && result.data?.user) {
                const customToken = result.firebaseCustomToken;
                const customSignIn = await signInWithCustomToken(auth, customToken);

                console.log({ customToken, customSignIn });

                dispatch(setUserData({ user: result.data.user }));
                router.push("contractor/dashboard");
            } else {
                console.log({ result });
                setErrorText(result.error?.message || "Login failed");
                setLoggingIn(false);
            }
        } catch (error: any) {
            console.error({ error });
            setLoggingIn(false);

            // Handle RTK Query error format
            const errorMessage =
                error?.data?.error?.message ||
                error?.data?.message ||
                error?.error?.message ||
                "An unexpected error occurred";

            setErrorText(errorMessage);
        }
    };

    // Use either the local loading state or RTK Query's loading state
    const isSubmitting = loggingIn || isLoadingRTK;

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                {/* Logo and Header */}
                <div className={styles.loginHeader}>
                    <Image src={logo} alt="Amni Logo" width={70} height={90} className={styles.logo} />
                    <h3 className={styles.platformTitle}>Amni Contractor Registration Portal</h3>
                </div>

                {/* Main Content */}
                <div className={styles.loginContent}>
                    <h4 className={styles.formTitle}>Login to Your Account</h4>

                    {/* Error Message */}
                    {errorText && (
                        <div className={styles.errorContainer}>
                            <ErrorText text={errorText} />
                        </div>
                    )}

                    {/* Login Form */}
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            validateLoginDetails();
                        }}
                        className={styles.loginForm}
                    >
                        {/* Email Field */}
                        <div className={styles.formGroup}>
                            <label htmlFor="email">Email Address *</label>
                            <input
                                id="email"
                                placeholder="Enter your email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                disabled={isSubmitting}
                                onChange={(event) =>
                                    updateLoginDetails({
                                        field: event.target.name as keyof LoginDetails,
                                        value: event.target.value,
                                    })
                                }
                                className={validationErrors.email ? styles.inputError : ""}
                            />
                        </div>

                        {/* Password Field */}
                        <div className={styles.formGroup}>
                            <label htmlFor="password">Password *</label>
                            <div className={styles.passwordInputWrapper}>
                                <input
                                    id="password"
                                    placeholder="Enter your password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    disabled={isSubmitting}
                                    onChange={(event) =>
                                        updateLoginDetails({
                                            field: event.target.name as keyof LoginDetails,
                                            value: event.target.value,
                                        })
                                    }
                                    className={validationErrors.password ? styles.inputError : ""}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M3 3L21 21M10.5 10.5C10.0353 10.9646 9.75 11.6022 9.75 12.3C9.75 13.7912 10.9588 15 12.45 15C13.1478 15 13.7854 14.7147 14.25 14.25M19.5 16.5C17.7 18.5 14.85 20 12 20C7.5 20 3.6 16.8 1.5 12C2.7 9.6 4.35 7.5 6.3 6M12 4C16.5 4 20.4 7.2 22.5 12C21.75 13.8 20.7 15.3 19.5 16.5"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M1.5 12C1.5 12 5.25 5.25 12 5.25C18.75 5.25 22.5 12 22.5 12C22.5 12 18.75 18.75 12 18.75C5.25 18.75 1.5 12 1.5 12Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me Checkbox */}
                        <div className={styles.rememberMeContainer}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    disabled={isSubmitting}
                                    onChange={(event) =>
                                        updateLoginDetails({
                                            field: event.target.name as keyof LoginDetails,
                                            value: event.target.checked,
                                        })
                                    }
                                    className={styles.checkbox}
                                />
                                <span className={styles.checkboxText}>Remember me</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                            {isSubmitting ? (
                                <>
                                    Logging in
                                    <ButtonLoadingIcon />
                                </>
                            ) : (
                                <>
                                    Login
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path
                                            d="M4.16667 10H15.8333M15.8333 10L10 4.16667M15.8333 10L10 15.8333"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </>
                            )}
                        </button>

                        {/* Footer Links */}
                        <div className={styles.footer}>
                            <span className={styles.footerText}>Forgot password?</span>
                            <Link href="/forgotPassword" className={styles.footerLink}>
                                Reset here
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
