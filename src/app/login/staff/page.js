"use client";

import logo from "@/assets/images/logo.png";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import { auth } from "@/lib/firebase";
import { useVerifyStaffTokenMutation } from "@/redux/apis/authApi";
import { useAppDispatch } from "@/redux/hooks";
import { setUserData } from "@/redux/reducers/user";

import { getIdToken, OAuthProvider, signInWithPopup } from "firebase/auth";

import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./styles/styles.module.css";

/**
 * STAFF LOGIN (RTK QUERY VERSION)
 * - Microsoft OAuth authentication via Firebase
 * - Backend verification using RTK mutation
 * - Cookie auth maintained by backend
 * - Elegant, responsive design matching login screen
 * - 100% backward-compatible with existing functionality
 */
const StaffLogin = () => {
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const dispatch = useAppDispatch();

  // RTK Staff token verification
  const [verifyStaffToken, { isLoading }] = useVerifyStaffTokenMutation();

  // Configure Microsoft OAuth provider
  const provider = new OAuthProvider("microsoft.com");
  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope("profile");
  // provider.setCustomParameters({ prompt: "select_account" });

  /**
   * Handle Microsoft sign-in with Firebase and backend verification
   */
  const signIn = async () => {
    setErrorMessage("");

    try {
      // 1) Microsoft sign-in via Firebase popup
      const result = await signInWithPopup(auth, provider);

      if (!result.user) {
        throw new Error("Sign-in succeeded but Firebase returned no user.");
      }

      const user = result.user;

      // 2) FORCE REMOVE EMAIL/PASSWORD PROVIDER IF IT EXISTS
      const providers = user.providerData.map((p) => p.providerId);
      console.log({ providers });

      if (providers.includes("password")) {
        try {
          await user.unlink("password");
          // console.log("🔥 Removed email/password provider for:", user.email);
        } catch (unlinkError) {
          console.warn("Could not unlink password provider:", unlinkError);
        }
      }

      // 3) Get Firebase Identity Token
      const firebaseToken = await getIdToken(user);

      // 4) Verify token with backend (sets cookie)
      const verificationResult = await verifyStaffToken({
        token: firebaseToken,
      }).unwrap();

      if (verificationResult.status === "OK") {
        dispatch(setUserData({ user: verificationResult.data.user }));
        router.push("/staff/approvals");
      } else {
        setErrorMessage(verificationResult.error?.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Sign in error:", error);

      let message = "Sign in failed.";

      if (error?.data?.error?.message) {
        message = error.data.error.message;
      } else if (error?.message) {
        message = error.message;
      } else if (error?.code) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
            message = "Sign-in popup was closed";
            break;
          case "auth/network-request-failed":
            message = "Network error. Check your connection.";
            break;
          case "auth/unauthorized-domain":
            message = "This domain is not authorized for OAuth";
            break;
          default:
            message = error.code;
        }
      }

      setErrorMessage(message);
    }
  };

  return (
    <>
      <Head>
        <title>Staff Login - Amni Contractor Portal</title>
      </Head>

      <div className={styles.staffLoginContainer}>
        <div className={styles.staffLoginCard}>
          {/* Logo and Header */}
          <div className={styles.staffLoginHeader}>
            <Image src={logo} alt="Amni Logo" width={70} height={90} className={styles.logo} />
            <h3 className={styles.platformTitle}>Amni Contractor Registration Portal</h3>
          </div>

          {/* Main Content */}
          <div className={styles.staffLoginContent}>
            <h4 className={styles.staffTitle}>Staff Login</h4>
            <p className={styles.staffSubtitle}>
              Please log in with your Amni corporate email credentials
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>{errorMessage}</div>
              </div>
            )}

            {/* Login Button */}
            <button onClick={signIn} disabled={isLoading} className={styles.loginButton}>
              {isLoading ? (
                <>
                  Signing in
                  <ButtonLoadingIcon />
                </>
              ) : (
                <>
                  Login with Microsoft
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.5 2H2V9.5H9.5V2Z" fill="currentColor" fillOpacity="0.9" />
                    <path d="M18 2H10.5V9.5H18V2Z" fill="currentColor" fillOpacity="0.9" />
                    <path d="M9.5 10.5H2V18H9.5V10.5Z" fill="currentColor" fillOpacity="0.9" />
                    <path d="M18 10.5H10.5V18H18V10.5Z" fill="currentColor" fillOpacity="0.9" />
                  </svg>
                </>
              )}
            </button>

            {/* Info Section */}
            <div className={styles.infoSection}>
              <div className={styles.infoCard}>
                <div className={styles.infoIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 14V10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 6H10.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className={styles.infoText}>
                  Please ensure you are using your Amni corporate email address.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffLogin;
