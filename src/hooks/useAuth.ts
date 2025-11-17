/**
 * Custom Auth Hooks
 * 
 * Reusable hooks for common authentication patterns
 * Built on top of RTK Query authApi
 */

import {
    useGetCurrentUserQuery,
    useLogoutMutation,
    useVerifySessionQuery
} from '@/redux/apis/authApi';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { clearUserData, setUserData } from '@/redux/reducers/user';
import type { User } from '@/types/auth.types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook to get current authenticated user
 * 
 * @returns {Object} - { user, isLoading, error }
 */
export const useAuth = () => {
    const user = useAppSelector((state) => state.user.user);
    const dispatch = useAppDispatch();

    // Optional: fetch user from backend if not in Redux
    const { data, isLoading, error } = useGetCurrentUserQuery(undefined, {
        skip: !!user && Object.keys(user).length > 0, // Skip if user already exists
    });

    useEffect(() => {
        if (data?.status === 'OK' && data.data?.user) {
            dispatch(setUserData({ user: data.data.user }));
        }
    }, [data, dispatch]);

    return {
        user: user as User,
        isAuthenticated: !!user && Object.keys(user).length > 0,
        isLoading,
        error,
    };
};

/**
 * Hook for logout functionality
 * 
 * @returns {Object} - { logout, isLoading }
 */
export const useLogout = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [logoutMutation, { isLoading }] = useLogoutMutation();

    const logout = async (redirectTo: string = '/login') => {
        try {
            await logoutMutation().unwrap();
            dispatch(clearUserData());
            router.push(redirectTo);
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if API call fails, clear local state and redirect
            dispatch(clearUserData());
            router.push(redirectTo);
        }
    };

    return {
        logout,
        isLoading,
    };
};

/**
 * Hook to protect routes - redirect if not authenticated
 * 
 * @param redirectTo - Where to redirect if not authenticated
 * @param requiredRole - Optional role requirement
 */
export const useRequireAuth = (
    redirectTo: string = '/login',
    requiredRole?: string
) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(redirectTo);
        } else if (
            !isLoading &&
            isAuthenticated &&
            requiredRole &&
            user?.role !== requiredRole
        ) {
            // Redirect if role doesn't match
            router.push('/unauthorized');
        }
    }, [isAuthenticated, isLoading, user, router, redirectTo, requiredRole]);

    return {
        user,
        isAuthenticated,
        isLoading,
    };
};

/**
 * Hook to verify active session
 * Useful for checking session validity without full user fetch
 * 
 * @returns {Object} - { isValid, isLoading, error }
 */
export const useSessionVerification = () => {
    const { data, isLoading, error } = useVerifySessionQuery();

    return {
        isValid: data?.valid ?? false,
        isLoading,
        error,
    };
};

/**
 * Hook to redirect authenticated users away from auth pages
 * Use on login/register pages
 * 
 * @param redirectTo - Where to redirect if already authenticated
 */
export const useRedirectIfAuthenticated = (redirectTo: string = '/dashboard') => {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push(redirectTo);
        }
    }, [isAuthenticated, isLoading, router, redirectTo]);

    return {
        isLoading,
    };
};

/**
 * Hook for role-based access control
 * 
 * @param allowedRoles - Array of allowed roles
 * @returns {boolean} - Whether user has required role
 */
export const useHasRole = (allowedRoles: string[]): boolean => {
    const { user } = useAuth();

    if (!user?.role) return false;

    return allowedRoles.includes(user.role);
};

/**
 * Hook to get user's permissions
 * 
 * @returns {string[]} - Array of user permissions
 */
export const usePermissions = (): string[] => {
    const { user } = useAuth();
    return user?.permissions || [];
};

/**
 * Hook to check if user has specific permission
 * 
 * @param permission - Permission to check
 * @returns {boolean} - Whether user has the permission
 */
export const useHasPermission = (permission: string): boolean => {
    const permissions = usePermissions();
    return permissions.includes(permission);
};