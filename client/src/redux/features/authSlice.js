import { createSlice } from "@reduxjs/toolkit";

/**
 * Auth Slice
 * Manages authentication state (user, isAuthenticated)
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
