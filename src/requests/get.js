import { getAuth, getIdToken } from "firebase/auth";
import { setUserData } from "@/redux/reducers/user";
import { auth } from '@/lib/firebase';

// Simple refresh state management
let isRefreshing = false;
let refreshPromise = null;

export const getPlain = async (route) => {
    try {
        const request = await fetch(route, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        const result = await request.json();
        return result;
    } catch (error) {
        console.log({error});
        throw error;
    }
}

export const getProtected = async (route, role) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
        });

        if (request.status === 401) {
            console.log('Token expired, attempting refresh...');
            
            // Attempt to refresh token
            const refreshSuccess = await handleTokenRefresh();
            
            if (refreshSuccess) {
                // Retry the original request
                const retryRequest = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                });

                if (retryRequest.ok) {
                    const result = await retryRequest.json();
                    return result;
                } else {
                    redirectToLogin(role);
                }
            } else {
                redirectToLogin(role);
            }
        } else if (request.ok) {
            const result = await request.json();
            return result;
        } else {
            throw new Error('Request failed');
        }
    } catch (error) {
        console.log({error});
        throw error;
    }
}

// Token refresh logic
const handleTokenRefresh = async () => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = performTokenRefresh();
    
    try {
        const result = await refreshPromise;
        return result;
    } finally {
        isRefreshing = false;
        refreshPromise = null;
    }
};

const performTokenRefresh = async () => {
    try {
        // const auth = getAuth();
        const user = auth.currentUser;
        console.log({user})
        // debugger;

        if (!user) {
            console.log('No current user found');
            return false;
        }

        // Firebase automatically handles refresh using its internal refreshToken
        const freshToken = await getIdToken(user, true);
        
        console.log('Got fresh Firebase token, updating backend...');
        
        // Send fresh token to backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`, {
            method: "PUT",
            headers: { token: freshToken },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            if (result.status === "OK") {
                console.log('Token refreshed successfully');
                return true;
            }
        }

        console.log('Backend token update failed');
        return false;
        
    } catch (error) {
        console.log('Token refresh failed:', error);
        return false;
    }
};

const redirectToLogin = (role) => {
    if (!role || role === "Vendor" || role === "User") {
        // window.location.href = "/login";
    } else {
        // window.location.href = "/login/staff";
    }
};