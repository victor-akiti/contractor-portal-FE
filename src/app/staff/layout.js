'use client'
<<<<<<< HEAD
import logo from "@/assets/images/logo.png";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import Modal from "@/components/modal";
import useFirebaseReady from "@/hooks/useFirebaseReady";
import { setUserData } from "@/redux/reducers/user";
import { getProtected } from "@/requests/get";
import { postProtected } from "@/requests/post";
import { faCaretDown, faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./styles/styles.module.css";
=======
import logo from "@/assets/images/logo.png"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import Modal from "@/components/modal"
// import { useGetCurrentAuthStateQuery } from "@/redux/apis/staffApi"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import { setUserData } from "@/redux/reducers/user"
import { postProtected } from "@/requests/post"
import { faBars, faCaretDown, faTimes, faUserCircle } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import styles from "./styles/styles.module.css"

/**
 * Staff Portal Layout with Collapsible Sidebar
 * 
 * Features:
 * - RTK Query for auth state
 * - Collapsible sidebar (desktop)
 * - Mobile-responsive hamburger menu
 * - Out of office modal
 * - User dropdown menu
 * - Active link highlighting
 */

// Types
// interface User {
//   _id?: string
//   name?: string
//   email?: string
//   role?: string
//   outOfOffice?: boolean
// }

// interface MenuItem {
//   href: string
//   label: string
//   adminOnly?: boolean
// }
>>>>>>> 6bf6fa9 (feat: app refactor and update styling and implement rtk query)

// Constants
const ADMIN_ROLES = ["Admin", "HOD"]

const MENU_ITEMS = [
  { href: "/staff/approvals", label: "Registration Approvals" },
  { href: "/staff/invites", label: "Registration Invites" },
  { href: "/staff/jobCategories", label: "Job Categories" },
  { href: "/staff/events", label: "Events" },
  { href: "/staff/forms", label: "Forms", adminOnly: true },
  { href: "/staff/userManagement", label: "Roles & User Management", adminOnly: true },
  { href: "/staff/settings", label: "Account Settings" },
]

// interface LayoutProps {
//   children: React.ReactNode
// }

const Layout = ({ children }) => {
  // State
  const [authenticated, setAuthenticated] = useState(false)
  const [updatingOutOfOffice, setUpdatingOutOfOffice] = useState(false)
  const [showFloatingUserMenu, setShowFloatingUserMenu] = useState(false)
  const [showOutOfOfficeModal, setShowOutOfOfficeModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  
  // Hooks
  const user = useAppSelector((state) => state.user.user) //as User
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()

  // RTK Query
  // const { data: authData, isLoading: isCheckingAuth, error: authError } = useGetCurrentAuthStateQuery()

  // Memoized values
  const hasAdminPermissions = useMemo(() => {
    return user?.role ? ADMIN_ROLES.includes(user.role) : false
  }, [user?.role])

  const isActiveMenu = useCallback((menuLink) => {
    return menuLink === pathname
  }, [pathname])

  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => 
      !item.adminOnly || hasAdminPermissions
    )
  }, [hasAdminPermissions])

  // Effects
<<<<<<< HEAD
  const firebaseReady = useFirebaseReady()

  useEffect(() => {
    if (!firebaseReady) return                          // ← PREVENT EARLY CALL
    getCurrentAuthState()
  }, [firebaseReady]) 
=======
  // useEffect(() => {
  //   if (authData) {
  //     const status = authData.status?.toUpperCase()
      
  //     if (status === "OK" && authData.data) {
  //       dispatch(setUserData({ user: authData.data }))
        
  //       if (authData.data.role === "Vendor") {
  //         router.push("/contractor/dashboard")
  //       } else {
  //         setAuthenticated(true)
          
  //         // Show out of office modal if user is OOO
  //         if (authData.data.outOfOffice) {
  //           setShowOutOfOfficeModal(true)
  //         }
  //       }
  //     } else {
  //       console.error('Auth state check failed, redirecting to login')
  //       router.push("/login/staff")
  //     }
  //   }
  // }, [authData, dispatch, router])

  // useEffect(() => {
  //   if (authError) {
  //     console.error('Auth error:', authError)
  //     router.push("/login/staff")
  //   }
  // }, [authError, router])
