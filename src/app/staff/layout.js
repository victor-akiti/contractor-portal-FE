'use client'
import logo from "@/assets/images/logo.png"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import Modal from "@/components/modal"
import useFirebaseReady from "@/hooks/useFirebaseReady"
import { setUserData } from "@/redux/reducers/user"
import { getProtected } from "@/requests/get"
import { postProtected } from "@/requests/post"

import {
  faBars,
  faCaretDown,
  faTimes,
  faUserCircle
} from "@fortawesome/free-solid-svg-icons"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

// -----------------------------------
// CONSTANTS
// -----------------------------------
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

// -----------------------------------
// LAYOUT COMPONENT
// -----------------------------------
const Layout = ({ children }) => {
  // -----------------------------------
  // HYDRATION FIX — rendered only on client
  // -----------------------------------
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  

  // -----------------------------------
  // STATE
  // -----------------------------------
  const [authenticated, setAuthenticated] = useState(false)
  const [updatingOutOfOffice, setUpdatingOutOfOffice] = useState(false)
  const [showFloatingUserMenu, setShowFloatingUserMenu] = useState(false)
  const [showOutOfOfficeModal, setShowOutOfOfficeModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // -----------------------------------
  // HOOKS
  // -----------------------------------
  const user = useSelector((state) => state.user.user)
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch()
  const firebaseReady = useFirebaseReady()

  // -----------------------------------
  // COMPUTED VALUES
  // -----------------------------------
  const hasAdminPermissions = useMemo(() => {
    return user?.role ? ADMIN_ROLES.includes(user.role) : false
  }, [user?.role])

  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => !item.adminOnly || hasAdminPermissions)
  }, [hasAdminPermissions])

  const isActiveMenu = useCallback((menuLink) => {
    return menuLink === pathname
  }, [pathname])


  // -----------------------------------
  // AUTH CHECK
  // -----------------------------------
  const getCurrentAuthState = useCallback(async () => {
    try {
      const currentAuthState = await getProtected(
        "auth/current-auth-state",
        "Amni Staff"
      )

      if (currentAuthState?.status !== "Failed") {
        dispatch(setUserData({ user: currentAuthState.data }))
        
        if (currentAuthState.data.role === "Vendor") {
          router.push("/contractor/dashboard")
        } else {
          setAuthenticated(true)

          if (currentAuthState.data.outOfOffice) {
            setShowOutOfOfficeModal(true)
          }
        }
      } else {
        router.push("/login/staff")
      }
    } catch (error) {
      console.error({ getCurrentAuthStateError: error })
      router.push("/login/staff")
    }
  }, [dispatch, router])


  // -----------------------------------
  // WAIT FOR FIREBASE USER BEFORE AUTH CHECK
  // -----------------------------------
  useEffect(() => {
    if (!firebaseReady) return
    getCurrentAuthState()
  }, [firebaseReady, getCurrentAuthState])



  // -----------------------------------
  // HANDLERS
  // -----------------------------------
  const unsetOutOfOffice = useCallback(async () => {
    if (!user?.role) return
    
    setUpdatingOutOfOffice(true)
    try {
      const unsetOutOfOfficeRequest = await postProtected(
        "user/outOfOffice/unset",
        {},
        user.role
      )

      if (unsetOutOfOfficeRequest.status === "OK") {
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

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev)
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev)
  const closeMobileSidebar = () => setMobileSidebarOpen(false)
  const toggleShowFloatingUserMenu = () =>
    setShowFloatingUserMenu(prev => !prev)

  const logUserOut = useCallback(async () => {
    try {
      await getProtected("auth/logout")
      router.push("/login/staff")
    } catch (error) {
      console.error({ error })
    }
  }, [router])



  // -----------------------------------
  // HYDRATION PREVENTION
  // -----------------------------------
  if (!mounted) {
    return <div className={styles.layout}></div>
  }

  if (!authenticated) {
    return <div className={styles.layout}></div>
  }



  // -----------------------------------
  // RENDER HELPERS
  // -----------------------------------
  const renderOutOfOfficeModal = () => (
    <Modal>
      <div className={styles.outOfOfficeDiv}>
        <h3>Out of Office</h3>
        <p>You are currently out-of-office. Set your account back to in office?</p>
        <div className={styles.outOfOfficeActionButtons}>
          <button
            onClick={() => setShowOutOfOfficeModal(false)}
            disabled={updatingOutOfOffice}
          >
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
      className={`${styles.left} ${
        sidebarCollapsed ? styles.collapsed : ""
      } ${mobileSidebarOpen ? styles.mobileOpen : ""}`}
      data-sidebar="true"
    >
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
    <div
      className={`${styles.content} ${
        sidebarCollapsed ? styles.sidebarCollapsed : ""
      }`}
    >
      {renderSideMenu()}
      <div className={styles.right}>{children}</div>
    </div>
  )

  // -----------------------------------
  // FINAL RENDER
  // -----------------------------------
  return (
    <div>
      <div className={styles.layout}>
        {showOutOfOfficeModal && renderOutOfOfficeModal()}
        {renderNavigation()}
        {renderContent()}
      </div>

      {mobileSidebarOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={closeMobileSidebar}
        />
      )}
    </div>
  )
}

export default Layout
