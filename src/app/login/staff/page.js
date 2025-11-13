"use client";

import logo from "@/assets/images/logo.png";
import { auth } from "@/lib/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { setUserData } from "@/redux/reducers/user";
import {
  OAuthProvider,
  signInWithPopup
} from "firebase/auth";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./styles/styles.module.css";

const StaffLogin = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const provider = new OAuthProvider("microsoft.com");

  // Add required scopes for Microsoft
  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope("profile");

  provider.setCustomParameters({
    prompt: "select_account"
  });

  const signIn = () => {
    console.log("=== SIGN IN CLICKED ===");

    console.log("Firebase Auth object:", auth);

    signInWithPopup(auth, provider)
      .then(async (result) => {
        console.log("=== POPUP SUCCESS ===");
        console.log("Full result object:", result);

        // Check if result.user is null
        if (!result.user) {
          console.error("❌ result.user is NULL — Firebase did NOT create/sign in a user");
        } else {
          console.log("✔ result.user UID:", result.user.uid);
          console.log("✔ result.user email:", result.user.email);
        }

        console.log("=== ADDITIONAL USER INFO ===");
        console.log(result.additionalUserInfo);

        console.log("=== MICROSOFT PROFILE ===");
        console.log(result.additionalUserInfo?.profile);

        const profile = result.additionalUserInfo?.profile;

        console.log("🔍 PROFILE EMAIL:", profile?.mail);
        console.log("🔍 PROFILE USER PRINCIPAL NAME:", profile?.userPrincipalName);
        console.log("🔍 PROFILE DISPLAY NAME:", profile?.displayName);

        // Credential data
        const credential = OAuthProvider.credentialFromResult(result);
        console.log("=== OAUTH CREDENTIAL ===", credential);

        if (!credential) {
          console.error("❌ Credential is NULL — Firebase could not parse Azure/MS identity");
        }

        console.log("Microsoft Access Token:", credential?.accessToken);
        console.log("Microsoft ID Token:", credential?.idToken);

        // Check auth.currentUser before calling getIdToken
        console.log("=== CHECK auth.currentUser BEFORE TOKEN ===");
        console.log("auth.currentUser:", auth.currentUser);

        if (!auth.currentUser) {
          console.error(
            "❌ auth.currentUser is NULL — Firebase DID NOT sign the user in even though OAuth succeeded"
          );
        }

        // Try getting Firebase ID token
        try {
          console.log("=== FETCHING FIREBASE ID TOKEN ===");

          const firebaseToken = await result.user?.getIdToken(true);

          console.log("✔ Firebase ID Token:", firebaseToken);

          // Call backend
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`,
            {
              method: "PUT",
              headers: {
                token: firebaseToken,
              },
              credentials: "include",
            }
          );

          const res = await response.json();
          console.log("=== BACKEND RESPONSE ===", res);

          if (res.status === "OK") {
            console.log("✔ Backend verified user:", res.data.user);
            dispatch(setUserData({ user: res.data.user }));
            router.push("/staff/approvals");
          } else {
            console.error("❌ Backend rejected token:", res);
          }
        } catch (tokenError) {
          console.error("❌ ERROR GETTING FIREBASE ID TOKEN:", tokenError);
        }
      })
      .catch((error) => {
        console.error("=== SIGN-IN POPUP ERROR ===", error);

        // More detailed error logging
        console.log("🔥 Error code:", error.code);
        console.log("🔥 Error message:", error.message);
        console.log("🔥 Error email:", error.customData?.email);
        console.log("🔥 Error credential:", error.credential);
      });
  };

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

        <button onClick={signIn}>Login</button>
      </div>
    </div>
  );
};

export default StaffLogin;
