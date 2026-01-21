import mongoose from "mongoose";
import { User } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  escapeRegex,
  safeAbortTransaction,
} from "../utils/helpers.js";

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
 * @property {Object} profilePicture - Profile picture information
 * @property {string} profilePicture.url - Cloudinary URL
 * @property {string} profilePicture.publicId - Cloudinary public ID
 * @property {Array} skills - User skills
 * @property {string} employeeId - Employee ID
 * @property {Date} dateOfBirth - Date of birth
 * @property {Date} joinedAt - Join date
 * @property {string} phone - Phone number
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - Deletion timestamp
 * @property {mongoose.Types.ObjectId} deletedBy - User who deleted
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} softDelete - Soft delete method
 * @property {Function} restore - Restore method
 * @property {Function} save - Save document
 * @property {Function} toObject - Convert to plain object
 */

/**
 * Standard population configuration for user queries
 * @constant
 */
const USER_POPULATE_CONFIG = [
  {
    path: "organization",
    select: "name email phone address industry size logo isPlatformOrg",
  },
  {
    path: "department",
    select: "name description manager",
  },
];

/**
 * Standard select fields for user queries
 * @constant
 */
const USER_SELECT_FIELDS =
  "firstName lastName email role organization department isPlatformUser isHod profilePicture skills employeeId dateOfBirth joinedAt phone lastLogin createdAt updatedAt isDeleted deletedAt deletedBy";

/**
 * Helper: Validate user belongs to same organization as authenticated user
 * @param {UserDocument} user - User document to validate
 * @param {Object} authenticatedUser - Authenticated user from req.user
 * @param {string} action - Action being performed (for error message)
 * @throws {CustomError} If organization mismatch
 */
const validateOrganizationScope = (user, authenticatedUser, action) => {
  const userOrgId = user.organization?._id || user.organization;
  const authOrgId = authenticatedUser.organization._id;

  if (userOrgId.toString() !== authOrgId.toString()) {
    throw new CustomError(
      `You do not have permission to ${action} this user`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN_ERROR
    );
  }
};

/**
 * Helper: Validate user is not soft-deleted
 * @param {UserDocument} user - User document to validate
 * @param {string} action - Action being performed (for error message)
 * @throws {CustomError} If user is soft-deleted
 */
