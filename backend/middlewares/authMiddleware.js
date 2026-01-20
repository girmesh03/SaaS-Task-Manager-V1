import { verifyToken } from "../utils/generateTokens.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";

/**
 * Authentication Middleware
 * Verifies JWT token from httpOnly cookies and attaches user to req.user
 * Returns 401 for authentication failures
 *
 * Enhanced with comprehensive checks:
 * - User is not deleted
 * - User's department is not deleted
 * - User's organization is not deleted
 * - User's organization subscription is active and not expired
 *
 * Requirements: 5.7, 39.1
 */

// Fields to select for authenticated user (excluding virtuals)
const AUTH_USER_FIELDS = [
  "email",
  "role",
  "isPlatformUser",
  "isHod",
  "isDeleted",
  "firstName",
  "lastName",
  "employeeId",
].join(" ");

/**
 * Helper: Fetch user with populated organization and department
 * Includes soft-deleted entities to check their status
 * @param {string} userId - User ID from JWT token
 * @returns {Promise<Object|null>} User object with populated relations or null
 */
const fetchUserWithRelations = async (userId) => {
  const User = mongoose.model("User");

  const user = await User.findById(userId)
    .withDeleted()
    .populate({
      path: "organization",
      select: "name isPlatformOrg subscription isDeleted",
      options: { withDeleted: true },
    })
    .populate({
      path: "department",
      select: "name isDeleted",
      options: { withDeleted: true },
    })
    .select(AUTH_USER_FIELDS)
    .lean();

  // Compute fullName manually (virtuals not available with lean())
  if (user && (user.firstName || user.lastName)) {
    user.fullName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";
  }

  return user;
};

/**
 * Helper: Validate user and related entities are not deleted
 * @param {Object} user - User object with populated relations
 * @param {string} userId - User ID for logging
 * @param {string} ip - Request IP address for logging
 * @throws {CustomError} If validation fails
 */
const validateUserNotDeleted = (user, userId, ip) => {
  // Check 1: User exists
  if (!user) {
    throw new CustomError(
      "User not found",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }

  // Check 2: User is not deleted
  if (user.isDeleted) {
    logger.warn("Deleted user attempted to authenticate", {
      userId,
      email: user.email,
      ip,
    });
    throw new CustomError(
      "User account has been deleted",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }

  // Check 3: User's organization exists
  if (!user.organization) {
    throw new CustomError(
      "User organization not found",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }

  // Check 4: User's organization is not deleted
  if (user.organization.isDeleted) {
    logger.warn("User with deleted organization attempted to authenticate", {
      userId,
      organizationId: user.organization._id,
      ip,
    });
    throw new CustomError(
      "Organization has been deleted",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }

  // Check 5: User's department exists
  if (!user.department) {
    throw new CustomError(
      "User department not found",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }

  // Check 6: User's department is not deleted
  if (user.department.isDeleted) {
    logger.warn("User with deleted department attempted to authenticate", {
      userId,
      departmentId: user.department._id,
      ip,
    });
    throw new CustomError(
      "Department has been deleted",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }
};

/**
 * Helper: Validate organization subscription is active
 * @param {Object} user - User object with populated organization
 * @param {string} userId - User ID for logging
 * @param {string} ip - Request IP address for logging
 * @throws {CustomError} If subscription validation fails
 */
const validateSubscription = (user, userId, ip) => {
  // Skip validation for platform organizations
  if (user.organization.isPlatformOrg) {
    return;
  }

  const subscription = user.organization.subscription;

  // Check subscription status
  if (subscription.status !== "Active") {
    logger.warn("User with inactive subscription attempted to authenticate", {
      userId,
      organizationId: user.organization._id,
      subscriptionStatus: subscription.status,
      ip,
    });
    throw new CustomError(
      `Organization subscription is ${subscription.status.toLowerCase()}. Please contact your administrator.`,
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }

  // Check subscription expiry
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    logger.warn("User with expired subscription attempted to authenticate", {
      userId,
      organizationId: user.organization._id,
      expiresAt: subscription.expiresAt,
      ip,
    });
    throw new CustomError(
      "Organization subscription has expired. Please renew your subscription.",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHENTICATED_ERROR
    );
  }
};

/**
 * Helper: Check if user and related entities are valid (non-throwing version)
 * @param {Object} user - User object with populated relations
 * @returns {boolean} True if valid, false otherwise
 */
const isUserValid = (user) => {
  if (
    !user ||
    user.isDeleted ||
    !user.organization ||
    user.organization.isDeleted ||
    !user.department ||
    user.department.isDeleted
  ) {
    return false;
  }

  // Check subscription for non-platform organizations
  if (!user.organization.isPlatformOrg) {
    const subscription = user.organization.subscription;
    if (
      subscription.status !== "Active" ||
      (subscription.expiresAt && new Date(subscription.expiresAt) < new Date())
    ) {
      return false;
    }
  }

  return true;
};

/**
 * Helper: Build comprehensive req.user object
 * Provides maximum flexibility with all potentially useful user information
 * @param {Object} user - User object with populated organization and department
 * @returns {Object} Comprehensive user object for req.user
 */
const buildReqUser = (user) => {
  return {
    // User Core Fields
    userId: user._id,
    email: user.email,
    role: user.role,
    isPlatformUser: user.isPlatformUser || false,
    isHod: user.isHod || false,
    isDeleted: user.isDeleted || false,

    // User Profile Fields (useful for logging, display, and business logic)
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    fullName: user.fullName || "Unknown User",
    employeeId: user.employeeId || null,

    // Organization Information (comprehensive)
    organization: {
      _id: user.organization._id,
      name: user.organization.name,
      isPlatformOrg: user.organization.isPlatformOrg,
      isDeleted: user.organization.isDeleted || false,
      subscription: {
        plan: user.organization.subscription?.plan,
        status: user.organization.subscription?.status,
        expiresAt: user.organization.subscription?.expiresAt,
      },
    },

    // Department Information (comprehensive)
    department: {
      _id: user.department._id,
      name: user.department.name,
      isDeleted: user.department.isDeleted || false,
    },
  };
};

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

    // Fetch user with populated organization and department (include deleted to check status)
    const user = await fetchUserWithRelations(decoded.userId);

    // Validate user and related entities are not deleted
    validateUserNotDeleted(user, decoded.userId, req.ip);

    // Validate organization subscription is active
    validateSubscription(user, decoded.userId, req.ip);

    // Attach user information to request object
    req.user = buildReqUser(user);

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
 *
 * Enhanced with comprehensive checks (same as authMiddleware)
 *
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

    // Fetch user with populated organization and department (include deleted to check status)
    const user = await fetchUserWithRelations(decoded.userId);

    // If any check fails, continue without authentication (optional auth)
    if (!isUserValid(user)) {
      logger.debug(
        "Optional authentication failed due to deleted entities or subscription",
        {
          userId: decoded.userId,
        }
      );
      return next();
    }

    // Attach user information to request object
    req.user = buildReqUser(user);

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
