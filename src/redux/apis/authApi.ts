// src/redux/apis/authApi.ts
import type {
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    StaffAuthResponse,
    TokenVerificationRequest,
} from "@/types/auth.types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../baseQuery";

/**
 * Auth API - RTK Query endpoints for authentication
 * 
 * This API is 100% backward compatible with existing auth implementations.
 * All existing postProtected and getProtected calls will continue to work.
 */
export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Auth", "User"],
    endpoints: (builder) => ({
        /**
         * Contractor/Vendor Login
         * POST /auth/login
         * 
         * @param loginDetails - { email, password, rememberMe? }
         * @returns AuthResponse with user data
         */
        loginContractor: builder.mutation<AuthResponse, LoginRequest>({
            query: (credentials) => ({
                url: "auth/login",
                method: "POST",
                body: credentials,
            }),
            invalidatesTags: ["Auth", "User"],
            transformResponse: (response: AuthResponse) => {
                // Ensure consistent response format
                return response;
            },
            transformErrorResponse: (error: any) => {
                return {
                    status: "FAILED" as const,
                    error: {
                        message: error?.data?.error?.message || error?.data?.message || "Login failed",
                    },
                };
            },
        }),

        /**
         * Staff Token Verification (after Microsoft OAuth)
         * PUT /user/ver
         * 
         * @param token - Firebase ID token
         * @returns StaffAuthResponse with user data
         */
        verifyStaffToken: builder.mutation<StaffAuthResponse, TokenVerificationRequest>({
            query: ({ token }) => ({
                url: "user/ver",
                method: "PUT",
                headers: {
                    token,
                },
            }),
            invalidatesTags: ["Auth", "User"],
            transformResponse: (response: StaffAuthResponse) => {
                return response;
            },
            transformErrorResponse: (error: any) => {
                return {
                    status: "FAILED" as const,
                    error: {
                        message: error?.data?.error?.message || error?.data?.message || "Token verification failed",
                    },
                };
            },
        }),

        /**
         * Forgot Password - Request reset link
         * POST /auth/forgot-password
         * 
         * @param email - User's email address
         * @returns ForgotPasswordResponse
         */
        forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
            query: (body) => ({
                url: "auth/forgot-password",
                method: "POST",
                body,
            }),
            transformResponse: (response: ForgotPasswordResponse) => {
                return response;
            },
            transformErrorResponse: (error: any) => {
                return {
                    status: "FAILED" as const,
                    error: {
                        message: error?.data?.error?.message || error?.data?.message || "Request failed",
                    },
                };
            },
        }),

        /**
         * Reset Password - Complete password reset
         * POST /auth/reset-password
         * 
         * @param token - Reset token from email
         * @param password - New password
         * @param confirmPassword - Password confirmation
         * @returns ResetPasswordResponse
         */
        resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
            query: (body) => ({
                url: "auth/reset-password",
                method: "POST",
                body,
            }),
            transformResponse: (response: ResetPasswordResponse) => {
                return response;
            },
            transformErrorResponse: (error: any) => {
                return {
                    status: "FAILED" as const,
                    error: {
                        message: error?.data?.error?.message || error?.data?.message || "Password reset failed",
                    },
                };
            },
        }),

        /**
         * Logout - Clear session
         * POST /auth/logout
         * 
         * @returns void
         */
        logout: builder.mutation<{ status: string }, void>({
            query: () => ({
                url: "auth/logout",
                method: "POST",
            }),
            invalidatesTags: ["Auth", "User"],
        }),

        /**
         * Get Current User (Protected)
         * GET /auth/me
         * 
         * @returns AuthResponse with current user data
         */
        getCurrentUser: builder.query<AuthResponse, void>({
            query: () => ({
                url: "auth/me",
                method: "GET",
            }),
            providesTags: ["User"],
            transformResponse: (response: AuthResponse) => {
                return response;
            },
        }),

        /**
         * Verify Session (Protected)
         * GET /auth/verify
         * 
         * @returns boolean - session validity
         */
        verifySession: builder.query<{ valid: boolean }, void>({
            query: () => ({
                url: "auth/verify",
                method: "GET",
            }),
            providesTags: ["Auth"],
        }),
    }),
});

// Export hooks for usage in components
export const {
    useLoginContractorMutation,
    useVerifyStaffTokenMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useLogoutMutation,
    useGetCurrentUserQuery,
    useLazyGetCurrentUserQuery,
    useVerifySessionQuery,
    useLazyVerifySessionQuery,
} = authApi;

// Export the API for store configuration
export default authApi;