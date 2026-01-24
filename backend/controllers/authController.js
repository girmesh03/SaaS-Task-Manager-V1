import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import crypto from "crypto";
import { User, Organization, Department } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import {
  generateTokens,
  setTokenCookies,
  clearTokenCookies,
  refreshTokens as refreshTokensUtil,
  verifyToken,
} from "../utils/generateTokens.js";
import {
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  ACCOUNT_LOCKOUT,
  TOKEN_EXPIRY_MS,
} from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  safeAbortTransaction,
} from "../utils/helpers.js";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
} from "../services/emailService.js";

/**
 * @typedef {Object} UserDocument
 * @property {mongoose.Types.ObjectId} _id - User ID
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} email - User's email
 * @property {string} password - User's hashed password
 * @property {string} role - User's role
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} department - Department reference
 * @property {boolean} isPlatformUser - Platform user flag
 * @property {boolean} isHod - Head of Department flag
 * @property {boolean} isDeleted - Soft delete flag (from softDeletePlugin)
 * @property {string} employeeId - Employee ID
 * @property {Date} joinedAt - Join date
 * @property {Date} [dateOfBirth] - Date of birth
 * @property {string} [refreshToken] - Refresh token
 * @property {Date} [refreshTokenExpiry] - Refresh token expiry
 * @property {Date} [lastLogin] - Last login timestamp
 * @property {number} failedLoginAttempts - Failed login attempts count
 * @property {Date} [accountLockedUntil] - Account lock expiry
 * @property {string} [passwordResetToken] - Password reset token
 * @property {Date} [passwordResetExpiry] - Password reset token expiry
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} comparePassword - Compare password with hash
 * @property {Function} generatePasswordResetToken - Generate password reset token
 * @property {Function} verifyPasswordResetToken - Verify password reset token
 * @property {Function} clearPasswordResetToken - Clear password reset token
 * @property {Function} save - Save document
 * @property {Function} toObject - Convert to plain object
 */

/**
 * Helper Functions
 */

/**
 * Get account lockout duration in minutes
 * @returns {number} Lockout duration in minutes
 */
const getLockoutDurationMinutes = () =>
  Math.ceil(ACCOUNT_LOCKOUT.LOCKOUT_DURATION / 1000 / 60);

/**
 * Format full user data for authentication responses
 * Returns complete user object with populated organization and department
 * Note: Sensitive fields are already removed by User model transform
 * @param {Object} user - User document with populated organization and department
 * @returns {Object} Full user data
 */
const formatUserData = (user) => {
  // Convert to plain object (transform will auto-remove sensitive fields)
  return user.toObject ? user.toObject() : user;
};

/**
 * Create organization during registration
 * @param {Object} orgData - Organization data
 * @param {Object} session - MongoDB session
 * @returns {Promise<Object>} Created organization
 */
const createOrganization = async (orgData, session) => {
  const [organization] = await Organization.create(
    [
      {
        name: orgData.name,
        email: orgData.email,
        phone: orgData.phone,
        address: orgData.address,
        industry: orgData.industry,
        size: orgData.size,
        description: orgData.description || "",
        isPlatformOrg: false,
        createdBy: null,
      },
    ],
    { session }
  );

  logger.debug("Organization created", {
    organizationId: organization._id,
    organizationName: organization.name,
  });

  return organization;
};

/**
 * Create department during registration
 * @param {Object} deptData - Department data
 * @param {string} organizationId - Organization ID
 * @param {Object} session - MongoDB session
 * @returns {Promise<Object>} Created department
 */
const createDepartment = async (deptData, organizationId, session) => {
  const [department] = await Department.create(
    [
      {
        name: deptData.name,
        description: deptData.description || "",
        organization: organizationId,
        manager: null,
        createdBy: null,
      },
    ],
    { session }
  );

  logger.debug("Department created", {
    departmentId: department._id,
    departmentName: department.name,
  });

  return department;
};