const validateNotDeleted = (user, action) => {
  if (user.isDeleted) {
    throw new CustomError(
      `Cannot ${action} deleted user`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Helper: Validate user is soft-deleted
 * @param {UserDocument} user - User document to validate
 * @throws {CustomError} If user is not soft-deleted
 */
const validateIsDeleted = (user) => {
  if (!user.isDeleted) {
    throw new CustomError(
      "User is not deleted",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Helper: Find user by ID with error handling
 * @param {string} userId - User ID to find
 * @param {Object} options - Query options
 * @param {boolean} options.includeDeleted - Include soft-deleted users
 * @param {boolean} options.includePassword - Include password field
 * @param {mongoose.ClientSession} options.session - MongoDB session
 * @returns {Promise<UserDocument>} User document
 * @throws {CustomError} If user not found
 */
const findUserById = async (userId, options = {}) => {
  const {
    includeDeleted = false,
    includePassword = false,
    session = null,
  } = options;

  let query = User.findById(userId);

  if (includeDeleted) {
    query = query.withDeleted();
  }

  if (includePassword) {
    query = query.select("+password");
  }

  if (session) {
    query = query.session(session);
  }

  const user = await query;

  if (!user) {
    throw new CustomError(
      `User with ID ${userId} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND_ERROR
    );
  }

  return user;
};

/**
 * Helper: Handle cascade operation result
 * @param {Object} cascadeResult - Result from cascade operation
 * @param {string} operation - Operation type (delete/restore)
 * @param {string} userId - User ID
 * @param {Object} logger - Logger instance
 * @throws {CustomError} If cascade operation failed
 */
const handleCascadeResult = (cascadeResult, operation, userId, logger) => {
  if (!cascadeResult.success) {
    const errorMessage = `Cascade ${operation} failed: ${cascadeResult.errors
      .map((e) => e.message)
      .join(", ")}`;

    logger.error(`Cascade ${operation} failed`, {
      userId,
      errors: cascadeResult.errors,
      warnings: cascadeResult.warnings,
      operationType: `CASCADE_${operation.toUpperCase()}`,
      resourceType: "USER",
    });

    throw new CustomError(
      errorMessage,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * User Controller
 * Handles user management operations: list, read, create, update, delete, restore, changePassword, changeEmail, uploadAvatar
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * Get all users with pagination and filtering
 * Filtered by organization scope
 *
 * @route GET /api/users
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { organization: userOrganization } = req.user;

    // Extract query parameters from validated data (Requirement 41.5)
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      role,
      department,
      isPlatformUser,
      isHod,
    } = req.validated.query || {};

    logger.info("Get all users request", {
      userId: req.user.userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        role,
        department,
        isPlatformUser,
        isHod,
      },
    });

    // Build filter query (Requirement 40.1)
    const filter = {};

    // Filter by organization scope - users can only see users in their organization
    filter.organization = userOrganization._id;

    // Apply search filter with regex escaping to prevent injection
    if (search && search.trim() !== "") {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { firstName: { $regex: escapedSearch, $options: "i" } },
        { lastName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { employeeId: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Apply role filter
    if (role) {
      filter.role = role;
    }

    // Apply department filter
    if (department) {
      filter.department = department;
    }

    // Apply isPlatformUser filter
    if (isPlatformUser !== undefined) {
      filter.isPlatformUser =
        isPlatformUser === "true" || isPlatformUser === true;
    }

    // Apply isHod filter
    if (isHod !== undefined) {
      filter.isHod = isHod === "true" || isHod === true;
    }

    // Get pagination options (Requirement 40.2)
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: USER_POPULATE_CONFIG,
      select: USER_SELECT_FIELDS,
      lean: true,
    };

    let query = User.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await User.paginate(query, options);

    logger.info("Users retrieved successfully", {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          users: result.docs,
          pagination: {
            total: result.totalDocs,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
            nextPage: result.nextPage,
            prevPage: result.prevPage,
          },
        },
        "Users retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Get all users failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
};

/**
 * Get user by ID
 * Filtered by organization scope
 *
 * @route GET /api/users/:userId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    logger.info("Get user by ID request", {
      userId: req.user.userId,
      targetUserId: userId,
      role: req.user.role,
    });

    // Find user (including soft-deleted)
    const user = await findUserById(userId, { includeDeleted: true });

    // Populate and convert to plain object
    await user.populate(USER_POPULATE_CONFIG);
    const userObj = user.toObject();

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(userObj, req.user, "access");

    logger.info("User retrieved successfully", {
      userId: req.user.userId,
      targetUserId: userObj._id,
      targetUserEmail: userObj.email,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse({ user: userObj }, "User retrieved successfully")
      );
  } catch (error) {
    logger.error("Get user by ID failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  }
};

/**
 * Create new user
 * Filtered by organization scope
 * Validates email uniqueness within organization
 * Hashes password on creation (schema hook)
 *
 * @route POST /api/users
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization: userOrganization, userId } = req.user;
    const userData = req.validated.body;

    logger.info("Create user request", {
      userId,
      role: req.user.role,
      userEmail: userData.email,
    });

    // Validate organization scope (Requirement 40.1)
    if (userData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        "You can only create users in your own organization",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Create user with session (Requirement 40.4)
    const user = new User(userData);

    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response (after transaction commit)
    await user.populate(USER_POPULATE_CONFIG);

    logger.info("User created successfully", {
      userId,
      createdUserId: user._id,
      createdUserEmail: user.email,
      operationType: "CREATE",
      resourceType: "USER",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(formatSuccessResponse({ user }, "User created successfully"));
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Create user failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Update user
 * Filtered by organization scope
 * Validates email uniqueness within organization
 * Hashes password on update (schema hook)
 *
 * @route PUT /api/users/:userId
 * @access Private (SuperAdmin, Admin, Manager - own profile)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const updateData = req.validated.body;

    logger.info("Update user request", {
      userId: req.user.userId,
      targetUserId: userId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Find user with session (Requirement 40.4)
    const user = await findUserById(userId, { session });

    // Validate user is not soft-deleted
    validateNotDeleted(user, "update");

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(user, req.user, "update");

    // Update user fields (let Mongoose handle validation)
    Object.keys(updateData).forEach((key) => {
      user[key] = updateData[key];
    });

    // Save user with session (Requirement 40.4)
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response (after transaction commit)
    await user.populate(USER_POPULATE_CONFIG);

    logger.info("User updated successfully", {
      userId: req.user.userId,
      targetUserId: user._id,
      targetUserEmail: user.email,
      operationType: "UPDATE",
      resourceType: "USER",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse({ user }, "User updated successfully"));
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Update user failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete user with cascade operations
 * Filtered by organization scope
 *
 * @route DELETE /api/users/:userId
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { userId: currentUserId } = req.user;

    logger.info("Delete user request", {
      userId: currentUserId,
      targetUserId: userId,
      role: req.user.role,
    });

    // Find user
    const user = await findUserById(userId, { session });

    // Validate user is not already deleted
    if (user.isDeleted) {
      throw new CustomError(
        "User is already deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(user, req.user, "delete");

    // Perform cascade delete with validation (Requirement 40.5, 40.6)
    const cascadeResult = await User.cascadeDelete(
      userId,
      currentUserId,
      session,
      {
        skipValidation: false,
        force: false,
      }
    );

    // Handle cascade result
    handleCascadeResult(cascadeResult, "delete", currentUserId, logger);

    // Commit transaction (Requirement 40.4)
    await session.commitTransaction();

    logger.info("User deleted successfully", {
      userId: currentUserId,
      targetUserId: userId,
      targetUserEmail: user.email,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "USER",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          userId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        "User deleted successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Delete user failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Restore soft-deleted user with cascade operations
 * Filtered by organization scope
 *
 * @route PUT /api/users/:userId/restore
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { userId: currentUserId } = req.user;

    logger.info("Restore user request", {
      userId: currentUserId,
      targetUserId: userId,
      role: req.user.role,
    });

    // Find user (including soft-deleted)
    const user = await findUserById(userId, { includeDeleted: true, session });

    // Validate user is deleted
    validateIsDeleted(user);

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(user, req.user, "restore");

    // Perform cascade restore with validation (Requirement 40.5, 40.6)
    const cascadeResult = await User.cascadeRestore(userId, session, {
      skipValidation: false,
      validateParents: true,
    });

    // Handle cascade result
    handleCascadeResult(cascadeResult, "restore", currentUserId, logger);

    // Commit transaction (Requirement 40.4)
    await session.commitTransaction();

    logger.info("User restored successfully", {
      userId: currentUserId,
      targetUserId: userId,
      targetUserEmail: user.email,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "USER",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          userId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        "User restored successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Restore user failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Change user password
 * Validates old password before updating
 * Hashes new password (schema hook)
 *
 * @route PUT /api/users/:userId/password
 * @access Private (User - own profile, SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const changePassword = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.validated.body;

    logger.info("Change password request", {
      userId: req.user.userId,
      targetUserId: userId,
      role: req.user.role,
    });

    // Find user with password field
    const user = await findUserById(userId, { includePassword: true, session });

    // Validate user is not soft-deleted
    validateNotDeleted(user, "change password for");

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(user, req.user, "change password for");

    // Verify old password (Requirement 39.9)
    const isPasswordValid = await user.comparePassword(oldPassword);

    if (!isPasswordValid) {
      throw new CustomError(
        "Old password is incorrect",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;

    // Save user with session (Requirement 40.4)
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();

    logger.info("Password changed successfully", {
      userId: req.user.userId,
      targetUserId: user._id,
      targetUserEmail: user.email,
      operationType: "PASSWORD_CHANGE",
      resourceType: "USER",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse(null, "Password changed successfully"));
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Change password failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Change user email
 * Validates email uniqueness within organization
 * Requires email verification (Requirement 39.10)
 *
 * @route PUT /api/users/:userId/email
 * @access Private (User - own profile, SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const changeEmail = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { newEmail } = req.validated.body;

    logger.info("Change email request", {
      userId: req.user.userId,
      targetUserId: userId,
      role: req.user.role,
      newEmail,
    });

    // Find user with session
    const user = await findUserById(userId, { session });

    // Validate user is not soft-deleted
    validateNotDeleted(user, "change email for");

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(user, req.user, "change email for");

    // Store old email for logging
    const oldEmail = user.email;

    // Update email
    user.email = newEmail.toLowerCase();

    // Save user with session (Requirement 40.4)
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();

    logger.info("Email changed successfully", {
      userId: req.user.userId,
      targetUserId: user._id,
      oldEmail,
      newEmail,
      operationType: "EMAIL_CHANGE",
      resourceType: "USER",
    });

    // TODO: Send email verification to new email (will be implemented in Task 18.1)
    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          null,
          "Email changed successfully. Please verify your new email address"
        )
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Change email failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Upload user avatar
 * Updates profile picture URL and publicId
 *
 * @route POST /api/users/:userId/avatar
 * @access Private (User - own profile, SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const uploadAvatar = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { url, publicId } = req.validated.body;

    logger.info("Upload avatar request", {
      userId: req.user.userId,
      targetUserId: userId,
      role: req.user.role,
    });

    // Find user with session
    const user = await findUserById(userId, { session });

    // Validate user is not soft-deleted
    validateNotDeleted(user, "upload avatar for");

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(user, req.user, "upload avatar for");

    // Update profile picture
    user.profilePicture = {
      url,
      publicId,
    };

    // Save user with session (Requirement 40.4)
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response (after transaction commit)
    await user.populate(USER_POPULATE_CONFIG);

    logger.info("Avatar uploaded successfully", {
      userId: req.user.userId,
      targetUserId: user._id,
      targetUserEmail: user.email,
      operationType: "AVATAR_UPLOAD",
      resourceType: "USER",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse({ user }, "Avatar uploaded successfully"));
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Upload avatar failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      targetUserId: req.params.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  changePassword,
  changeEmail,
  uploadAvatar,
};
