"use client";

import logo from "@/assets/images/logo.png";
import { auth } from "@/lib/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { setUserData } from "@/redux/reducers/user";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./styles/styles.module.css";

const StaffLogin = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const provider = new OAuthProvider("microsoft.com");

  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope("profile");

  provider.setCustomParameters({
    prompt: "select_account"
  });

  const signIn = () => {
    signInWithPopup(auth, provider)
      .then(async (result) => {
        if (!result.user) {
          console.error("Sign-in succeeded, but Firebase returned no user");
          return;
        }

        const credential = OAuthProvider.credentialFromResult(result);
        if (!credential) {
          console.error("OAuth credential missing from Azure/Microsoft provider");
          return;
        }

        try {
          const firebaseToken = await result.user.getIdToken(true);

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`,
            {
              method: "PUT",
              headers: { token: firebaseToken },
              credentials: "include"
            }
          );

          const res = await response.json();

          if (res.status === "OK") {
            dispatch(setUserData({ user: res.data.user }));
            router.push("/staff/approvals");
          } else {
            console.error("Backend rejected token:", res);
          }
        } catch (tokenError) {
          console.error("Error retrieving Firebase ID token:", tokenError);
        }
      })
      .catch((error) => {
        console.error("Microsoft sign-in failed:", error);
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
