import { verifyToken } from "../utils/generateTokens.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";

/**
 * Authentication Middleware
 * Verifies JWT token from httpOnly cookies and attaches user to req.user
 * Returns 401 for authentication failures
 *
 * Requirements: 5.7, 39.1
 */

/**
 * Authenticate user from JWT token in cookies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Extract access token from httpOnly cookie
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      throw new CustomError(
        "Authentication required - No token provided",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Verify access token
    const decoded = verifyToken(accessToken, "access");

    // Attach user information to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organization: decoded.organization,
      department: decoded.department,
      isPlatformUser: decoded.isPlatformUser || false,
    };

    logger.debug("User authenticated successfully", {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.warn("Authentication failed", {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Return 401 for authentication failures
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Handle unexpected errors
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHENTICATED_ERROR,
        message: "Authentication failed",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to req.user if token is present, but doesn't fail if missing
 * Useful for routes that work differently for authenticated vs unauthenticated users
 * @param {Object} req - Express request object
 * @param {Object} _res - Express response object (unused)
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export const optionalAuth = async (req, _res, next) => {
  try {
    // Extract access token from httpOnly cookie
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      // No token present, continue without authentication
      return next();
    }

    // Verify access token
    const decoded = verifyToken(accessToken, "access");

    // Attach user information to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organization: decoded.organization,
      department: decoded.department,
      isPlatformUser: decoded.isPlatformUser || false,
    };

    logger.debug("User optionally authenticated", {
      userId: req.user.userId,
      email: req.user.email,
    });

    next();
  } catch (error) {
    // Token verification failed, continue without authentication
    logger.debug("Optional authentication failed, continuing without auth", {
      error: error.message,
    });
    next();
  }
};

export default authMiddleware;
