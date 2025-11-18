'use client'
import logo from "@/assets/images/logo.png"
import { ThemeToggle } from "@/components/ThemeToggle"
import { setUserData } from "@/redux/reducers/user"
import { getProtected } from "@/requests/get"
import { faCaretDown, faEnvelope, faUserCircle } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import styles from "./styles/styles.module.css"

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * CONTRACTOR LAYOUT (MODERNIZED)
 * - Sticky navigation with modern design
 * - Responsive dropdown menu
 * - Auth state management
 * - Elegant footer
 * - 100% backward-compatible with existing functionality
 */
const Layout = ({ children }: LayoutProps) => {
  const [authenticated, setAuthenticated] = useState(false)
  const [showFloatingUserMenu, setShowFloatingUserMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  const user = useSelector((state: any) => state.user.user)
  const dispatch = useDispatch()
  const router = useRouter()

  useEffect(() => {
    getCurrentAuthState()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowFloatingUserMenu(false)
      }
    }

    if (showFloatingUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFloatingUserMenu])

  const getCurrentAuthState = async () => {
    try {
      setIsLoading(true)
      const currentAuthState = await getProtected("auth/current-auth-state")

      console.log({ currentAuthState })

      if (!currentAuthState || currentAuthState.status === "Failed") {
        router.push("/login")
      } else {
        if (currentAuthState.data.role !== "Vendor") {
          router.push("/staff/approvals")
        } else {
          dispatch(setUserData({ user: currentAuthState.data }))
          setAuthenticated(true)
        }
      }
    } catch (error) {
      console.error({ error })
      router.push("/login")
    } finally {
      setIsLoading(false)
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
      console.error({ error })
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <svg className={styles.loadingSpinner} width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#e67509" strokeWidth="4" strokeDasharray="90 150" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    )
  }

  // Authenticated layout
  if (!authenticated) {
    return null
  }

  return (
    <div className={styles.layout}>
      {/* Skip to main content for accessibility */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* Navigation Bar */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.logoLink}>
            <Image
              src={logo}
              width={35}
              height={45}
              alt="Amni Logo"
              className={styles.logo}
              priority
            />
            <span className={styles.logoText}>Contractor Portal</span>
          </Link>
        </div>

        <div className={styles.navRight}>
          <Link href="/contractor/dashboard" className={styles.navDashboardText}>DASHBOARD</Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Messages Button */}
          <Link href="/contractor/messages" className={styles.navIconButton}>
            <FontAwesomeIcon icon={faEnvelope} className={styles.messageIcon} />
          </Link>

          {/* User Menu Button */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={toggleFloatingUserMenu}
              className={styles.navIconButton}
              aria-expanded={showFloatingUserMenu}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <FontAwesomeIcon icon={faUserCircle} className={styles.userIcon} />
              <FontAwesomeIcon icon={faCaretDown} className={styles.caretIcon} />
            </button>

            {/* Floating User Menu */}
            {showFloatingUserMenu && (
              <div className={styles.floatingUserMenu} role="menu">
                <div className={`${styles.menuSection} ${styles.loggedInSection}`}>
                  <p className={styles.loggedInLabel}>Logged in as:</p>
                  <p className={styles.loggedInName}>{user.name}</p>
                </div>

                {/* Uncomment when settings page is ready
                <Link
                  href="/contractor/settings"
                  className={styles.menuItem}
                  onClick={() => setShowFloatingUserMenu(false)}
                  role="menuitem"
                >
                  Settings
                </Link>
                <hr className={styles.menuDivider} />
                */}

                <button
                  onClick={() => {
                    setShowFloatingUserMenu(false)
                    logUserOut()
                  }}
                  className={`${styles.menuItem} ${styles.logoutItem}`}
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className={styles.content}>
        {children}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          ©Copyright 2024 Amni International Petroleum Development Company. Please ensure to read the
          <Link href="/" className={styles.footerLink}> Terms & Conditions</Link> for using this application.
        </p>
      </footer>
    </div>
  )
}

export default Layout