/**
 * Create SuperAdmin user during registration
 * @param {Object} userData - User data
 * @param {string} organizationId - Organization ID
 * @param {string} departmentId - Department ID
 * @param {Object} session - MongoDB session
 * @returns {Promise<Object>} Created user
 */
const createSuperAdminUser = async (
  userData,
  organizationId,
  departmentId,
  session
) => {
  const [user] = await User.create(
    [
      {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: USER_ROLES.SUPER_ADMIN,
        organization: organizationId,
        department: departmentId,
        isPlatformUser: false,
        isHod: true,
        employeeId: userData.employeeId,
        joinedAt: userData.joinedAt || new Date(),
        dateOfBirth: userData.dateOfBirth || null,
        phone: userData.phone || null,
      },
    ],
    { session }
  );

  logger.debug("User created", {
    userId: user._id,
    userEmail: user.email,
    role: user.role,
  });

  return user;
};

/**
 * Update user with refresh token
 * @param {Object} user - User document
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<void>}
 */
const updateUserRefreshToken = async (user, refreshToken) => {
  user.refreshToken = refreshToken;
  user.refreshTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MS.REFRESH);
  await user.save();
};

/**
 * Authentication Controller
 * Handles user authentication operations: register, login, refresh, logout, password reset
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.10, 5.11, 5.12,
 *               39.6, 39.7, 39.8, 39.9, 39.10, 39.11, 39.12, 39.13, 39.14, 39.15
 */

