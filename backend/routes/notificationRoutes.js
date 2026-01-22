import express from "express";
import {
  getAllNotifications,
  getNotificationById,
  markAsRead,
  batchMarkAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import {
  listNotificationsValidator,
  getNotificationByIdValidator,
  markAsReadValidator,
  batchMarkAsReadValidator,
  deleteNotificationValidator,
} from "../middlewares/validators/notificationValidators.js";
import { validate } from "../middlewares/validation.js";
import { findResourceById } from "../utils/controllerHelpers.js";
import { Notification } from "../models/index.js";

/**
 * Notification Routes
 * Routes for notification management (system notifications for users)
 * Mounted at: /api/notifications
 *
 * MIDDLEWARE ORDER (Requirement 39.3):
 * 1. Authentication (authMiddleware) - Verify JWT token
 * 2. Authorization (authorize) - Check permissions
 * 3. Validation (validators + validate) - Validate request data
 * 4. Controller - Execute business logic
 *
 * Requirements: 39.1, 39.2, 39.3, 39.5
 */

const router = express.Router();

// Apply authentication to all routes (Requirement 39.1)
router.use(authMiddleware);

/**
 * Helper function to get notification document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} Notification document or null
 */
const getNotificationDocument = async (req) => {
  const { notificationId } = req.params;
  if (!notificationId) return null;

  return findResourceById(Notification, notificationId, {
    includeDeleted: true,
  });
};

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @query   {boolean} deleted - Include deleted notifications (true/false/"only")
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10)
 * @query   {string} search - Search query for notification title or message
 * @query   {string} type - Filter by notification type (TASK_CREATED, TASK_UPDATED, etc.)
 * @query   {boolean} isRead - Filter by read status (true/false)
 * @query   {string} recipient - Filter by recipient user ID
 * @query   {string} organization - Filter by organization ID
 * @query   {string} department - Filter by department ID
 * @query   {string} entityModel - Filter by entity model type (Task, User, etc.)
 */
router.get(
  "/",
  authorize("notifications", "read"),
  listNotificationsValidator,
  validate,
  getAllNotifications
);

/**
 * @route   PUT /api/notifications/batch-read
 * @desc    Batch mark notifications as read
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @body    {Array<string>} notificationIds - Array of notification IDs to mark as read (required)
 * @note    Users can only mark their own notifications as read
 * @note    SuperAdmin/Admin can mark any notification in their scope as read
 */
router.put(
  "/batch-read",
  authorize("notifications", "update"),
  batchMarkAsReadValidator,
  validate,
  batchMarkAsRead
);

/**
 * @route   GET /api/notifications/:notificationId
 * @desc    Get notification by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @param   {string} notificationId - Notification ID
 * @note    Users can only access notifications where they are recipients
 */
router.get(
  "/:notificationId",
  authorize("notifications", "read", {
    checkScope: true,
    getDocument: getNotificationDocument,
  }),
  getNotificationByIdValidator,
  validate,
  getNotificationById
);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @param   {string} notificationId - Notification ID
 * @note    Users can only mark their own notifications as read
 * @note    SuperAdmin/Admin can mark any notification in their scope as read
 */
router.put(
  "/:notificationId/read",
  authorize("notifications", "update", {
    checkScope: true,
    getDocument: getNotificationDocument,
  }),
  markAsReadValidator,
  validate,
  markAsRead
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Soft delete notification with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @param   {string} notificationId - Notification ID
 * @note    SuperAdmin/Admin can delete any notification in their scope
 * @note    Manager/User can only delete notifications where they are recipients
 */
router.delete(
  "/:notificationId",
  authorize("notifications", "delete", {
    checkScope: true,
    getDocument: getNotificationDocument,
  }),
  deleteNotificationValidator,
  validate,
  deleteNotification
);

export default router;
