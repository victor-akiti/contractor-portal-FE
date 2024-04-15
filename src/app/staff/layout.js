import Image from "next/image";
import styles from "./styles/styles.module.css"
import logo from "@/assets/images/logo.png"
// import {faUserCircle} from "@fortawesome/free-regular-svg-icons"
import {faCaretDown, faUserCircle} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

const Layout = ({children}) => {
 return (
    <div className={styles.layout}>
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
                    
                    <Link href={"/staff/tasks"}>Admin Tasks</Link>
                    
                    <Link href={"/staff/events"}>Events</Link>

                    <Link href={"/staff/forms"}>Forms</Link>

                    <Link href={"/staff/permissions"}>Roles and Permissions</Link>

                    <hr />

                    <Link href={"/staff/search"}>Advanced Search</Link>
                </div>

                <div className={styles.right}>
                    {children}
                </div>
            </div>

       
    </div>
 )
}

export default Layout