'use client'
import logo from "@/assets/images/logo.png"
import styles from "./styles/styles.module.css"
import Image from "next/image"
import {faCaretDown, faUserCircle} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getProtected } from "@/requests/get"

const Layout = ({children}) => {
    const [authenticated, setAuthenticated] = useState(false)
    useEffect(() => {
        getCurrentAuthState()
      }, [])
    
      const router = useRouter()
    
      const getCurrentAuthState = async () => {
        try {
          const currentAuthState = await getProtected("auth/current-auth-state")
    
          if (currentAuthState.status === "Failed") {
            router.push("/login")
          } else {
            if (currentAuthState.data.role !== "User") {
              router.push("/staff/approvals")
            } else {
              setAuthenticated(true)
            }
          }
    
          
          
        } catch (error) {
          console.log({error});
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