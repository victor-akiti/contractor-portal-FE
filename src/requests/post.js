import { getIdToken } from "firebase/auth";
import { auth } from "@/app/layout";

// Import the refresh logic from get.js to avoid duplication
const handleTokenRefresh = async () => {
    try {
        const user = auth.currentUser;

        if (!user) {
            console.log('No current user found');
            return false;
        }

        const freshToken = await getIdToken(user, true);
        console.log('Got fresh Firebase token, updating backend...');
        
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
        return false;
    } catch (error) {
        console.log('Token refresh failed:', error);
        return false;
    }
};

const redirectToLogin = (role) => {
    if (!role || role === "Vendor" || role === "User") {
        window.location.href = "/login";
    } else {
        window.location.href = "/login/staff";
    }
};

export const postPlain = async (route, body, role) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
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
        console.log({error});
        throw error;
    }
}

export const postProtected = async (route, body, role) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        });

        if (request.status === 401) {
            console.log('Token expired, attempting refresh...');
            
            const refreshSuccess = await handleTokenRefresh();
            
            if (refreshSuccess) {
                // Retry the original request
                const retryRequest = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(body)
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

export const postProtectedMultipart = async (route, body, role) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "POST",
            headers: {
                // "Content-Type": "application/json" - removed for multipart
            },
            credentials: "include",
            body
        });

        if (request.status === 401) {
            console.log('Token expired, attempting refresh...');
            
            const refreshSuccess = await handleTokenRefresh();
            
            if (refreshSuccess) {
                // Retry the original request
                const retryRequest = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
                    method: "POST",
                    headers: {
                        // "Content-Type": "application/json" - removed for multipart
                    },
                    credentials: "include",
                    body
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