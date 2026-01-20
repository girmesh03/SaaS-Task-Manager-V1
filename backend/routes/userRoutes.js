import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  changePassword,
  changeEmail,
  uploadAvatar,
} from "../controllers/userController.js";
import {
  listUsersValidator,
  getUserByIdValidator,
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  restoreUserValidator,
  changePasswordValidator,
  changeEmailValidator,
  uploadAvatarValidator,
} from "../middlewares/validators/userValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import { User } from "../models/index.js";

/**
 * User Routes
 * Defines routes for user management operations
 * Applies authentication, validation, and authorization middleware in correct order
 *
 * MIDDLEWARE ORDER (Requirement 39.3):
 * 1. Authentication (authMiddleware) - Verify JWT token
 * 2. Validation (validators + validate) - Validate request data
 * 3. Authorization (authorize) - Check permissions
 * 4. Controller - Execute business logic
 *
 * Requirements: 39.1, 39.2, 39.3, 39.5
 */

const router = express.Router();

/**
 * Helper function to get user document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} User document or null
 */
const getUserDocument = async (req) => {
  const userId = req.params.userId;
  if (!userId) return null;

  const user = await User.findById(userId).withDeleted().lean();
  return user;
};

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware listUsersValidator - Validate query parameters
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/",
  authMiddleware,
  listUsersValidator,
  validate,
  authorize("users", "read"),
  getAllUsers
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware getUserByIdValidator - Validate user ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/:userId",
  authMiddleware,
  getUserByIdValidator,
  validate,
  authorize("users", "read", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  getUserById
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware createUserValidator - Validate user data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.post(
  "/",
  authMiddleware,
  createUserValidator,
  validate,
  authorize("users", "create"),
  createUser
);

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user
 * @access  Private (SuperAdmin, Admin, Manager - own profile)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware updateUserValidator - Validate update data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:userId",
  authMiddleware,
  updateUserValidator,
  validate,
  authorize("users", "update", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  updateUser
);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Soft delete user with cascade operations
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware deleteUserValidator - Validate user ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.delete(
  "/:userId",
  authMiddleware,
  deleteUserValidator,
  validate,
  authorize("users", "delete", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  deleteUser
);

/**
 * @route   PUT /api/users/:userId/restore
 * @desc    Restore soft-deleted user with cascade operations
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware restoreUserValidator - Validate user ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:userId/restore",
  authMiddleware,
  restoreUserValidator,
  validate,
  authorize("users", "restore", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  restoreUser
);

/**
 * @route   PUT /api/users/:userId/password
 * @desc    Change user password
 * @access  Private (User - own profile, SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware changePasswordValidator - Validate password data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:userId/password",
  authMiddleware,
  changePasswordValidator,
  validate,
  authorize("users", "update", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  changePassword
);

/**
 * @route   PUT /api/users/:userId/email
 * @desc    Change user email
 * @access  Private (User - own profile, SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware changeEmailValidator - Validate email data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:userId/email",
  authMiddleware,
  changeEmailValidator,
  validate,
  authorize("users", "update", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  changeEmail
);

/**
 * @route   POST /api/users/:userId/avatar
 * @desc    Upload user avatar
 * @access  Private (User - own profile, SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware uploadAvatarValidator - Validate avatar data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.post(
  "/:userId/avatar",
  authMiddleware,
  uploadAvatarValidator,
  validate,
  authorize("users", "update", {
    checkScope: true,
    getDocument: getUserDocument,
  }),
  uploadAvatar
);

export default router;
