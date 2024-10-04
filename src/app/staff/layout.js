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
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setUserData } from "@/redux/reducers/user";

const Layout = ({children}) => {
    const [authenticated, setAuthenticated] = useState(false)
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

      const approveHoldRequest = async (id) => {
        try {
          const approveRequest = await getProtected(`forms/approve/${id}`)
          console.log({approveRequest})
        } catch (error) {
          console.log({error})
        }
      }

      const declineHoldRequest = async (id) => {
        try {
          const declineRequest = await getProtected(`forms/decline/${id}`)
          console.log({declineRequest})
        } catch (error) {
          console.log({error})
        }
      }
 return (
    <div>
        {
            authenticated && <div className={styles.layout}>
            <nav>
                <div className={styles.left}>
                    <Image src={logo} width={30} height={30} style={{width:"35px", height:"45px"}} alt="logo" />
                    <span>Contractor Portal</span>
                </div>
    
                <div className={styles.right}>
                    <span>STAFF DASHBOARD</span>
                    <FontAwesomeIcon icon={faUserCircle} style={{width: "20px", color: "#ffffff80", marginRight: "10px"}} />
                    <FontAwesomeIcon icon={faCaretDown} style={{width: "10px", color: "#ffffff80"}} />
                </div>
            </nav>
    
            <div className={styles.content}>
                    <div className={styles.left}>
                        <Link href={"/staff/approvals"}>Registration Approvals</Link>
    
                        <Link href={"/staff/invites"}>Registration Invites</Link>
                        
                        <Link href={"/staff/jobCategories"}>Job Categories</Link>
                        
                        <Link href={"/staff/events"}>Events</Link>
    
                        <Link href={"/staff/forms"}>Forms</Link>
    
                        <Link href={"/staff/userManagement"}>Roles & User Management</Link>

                        <Link href={"/staff/invoice-forms"}>Invoice Forms</Link>
    
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