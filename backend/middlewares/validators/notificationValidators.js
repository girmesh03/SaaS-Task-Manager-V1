import { body, param, query } from "express-validator";
import {
  NOTIFICATION_VALIDATION,
  NOTIFICATION_TYPES,
  NOTIFICATION_TITLE_VALIDATION,
  ENTITY_MODEL_TYPES,
  COMMON_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import { Notification, User, Department } from "../../models/index.js";

/**
 * Notification Validators
 * Validates notification-related requests (create, update, mark as read)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.8, 41.9, 41.10
 */

/**
 * List Notifications Validator
 * Validates query parameters for listing notifications
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listNotificationsValidator = [
  query("deleted")
    .optional()
    .isBoolean()
    .withMessage("Deleted must be a boolean value")
    .toBoolean(),

  query("page")
    .optional()
    .isInt({ min: SEARCH_VALIDATION.PAGE.MIN, max: SEARCH_VALIDATION.PAGE.MAX })
    .withMessage(
      `Page must be between ${SEARCH_VALIDATION.PAGE.MIN} and ${SEARCH_VALIDATION.PAGE.MAX}`
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: SEARCH_VALIDATION.LIMIT.MIN,
      max: SEARCH_VALIDATION.LIMIT.MAX,
    })
    .withMessage(
      `Limit must be between ${SEARCH_VALIDATION.LIMIT.MIN} and ${SEARCH_VALIDATION.LIMIT.MAX}`
    )
    .toInt(),

  query("search")
    .optional()
    .trim()
    .isLength({
      min: SEARCH_VALIDATION.QUERY.MIN_LENGTH,
      max: SEARCH_VALIDATION.QUERY.MAX_LENGTH,
    })
    .withMessage(
      `Search query must be between ${SEARCH_VALIDATION.QUERY.MIN_LENGTH} and ${SEARCH_VALIDATION.QUERY.MAX_LENGTH} characters`
    ),

  query("type")
    .optional()
    .trim()
    .isIn(Object.values(NOTIFICATION_TYPES))
    .withMessage("Invalid notification type filter"),

  query("isRead")
    .optional()
    .isBoolean()
    .withMessage("isRead must be a boolean value")
    .toBoolean(),

  query("recipient")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid recipient ID format"),

  query("organization")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format"),

  query("department")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format"),

  query("entityModel")
    .optional()
    .trim()
    .isIn(Object.values(ENTITY_MODEL_TYPES))
    .withMessage("Invalid entity model filter"),
];

/**
 * Create Notification Validator
 */
export const createNotificationValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Notification title is required")
    .isLength({ max: NOTIFICATION_TITLE_VALIDATION.MAX_LENGTH })
    .withMessage(
      `Title must not exceed ${NOTIFICATION_TITLE_VALIDATION.MAX_LENGTH} characters`
    ),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Notification message is required")
    .isLength({
      min: NOTIFICATION_VALIDATION.MESSAGE.MIN_LENGTH,
      max: NOTIFICATION_VALIDATION.MESSAGE.MAX_LENGTH,
    })
    .withMessage(
      `Message must be between ${NOTIFICATION_VALIDATION.MESSAGE.MIN_LENGTH} and ${NOTIFICATION_VALIDATION.MESSAGE.MAX_LENGTH} characters`
    ),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("Notification type is required")
    .isIn(Object.values(NOTIFICATION_TYPES))
    .withMessage("Invalid notification type"),

  body("recipients")
    .notEmpty()
    .withMessage("At least one recipient is required")
    .isArray()
    .withMessage("Recipients must be an array")
    .custom((value) => {
      if (value.length < NOTIFICATION_VALIDATION.RECIPIENTS.MIN_COUNT) {
        throw new Error(
          `At least ${NOTIFICATION_VALIDATION.RECIPIENTS.MIN_COUNT} recipient is required`
        );
      }
      if (value.length > NOTIFICATION_VALIDATION.RECIPIENTS.MAX_COUNT) {
        throw new Error(
          `Maximum ${NOTIFICATION_VALIDATION.RECIPIENTS.MAX_COUNT} recipients allowed`
        );
      }
      // Check for uniqueness
      const uniqueRecipients = new Set(value.map((r) => r.toString()));
      if (uniqueRecipients.size !== value.length) {
        throw new Error("Recipients must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      // SCOPING: Check if all recipients exist and belong to req.user's organization and department
      const recipients = await User.find({ _id: { $in: value } })
        .withDeleted()
        .lean();
      if (recipients.length !== value.length) {
        throw new Error("One or more recipients not found");
      }
      const invalidRecipients = recipients.filter(
        (recipient) =>
          recipient.isDeleted ||
          recipient.organization.toString() !==
            req.user.organization._id.toString() ||
          recipient.department.toString() !== req.user.department._id.toString()
      );
      if (invalidRecipients.length > 0) {
        throw new Error(
          "All recipients must belong to your organization and department and not be deleted"
        );
      }
      return true;
    }),

  body("entity")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid entity ID format"),

  body("entityModel")
    .optional()
    .trim()
    .isIn(Object.values(ENTITY_MODEL_TYPES))
    .withMessage("Invalid entity model"),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create notifications in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error(
          "You can only create notifications in your own organization"
        );
      }
      return true;
    }),

  body("department")
    .trim()
    .notEmpty()
    .withMessage("Department is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value, { req }) => {
      // Check if department exists and belongs to organization
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (department.isDeleted) {
        throw new Error("Cannot assign notification to deleted department");
      }
      // SCOPING: Department must belong to req.user's organization
      if (
        department.organization.toString() !==
        req.user.organization._id.toString()
      ) {
        throw new Error("Department must belong to your organization");
      }
      return true;
    }),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),
];