/**
 * Register new organization with department and user
 * Creates org/dept/user in transaction, user assigned SuperAdmin role
 * Sends welcome email and emits Socket.IO notification
 *
 * @route POST /api/auth/register
 * @access Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      organization: orgData,
      department: deptData,
      user: userData,
    } = req.validated.body;

    logger.info("Registration attempt", {
      organizationName: orgData.name,
      userEmail: userData.email,
    });

    // Create organization, department, and user
    const organization = await createOrganization(orgData, session);
    const department = await createDepartment(
      deptData,
      organization._id,
      session
    );
    const user = await createSuperAdminUser(
      userData,
      organization._id,
      department._id,
      session
    );

    // Update references
    organization.createdBy = user._id;
    await organization.save({ session });

    department.createdBy = user._id;
    department.manager = user._id;
    await department.save({ session });

    logger.debug("Organization and department updated with user references");

    // Commit transaction
    await session.commitTransaction();
    logger.info("Registration transaction committed successfully");

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update user with refresh token
    await updateUserRefreshToken(user, refreshToken);

    // Set httpOnly cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Populate user with organization and department for response
    const populatedUser = await User.findById(user._id)
      .populate({
        path: "organization",
        select:
          "name email phone address industry size logo isPlatformOrg subscription settings",
      })
      .populate({
        path: "department",
        select: "name description manager",
      })
      .select(
        "-password -refreshToken -refreshTokenExpiry -passwordResetToken -passwordResetExpiry"
      )
      .lean();

    // Send welcome email
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
    const frontendUrl = allowedOrigins[0] || "http://localhost:3000";
    const loginUrl = `${frontendUrl}/login`;
    await sendWelcomeEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      organization.name,
      loginUrl
    );

    // Optional: Send email verification email (if EMAIL_VERIFICATION_ENABLED is true)
    if (process.env.EMAIL_VERIFICATION_ENABLED === "true") {
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
      await sendEmailVerificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken,
        verificationUrl
      );

      logger.info("Email verification token sent", {
        userId: user._id,
        email: user.email,
      });
    }

    logger.info("Registration successful", {
      userId: user._id,
      organizationId: organization._id,
      departmentId: department._id,
    });

    // Return success response with full user data
    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        formatSuccessResponse(
          { user: populatedUser },
          "Registration successful"
        )
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Registration failed", {
      error: error.message,
      stack: error.stack,
    });

    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Login user with email and password
 * Implements brute-force protection and account lockout
 *
 * @route POST /api/auth/login
 * @access Public
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const login = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;

    // Defensive validation
    if (!email || !password) {
      throw new CustomError(
        "Email and password are required",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    logger.info("Login attempt", {
      email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Find user by email (include password field)
    /** @type {UserDocument | null} */
    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password +refreshToken +refreshTokenExpiry")
      .populate({
        path: "organization",
        select:
          "name email phone address industry size logo isPlatformOrg subscription settings isDeleted",
      })
      .populate({
        path: "department",
        select: "name description manager isDeleted",
      });

    if (!user) {
      throw new CustomError(
        "Invalid email or password",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if user is soft-deleted
    if (user.isDeleted) {
      logger.warn("Deleted user attempted to login", {
        email: user.email,
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
      });
      throw new CustomError(
        "User account has been deleted",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if organization exists
    if (!user.organization) {
      throw new CustomError(
        "User organization not found",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if organization is soft-deleted
    if (user.organization.isDeleted) {
      logger.warn("User with deleted organization attempted to login", {
        email: user.email,
        userId: user._id,
        organizationId: user.organization._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
      });
      throw new CustomError(
        "Organization has been deleted",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if department exists
    if (!user.department) {
      throw new CustomError(
        "User department not found",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if department is soft-deleted
    if (user.department.isDeleted) {
      logger.warn("User with deleted department attempted to login", {
        email: user.email,
        userId: user._id,
        departmentId: user.department._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
      });
      throw new CustomError(
        "Department has been deleted",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check organization subscription (skip for platform organizations)
    if (!user.organization.isPlatformOrg) {
      const subscription = user.organization.subscription;

      // Check subscription status
      if (subscription.status !== "Active") {
        logger.warn("User with inactive subscription attempted to login", {
          email: user.email,
          userId: user._id,
          organizationId: user.organization._id,
          subscriptionStatus: subscription.status,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          timestamp: new Date().toISOString(),
        });
        throw new CustomError(
          `Organization subscription is ${subscription.status.toLowerCase()}. Please contact your administrator.`,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHENTICATED_ERROR
        );
      }

      // Check subscription expiry
      if (
        subscription.expiresAt &&
        new Date(subscription.expiresAt) < new Date()
      ) {
        logger.warn("User with expired subscription attempted to login", {
          email: user.email,
          userId: user._id,
          organizationId: user.organization._id,
          expiresAt: subscription.expiresAt,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          timestamp: new Date().toISOString(),
        });
        throw new CustomError(
          "Organization subscription has expired. Please renew your subscription.",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHENTICATED_ERROR
        );
      }
    }

    // Check if account is locked (Requirement 5.11)
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.accountLockedUntil - new Date()) / 1000 / 60
      );
      throw new CustomError(
        `Account is locked. Please try again in ${remainingTime} minutes`,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Compare password (Requirement 5.10)
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account if max attempts exceeded (Requirement 5.11)
      if (user.failedLoginAttempts >= ACCOUNT_LOCKOUT.MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = new Date(
          Date.now() + ACCOUNT_LOCKOUT.LOCKOUT_DURATION
        );
        await user.save();

        logger.warn("Account locked due to failed login attempts", {
          userId: user._id,
          email: user.email,
          failedAttempts: user.failedLoginAttempts,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          timestamp: new Date().toISOString(),
        });

        throw new CustomError(
          `Account locked due to too many failed login attempts. Please try again in ${getLockoutDurationMinutes()} minutes`,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHENTICATED_ERROR
        );
      }

      await user.save();

      logger.warn("Invalid password attempt", {
        email: user.email,
        failedAttempts: user.failedLoginAttempts,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
      });

      throw new CustomError(
        "Invalid email or password",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date(); // Update last login (Requirement 9.13)

    // Generate JWT tokens (Requirement 5.2, 5.3)
    const { accessToken, refreshToken } = generateTokens(user);

    // Update user with refresh token (Requirement 5.4)
    await updateUserRefreshToken(user, refreshToken);

    // Set httpOnly and secure cookies (Requirement 5.3)
    setTokenCookies(res, accessToken, refreshToken);

    logger.info("Login successful", {
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Format user data (removes sensitive fields)
    const userData = formatUserData(user);

    // Return success response with full user data
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse({ user: userData }, "Login successful"));
  } catch (error) {
    logger.error("Login failed", {
      error: error.message,
      email: req.validated?.body?.email,
    });
    next(error);
  }
});

/**
 * Refresh access and refresh tokens
 * Rotates refresh token on each refresh (Requirement 5.5)
 *
 * @route POST /api/auth/refresh
 * @access Public
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const refreshToken = asyncHandler(async (req, res, next) => {
  try {
    // Extract refresh token from httpOnly cookie
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      throw new CustomError(
        "Refresh token not provided",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    logger.debug("Refresh token attempt");

    // Verify refresh token
    const decoded = verifyToken(oldRefreshToken, "refresh");

    // Find user by ID
    /** @type {UserDocument | null} */
    const user = await User.findById(decoded.userId)
      .select("+refreshToken +refreshTokenExpiry")
      .populate({
        path: "organization",
        select:
          "name email phone address industry size logo isPlatformOrg subscription settings isDeleted",
      })
      .populate({
        path: "department",
        select: "name description manager isDeleted",
      });

    if (!user) {
      throw new CustomError(
        "User not found",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if user is soft-deleted
    if (user.isDeleted) {
      logger.warn("Deleted user attempted to refresh token", {
        userId: user._id,
        email: user.email,
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
      });
      throw new CustomError(
        "User account has been deleted",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if organization exists
    if (!user.organization) {
      throw new CustomError(
        "User organization not found",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if organization is soft-deleted
    if (user.organization.isDeleted) {
      logger.warn("User with deleted organization attempted to refresh token", {
        userId: user._id,
        organizationId: user.organization._id,
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
      });
      throw new CustomError(
        "Organization has been deleted",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if department exists
    if (!user.department) {
      throw new CustomError(
        "User department not found",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check if department is soft-deleted
    if (user.department.isDeleted) {
      logger.warn("User with deleted department attempted to refresh token", {
        userId: user._id,
        departmentId: user.department._id,
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
      });
      throw new CustomError(
        "Department has been deleted",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Check organization subscription (skip for platform organizations)
    if (!user.organization.isPlatformOrg) {
      const subscription = user.organization.subscription;

      // Check subscription status
      if (subscription.status !== "Active") {
        logger.warn(
          "User with inactive subscription attempted to refresh token",
          {
            userId: user._id,
            organizationId: user.organization._id,
            subscriptionStatus: subscription.status,
            ipAddress: req.ip,
            timestamp: new Date().toISOString(),
          }
        );
        throw new CustomError(
          `Organization subscription is ${subscription.status.toLowerCase()}. Please contact your administrator.`,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHENTICATED_ERROR
        );
      }

      // Check subscription expiry
      if (
        subscription.expiresAt &&
        new Date(subscription.expiresAt) < new Date()
      ) {
        logger.warn(
          "User with expired subscription attempted to refresh token",
          {
            userId: user._id,
            organizationId: user.organization._id,
            expiresAt: subscription.expiresAt,
            ipAddress: req.ip,
            timestamp: new Date().toISOString(),
          }
        );
        throw new CustomError(
          "Organization subscription has expired. Please renew your subscription.",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHENTICATED_ERROR
        );
      }
    }

    // Validate refresh token matches stored token
    if (user.refreshToken !== oldRefreshToken) {
      throw new CustomError(
        "Invalid refresh token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Validate refresh token expiry
    if (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date()) {
      throw new CustomError(
        "Refresh token expired",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Generate new tokens (rotate refresh token) (Requirement 5.5)
    const tokens = refreshTokensUtil(oldRefreshToken, user);

    // Update user with new refresh token
    await updateUserRefreshToken(user, tokens.refreshToken);

    // Set new httpOnly cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    logger.info("Token refresh successful", {
      userId: user._id,
      email: user.email,
    });

    // Format user data (removes sensitive fields)
    const userData = formatUserData(user);

    // Return success response with full user data
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse({ user: userData }, "Token refresh successful")
      );
  } catch (error) {
    logger.error("Token refresh failed", {
      error: error.message,
    });
    next(error);
  }
});

/**
 * Logout user
 * Clears refresh token and cookies (Requirement 5.6)
 *
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.userId;

    logger.info("Logout attempt", { userId });

    // Find user and clear refresh token
    const user = await User.findById(userId).select(
      "+refreshToken +refreshTokenExpiry"
    );

    if (user) {
      user.refreshToken = null;
      user.refreshTokenExpiry = null;
      await user.save();
    }

    // Clear httpOnly cookies (Requirement 5.6)
    clearTokenCookies(res);

    logger.info("Logout successful", { userId });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse(null, "Logout successful"));
  } catch (error) {
    logger.error("Logout failed", {
      error: error.message,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Forgot password - send password reset email
 * Generates secure reset token with expiry (Requirement 5.12)
 *
 * @route POST /api/auth/forgot-password
 * @access Public
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  try {
    const { email } = req.validated.body;

    logger.info("Forgot password request", { email });

    // Find user by email
    /** @type {UserDocument | null} */
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordResetToken +passwordResetExpiry"
    );

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
    }

    // Generate password reset token (Requirement 5.12)
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email with token
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
    const frontendUrl = allowedOrigins[0] || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      resetToken,
      resetUrl
    );

    logger.info("Password reset token generated", {
      userId: user._id,
      email: user.email,
    });

    // Return success response (don't reveal if user exists)
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        // In development, include token for testing
        process.env.NODE_ENV === "development" ? { resetToken } : null,
        "If the email exists, a password reset link has been sent"
      )
    );
  } catch (error) {
    logger.error("Forgot password failed", {
      error: error.message,
      email: req.validated.body.email,
    });
    next(error);
  }
});

/**
 * Reset password with token
 * Validates token expiry (Requirement 5.12)
 *
 * @route POST /api/auth/reset-password
 * @access Public
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  try {
    const { token, password } = req.validated.body;

    logger.info("Password reset attempt");

    // Hash the provided token to match stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid reset token
    /** @type {UserDocument | null} */
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() }, // Token not expired
    }).select("+passwordResetToken +passwordResetExpiry +password");

    if (!user) {
      throw new CustomError(
        "Invalid or expired password reset token",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;

    // Clear password reset token
    user.clearPasswordResetToken();

    await user.save();

    logger.info("Password reset successful", {
      userId: user._id,
      email: user.email,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          null,
          "Password reset successful. You can now login with your new password"
        )
      );
  } catch (error) {
    logger.error("Password reset failed", {
      error: error.message,
    });
    next(error);
  }
});

/**
 * Verify email with token
 * Validates token expiry and marks email as verified
 *
 * @route POST /api/auth/verify-email
 * @access Public
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const verifyEmail = asyncHandler(async (req, res, next) => {
  try {
    const { token } = req.validated.body;

    logger.info("Email verification attempt");

    // Hash the provided token to match stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid verification token
    /** @type {UserDocument | null} */
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() }, // Token not expired
    }).select("+emailVerificationToken +emailVerificationExpiry");

    if (!user) {
      throw new CustomError(
        "Invalid or expired email verification token",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      logger.info("Email already verified", {
        userId: user._id,
        email: user.email,
      });

      return res
        .status(HTTP_STATUS.OK)
        .json(
          formatSuccessResponse(
            null,
            "Email is already verified. You can login to your account"
          )
        );
    }

    // Mark email as verified and clear verification token
    user.clearEmailVerificationToken();

    await user.save();

    logger.info("Email verification successful", {
      userId: user._id,
      email: user.email,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          null,
          "Email verification successful. You can now login to your account"
        )
      );
  } catch (error) {
    logger.error("Email verification failed", {
      error: error.message,
    });
    next(error);
  }
});

export default {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
