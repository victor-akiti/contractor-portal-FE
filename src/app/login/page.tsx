'use client'
import Image from "next/image"
import styles from "./styles/styles.module.css"
import logo from "@/assets/images/logo.png"
import { useEffect, useState } from "react"
import ErrorText from "@/components/errorText"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import { postProtected } from "@/requests/post"
import { useAppDispatch } from "@/redux/hooks"
import { setUserData } from "@/redux/reducers/user"
import { useRouter } from "next/navigation"
import Link from "next/link"

const Login = () => {
    const [loginDetails, setLoginDetails] = useState({
        email: "",
        password: ""
    })
    const [errorText, setErrorText] = useState("")
    const [loggingIn, setLoggingIn] = useState(false)
    const router = useRouter()
    const dispatch = useAppDispatch()
 
   
    

    console.log({loginDetails});

    useEffect(() => {
        console.log({env: process.env.NEXT_PUBLIC_BACKEND_URL});
    }, [process.env])

    const updateLoginDetails = ({field, value} : {field: any, value: any}) => {
        console.log({field, value});
        let tempLoginDetals = {...loginDetails}
        tempLoginDetals[field] = value
        setLoginDetails(tempLoginDetals)
    }

    const validateLoginDetails = () => {
        if (!loginDetails.email) {
            setErrorText("Please enter your email address")
        } else if (!loginDetails.password) {
            setErrorText("Please enter your password")
        } else {
            setErrorText("")
            logUserInWithEmailAndPassword()
        }
    }

    const logUserInWithEmailAndPassword = async () => {
        try {
            setLoggingIn(true)
            const loginRequest = await postProtected("auth/login", {loginDetails})

            if (loginRequest.status === "OK") {
                console.log({loginRequestUser: loginRequest.data.user});
                //@ts-ignore
                dispatch(setUserData({ user: loginRequest.data.user }));
                router.push("contractor/dashboard")
            } else {
                setErrorText(loginRequest.error.message)
                setLoggingIn(false)
            }

        } catch (error) {
            console.log({error});
        }
    }

    return (
        <div className={styles.login}>
            <div>
                <Image src={logo} alt="logo" width={70} height={89} style={{marginBottom: "1.5rem"}}/>

                <h5>Amni&#39;s Contractor Registration Portal Page.</h5>

                <div className={styles.content}>
                    <h3>Log In</h3>

                    {
                        errorText && <ErrorText text={errorText}/>

                    }
                    <form onSubmit={event => {
                        event.preventDefault()
                        validateLoginDetails()
                    }} onChange={(event: any) => updateLoginDetails({field: event.target.name, value: event.target.value})}>
                        <input placeholder="Email" name="email" />
                        <input placeholder="Password" name="password" type="password"/>

                        <div>
                            <div>
                                <input type="checkbox" name="rememberMe" />
                                <label>Remember me</label>
                            </div>
                        </div>

                        <button>Login {loggingIn && <ButtonLoadingIcon />}</button>
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