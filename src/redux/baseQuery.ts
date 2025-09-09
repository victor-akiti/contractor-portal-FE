// src/redux/apis/staffApi.ts
import { auth } from '@/lib/firebase'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { getIdToken } from 'firebase/auth'

// Firebase token refresh logic
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

const handleTokenRefresh = async (): Promise<boolean> => {
    if (isRefreshing) {
        return refreshPromise!
    }

    isRefreshing = true
    refreshPromise = performTokenRefresh()

    try {
        const result = await refreshPromise
        return result
    } finally {
        isRefreshing = false
        refreshPromise = null
    }
}

const performTokenRefresh = async (): Promise<boolean> => {
    try {
        const user = auth.currentUser

        if (!user) {
            console.log('No current user found')
            return false
        }

        const freshToken = await getIdToken(user, true)
        console.log('Got fresh Firebase token, updating backend...')

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/ver`, {
            method: "PUT",
            headers: { token: freshToken },
            credentials: "include",
        })

        if (response.ok) {
            const result = await response.json()
            if (result.status === "OK") {
                console.log('Token refreshed successfully')
                return true
            }
        }

        console.log('Backend token update failed')
        return false

    } catch (error) {
        console.log('Token refresh failed:', error)
        return false
    }
}

const redirectToLogin = (role?: string): void => {
    if (!role || role === "Vendor" || role === "User") {
        window.location.href = "/login"
    } else {
        window.location.href = "/login/staff"
    }
}

// Base query with Firebase auth refresh
const baseQuery = fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    credentials: 'include',
    prepareHeaders: (headers, { extra }) => {
        const userRole = (extra as any)?.userRole
        if (userRole) headers.set('User-Role', userRole)
        return headers
    },
})

export const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError & { userRole?: string }
> = async (args, api, extraOptions) => {
    const userRole = (extraOptions as any)?.userRole

    let result = await baseQuery(args, api, extraOptions)

    if (result.error && result.error.status === 401) {
        console.log('Token expired, attempting refresh...')

        const refreshSuccess = await handleTokenRefresh()

        if (refreshSuccess) {
            result = await baseQuery(args, api, extraOptions)

            if (result.error && result.error.status === 401) {
                redirectToLogin(userRole)
            }
        } else {
            redirectToLogin(userRole)
        }
    }

    return result
}
