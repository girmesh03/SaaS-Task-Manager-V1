import rateLimit from "express-rate-limit";
import { RATE_LIMIT, HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";

/**
 * Rate Limiting Middleware
 * Applies rate limiting to all /api routes
 * Prevents abuse and brute-force attacks
 *
 * IMPORTANT: Rate limiting is ONLY applied in production environment
 * In development, rate limiters are bypassed for easier testing
 *
 * Requirements: 1.6, 39.4
 */

/**
 * Helper function to create conditional rate limiter
 * Skips rate limiting in development environment
 * @param {Object} config - Rate limiter configuration
 * @returns {Function} Middleware function
 */
const createConditionalLimiter = (config) => {
  const limiter = rateLimit(config);

  // Return middleware that skips rate limiting in development
  return (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      // Skip rate limiting in development
      return next();
    }
    // Apply rate limiting in production
    return limiter(req, res, next);
  };
};

/**
 * General API rate limiter
 * Applied to all /api routes
 * ONLY in production
 */
export const apiLimiter = createConditionalLimiter({
  windowMs: RATE_LIMIT.WINDOW_MS, // 15 minutes
  max: RATE_LIMIT.MAX_REQUESTS, // 100 requests per window
  message: {
    success: false,
    error: {
      code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
      message: "Too many requests from this IP, please try again later",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("user-agent"),
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
        message: "Too many requests from this IP, please try again later",
        timestamp: new Date().toISOString(),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/health";
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute-force attacks on login/register
 * ONLY in production
 */
export const authLimiter = createConditionalLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
      message:
        "Too many authentication attempts, please try again after 15 minutes",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn("Authentication rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("user-agent"),
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
        message:
          "Too many authentication attempts, please try again after 15 minutes",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Strict rate limiter for password reset endpoints
 * Prevents abuse of password reset functionality
 * ONLY in production
 */
export const passwordResetLimiter = createConditionalLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    error: {
      code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
      message:
        "Too many password reset attempts, please try again after 1 hour",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Password reset rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      email: req.body?.email,
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
        message:
          "Too many password reset attempts, please try again after 1 hour",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Moderate rate limiter for create/update/delete operations
 * Prevents abuse of write operations
 * ONLY in production
 */
export const writeLimiter = createConditionalLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    success: false,
    error: {
      code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
      message: "Too many write operations, please try again later",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Write operation rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
        message: "Too many write operations, please try again later",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Lenient rate limiter for read operations
 * Allows more requests for read-only operations
 * ONLY in production
 */
export const readLimiter = createConditionalLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: {
      code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
      message: "Too many read operations, please try again later",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Read operation rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
        message: "Too many read operations, please try again later",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * File upload rate limiter
 * Prevents abuse of file upload endpoints
 * ONLY in production
 */
export const uploadLimiter = createConditionalLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    error: {
      code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
      message: "Too many file uploads, please try again after 1 hour",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("File upload rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS_ERROR,
        message: "Too many file uploads, please try again after 1 hour",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

export default {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  writeLimiter,
  readLimiter,
  uploadLimiter,
};
