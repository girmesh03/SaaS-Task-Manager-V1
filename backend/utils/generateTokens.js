import jwt from "jsonwebtoken";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES, TOKEN_EXPIRY } from "./constants.js";
import logger from "./logger.js";

/**
 * JWT Token Management
 * Generate, verify, and refresh JWT tokens for authentication
 * Uses same JWT secret for HTTP and Socket.IO
 */

// Cache environment checks for performance
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Common JWT signing options
const JWT_SIGN_OPTIONS = {
  issuer: process.env.APP_NAME || "SaaS-Task-Manager",
  audience: "api",
};

// Cookie max age in milliseconds
const COOKIE_MAX_AGE = {
  ACCESS: 15 * 60 * 1000, // 15 minutes
  REFRESH: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// JWT error message mappings
const JWT_ERROR_MESSAGES = {
  TokenExpiredError: "Token has expired",
  JsonWebTokenError: "Invalid token",
  NotBeforeError: "Token not yet valid",
};

/**
 * Validate JWT environment variables
 * @throws {CustomError} If required environment variables are missing
 */
const validateJWTEnv = () => {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new CustomError(
      "JWT secrets not configured",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
};

/**
 * Normalize Mongoose reference to ObjectId string
 * Handles both populated documents and direct ObjectId references
 * @param {Object|ObjectId|string} ref - Mongoose reference
 * @returns {string|undefined} ObjectId string or undefined
 */
const normalizeObjectId = (ref) => {
  if (!ref) return undefined;
  return ref._id?.toString() || ref.toString();
};

/**
 * Get base cookie configuration
 * @returns {Object} Cookie configuration object
 */
const getBaseCookieConfig = () => ({
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "strict" : "lax",
  path: "/",
});

/**
 * Generate access and refresh tokens
 * @param {Object} user - User object
 * @param {string|ObjectId} user._id - User ID
 * @param {string} user.email - User email
 * @param {string} user.role - User role (SuperAdmin, Admin, Manager, User)
 * @param {string|ObjectId} user.organization - Organization ID
 * @param {string|ObjectId} [user.department] - Department ID (optional)
 * @param {boolean} [user.isPlatformUser] - Platform user flag
 * @returns {Object} Token object
 * @returns {string} return.accessToken - JWT access token
 * @returns {string} return.refreshToken - JWT refresh token
 * @throws {CustomError} If JWT secrets are not configured or user is invalid
 */
export const generateTokens = (user) => {
  try {
    // Validate user object
    if (!user || !user._id || !user.email || !user.role) {
      logger.error("Invalid user object provided to generateTokens", {
        hasUser: !!user,
        hasId: !!user?._id,
        hasEmail: !!user?.email,
        hasRole: !!user?.role,
      });
      throw new CustomError(
        "Invalid user object provided",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    // Validate required environment variables
    validateJWTEnv();

    // Payload for JWT tokens
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organization: normalizeObjectId(user.organization),
      department: normalizeObjectId(user.department),
      isPlatformUser: user.isPlatformUser || false,
    };

    // Generate access token (15min)
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: TOKEN_EXPIRY.ACCESS,
      ...JWT_SIGN_OPTIONS,
    });

    // Generate refresh token (7days)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: TOKEN_EXPIRY.REFRESH,
        ...JWT_SIGN_OPTIONS,
      }
    );

    logger.info("Tokens generated successfully", {
      userId: user._id,
      email: user.email,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Error generating tokens:", {
      error: error.message,
      userId: user?._id,
    });
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {Object} Decoded token payload
 * @throws {CustomError} If token is invalid, expired, or secrets are not configured
 */
export const verifyToken = (token, type = "access") => {
  try {
    if (!token) {
      throw new CustomError(
        "Authentication required - No token provided",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Select appropriate secret based on token type
    const secret =
      type === "access"
        ? process.env.JWT_ACCESS_SECRET
        : process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new CustomError(
        "JWT secret not configured",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    // Verify token
    const decoded = jwt.verify(token, secret, JWT_SIGN_OPTIONS);

    return decoded;
  } catch (error) {
    // Handle JWT-specific errors using mapping
    if (JWT_ERROR_MESSAGES[error.name]) {
      throw new CustomError(
        JWT_ERROR_MESSAGES[error.name],
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Re-throw CustomError as-is
    if (error instanceof CustomError) {
      throw error;
    }

    // Wrap other errors
    logger.error("Error verifying token:", { error: error.message });
    throw new CustomError(
      "Token verification failed",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }
};

/**
 * Refresh tokens - generate new access and refresh tokens
 * Rotates refresh token on each refresh
 * @param {string} refreshToken - Current refresh token
 * @param {Object} user - User object from database
 * @returns {Object} Token object
 * @returns {string} return.accessToken - New JWT access token
 * @returns {string} return.refreshToken - New JWT refresh token
 * @throws {CustomError} If refresh token is invalid or user ID doesn't match
 */
export const refreshTokens = (refreshToken, user) => {
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, "refresh");

    // Validate user ID matches
    if (decoded.userId !== user._id.toString()) {
      throw new CustomError(
        "Invalid refresh token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Generate new tokens (rotate refresh token)
    const tokens = generateTokens(user);

    logger.info("Tokens refreshed successfully", {
      userId: user._id,
      email: user.email,
    });

    return tokens;
  } catch (error) {
    logger.error("Error refreshing tokens:", {
      error: error.message,
      userId: user?._id,
    });
    throw error;
  }
};

/**
 * Set token cookies with httpOnly and secure flags
 * @param {Object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
export const setTokenCookies = (res, accessToken, refreshToken) => {
  try {
    const baseCookieConfig = getBaseCookieConfig();

    // Access token cookie (15min)
    res.cookie("accessToken", accessToken, {
      ...baseCookieConfig,
      maxAge: COOKIE_MAX_AGE.ACCESS,
    });

    // Refresh token cookie (7days)
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieConfig,
      maxAge: COOKIE_MAX_AGE.REFRESH,
    });

    logger.debug("Token cookies set successfully");
  } catch (error) {
    logger.error("Error setting token cookies:", { error: error.message });
    throw error;
  }
};

/**
 * Clear token cookies
 * @param {Object} res - Express response object
 */
export const clearTokenCookies = (res) => {
  try {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    logger.debug("Token cookies cleared successfully");
  } catch (error) {
    logger.error("Error clearing token cookies:", { error: error.message });
    throw error;
  }
};

export default {
  generateTokens,
  verifyToken,
  refreshTokens,
  setTokenCookies,
  clearTokenCookies,
};
