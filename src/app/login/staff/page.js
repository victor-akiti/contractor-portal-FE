'use client'

import Head from "next/head"
import styles from "./styles/styles.module.css"
import logo from "@/assets/images/logo.png"
import Image from "next/image"
import {initializeApp} from "firebase/app"
import {OAuthProvider, getAuth, signInWithPopup, getIdToken, getIdTokenResult} from "firebase/auth"
import { useRouter } from "next/navigation"

const StaffLogin = () => {
  const firebaseConfig = {
    apiKey: 'AIzaSyC0ZtnjPzHg6ieIeTYTuqwMiSgofrgulHw',
    authDomain: 'amni-contractors.firebaseapp.com',
    databaseURL: 'https://amni-contractors.firebaseio.com',
    projectId: 'amni-contractors',
    storageBucket: 'amni-contractors.appspot.com',
    messagingSenderId: '754512756573',
    appId: '1:754512756573:web:d5c79ebeca11ea64',
  };
    
    const app = initializeApp(firebaseConfig);
    const provider = new OAuthProvider('microsoft.com');
    const router = useRouter()

    const auth = getAuth();
    const signIn = () => {
      signInWithPopup(auth, provider)
      .then((result) => {
        // User is signed in.
        // IdP data available in result.additionalUserInfo.profile.

        

        // Get the OAuth access token and ID Token
        const credential = OAuthProvider.credentialFromResult(result);
        console.log({credential});
        const accessToken = credential.accessToken;
        const idToken = credential.idToken;

        auth.currentUser.getIdToken().then((result) => {
          fetch('http://localhost:8080/user/ver', {
        method: 'PUT',
        headers: {
          'token': result,
        },
        credentials: 'include',
      }).then(async (respone) => {
        const res = await respone.json();
        goToApprovals()
        console.log({ res });
      });

        }).catch((error) => {
          console.log({error});
        })

        
        console.log({idToken});

        console.log({result});


      })
      .catch((error) => {
        // Handle error.
    });
    }

    const goToApprovals = () => {
      router.push("/staff/approvals")
    }

    return (
        <div className={styles.staffLogin}>
            

            <Head>
                <title>Staff Login</title>
            </Head>

            <div className={styles.staffLoginContent}>
                <Image src={logo} alt="Logo" width={100} height={127} style={{marginTop: "24px"}} />

                <h4>Amni&#39;s Contractor Registration Portal</h4>

                <h5>Staff Login</h5>

                <h6>Please log in with your Amni corporate email credentials.</h6>

                <button onClick={() => {
                  signIn()
                }}>Login</button>
            </div>
        </div>
    )
}

export default StaffLogin