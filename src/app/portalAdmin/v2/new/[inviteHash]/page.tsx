'use client'

// V2 contractor registration page.
//
// Email invite from /api/v2/invites/.../approve points here. The contractor
// admin lands on this page, sets a password, accepts terms, and creates a
// Firebase + UserModel account that's linked to their InviteV2's SubmissionV2.
//
// Endpoints:
//   GET  /api/v2/auth/register/validate/:hash  - pre-fill fname/lname/email
//   POST /api/v2/auth/register                 - create the account
//
// After success, the contractor follows the Login link and signs in like any
// Vendor; they'll land on the contractor dashboard which surfaces their V2
// application.

import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import ErrorText from "@/components/errorText"
import Loading from "@/components/loading"
import Modal from "@/components/modal"
import SuccessMessage from "@/components/successMessage"
import { BACKEND_BASE_URL } from "@/lib/config"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import logo from "../../../../../assets/images/logo.png"
import styles from "./styles/styles.module.css"

interface InvitePrefill {
    _id: string
    fname: string
    lname: string
    name: string
    email: string
    companyName: string
    groupName?: string | null
    phone?: any
    expiry?: string
}

const callPlain = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${BACKEND_BASE_URL}/${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    })
    if (!res.ok) {
        let message = `Request failed with status ${res.status}`
        try {
            const body = await res.json()
            message = body?.message || body?.error?.message || message
        } catch {
            /* ignore */
        }
        return { status: "FAILED", error: { message } }
    }
    return res.json()
}

const RegisterV2 = () => {
    const params = useParams<{ inviteHash: string }>()
    const hash = params?.inviteHash

    const [hashValid, setHashValid] = useState<boolean | null>(null)
    const [invite, setInvite] = useState<InvitePrefill | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [fname, setFname] = useState("")
    const [lname, setLname] = useState("")
    const [password, setPassword] = useState("")
    const [passwordConfirm, setPasswordConfirm] = useState("")
    const [phone, setPhone] = useState("")
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [creatingAccount, setCreatingAccount] = useState(false)
    const [createdAccount, setCreatedAccount] = useState(false)
    const [showAcceptNDPRModal, setShowAcceptNDPRModal] = useState(false)

    // Same regex as legacy register flow: 8+ chars, ≥1 digit, ≥1 special.
    const passwordRegex = /^(?=.*\d)(?=.*[#$@!%&*?_])[A-Za-z\d#$@!%&*?_]{8,}$/

    useEffect(() => {
        if (hash) validateHash()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hash])

    const validateHash = async () => {
        try {
            const result = await callPlain(`api/v2/auth/register/validate/${hash}`)
            if (result?.status === "OK") {
                const inv = result.data.invite as InvitePrefill
                setInvite(inv)
                setFname(inv.fname || "")
                setLname(inv.lname || "")
                setPhone(inv.phone?.number || inv.phone || "")
                setHashValid(true)
            } else {
                setErrorMessage(result?.error?.message || "Could not validate this invite link.")
                setHashValid(false)
            }
        } catch (e: any) {
            setErrorMessage(e?.message || "Could not reach the server.")
            setHashValid(false)
        }
    }

    const validateForm = () => {
        setErrorMessage("")
        if (!fname.trim() || !lname.trim()) {
            setErrorMessage("First name and last name are required.")
            return
        }
        if (!password) {
            setErrorMessage("Choose a password.")
            return
        }
        if (!passwordRegex.test(password)) {
            setErrorMessage(
                "Password must be at least 8 characters and include a digit and a special character (#$@!%&*?_).",
            )
            return
        }
        if (password !== passwordConfirm) {
            setErrorMessage("Passwords do not match.")
            return
        }
        if (!acceptedTerms) {
            setErrorMessage("Please accept the terms before continuing.")
            return
        }
        setShowAcceptNDPRModal(true)
    }

    const createAccount = async () => {
        try {
            setCreatingAccount(true)
            setErrorMessage("")
            const result = await callPlain("api/v2/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    hash,
                    password,
                    passwordConfirm,
                    phone: phone.trim(),
                }),
            })
            if (result?.status === "OK") {
                setCreatedAccount(true)
                setShowAcceptNDPRModal(false)
            } else {
                setErrorMessage(result?.error?.message || "Could not create your account.")
                setShowAcceptNDPRModal(false)
            }
        } catch (e: any) {
            setErrorMessage(e?.message || "Unexpected error.")
            setShowAcceptNDPRModal(false)
        } finally {
            setCreatingAccount(false)
        }
    }

    return (
        <div className={styles.register}>
            <Image
                src={logo}
                alt="logo"
                width={100}
                height={100}
                style={{ width: "70px", height: "90px", marginBottom: "1.5rem" }}
            />

            <h3>Amni Contractor Registration Portal</h3>

            <div>
                <h4>Register</h4>

                {showAcceptNDPRModal && (
                    <Modal>
                        <div className={styles.ndprModal}>
                            <h3>Accept NDPR</h3>
                            <p>By proceeding with this registration, you agree with our NDPR policy.</p>
                            <div>
                                <button
                                    onClick={() => setShowAcceptNDPRModal(false)}
                                    disabled={creatingAccount}
                                >
                                    Cancel
                                </button>
                                <button onClick={createAccount} disabled={creatingAccount}>
                                    {creatingAccount ? "Creating account" : "Accept and Continue"}
                                    {creatingAccount && <ButtonLoadingIcon />}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {hashValid === null && <Loading message="" />}

                {errorMessage && <ErrorText text={errorMessage} />}

                {hashValid && !createdAccount && invite && (
                    <>
                        <p className={styles.companyHint}>
                            You're registering as the contractor admin for{" "}
                            <strong>{invite.companyName}</strong>.
                        </p>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault()
                                validateForm()
                            }}
                        >
                            <div className={styles.names}>
                                <input
                                    value={fname}
                                    placeholder="First Name"
                                    onChange={(e) => setFname(e.target.value)}
                                    disabled={creatingAccount}
                                />
                                <input
                                    value={lname}
                                    placeholder="Last Name"
                                    onChange={(e) => setLname(e.target.value)}
                                    disabled={creatingAccount}
                                />
                            </div>

                            <input className={styles.disabled} disabled value={invite.email} />

                            <input
                                value={phone}
                                placeholder="Phone (optional)"
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={creatingAccount}
                            />

                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={creatingAccount}
                            />

                            <input
                                type="password"
                                placeholder="Repeat password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                disabled={creatingAccount}
                            />

                            <div className={styles.rememberMeContainer}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        disabled={creatingAccount}
                                    />
                                    <span className={styles.checkboxText}>Accept our <Link href="/">terms and conditions</Link></span>

                                </label>
                            </div>

                            <button type="submit" disabled={creatingAccount}>
                                Sign Up
                            </button>

                            <p className={styles.hasAccount}>
                                Already signed up? <Link href="/login">Login here</Link>
                            </p>
                        </form>
                    </>
                )}

                {createdAccount && (
                    <div className={styles.accountCreationSuccessDiv}>
                        <SuccessMessage message="Your contractor portal account has been created successfully." />
                        <p>
                            You can now <Link href="/login">log in</Link>. Once you're in, your
                            application form will be waiting on your dashboard.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default RegisterV2
