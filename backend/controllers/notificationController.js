import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Notification } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES, USER_ROLES } from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  safeAbortTransaction,
  escapeRegex,
} from "../utils/helpers.js";
import {
  validateOrganizationScope,
  validateNotDeleted,
  findResourceById,
  handleCascadeResult,
} from "../utils/controllerHelpers.js";
import { emitToUser } from "../utils/socketEmitter.js";

/**
 * Notification Controller
 * Handles notification management operations: list, read, mark as read, batch mark as read, delete
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * @typedef {Object} NotificationDocument
 * @property {mongoose.Types.ObjectId} _id - Notification ID
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} type - Notification type
 * @property {boolean} isRead - Read status
 * @property {Array<mongoose.Types.ObjectId>} recipients - User recipients
 * @property {mongoose.Types.ObjectId} entity - Entity reference
 * @property {string} entityModel - Entity model type
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} department - Department reference
 * @property {Date} expiresAt - Expiry timestamp
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - Deletion timestamp
 * @property {mongoose.Types.ObjectId} deletedBy - User who deleted
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} save - Save document
 * @property {Function} populate - Populate references
 * @property {Function} toObject - Convert to plain object
 */

/**
 * Get all notifications with pagination and filtering
 * Filtered by organization and department scope
 * Users can only see notifications where they are recipients
 *
 * @route GET /api/notifications
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllNotifications = asyncHandler(async (req, res, next) => {
  try {
    const {
      organization: userOrganization,
      department: userDepartment,
      userId,
      isHod,
    } = req.user;

    // Extract query parameters from validated data
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      type,
      isRead,
      recipient,
      organization,
      department,
      entityModel,
    } = req.validated.query || {};

    logger.info("Get all notifications request", {
      userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        type,
        isRead,
        recipient,
        organization,
        department,
        entityModel,
      },
    });

    // Build filter query
    const filter = {};

    // Organization Scope (always applied)
    filter.organization = userOrganization._id;

    // Department Scope
    // If explicit department filter provided, use it (validated by validator/middleware to be within org)
    // If no explicit filter:
    // - If SuperAdmin/Admin/Manager: Can see all departments they have access to
    // - If User (not HOD): Scoped to their department
    if (department) {
      filter.department = department;
    } else if (!isHod && req.user.role === USER_ROLES.USER) {
      filter.department = userDepartment._id;
    }

    // Recipients Filter - Users can only see notifications where they are recipients
    // SuperAdmin/Admin/Manager can see all notifications in their scope
    if (req.user.role === USER_ROLES.USER) {
      filter.recipients = userId;
    } else if (recipient) {
      // If explicit recipient filter provided (for Admin/Manager)
      filter.recipients = recipient;
    }

    // Type Filter
    if (type) {
      filter.type = type;
    }

    // Read Status Filter
    if (isRead !== undefined) {
      filter.isRead = isRead;
    }

    // Entity Model Filter
    if (entityModel) {
      filter.entityModel = entityModel;
    }

    // Search Filter (Title, Message)
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { message: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: [
        {
          path: "recipients",
          select: "firstName lastName email profilePicture",
        },
        {
          path: "organization",
          select: "name",
        },
        {
          path: "department",
          select: "name",
        },
      ],
      lean: true,
    };

    let query = Notification.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await Notification.paginate(query, options);

    logger.info("Notifications retrieved successfully", {
      userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          notifications: result.docs,
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
        "Notifications retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Get all notifications failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Get notification by ID
 * Filtered by organization scope
 * Users can only access notifications where they are recipients
 *
 * @route GET /api/notifications/:notificationId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getNotificationById = asyncHandler(async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.user;

    logger.info("Get notification by ID request", {
      userId,
      notificationId,
      role: req.user.role,
    });

    // Find notification (including soft-deleted) using helper
    const notification = await findResourceById(Notification, notificationId, {
      includeDeleted: true,
      resourceType: "Notification",
    });

    // Populate and convert to plain object
    await notification.populate([
      {
        path: "recipients",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "organization",
        select: "name",
      },
      {
        path: "department",
        select: "name",
      },
    ]);
    const notificationObj = notification.toObject();

    // Validate organization scope
    validateOrganizationScope(
      notificationObj,
      req.user,
      "access",
      "notification"
    );

    // Validate user is a recipient (unless SuperAdmin/Admin/Manager)
    if (req.user.role === USER_ROLES.USER) {
      const isRecipient = notificationObj.recipients.some(
        (recipient) => recipient._id.toString() === userId
      );
      if (!isRecipient) {
        throw new CustomError(
          "You do not have permission to access this notification",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN_ERROR
        );
      }
    }

    logger.info("Notification retrieved successfully", {
      userId,
      notificationId: notificationObj._id,
      type: notificationObj.type,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { notification: notificationObj },
          "Notification retrieved successfully"
        )
      );
  } catch (error) {
    logger.error("Get notification by ID failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      notificationId: req.params.notificationId,
    });
    next(error);
  }
});

/**
 * Mark notification as read
 * Transactional
 * Filtered by organization scope
 * Users can only mark their own notifications as read
 *
 * @route PUT /api/notifications/:notificationId/read
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const markAsRead = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { notificationId } = req.params;
    const { userId } = req.user;

    logger.info("Mark notification as read request", {
      userId,
      notificationId,
      role: req.user.role,
    });

    // Find notification with session
    const notification = await findResourceById(Notification, notificationId, {
      session,
      resourceType: "Notification",
    });

    // Validate notification is not soft-deleted
    validateNotDeleted(notification, "mark as read", "notification");

    // Validate organization scope
    validateOrganizationScope(notification, req.user, "update", "notification");

    // Validate user is a recipient (unless SuperAdmin/Admin/Manager)
    if (req.user.role === USER_ROLES.USER) {
      const isRecipient = notification.recipients.some(
        (recipient) => recipient.toString() === userId
      );
      if (!isRecipient) {
        throw new CustomError(
          "You can only mark your own notifications as read",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN_ERROR
        );
      }
    }

    // Mark as read using static method
    const updatedNotification = await Notification.markAsRead(
      notificationId,
      session
    );

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await updatedNotification.populate([
      {
        path: "recipients",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "organization",
        select: "name",
      },
      {
        path: "department",
        select: "name",
      },
    ]);

    logger.info("Notification marked as read successfully", {
      userId,
      notificationId: updatedNotification._id,
      operationType: "MARK_AS_READ",
      resourceType: "NOTIFICATION",
    });

    // Emit Socket.IO event for real-time updates
    emitToUser(
      "notification:read",
      { notification: updatedNotification },
      userId
    );

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { notification: updatedNotification },
          "Notification marked as read successfully"
        )
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Mark notification as read failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      notificationId: req.params.notificationId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Batch mark notifications as read
 * Transactional
 * Filtered by organization scope
 * Users can only mark their own notifications as read
 *
 * @route PUT /api/notifications/batch-read
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const batchMarkAsRead = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { notificationIds } = req.validated.body;
    const { userId } = req.user;

    logger.info("Batch mark notifications as read request", {
      userId,
      notificationCount: notificationIds.length,
      role: req.user.role,
    });

    // Find all notifications with session
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
    }).session(session);

    if (notifications.length !== notificationIds.length) {
      throw new CustomError(
        "One or more notifications not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Validate all notifications
    for (const notification of notifications) {
      // Validate not deleted
      if (notification.isDeleted) {
        throw new CustomError(
          "Cannot mark deleted notifications as read",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate organization scope
      validateOrganizationScope(
        notification,
        req.user,
        "update",
        "notification"
      );

      // Validate user is a recipient (unless SuperAdmin/Admin/Manager)
      if (req.user.role === USER_ROLES.USER) {
        const isRecipient = notification.recipients.some(
          (recipient) => recipient.toString() === userId
        );
        if (!isRecipient) {
          throw new CustomError(
            "You can only mark your own notifications as read",
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.FORBIDDEN_ERROR
          );
        }
      }
    }

    // Batch mark as read using static method
    const result = await Notification.batchMarkAsRead(notificationIds, session);

    // Commit transaction
    await session.commitTransaction();

    logger.info("Notifications marked as read successfully", {
      userId,
      updatedCount: result.modifiedCount,
      operationType: "BATCH_MARK_AS_READ",
      resourceType: "NOTIFICATION",
    });

    // Emit Socket.IO event for real-time updates
    emitToUser(
      "notifications:batch-read",
      { notificationIds, updatedCount: result.modifiedCount },
      userId
    );

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          updatedCount: result.modifiedCount,
          notificationIds,
        },
        "Notifications marked as read successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Batch mark notifications as read failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Soft delete notification with cascade operations
 * Filtered by organization scope
 * SuperAdmin/Admin can delete any notification in their scope
 * Manager/User can delete notifications where they are recipients
 *
 * @route DELETE /api/notifications/:notificationId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { notificationId } = req.params;
    const { userId } = req.user;

    logger.info("Delete notification request", {
      userId,
      notificationId,
      role: req.user.role,
    });

    // Find notification
    const notification = await findResourceById(Notification, notificationId, {
      session,
      resourceType: "Notification",
    });

    // Validate not already deleted
    if (notification.isDeleted) {
      throw new CustomError(
        "Notification is already deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope
    validateOrganizationScope(notification, req.user, "delete", "notification");

    // Validate user is a recipient (unless SuperAdmin/Admin)
    if (
      req.user.role === USER_ROLES.MANAGER ||
      req.user.role === USER_ROLES.USER
    ) {
      const isRecipient = notification.recipients.some(
        (recipient) => recipient.toString() === userId
      );
      if (!isRecipient) {
        throw new CustomError(
          "You can only delete your own notifications",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN_ERROR
        );
      }
    }

    // Perform cascade delete with validation
    const cascadeResult = await Notification.cascadeDelete(
      notificationId,
      userId,
      session,
      {
        skipValidation: false,
        force: false,
      }
    );

    // Handle cascade result
    handleCascadeResult(
      cascadeResult,
      "delete",
      userId,
      logger,
      "NOTIFICATION"
    );

    // Commit transaction
    await session.commitTransaction();

    logger.info("Notification deleted successfully", {
      userId,
      notificationId,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "NOTIFICATION",
    });

    // Emit Socket.IO event for real-time updates
    emitToUser(
      "notification:deleted",
      { notificationId, deletedCount: cascadeResult.deletedCount },
      userId
    );

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          notificationId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        "Notification deleted successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Delete notification failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      notificationId: req.params.notificationId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

export default {
  getAllNotifications,
  getNotificationById,
  markAsRead,
  batchMarkAsRead,
  deleteNotification,
};
