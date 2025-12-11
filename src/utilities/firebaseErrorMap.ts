// Map Firebase errors → Human-readable messages
export const firebaseErrorMap: Record<string, string> = {
    "auth/popup-closed-by-user": "The sign-in window was closed before completing login.",
    "auth/network-request-failed": "Network error detected. Please check your internet connection.",
    "auth/unauthorized-domain": "This domain is not authorized for corporate login. Contact IT.",
    "auth/invalid-credential": "The login session is invalid or expired. Please try again.",
    "auth/popup-blocked": "Your browser blocked the login popup. Enable popups and try again.",
    "auth/user-disabled": "Your account has been disabled. Contact the IT department.",
    "auth/user-not-found": "No staff account found. Use your Amni corporate email.",
    "auth/account-exists-with-different-credential":
        "This email is linked to another login method. Contact IT for assistance.",
    "auth/email-already-in-use":
        "This email is already linked to another account.",
    "auth/operation-not-allowed":
        "This login option is not enabled. Contact the IT department.",
    "auth/timeout": "The request timed out. Please try again.",
};

// Fallback error
export const defaultFirebaseError =
    "We couldn’t complete your sign-in. Please try again or contact IT support.";
