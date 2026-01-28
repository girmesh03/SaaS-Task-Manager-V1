import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/authController.js";
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  resendVerificationValidator,
} from "../middlewares/validators/authValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimiter.js";

/**
 * Authentication Routes
 * Defines routes for authentication operations
 * Applies validation middleware and rate limiting to expensive operations
 *
 * RATE LIMITING STRATEGY:
 * - Global rate limiter in app.js: 100 requests per 15 minutes (all /api routes)
 * - Auth rate limiter: 5 requests per 15 minutes (register, login)
 * - Password reset limiter: 3 requests per hour (forgot/reset password)
 *
 * IMPORTANT: Rate limiting is ONLY applied in production environment
 * In development (NODE_ENV !== "production"), all rate limiters are bypassed
 * This allows unlimited requests during development and testing
 *
 * This layered approach provides:
 * 1. General API protection (global limiter)
 * 2. Specific protection for expensive auth operations (auth limiter)
 * 3. Extra protection for sensitive operations (password reset limiter)
 *
 * Requirements: 39.1, 39.3, 39.4, 39.5
 */

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new organization with department and user
 * @access  Public
 * @validation registerValidator
 * @rateLimit authLimiter (5 requests per 15 minutes)
 */
router.post("/register", authLimiter, registerValidator, validate, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 * @validation loginValidator
 * @rateLimit authLimiter (5 requests per 15 minutes)
 */
router.post("/login", authLimiter, loginValidator, validate, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access and refresh tokens
 * @access  Public
 * @validation refreshTokenValidator
 */
router.post("/refresh", refreshTokenValidator, validate, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear tokens
 * @access  Private (requires authentication)
 * @validation logoutValidator
 * @middleware authMiddleware
 */
router.post("/logout", authMiddleware, logoutValidator, validate, logout);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @validation forgotPasswordValidator
 * @rateLimit passwordResetLimiter (3 requests per hour)
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPasswordValidator,
  validate,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @validation resetPasswordValidator
 * @rateLimit passwordResetLimiter (3 requests per hour)
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  resetPasswordValidator,
  validate,
  resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 * @validation verifyEmailValidator
 */
router.post("/verify-email", verifyEmailValidator, validate, verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 * @validation resendVerificationValidator
 * @rateLimit passwordResetLimiter (3 requests per hour)
 */
router.post(
  "/resend-verification",
  passwordResetLimiter,
  resendVerificationValidator,
  validate,
  resendVerification
);

export default router;
