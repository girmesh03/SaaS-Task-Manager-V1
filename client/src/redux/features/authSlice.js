import { createSlice } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";

/**
 * Auth Slice
 * Manages authentication state (user, isAuthenticated)
 * Provides RTK Query endpoints for authentication operations
 * Persisted to localStorage via redux-persist
 * Note: Token is stored in httpOnly cookies by backend, not in Redux
 *
 * Requirements: 24.3, 24.4, 24.6
 */

const initialState = {
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Set credentials (login/register success)
    setCredentials: (state, action) => {
      const { user } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
    },

    // Update user (profile update)
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },

    // Clear credentials (logout)
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },

    // Reset auth state (error recovery)
    resetAuthState: () => initialState,
  },
});

// Export actions
export const { setCredentials, updateUser, clearCredentials, resetAuthState } =
  authSlice.actions;

// Export selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

// Export reducer
export default authSlice.reducer;

/**
 * Helper: Handle successful authentication (login/register)
 * Updates Redux state with user data from response
 */
const handleAuthSuccess = async (_arg, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled;
    if (data?.data?.user) {
      dispatch(setCredentials({ user: data.data.user }));
    }
  } catch {
    // Error handled by baseQuery (401 → logout, 403 → toast)
  }
};

/**
 * Auth API Endpoints
 * RTK Query endpoints for authentication operations
 * Injected into baseApi for automatic caching and state management
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Register new organization with department and user
     * @param {Object} credentials - Registration data
     * @param {Object} credentials.organization - Organization data
     * @param {Object} credentials.department - Department data
     * @param {Object} credentials.user - User data
     * @returns {Object} Created user and organization
     */
    register: builder.mutation({
      query: (credentials) => ({
        url: "/auth/register",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
      onQueryStarted: handleAuthSuccess,
    }),

    /**
     * Login user with email and password
     * @param {Object} credentials - Login credentials
     * @param {string} credentials.email - User email
     * @param {string} credentials.password - User password
     * @returns {Object} User data
     */
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
      onQueryStarted: handleAuthSuccess,
    }),

    /**
     * Refresh access and refresh tokens
     * @returns {Object} New tokens and user data
     */
    refresh: builder.mutation({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data?.user) {
            dispatch(setCredentials({ user: data.data.user }));
          }
        } catch {
          // Refresh failed - clear credentials to force re-login
          // baseQuery handles 401 → logout flow
          dispatch(clearCredentials());
        }
      },
    }),

    /**
     * Logout user and clear tokens
     * @returns {Object} Success message
     */
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        // Optimistically clear credentials immediately
        dispatch(clearCredentials());

        try {
          await queryFulfilled;
        } catch {
          // Already cleared, no rollback needed
        }
      },
    }),

    /**
     * Send password reset email
     * @param {Object} data - Email data
     * @param {string} data.email - User email
     * @returns {Object} Success message
     */
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),

    /**
     * Reset password with token
     * @param {Object} data - Reset data
     * @param {string} data.token - Reset token
     * @param {string} data.password - New password
     * @returns {Object} Success message
     */
    resetPassword: builder.mutation({
      query: (data) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: data,
      }),
    }),

    /**
     * Verify email with token
     * @param {Object} data - Verification data
     * @param {string} data.token - Verification token
     * @returns {Object} Success message
     */
    verifyEmail: builder.mutation({
      query: (data) => ({
        url: "/auth/verify-email",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
} = authApi;
