"use client";

import logo from "@/assets/images/logo.png";
import { auth } from '@/lib/firebase';
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
 
  const provider = new OAuthProvider("microsoft.com");
  const router = useRouter();
  const dispatch = useAppDispatch();

  // const auth = getAuth();
  const signIn = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        // User is signed in.
        // IdP data available in result.additionalUserInfo.profile.
        

        // Get the OAuth access token and ID Token
        const credential = OAuthProvider.credentialFromResult(result);
        
        const accessToken = credential.accessToken;
        const idToken = credential.idToken;

        auth.currentUser
          .getIdToken()
          .then((result) => {
            
            
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`, {
              method: "PUT",
              headers: {
                token: result,
              },
              credentials: "include",
            }).then(async (response) => {
              const res = await response.json();

              

              if (res.status === "OK") {
                dispatch(setUserData({ user: res.data.user }));
                goToApprovals();
              }
            }).catch((innerError) => {
              
              
            })
          })
          .catch((error) => {
            console.error({ error });
          });

        

        
      })
      .catch((error) => {
        // Handle error.
      });
  };

  const goToApprovals = () => {
    router.push("/staff/approvals");
  };

  const goToDashboard = () => {
    router.push("/staff/dashboard");
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

        <button
          onClick={() => {
            signIn();
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default StaffLogin;
