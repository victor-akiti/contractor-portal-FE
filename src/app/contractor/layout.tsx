'use client'
import logo from "@/assets/images/logo.png"
import useFirebaseReady from "@/hooks/useFirebaseReady"
import { setUserData } from "@/redux/reducers/user"
import { getProtected } from "@/requests/get"
import { faCaretDown, faEnvelope, faUserCircle } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

const Layout = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false)
  const [showFloatingUserMenu, setShowFloatingUserMenu] = useState(false)
  const user = useSelector((state: any) => state.user.user)
  const dispatch = useDispatch()
  const firebaseReady = useFirebaseReady()

  useEffect(() => {
    if (!firebaseReady) return                          // ← PREVENT EARLY CALL
    getCurrentAuthState()
  }, [firebaseReady])

  const router = useRouter()

  const getCurrentAuthState = async () => {
    try {
      const currentAuthState = await getProtected("auth/current-auth-state")

      if (!currentAuthState || currentAuthState.status === "Failed") {
        router.push("/login")
      } else {
        if (currentAuthState.data.role !== "Vendor") {
          router.push("/staff/approvals")
        } else {
          //@ts-ignore
          dispatch(setUserData({ user: currentAuthState.data }))
          setAuthenticated(true)
        }
      }



    } catch (error) {
      console.error({ error });
    }
  }

  const toggleFloatingUserMenu = () => {
    setShowFloatingUserMenu(!showFloatingUserMenu)
  }



  const logUserOut = async () => {
    try {
      const logUserOutRequest = await getProtected(`auth/logout`)
      if (logUserOutRequest.status === "OK") {
        router.push("/login/")
      }
    } catch (error) {
      console.error({ error });
    }
  }
  return (
    <div>
      {
        authenticated && <div className={styles.layout}>

          <nav>
            <div className={styles.left}>
              <Link href={"/"}>
                <div>
                  <Image src={logo} width={30} height={30} style={{ width: "35px", height: "45px" }} alt="logo" />
                  <span>Contractor Portal</span>
                </div>
              </Link>
            </div>

            <div className={styles.right}>
              <span>DASHBOARD</span>

              <Link href="/contractor/messages"><FontAwesomeIcon icon={faEnvelope} style={{ width: "20px", color: "#ffffff80", marginRight: "10px" }} /></Link>

              <span onClick={() => toggleFloatingUserMenu()}>
                <FontAwesomeIcon icon={faUserCircle} style={{ width: "20px", color: "#ffffff80", marginRight: "10px" }} />
                <FontAwesomeIcon icon={faCaretDown} style={{ width: "10px", color: "#ffffff80" }} />
              </span>
            </div>

            {
              showFloatingUserMenu && <div className={styles.floatingUserMenu}>

                <div className={styles.loggedInStatusDiv}>
                  <p>Logged in as:</p>
                  <span>{user.name}</span>
                </div>

                <hr />

                {/* <div className={styles.officeStatusDiv}>
                    <Link href={`/contractor/settings`}><p>Settings</p></Link>
                  </div> */}

                {/* <hr /> */}

                <div className={styles.logoutActionDiv}>
                  <p onClick={() => logUserOut()}>Logout</p>
                </div>

              </div>
            }
          </nav>

          <div className={styles.content}>
            {children}
          </div>

          <footer>
            <small>
              ©Copyright 2024 Amni International Petroleum Development Company. Please ensure to read the
              <Link href={"/"}> Terms & Conditions</Link>  for
              using this application.
            </small>
          </footer>

        </div>
      }
    </div>
  )
}

export default Layout