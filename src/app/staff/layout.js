'use client'
import Image from "next/image";
import styles from "./styles/styles.module.css"
import logo from "@/assets/images/logo.png"
// import {faUserCircle} from "@fortawesome/free-regular-svg-icons"
import {faCaretDown, faUserCircle} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProtected } from "@/requests/get";
import { use, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "@/redux/reducers/user";
import Modal from "@/components/modal";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import { postProtected } from "@/requests/post";

const Layout = ({children}) => {
    const [authenticated, setAuthenticated] = useState(false)
    const user = useSelector((state) => state.user.user)
    const [updatingOutOfOffice, setUpdatingOutOfOffice] = useState(false)
    const [showFloatingUserMenu, setShowFloatingUserMenu] = useState(false)

    console.log({theUser: user})
    
    useEffect(() => {
        getCurrentAuthState()
      }, [])
    
      const router = useRouter()
      const dispatch = useDispatch()
    
      const getCurrentAuthState = async () => {
        try {
          const currentAuthState = await getProtected("auth/current-auth-state")
          dispatch(setUserData({user: currentAuthState.data}))
          

          console.log({currentAuthState});
          
    
          if (currentAuthState.status === "Failed") {
            router.push("/login")
          } else {
            if (currentAuthState.data.role === "User") {
              router.push("/contractor/dashboard")
            } else {
              setAuthenticated(true)
            }
          }
    
          
          
        } catch (error) {
          console.log({error});
        }
      }

      const hasAdminPermissions = (role) => {
        return (["Admin", "HOD"].includes(role))
      }

      const unsetOutOfOffice = async () => {
        setUpdatingOutOfOffice(true)
        try {
          const unsetOutOfOfficeRequest = await postProtected (`user/outOfOffice/unset`, {})
          if (unsetOutOfOfficeRequest.status === "OK") {
            getCurrentAuthState()
          }    
        } catch (error) {
          setUpdatingOutOfOffice(false) 
          console.log({error});
        } finally {
          
        }
      }

      const toggleShowFloatingUserMenu = () => {
        setShowFloatingUserMenu(!showFloatingUserMenu)
      }

      const logUserOut = async () => {
        try {
          const logUserOutRequest = await getProtected (`auth/logout`)
          if (logUserOutRequest.status === "OK") {
            router.push("/login/staff")
          }    
        } catch (error) {
          console.log({error});
        }
      }

      console.log({authenticated});
      

 return (
    <div>
        {
            authenticated && <div className={styles.layout}>
              {
                user.outOfOffice && <Modal>
                <div className={styles.outOfOfficeDiv}>
                  <h3>Out of Office</h3>

                  <p>You are currently out-of-office. Set your account back to in office?</p>

                  <div className={styles.outOfOfficeActionButtons}>
                    <button>Close</button>
                    <button onClick={() =>  unsetOutOfOffice()}>Set as in office {updatingOutOfOffice && <ButtonLoadingIcon />}</button>
                  </div>
                </div>
              </Modal>
              }
            <nav>
                <div className={styles.left}>
                    <Image src={logo} width={30} height={30} style={{width:"35px", height:"45px"}} alt="logo" />
                    <span>Contractor Portal</span>
                </div>
    
                <div className={styles.right} onClick={() => toggleShowFloatingUserMenu()}>
                    <span>STAFF DASHBOARD</span>
                    <FontAwesomeIcon icon={faUserCircle} style={{width: "20px", color: "#ffffff80", marginRight: "10px"}} />
                    <FontAwesomeIcon icon={faCaretDown} style={{width: "10px", color: "#ffffff80"}} />
                </div>

                {
                  showFloatingUserMenu && <div className={styles.floatingUserMenu}>

                  <div className={styles.loggedInStatusDiv}>
                    <p>Logged in as:</p>
                    <span>{user.name}</span>
                  </div>

                  <hr />

                  <div className={styles.officeStatusDiv}>
                    <p>Status:</p>
                    <p className={user.outOfOffice ? styles.outOfOfficeText : styles.inOfficeText}>{user.outOfOffice ? "Out of Office" : "In Office"}</p>

                    <Link href={"/staff/settings"}><button>Change</button></Link>
                  </div>

                  <hr />

                  <div className={styles.logoutActionDiv}>
                    <p onClick={() => logUserOut()}>Logout</p>
                  </div>

                </div>
                }
            </nav>
    
            <div className={styles.content}>
                    <div className={styles.left}>
                        <Link href={"/staff/approvals"}>Registration Approvals</Link>
    
                        <Link href={"/staff/invites"}>Registration Invites</Link>
                        
                        <Link href={"/staff/jobCategories"}>Job Categories</Link>
                        
                        <Link href={"/staff/events"}>Events</Link>
    
                        {
                          hasAdminPermissions(user?.role) && <Link href={"/staff/forms"}>Forms</Link>
                        }
    
                        {
                          hasAdminPermissions(user?.role) && <Link href={"/staff/userManagement"}>Roles & User Management</Link>
                        }

                        <Link href={"/staff/settings"}>Account Settings</Link>

                        {/* <Link href={"/staff/invoice-forms"}>Invoice Forms</Link> */}
    
                        <hr />
    
                        <Link href={"/staff/search"}>Advanced Search</Link>
                    </div>
    
                    <div className={styles.right}>
                        {children}
                    </div>
                </div>
    
           
        </div>
        }
    </div>
 )
}

export default Layout