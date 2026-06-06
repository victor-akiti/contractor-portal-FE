import { auth } from '@/lib/firebase';
import { getIdToken } from "firebase/auth";
import { BACKEND_BASE_URL } from "@/lib/config";

// PATCH request helper. Mirrors put.ts / post.js conventions:
// - Authorization: Bearer <firebase id token>
// - credentials: include (so cookie-based session also flows)
// - On 401, attempts a token refresh via /user/ver and retries once
// - On non-OK responses, parses the body to surface a structured
//   { status: "FAILED", error: { message, ... } } shape callers can read
//   without try/catch on a generic Error.

const handleTokenRefresh = async (): Promise<boolean> => {
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

const redirectToLogin = (role?: string): void => {
    if (!role || role === "Vendor" || role === "User") {
        window.location.href = "/login";
    } else {
        window.location.href = "/login/staff";
    }
};

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

export const patchProtected = async (route: string, body: any, role?: string) => {
    try {
        const url = `${BACKEND_BASE_URL}/${route}`;
        const authHeader = await getAuthHeader();

        let request = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...authHeader,
            },
            credentials: "include",
            body: JSON.stringify(body),
        });

        if (request.status === 401) {
            const refreshSuccess = await handleTokenRefresh();
            if (refreshSuccess) {
                const retryAuthHeader = await getAuthHeader();
                request = await fetch(url, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...retryAuthHeader,
                    },
                    credentials: "include",
                    body: JSON.stringify(body),
                });
                if (request.ok) return request.json();
                return redirectToLogin(role);
            }
            return redirectToLogin(role);
        }

        if (request.ok) {
            return await request.json();
        }

        // Non-OK with a response - parse error body so callers can read structured errors.
        // Nested .error.message takes precedence (BE shape).
        try {
            const errorBody = await request.json();
            const msg =
                errorBody?.error?.message ||
                errorBody?.message ||
                `Request failed with status ${request.status}`;
            return {
                status: "FAILED",
                error: { ...errorBody?.error, message: msg },
            };
        } catch {
            return {
                status: "FAILED",
                error: { message: `Request failed with status ${request.status}` },
            };
        }
    } catch (error: any) {
        console.error("PATCH ERROR:", error);
        return {
            status: "FAILED",
            error: { message: error?.message || "An unexpected error occurred" },
        };
    }
};
