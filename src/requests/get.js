import { BACKEND_BASE_URL } from "@/lib/config";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

// Simple refresh state management
let isRefreshing = false;
let refreshPromise = null;

// 🔐 Helper: build Authorization header (non-breaking, best-effort)
const getAuthHeader = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return {};

    // Do NOT force refresh on every request; let Firebase manage expiration
    const token = await getIdToken(user);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    console.error("Failed to build auth header:", error);
    return {};
  }
};

export const getPlain = async (route) => {
  try {
    const request = await fetch(route, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await request.json();
    return result;
  } catch (error) {
    console.error({ error });
    throw error;
  }
};

export const getProtected = async (route, role, signal = null) => {
  try {
    const baseUrl = `${BACKEND_BASE_URL}/${route}`;

    const authHeader = await getAuthHeader();

    // Check if request was aborted before making it
    if (signal?.aborted) {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    const request = await fetch(baseUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader, // 🔐 Fallback header, cookie remains primary
      },
      credentials: "include",
      signal, // Pass the abort signal to fetch
    });

    if (request.status === 401) {
      // Check if aborted before attempting refresh
      if (signal?.aborted) {
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";
        throw abortError;
      }

      // Attempt to refresh token
      const refreshSuccess = await handleTokenRefresh();

      if (refreshSuccess) {
        // Check if aborted before retry
        if (signal?.aborted) {
          const abortError = new Error("Request aborted");
          abortError.name = "AbortError";
          throw abortError;
        }

        const retryAuthHeader = await getAuthHeader();

        // Retry the original request
        const retryRequest = await fetch(baseUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...retryAuthHeader,
          },
          credentials: "include",
          signal, // Pass signal to retry request as well
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
      // Non-OK with a response - parse the BE error body so callers see
      // the actual message instead of a generic "Request failed". Same
      // FAILED envelope as post/put/patch/delete.
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
    }
  } catch (error) {
    // Don't log AbortErrors as errors since they're expected for cancelled requests
    if (error?.name === "AbortError") {
      // Re-throw to let the caller handle cancellation
      throw error;
    }
    console.error({ error });
    throw error;
  }
};

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
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    // Firebase automatically handles refresh using its internal refreshToken
    const freshToken = await getIdToken(user, true);

    // Send fresh token to backend
    const response = await fetch(`${BACKEND_BASE_URL}/user/ver`, {
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

    console.error("Backend token update failed");
    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
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