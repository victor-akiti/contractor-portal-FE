'use client'

import Image from "next/image"
import styles from "./styles/styles.module.css"
import logo from "../../../../assets/images/logo.png"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getProtected } from "@/requests/get"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import { postProtected } from "@/requests/post"
import { useAppSelector } from "@/redux/hooks"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import SuccessMessage from "@/components/successMessage"

const RegisterNewPortalAdmin = () => {
    const params = useParams()
    const [hashValid, setHashValid] = useState(null)
    const [registrationDetails, setRegistrationDetails] = useState({
        fname: "",
        lname: "",
        email: "",
        password: "",
        passwordConfirm: "",
        acceptedTerms : false,
        hash: params.hash,
        acceptedNDPR: false
    })
    const [errorMessage, setErrorMessage] = useState("")
    const [creatingAccount, setCreatingAccount] = useState(false)
    const [createdAccount, setCreatedAccount] = useState(false)
    const passwordRegex = /^(?=.*\d)(?=.*[#$@!%&*?_])[A-Za-z\d#$@!%&*?_]{8,}$/
    const [showAcceptNDPRModal, setShowAcceptNDPRModal] = useState(false)
    const reduxState = useAppSelector(state => state)

    console.log({reduxState});
    

    

    useEffect(() => {
        console.log({params});
        validateHash()
    }, [params])

    const validateHash = async () => {
        try {
            const validateHashRequest = await getProtected(`auth/register/validate/${params.inviteHash}`)

            if (validateHashRequest.status === "OK") {
                let tempRegistrationDetails = {...registrationDetails}
                tempRegistrationDetails = validateHashRequest.data
                setRegistrationDetails(tempRegistrationDetails)
                setHashValid(true)
            } else {
                setErrorMessage(validateHashRequest.error.message)
                setHashValid(false)
            }
        } catch (error) {
            console.log({error});
        }
    }

    const updateTermsAcceptance = newValue => {
        console.log({newValue});
        let tempRegistrationDetails = {...registrationDetails}
        tempRegistrationDetails.acceptedTerms = newValue
        setRegistrationDetails(tempRegistrationDetails)

        updateRegistrationDetails("acceptedTerms", newValue)
    }

    const updateRegistrationDetails = (field: any, value: any) => {
        console.log({field, value});
        if (field) {
            let tempRegistrationDetails = {...registrationDetails}
            tempRegistrationDetails[field] = value
            setRegistrationDetails(tempRegistrationDetails)
        }
    }

    const validateForm = () => {
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
        console.log({registrationDetails});
        
        try {
            setCreatingAccount(true)
            const createNewAccountRequest = await postProtected("auth/newPortalAdmin/register", registrationDetails)

            console.log({createNewAccountRequest});
            

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
            console.log({error});
            
        }
    }

    console.log({registrationDetails});

    return (
        <div className={styles.register}>

           
            
            <Image src={logo} alt="logo" width={100} height={100} style={{width: "70px", height: "90px", marginBottom: "1.5rem"}} />

            <h3>Amni Contractor Registration Portal</h3>

            

            <div >
                <h4>Register</h4>

                {
                    showAcceptNDPRModal && <Modal>
                        <div className={styles.ndprModal}>
                            <h3>Accept NDPR</h3>

                            <p>By proceeding with this registration, you agree with our NDPR policy.</p>

                            <div>
                                <button onClick={() => setShowAcceptNDPRModal(false)} disabled={creatingAccount}>Cancel</button>
                                <button onClick={() => createNewAccount()} disabled={creatingAccount}>{`${creatingAccount ? `Creating account` : `Accept and Continue`}`} {creatingAccount && <ButtonLoadingIcon />}</button>
                            </div>
                        </div>
                    </Modal>
                }
                {
                    hashValid === null &&  <Loading message={""} />
                }

               

                {
                    errorMessage && <ErrorText text={errorMessage}/>
                }

                {
                    hashValid && !createdAccount && <form onSubmit={(event) => {
                        event.preventDefault()
                        validateForm()
                    }} onChange={(event: any) => updateRegistrationDetails(event.target.name, event.target.value)}>
                    <div className={styles.names}>
                        <input  value={registrationDetails.fname} placeholder="First Name" name="fname" />
                        <input  value={registrationDetails.lname} placeholder="Last Name" name="lname" />
                    </div>

                    <input className={styles.disabled} disabled value={registrationDetails.email} />

                    <input disabled={creatingAccount}  type="password" placeholder="Password" name="password" defaultValue={registrationDetails.password} />

                    <input disabled={creatingAccount} type="password" placeholder="Repeat password" name="passwordConfirm" defaultValue={registrationDetails.passwordConfirm} />

                    <div className={styles.acceptTermsDiv}>
                        <input disabled={creatingAccount} type="checkbox" onChange={(event) => updateTermsAcceptance(event.target.checked)} />
                        <label>Accept our <Link href={"/"}>terms and conditions</Link></label>
                    </div>

                    <button disabled={creatingAccount}>Sign Up</button>

                    <p className={styles.hasAccount}>Already signed up? <Link href={"/login"}>Login here</Link></p>
                </form>
                }

                {
                    createdAccount && <div className={styles.accountCreationSuccessDiv}>
                        <SuccessMessage message={"Your contractor portal account has been created successfully."} />
                        <p>You can now <Link href={"/login"}>Login</Link></p>
                    </div>
                }
            </div>
        </div>
    )
}

export default RegisterNewPortalAdmin