// src/redux/apis/baseQueryWithReauth.ts
import { auth } from '@/lib/firebase';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getIdToken } from 'firebase/auth';

// Detect cookie (browser-only safeguard)
const hasAuthCookie = () => {
    if (typeof document === "undefined") return false; // SSR-safe
    return document.cookie.includes("authToken=");
};

// === REFRESH LOGIC ===
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const handleTokenRefresh = async (): Promise<boolean> => {
    if (isRefreshing) return refreshPromise!;
    isRefreshing = true;
    refreshPromise = performTokenRefresh();

    try {
        return await refreshPromise;
    } finally {
        isRefreshing = false;
        refreshPromise = null;
    }
};

const performTokenRefresh = async (): Promise<boolean> => {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        const freshToken = await getIdToken(user, true);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`, {
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

// === LOGIN REDIRECT ===
const redirectToLogin = (role?: string): void => {
    if (!role || role === "Vendor" || role === "User") {
        window.location.href = "/login";
    } else {
        window.location.href = "/login/staff";
    }
};

// === BASE QUERY ===
const baseQuery = fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    credentials: "include",
    prepareHeaders: async (headers, apiContext) => {
        const cookieAvailable = hasAuthCookie();

        // Only send Authorization when cookie is missing
        if (!cookieAvailable) {
            const user = auth.currentUser;
            if (user) {
                const token = await getIdToken(user);
                if (token) headers.set("Authorization", `Bearer ${token}`);
            }
        }

        // Pass through role if needed
        const userRole = (apiContext.extra as any)?.userRole;
        if (userRole) headers.set("User-Role", userRole);

        return headers;
    },
});

// === WRAP WITH TOKEN REAUTH ===
export const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        const refreshSuccess = await handleTokenRefresh();

        if (refreshSuccess) {
            result = await baseQuery(args, api, extraOptions);
            if (result.error && result.error.status === 401) redirectToLogin();
        } else {
            redirectToLogin();
        }
    }

    return result;
};
