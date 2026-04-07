import { auth } from '@/lib/firebase';
import { getIdToken } from "firebase/auth";
import { BACKEND_BASE_URL } from "@/lib/config";


// Import the refresh logic from get.js to avoid duplication
// const handleTokenRefresh = async () => {
//     try {
//         const user = auth.currentUser;

//         if (!user) {
//             return false;
//         }

//         const freshToken = await getIdToken(user, true);
        
//         const response = await fetch(`${BACKEND_BASE_URL}/user/ver`, {
//             method: "PUT",
//             headers: { token: freshToken },
//             credentials: "include",
//         });

//         if (response.ok) {
//             const result = await response.json();
//             if (result.status === "OK") {
//                 return true;
//             }
//         }
//         return false;
//     } catch (error) {
//         console.error('Token refresh failed:', error);
//         return false;
//     }
// };

// const redirectToLogin = (role) => {
//     if (!role || role === "Vendor" || role === "User") {
//         window.location.href = "/login";
//     } else {
//         window.location.href = "/login/staff";
//     }
// };

export const postPlain = async (route, body, role) => {
    try {
        const request = await fetch(`${BACKEND_BASE_URL}/${route}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        });
        
        const result = await request.json();
        return result;
    } catch (error) {
        console.error({error});
        throw error;
    }
}


// -------------------------
// TOKEN REFRESH (existing)
// -------------------------
const handleTokenRefresh = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        const freshToken = await getIdToken(user, true);

        const response = await fetch(`${BACKEND_BASE_URL}/user/ver`, {
            method: "PUT",
            headers: { token: freshToken },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            return result.status === "OK";
        }
        return false;
    } catch (error) {
        console.error("Token refresh failed:", error);
        return false;
    }
};

// -------------------------
// LOGIN REDIRECT (existing)
// -------------------------
const redirectToLogin = (role) => {
    if (!role || role === "Vendor" || role === "User") {
        window.location.href = "/login";
    } else {
        window.location.href = "/login/staff";
    }
};

// -------------------------
// 🔐 Authorization header helper
// -------------------------
const getAuthHeader = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return {};

        const token = await getIdToken(user);
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
        console.error("Failed to build auth header:", error);
        return {};
    }
};

// ============================================================================
// 🔥 JS VERSION — POST PROTECTED
// ============================================================================
export const postProtected = async (route, body, role) => {
    try {
        const url = `${BACKEND_BASE_URL}/${route}`;
        const authHeader = await getAuthHeader();

        let request = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeader,     // ⬅ Bearer token added here
            },
            credentials: "include",
            body: JSON.stringify(body),
        });

        // Handle unauthorized
        if (request.status === 401) {
            const refreshSuccess = await handleTokenRefresh();

            if (refreshSuccess) {
                const retryAuthHeader = await getAuthHeader();

                request = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...retryAuthHeader,  // ⬅ retry with updated token
                    },
                    credentials: "include",
                    body: JSON.stringify(body),
                });

                if (request.ok) return request.json();
                return redirectToLogin(role);
            }

            return redirectToLogin(role);
        }

        // Normal flow
        if (request.ok) {
            return await request.json();
        }

        // Not ok but responded — parse the error body so callers can read structured errors
        try {
            const errorBody = await request.json();
            return {
                status: "FAILED",
                error: {
                    message: errorBody.message || `Request failed with status ${request.status}`,
                    ...errorBody,
                },
            };
        } catch {
            return {
                status: "FAILED",
                error: { message: `Request failed with status ${request.status}` },
            };
        }

    } catch (error) {
        console.error("POST ERROR:", error);
        return {
            status: "FAILED",
            error: { message: error.message || "An unexpected error occurred" }
        };
    }
};

// ============================================================================
// 🔥 JS VERSION — POST PROTECTED MULTIPART
// ============================================================================
export const postProtectedMultipart = async (route, body, role) => {
    try {
        const url = `${BACKEND_BASE_URL}/${route}`;
        const authHeader = await getAuthHeader();

        let request = await fetch(url, {
            method: "POST",
            headers: {
                ...authHeader,   // ⬅ DO NOT add content-type manually
            },
            credentials: "include",
            body,
        });

        if (request.status === 401) {
            const refreshSuccess = await handleTokenRefresh();

            if (refreshSuccess) {
                const retryAuthHeader = await getAuthHeader();

                request = await fetch(url, {
                    method: "POST",
                    headers: {
                        ...retryAuthHeader,
                    },
                    credentials: "include",
                    body,
                });

                if (request.ok) return request.json();
                return redirectToLogin(role);
            }

            return redirectToLogin(role);
        }

        if (request.ok) return request.json();

        // Not ok — parse and return structured error so callers can display it
        try {
            const errorBody = await request.json();
            return {
                status: "FAILED",
                error: {
                    message: errorBody.message || errorBody.error?.message || `Request failed with status ${request.status}`,
                    ...errorBody,
                },
            };
        } catch {
            return {
                status: "FAILED",
                error: { message: `Request failed with status ${request.status}` },
            };
        }

    } catch (error) {
        console.error("MULTIPART POST ERROR:", error);
        return {
            status: "FAILED",
            error: { message: error.message || "An unexpected error occurred" },
        };
    }
};
