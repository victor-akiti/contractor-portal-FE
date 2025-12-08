// Authentication Types and Interfaces

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginDetails {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface User {
    _id?: string;
    id?: string;
    email: string;
    role: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    vendorId?: string;
    permissions?: string[];
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any; // Allow for additional properties
}

export interface AuthResponse {
    status: "OK" | "FAILED";
    data?: {
        user: User;
        token?: string;
    };
    error?: {
        message: string;
    };
    message?: string;
    firebaseCustomToken?: string;
}

export interface LoginRequest {
    loginDetails: LoginDetails;
}

export interface StaffAuthResponse {
    status: "OK" | "FAILED";
    data?: {
        user: User;
    };
    error?: {
        message: string;
    };
}

export interface TokenVerificationRequest {
    token: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
    confirmPassword: string;
}

export interface ForgotPasswordResponse {
    status: "OK" | "FAILED";
    message?: string;
    error?: {
        message: string;
    };
}

export interface ResetPasswordResponse {
    status: "OK" | "FAILED";
    message?: string;
    error?: {
        message: string;
    };
}

// User role types
export type UserRole = "Vendor" | "User" | "Admin" | "Staff" | string;

// Auth state interface for Redux
export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    token?: string;
}

// Firebase auth types
export interface FirebaseAuthResult {
    user: any;
    credential: any;
    additionalUserInfo?: any;
}

export interface FirebaseTokenResult {
    token: string;
}
