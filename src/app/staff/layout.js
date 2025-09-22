'use client'
import logo from "@/assets/images/logo.png";
import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import Modal from "@/components/modal";
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

// Constants
const ADMIN_ROLES = ["Admin", "HOD"];

const MENU_ITEMS = [
  { href: "/staff/approvals", label: "Registration Approvals" },
  { href: "/staff/invites", label: "Registration Invites" },
  { href: "/staff/jobCategories", label: "Job Categories" },
  { href: "/staff/events", label: "Events" },
  { href: "/staff/forms", label: "Forms", adminOnly: true },
  { href: "/staff/userManagement", label: "Roles & User Management", adminOnly: true },
  { href: "/staff/settings", label: "Account Settings" },
];

const Layout = ({ children }) => {
  // State
  const [authenticated, setAuthenticated] = useState(false);
  const [updatingOutOfOffice, setUpdatingOutOfOffice] = useState(false);
  const [showFloatingUserMenu, setShowFloatingUserMenu] = useState(false);
  
  // Hooks
  const user = useSelector((state) => state.user.user);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();

  // Memoized values
  const hasAdminPermissions = useMemo(() => {
    return user?.role ? ADMIN_ROLES.includes(user.role) : false;
  }, [user?.role]);

  const isActiveMenu = useCallback((menuLink) => {
    return menuLink === pathname;
  }, [pathname]);

  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => 
      !item.adminOnly || hasAdminPermissions
    );
  }, [hasAdminPermissions]);

  // Effects
  useEffect(() => {
    getCurrentAuthState();
  }, []);

  // Handlers
  const getCurrentAuthState = useCallback(async () => {
    try {
      const currentAuthState = await getProtected("auth/current-auth-state", "Amni Staff");
      
      if (currentAuthState?.status !== "Failed") {
        dispatch(setUserData({ user: currentAuthState.data }));
        
        if (currentAuthState.data.role === "Vendor") {
          router.push("/contractor/dashboard");
        } else {
          setAuthenticated(true);
        }
      } else {
        console.log('Auth state check failed, redirecting to login');
        router.push("/login/staff");
      }
    } catch (error) {
      console.log({ getCurrentAuthStateError: error });
    }
  }, [dispatch, router]);

  const unsetOutOfOffice = useCallback(async () => {
    if (!user?.role) return;
    
    setUpdatingOutOfOffice(true);
    try {
      const unsetOutOfOfficeRequest = await postProtected(
        "user/outOfOffice/unset", 
        {}, 
        user.role
      );
      
      if (unsetOutOfOfficeRequest.status === "OK") {
        await getCurrentAuthState();
      }
    } catch (error) {
      console.log({ error });
    } finally {
      setUpdatingOutOfOffice(false);
    }
  }, [user?.role, getCurrentAuthState]);

  const toggleShowFloatingUserMenu = useCallback(() => {
    setShowFloatingUserMenu(prev => !prev);
  }, []);

  const logUserOut = useCallback(async () => {
    try {
      const logUserOutRequest = await getProtected("auth/logout");
      if (logUserOutRequest.status === "OK") {
        router.push("/login/staff");
      }
    } catch (error) {
      console.log({ error });
    }
  }, [router]);

  const handleCloseOutOfOfficeModal = useCallback(() => {
    // Implement close functionality if needed
    // For now, this is a placeholder for the close button
  }, []);

  // Render helpers
  const renderOutOfOfficeModal = () => (
    <Modal>
      <div className={styles.outOfOfficeDiv}>
        <h3>Out of Office</h3>
        <p>You are currently out-of-office. Set your account back to in office?</p>
        <div className={styles.outOfOfficeActionButtons}>
          <button onClick={handleCloseOutOfOfficeModal}>Close</button>
          <button onClick={unsetOutOfOffice}>
            Set as in office {updatingOutOfOffice && <ButtonLoadingIcon />}
          </button>
        </div>
      </div>
    </Modal>
  );

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
  );

  const renderNavigation = () => (
    <nav>
      <div className={styles.left}>
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
  );

  const renderSideMenu = () => (
    <div className={styles.left}>
      {filteredMenuItems.map((item) => (
        <Link
          key={item.href}
          className={isActiveMenu(item.href) ? styles.active : undefined}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
      <hr />
    </div>
  );

  const renderContent = () => (
    <div className={styles.content}>
      {renderSideMenu()}
      <div className={styles.right}>
        {children}
      </div>
    </div>
  );

  // Main render
  if (!authenticated) {
    return null;
  }

  return (
    <div>
      <div className={styles.layout}>
        {user?.outOfOffice && renderOutOfOfficeModal()}
        {renderNavigation()}
        {renderContent()}
      </div>
    </div>
  );
};

export default Layout;