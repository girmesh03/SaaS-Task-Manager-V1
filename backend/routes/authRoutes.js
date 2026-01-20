import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController.js";
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
} from "../middlewares/validators/authValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rateLimit from "express-rate-limit";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";

/**
 * Authentication Routes
 * Defines routes for authentication operations
 * Applies validation middleware and rate limiting to expensive operations
 *
 * RATE LIMITING STRATEGY:
 * - Global rate limiter in app.js: 100 requests per 15 minutes (all /api routes)
 * - Auth rate limiter (below): 5 requests per 15 minutes (register, login)
 * - Password reset limiter (below): 3 requests per hour (forgot/reset password)
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
 * Helper function to create rate limiter error response
 * @param {string} message - Error message
 * @returns {Object} Formatted error response
 */
const createRateLimitErrorResponse = (message) => ({
  success: false,
  error: {
    code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
    message,
    timestamp: new Date().toISOString(),
  },
});

/**
 * Helper function to create rate limiter handler
 * @param {string} logMessage - Log message prefix
 * @param {string} errorMessage - Error message for response
 * @returns {Function} Rate limiter handler function
 */
const createRateLimitHandler = (logMessage, errorMessage) => {
  return (req, res) => {
    logger.warn(`${logMessage} for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res
      .status(HTTP_STATUS.TOO_MANY_REQUESTS)
      .json(createRateLimitErrorResponse(errorMessage));
  };
};

/**
 * Rate limiter for expensive authentication operations (Requirement 39.4)
 * Applied to: register, login
 * Limit: 5 requests per 15 minutes per IP
 * Purpose: Prevent brute-force attacks and credential stuffing
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window (stricter than global limiter)
  message: createRateLimitErrorResponse(
    "Too many authentication attempts, please try again later"
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Auth rate limit exceeded",
    "Too many authentication attempts, please try again later"
  ),
});

/**
 * Rate limiter for password reset operations (stricter)
 * Applied to: forgot-password, reset-password
 * Limit: 3 requests per hour per IP
 * Purpose: Prevent password reset abuse and enumeration attacks
 */
const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 requests per hour (very strict)
  message: createRateLimitErrorResponse(
    "Too many password reset attempts, please try again later"
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Password reset rate limit exceeded",
    "Too many password reset attempts, please try again later"
  ),
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new organization with department and user
 * @access  Public
 * @validation registerValidator
 * @rateLimit authRateLimiter (5 requests per 15 minutes)
 */
router.post(
  "/register",
  authRateLimiter,
  registerValidator,
  validate,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 * @validation loginValidator
 * @rateLimit authRateLimiter (5 requests per 15 minutes)
 */
router.post("/login", authRateLimiter, loginValidator, validate, login);

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
 * @rateLimit passwordResetRateLimiter (3 requests per hour)
 */
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  forgotPasswordValidator,
  validate,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @validation resetPasswordValidator
 * @rateLimit passwordResetRateLimiter (3 requests per hour)
 */
router.post(
  "/reset-password",
  passwordResetRateLimiter,
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

export default router;
