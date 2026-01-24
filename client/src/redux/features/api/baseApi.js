import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { setCredentials, clearCredentials } from "../authSlice";
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

// Get API base URL from environment
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

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
    // Log error
    logError(result.error, "API - Authentication Error (401)");

    // Try to refresh token
    const refreshResult = await baseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions
    );

    if (refreshResult.data?.data?.user) {
      // Token refresh successful - update user data in Redux
      api.dispatch(setCredentials({ user: refreshResult.data.data.user }));

      // Retry original request
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Token refresh failed - logout user
      api.dispatch(clearCredentials());

      // Show toast notification
      toast.error(getUserFriendlyMessage(result.error));

      // Redirect to login page
      window.location.href = "/login";
    }
  }

  // Handle 403 errors (authorization failure)
  if (result.error?.status === 403) {
    // Log error
    logError(result.error, "API - Authorization Error (403)");

    // Show toast notification (do NOT logout user)
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
