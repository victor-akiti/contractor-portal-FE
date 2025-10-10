import { auth } from '@/lib/firebase';
import { getIdToken } from "firebase/auth";


// Import the refresh logic from get.js to avoid duplication
const handleTokenRefresh = async () => {
    try {
        const user = auth.currentUser;

        if (!user) {
            return false;
        }

        const freshToken = await getIdToken(user, true);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`, {
            method: "PUT",
            headers: { token: freshToken },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            if (result.status === "OK") {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
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
        console.error({error});
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
        console.error({error});
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
        console.error({error});
        throw error;
    }
}