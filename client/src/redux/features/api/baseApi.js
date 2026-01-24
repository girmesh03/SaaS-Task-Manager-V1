import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { logError, getUserFriendlyMessage } from "../../../utils/errorHandler";
import { toast } from "react-toastify";

/**
 * Base API Configuration
 * RTK Query base API with fetchBaseQuery configuration
 * Handles 401 errors (logout user) and 403 errors (show toast, no logout)
 * Implements retry logic and token refresh mechanism
 *
 * Requirements: 23.3, 23.4, 23.5, 24.3, 24.5
 */

// Constants
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const LOGIN_ROUTE = "/login";
const LOGOUT_REDIRECT_DELAY_MS = 1000;
const TOAST_AUTO_CLOSE_MS = 2000;

// Prevent multiple simultaneous redirects
let isRedirecting = false;

// Create base query with credentials (cookies)
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include", // Include httpOnly cookies for JWT authentication
  prepareHeaders: (headers) => {
    // Set content type
    headers.set("Content-Type", "application/json");

    // Note: No Authorization header needed - backend uses httpOnly cookies
    return headers;
  },
});

/**
 * Base query with automatic token refresh and error handling
 * Intercepts 401 errors to attempt token refresh before failing
 * Handles 403 errors with user-friendly toast notifications
 * Prevents infinite refresh loops by bypassing reauth for refresh endpoint
 *
 * CRITICAL: Only logout user when token refresh FAILS, not on every 401
 *
 * @param {Object} args - Request arguments
 * @param {Object} api - RTK Query API object
 * @param {Object} extraOptions - Additional options
 * @returns {Promise<Object>} Query result
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  // Prevent infinite refresh loops - bypass reauth for refresh endpoint
  if (args.url === "/auth/refresh") {
    return await baseQuery(args, api, extraOptions);
  }

  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 errors (authentication failure)
  if (result.error?.status === 401) {
    logError(
      result.error,
      "API - Authentication Error (401) - Attempting token refresh"
    );

    try {
      // Import auth actions dynamically to avoid circular dependency
      const { setCredentials, clearCredentials } = await import("../authSlice");

      // Try to refresh token
      const refreshResult = await baseQuery(
        { url: "/auth/refresh", method: "POST" },
        api,
        extraOptions
      );

      if (refreshResult.data?.data?.user) {
        // Token refresh successful - update user data in Redux
        console.log(
          "[baseApi] Token refresh successful, retrying original request"
        );

        api.dispatch(setCredentials({ user: refreshResult.data.data.user }));

        // Retry original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Token refresh failed - NOW logout user
        logError(
          new Error("Token refresh failed"),
          "API - Token Refresh Failed - Logging out user",
          { refreshResult }
        );

        // Prevent multiple redirects
        if (!isRedirecting) {
          isRedirecting = true;

          api.dispatch(clearCredentials());

          // Show toast notification with callback
          toast.error("Your session has expired. Please login again.", {
            autoClose: TOAST_AUTO_CLOSE_MS,
            onClose: () => {
              window.location.href = LOGIN_ROUTE;
            },
          });
        }

        // Return error immediately to prevent retries
        return {
          error: {
            status: 401,
            data: { message: "Session expired" },
          },
        };
      }
    } catch (importError) {
      // Handle dynamic import failure
      logError(importError, "API - Failed to import authSlice");

      // Fallback: force logout
      if (!isRedirecting) {
        isRedirecting = true;
        toast.error("An error occurred. Please login again.");
        setTimeout(() => {
          window.location.href = LOGIN_ROUTE;
        }, LOGOUT_REDIRECT_DELAY_MS);
      }

      return {
        error: {
          status: 500,
          data: { message: "Internal error" },
        },
      };
    }
  }

  // Handle 403 errors (authorization failure)
  if (result.error?.status === 403) {
    logError(result.error, "API - Authorization Error (403)");
    toast.error(getUserFriendlyMessage(result.error));
  }

  return result;
};

// Create base query with retry logic
const baseQueryWithRetry = retry(baseQueryWithReauth, {
  maxRetries: 2, // Maximum 2 retry attempts (total 3 tries)
});

// Create base API
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRetry,
  tagTypes: [
    "Auth",
    "Organization",
    "Department",
    "User",
    "Task",
    "TaskActivity",
    "TaskComment",
    "Material",
    "Vendor",
    "Notification",
    "Attachment",
  ],
  endpoints: () => ({}), // Endpoints will be injected by feature slices
});

export default baseApi;
