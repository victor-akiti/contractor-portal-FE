"use client";

import logo from "@/assets/images/logo.png";
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
 * - Microsoft OAuth authentication
 * - Firebase Identity Token retrieval
 * - Backend verification using RTK mutation
 * - Cookie auth maintained by backend
 * - 100% backward-compatible with token expectations
 */
const StaffLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const dispatch = useAppDispatch();

  // RTK Staff token verification
  const [verifyStaffToken, { isLoading: isVerifying }] =
    useVerifyStaffTokenMutation();

  // Configure Microsoft OAuth provider
  const provider = new OAuthProvider("microsoft.com");
  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope("profile");
  provider.setCustomParameters({ prompt: "select_account" });

  /**
   * NEW — RTK Query sign-in flow
   */
  const signIn = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      // 1) Microsoft sign-in via Firebase popup
      const result = await signInWithPopup(auth, provider);

      if (!result.user) {
        throw new Error("Sign-in succeeded but Firebase returned no user.");
      }

      // 2) Get Firebase Identity Token
      const firebaseToken = await getIdToken(result.user);

      // 3) Verify token with backend (sets cookie)
      const verificationResult = await verifyStaffToken({
        token: firebaseToken,
      }).unwrap();

      if (verificationResult.status === "OK") {
        dispatch(setUserData({ user: verificationResult.data.user }));
        router.push("/staff/approvals");
      } else {
        setErrorMessage(
          verificationResult.error?.message || "Authentication failed"
        );
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
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || isVerifying;

  return (
    <div className={styles.staffLogin}>
      <Head>
        <title>Staff Login</title>
      </Head>

      <div className={styles.staffLoginContent}>
        <Image
          src={logo}
          alt="Logo"
          width={100}
          height={127}
          style={{ marginTop: "24px" }}
        />

        <h4>Amni&#39;s Contractor Registration Portal</h4>
        <h5>Staff Login</h5>
        <h6>Please log in with your Amni corporate email credentials.</h6>

        {errorMessage && (
          <div
            style={{
              backgroundColor: "rgb(205, 99, 99)",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              marginTop: "10px",
              marginBottom: "10px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          onClick={signIn}
          disabled={isProcessing}
          style={{
            opacity: isProcessing ? 0.6 : 1,
            cursor: isProcessing ? "not-allowed" : "pointer",
          }}
        >
          {isProcessing ? "Signing in..." : "Login"}
        </button>
      </div>
    </div>
  );
};

export default StaffLogin;
