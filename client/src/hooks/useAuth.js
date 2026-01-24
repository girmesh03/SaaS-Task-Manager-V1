/**
 * useAuth Hook - Authentication Hook
 *
 * Custom hook for authentication operations.
 * Provides user, isAuthenticated, and auth functions.
 * Uses Redux state and RTK Query mutations.
 *
 * Requirements: 24.6
 */

import { useSelector } from "react-redux";
import {
  selectCurrentUser,
  selectIsAuthenticated,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useRefreshMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
} from "../redux/features/authSlice";

/**
 * useAuth hook
 *
 * @returns {Object} Authentication state and functions
 * @returns {Object|null} return.user - Current user object or null
 * @returns {boolean} return.isAuthenticated - True if user is authenticated
 * @returns {Function} return.login - Login function
 * @returns {Function} return.logout - Logout function
 * @returns {Function} return.register - Register function
 * @returns {Function} return.refresh - Refresh tokens function
 * @returns {Function} return.forgotPassword - Forgot password function
 * @returns {Function} return.resetPassword - Reset password function
 * @returns {Function} return.verifyEmail - Verify email function
 * @returns {boolean} return.isLoading - True if any auth operation is in progress
 */
const useAuth = () => {
  // Get auth state from Redux
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Get RTK Query mutations
  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [logoutMutation, { isLoading: isLogoutLoading }] = useLogoutMutation();
  const [registerMutation, { isLoading: isRegisterLoading }] =
    useRegisterMutation();
  const [refreshMutation, { isLoading: isRefreshLoading }] =
    useRefreshMutation();
  const [forgotPasswordMutation, { isLoading: isForgotPasswordLoading }] =
    useForgotPasswordMutation();
  const [resetPasswordMutation, { isLoading: isResetPasswordLoading }] =
    useResetPasswordMutation();
  const [verifyEmailMutation, { isLoading: isVerifyEmailLoading }] =
    useVerifyEmailMutation();

  /**
   * Login user with email and password
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} Login response
   */
  const login = (credentials) => loginMutation(credentials).unwrap();

  /**
   * Logout user and clear tokens
   * @returns {Promise<Object>} Logout response
   */
  const logout = () => logoutMutation().unwrap();

  /**
   * Register new organization with department and user
   * @param {Object} data - Registration data
   * @param {Object} data.organization - Organization data
   * @param {Object} data.department - Department data
   * @param {Object} data.user - User data
   * @returns {Promise<Object>} Registration response
   */
  const register = (data) => registerMutation(data).unwrap();

  /**
   * Refresh access and refresh tokens
   * @returns {Promise<Object>} Refresh response
   */
  const refresh = () => refreshMutation().unwrap();

  /**
   * Send password reset email
   * @param {Object} data - Email data
   * @param {string} data.email - User email
   * @returns {Promise<Object>} Forgot password response
   */
  const forgotPassword = (data) => forgotPasswordMutation(data).unwrap();

  /**
   * Reset password with token
   * @param {Object} data - Reset data
   * @param {string} data.token - Reset token
   * @param {string} data.password - New password
   * @returns {Promise<Object>} Reset password response
   */
  const resetPassword = (data) => resetPasswordMutation(data).unwrap();

  /**
   * Verify email with token
   * @param {Object} data - Verification data
   * @param {string} data.token - Verification token
   * @returns {Promise<Object>} Verify email response
   */
  const verifyEmail = (data) => verifyEmailMutation(data).unwrap();

  // Aggregate loading state
  const isLoading =
    isLoginLoading ||
    isLogoutLoading ||
    isRegisterLoading ||
    isRefreshLoading ||
    isForgotPasswordLoading ||
    isResetPasswordLoading ||
    isVerifyEmailLoading;

  return {
    user,
    isAuthenticated,
    login,
    logout,
    register,
    refresh,
    forgotPassword,
    resetPassword,
    verifyEmail,
    isLoading,
  };
};

export default useAuth;