/**
 * Update Notification Validator
 */
export const updateNotificationValidator = [
  param("notificationId")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid notification ID format")
    .custom(async (value) => {
      // Check if notification exists
      const notification = await Notification.findById(value)
        .withDeleted()
        .lean();
      if (!notification) {
        throw new Error("Notification not found");
      }
      if (notification.isDeleted) {
        throw new Error("Cannot update deleted notification");
      }
      return true;
    }),

  body("isRead")
    .optional()
    .isBoolean()
    .withMessage("isRead must be a boolean value"),
];

/**
 * Mark Notification As Read Validator
 */
export const markAsReadValidator = [
  param("notificationId")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid notification ID format")
    .custom(async (value) => {
      const notification = await Notification.findById(value)
        .withDeleted()
        .lean();
      if (!notification) {
        throw new Error("Notification not found");
      }
      if (notification.isDeleted) {
        throw new Error("Cannot mark deleted notification as read");
      }
      return true;
    }),
];

/**
 * Batch Mark Notifications As Read Validator
 */
export const batchMarkAsReadValidator = [
  body("notificationIds")
    .notEmpty()
    .withMessage("Notification IDs are required")
    .isArray()
    .withMessage("Notification IDs must be an array")
    .custom((value) => {
      if (value.length === 0) {
        throw new Error("At least one notification ID is required");
      }
      // Validate each ID format
      for (const id of value) {
        if (!COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN.test(id)) {
          throw new Error("Invalid notification ID format");
        }
      }
      return true;
    })
    .custom(async (value) => {
      // Check if all notifications exist
      const notifications = await Notification.find({ _id: { $in: value } })
        .withDeleted()
        .lean();
      if (notifications.length !== value.length) {
        throw new Error("One or more notifications not found");
      }
      const deletedNotifications = notifications.filter((n) => n.isDeleted);
      if (deletedNotifications.length > 0) {
        throw new Error("Cannot mark deleted notifications as read");
      }
      return true;
    }),
];

/**
 * Delete Notification Validator
 */
export const deleteNotificationValidator = [
  param("notificationId")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid notification ID format")
    .custom(async (value) => {
      const notification = await Notification.findById(value)
        .withDeleted()
        .lean();
      if (!notification) {
        throw new Error("Notification not found");
      }
      if (notification.isDeleted) {
        throw new Error("Notification is already deleted");
      }
      return true;
    }),
];

/**
 * Restore Notification Validator
 */
export const restoreNotificationValidator = [
  param("notificationId")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid notification ID format")
    .custom(async (value) => {
      const notification = await Notification.findById(value)
        .withDeleted()
        .lean();
      if (!notification) {
        throw new Error("Notification not found");
      }
      if (!notification.isDeleted) {
        throw new Error("Notification is not deleted");
      }
      // Validate parent department is not deleted
      const department = await Department.findById(notification.department)
        .withDeleted()
        .lean();
      if (department && department.isDeleted) {
        throw new Error("Cannot restore notification with deleted department");
      }
      return true;
    }),
];

/**
 * Get Notification By ID Validator
 */
export const getNotificationByIdValidator = [
  param("notificationId")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid notification ID format")
    .custom(async (value) => {
      // Check if notification exists (including soft-deleted)
      const notification = await Notification.findById(value)
        .withDeleted()
        .lean();
      if (!notification) {
        throw new Error("Notification not found");
      }
      return true;
    }),
];

export default {
  listNotificationsValidator,
  createNotificationValidator,
  updateNotificationValidator,
  markAsReadValidator,
  batchMarkAsReadValidator,
  deleteNotificationValidator,
  restoreNotificationValidator,
  getNotificationByIdValidator,
};