>>>>>>> 6bf6fa9 (feat: app refactor and update styling and implement rtk query)

  // Handlers
  const unsetOutOfOffice = useCallback(async () => {
    if (!user?.role) return
    
    setUpdatingOutOfOffice(true)
    try {
      const unsetOutOfOfficeRequest = await postProtected(
        "user/outOfOffice/unset", 
        {}, 
        user.role
      )
      
      const status = unsetOutOfOfficeRequest.status?.toUpperCase()
      
      if (status === "OK") {
        // Update user data locally
        dispatch(setUserData({ 
          user: { ...user, outOfOffice: false } 
        }))
        setShowOutOfOfficeModal(false)
      }
    } catch (error) {
      console.error({ error })
    } finally {
      setUpdatingOutOfOffice(false)
    }
  }, [user, dispatch])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => !prev)
  }, [])

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false)
  }, [])

  const toggleShowFloatingUserMenu = useCallback(() => {
    setShowFloatingUserMenu(prev => !prev)
  }, [])

  const logUserOut = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        router.push("/login/staff")
      }
    } catch (error) {
      console.error({ error })
    }
  }, [router])

  const handleCloseOutOfOfficeModal = useCallback(() => {
    setShowOutOfOfficeModal(false)
  }, [])

  // Render helpers
  const renderOutOfOfficeModal = () => (
    <Modal>
      <div className={styles.outOfOfficeDiv}>
        <h3>Out of Office</h3>
        <p>You are currently out-of-office. Set your account back to in office?</p>
        <div className={styles.outOfOfficeActionButtons}>
          <button onClick={handleCloseOutOfOfficeModal} disabled={updatingOutOfOffice}>
            Close
          </button>
          <button onClick={unsetOutOfOffice} disabled={updatingOutOfOffice}>
            Set as in office {updatingOutOfOffice && <ButtonLoadingIcon />}
          </button>
        </div>
      </div>
    </Modal>
  )

  const renderUserMenu = () => (
    <div className={styles.floatingUserMenu}>
      <div className={styles.loggedInStatusDiv}>
        <p>Logged in as:</p>
        <span>{user?.name}</span>
      </div>

      <hr />

      <div className={styles.officeStatusDiv}>
        <p>Status:</p>
        <p className={user?.outOfOffice ? styles.outOfOfficeText : styles.inOfficeText}>
          {user?.outOfOffice ? "Out of Office" : "In Office"}
        </p>
        <Link href="/staff/settings">
          <button>Change</button>
        </Link>
      </div>

      <hr />

      <div className={styles.logoutActionDiv}>
        <p onClick={logUserOut}>Logout</p>
      </div>
    </div>
  )

  const renderNavigation = () => (
    <nav className={styles.nav}>
      <div className={styles.left}>
        {/* Mobile hamburger */}
        <button 
          className={styles.mobileMenuButton}
          onClick={toggleMobileSidebar}
          aria-label="Toggle mobile menu"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        {/* Desktop sidebar toggle */}
        <button 
          className={styles.sidebarToggle}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <FontAwesomeIcon icon={sidebarCollapsed ? faBars : faTimes} />
        </button>

        <Link href="/staff/approvals">
          <Image 
            src={logo} 
            width={30} 
            height={30} 
            style={{ width: "35px", height: "45px" }} 
            alt="logo" 
          />
          <span>Contractor Portal</span>
        </Link>
      </div>

      <div className={styles.right} onClick={toggleShowFloatingUserMenu}>
        <span>STAFF DASHBOARD</span>
        <FontAwesomeIcon 
          icon={faUserCircle} 
          style={{ width: "20px", color: "#ffffff80", marginRight: "10px" }} 
        />
        <FontAwesomeIcon 
          icon={faCaretDown} 
          style={{ width: "10px", color: "#ffffff80" }} 
        />
      </div>

      {showFloatingUserMenu && renderUserMenu()}
    </nav>
  )

  const renderSideMenu = () => (
    <div 
      className={`${styles.left} ${sidebarCollapsed ? styles.collapsed : ''} ${mobileSidebarOpen ? styles.mobileOpen : ''}`}
      data-sidebar="true"
    >
      {/* Mobile close button */}
      <button 
        className={styles.mobileCloseButton}
        onClick={closeMobileSidebar}
        aria-label="Close menu"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>

      {filteredMenuItems.map((item) => (
        <Link
          key={item.href}
          className={isActiveMenu(item.href) ? styles.active : undefined}
          href={item.href}
          onClick={closeMobileSidebar}
        >
          {item.label}
        </Link>
      ))}
      <hr />
    </div>
  )

  const renderContent = () => (
    <div className={`${styles.content} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      {renderSideMenu()}
      <div className={styles.right}>
        {children}
      </div>
    </div>
  )

  // Loading state
  // if (isCheckingAuth || !authenticated) {
  //   return null
  // }

  // Main render
  return (
    <div>
      <div className={styles.layout}>
        {showOutOfOfficeModal && renderOutOfOfficeModal()}
        {renderNavigation()}
        {renderContent()}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export default Layout