import { auth } from '@/lib/firebase';
import { getIdToken } from "firebase/auth";

const handleTokenRefresh = async (): Promise<boolean> => {
    try {
        const user = auth.currentUser;

        if (!user) {
            console.error('No current user found');
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

const redirectToLogin = (role?: string): void => {
    if (!role || role === "Vendor" || role === "User") {
        window.location.href = "/login";
    } else {
        window.location.href = "/login/staff";
    }
};

// 🔐 Helper
const getAuthHeader = async (): Promise<Record<string, string>> => {
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

export const deletePlain = async (route: string, body?: any) => {
    try {
        const request = await fetch(route, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const result = await request.json();
        return result;
    } catch (error) {
        console.error({ error });
        throw error;
    }
};

export const deleteProtected = async (route: string, body?: any, role?: string) => {
    try {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`;
        const authHeader = await getAuthHeader();

        const request = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...authHeader,
            },
            credentials: "include",
            body: body ? JSON.stringify(body) : undefined
        });

        if (request.status === 401) {

            const refreshSuccess = await handleTokenRefresh();

            if (refreshSuccess) {
                const retryAuthHeader = await getAuthHeader();

                // Retry the original request
                const retryRequest = await fetch(url, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        ...retryAuthHeader,
                    },
                    credentials: "include",
                    body: body ? JSON.stringify(body) : undefined
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
        console.error({ error });
        throw error;
    }
};
