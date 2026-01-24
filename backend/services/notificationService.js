import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { NOTIFICATION_TYPES, SOCKET_EVENTS } from "../utils/constants.js";
import { getSocketIO } from "../utils/socketInstance.js";

/**
 * Notification Service
 * Handles notification creation for task assignments, task updates, comments, mentions, and system alerts
 * Validates recipients belong to same organization and department
 * Emits Socket.IO events for real-time notifications
 *
 * Requirements: 48.4, 48.5, 48.6, 48.7, 48.8
 */

/**
 * Logging message constants
 * @constant
 * @private
 */
const LOG_MESSAGES = {
  VALIDATION_FAILED: "Recipient validation failed",
  NO_RECIPIENTS: "No recipients after filtering",
  NOTIFICATION_CREATED: "Notification created successfully",
  NOTIFICATION_FAILED: "Failed to create notification",
  SOCKET_EMIT_SUCCESS: "Notification emitted via Socket.IO",
  SOCKET_EMIT_FAILED: "Failed to emit notification via Socket.IO",
  SOCKET_UNAVAILABLE:
    "Socket.IO instance not available, skipping real-time emit",
};

/**
 * Validate recipients belong to same organization and department
 * @private
 * @param {Array<mongoose.Types.ObjectId>} recipientIds - Array of recipient user IDs
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} departmentId - Department ID
 * @param {mongoose.ClientSession} [session=null] - MongoDB session
 * @returns {Promise<{valid: boolean, invalidRecipients: Array<mongoose.Types.ObjectId>, message: string}>} Validation result
 * @throws {Error} If database query fails
 */
const validateRecipients = async (
  recipientIds,
  organizationId,
  departmentId,
  session = null
) => {
  try {
    // Fetch all recipients
    const recipients = await User.find({
      _id: { $in: recipientIds },
    })
      .select("_id organization department isDeleted")
      .session(session);

    // Check if all recipients exist
    if (recipients.length !== recipientIds.length) {
      const foundIds = recipients.map((r) => r._id.toString());
      const invalidRecipients = recipientIds.filter(
        (id) => !foundIds.includes(id.toString())
      );

      return {
        valid: false,
        invalidRecipients,
        message: "One or more recipients not found",
      };
    }

    // Check if any recipients are deleted
    const deletedRecipients = recipients.filter((r) => r.isDeleted);
    if (deletedRecipients.length > 0) {
      return {
        valid: false,
        invalidRecipients: deletedRecipients.map((r) => r._id),
        message: "One or more recipients are deleted",
      };
    }

    // Check if all recipients belong to same organization
    const invalidOrgRecipients = recipients.filter(
      (r) => r.organization.toString() !== organizationId.toString()
    );
    if (invalidOrgRecipients.length > 0) {
      return {
        valid: false,
        invalidRecipients: invalidOrgRecipients.map((r) => r._id),
        message: "All recipients must belong to the same organization",
      };
    }

    // Check if all recipients belong to same department
    const invalidDeptRecipients = recipients.filter(
      (r) => r.department.toString() !== departmentId.toString()
    );
    if (invalidDeptRecipients.length > 0) {
      return {
        valid: false,
        invalidRecipients: invalidDeptRecipients.map((r) => r._id),
        message: "All recipients must belong to the same department",
      };
    }

    return {
      valid: true,
      invalidRecipients: [],
      message: "All recipients are valid",
    };
  } catch (error) {
    logger.error("Failed to validate recipients", {
      error: error.message,
      stack: error.stack,
      recipientIds,
      organizationId,
      departmentId,
    });

    return {
      valid: false,
      invalidRecipients: [],
      message: error.message,
    };
  }
};

/**
 * Emit Socket.IO event for real-time notification
 * @private
 * @param {Object} notification - Notification document
 * @returns {boolean} True if emission successful, false otherwise
 */
const emitNotificationEvent = (notification) => {
  try {
    const io = getSocketIO();

    if (!io) {
      logger.warn(LOG_MESSAGES.SOCKET_UNAVAILABLE, {
        notificationId: notification._id,
      });
      return false;
    }

    // Emit to each recipient's room
    notification.recipients.forEach((recipientId) => {
      const room = `user:${recipientId.toString()}`;
      io.to(room).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notification: notification.toObject(),
      });

      logger.info(LOG_MESSAGES.SOCKET_EMIT_SUCCESS, {
        notificationId: notification._id,
        recipientId,
        room,
        type: notification.type,
      });
    });

    return true;
  } catch (error) {
    logger.error(LOG_MESSAGES.SOCKET_EMIT_FAILED, {
      error: error.message,
      stack: error.stack,
      notificationId: notification._id,
    });
    return false;
  }
};

/**
 * Generic notification creation helper
 * Handles validation, creation, and Socket.IO emission
 * @private
 * @param {Object} params - Notification parameters
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Notification type from NOTIFICATION_TYPES
 * @param {Array<mongoose.Types.ObjectId>} params.recipientIds - Array of recipient user IDs
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.Types.ObjectId} [params.entityId=null] - Entity ID (Task, TaskActivity, TaskComment)
 * @param {string} [params.entityModel=null] - Entity model name
 * @param {mongoose.Types.ObjectId} [params.actorId=null] - User who triggered the action (to filter out)
 * @param {mongoose.ClientSession} [params.session=null] - MongoDB session
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>} Creation result
 */
const createNotificationWithValidation = async ({
  title,
  message,
  type,
  recipientIds,
  organizationId,
  departmentId,
  entityId = null,
  entityModel = null,
  actorId = null,
  session = null,
}) => {
  try {
    // Filter out actor if provided (don't notify the person who triggered the action)
    const filteredRecipientIds = actorId
      ? recipientIds.filter((id) => id.toString() !== actorId.toString())
      : recipientIds;

    // Skip if no recipients after filtering
    if (filteredRecipientIds.length === 0) {
      logger.info(LOG_MESSAGES.NO_RECIPIENTS, { type, actorId });
      return { success: true, notification: null, error: null };
    }

    // Validate recipients
    const validation = await validateRecipients(
      filteredRecipientIds,
      organizationId,
      departmentId,
      session
    );

    if (!validation.valid) {
      logger.error(LOG_MESSAGES.VALIDATION_FAILED, {
        type,
        invalidRecipients: validation.invalidRecipients,
        message: validation.message,
      });
      return { success: false, notification: null, error: validation.message };
    }

    // Create notification
    const notification = await Notification.create(
      [
        {
          title,
          message,
          type,
          recipients: filteredRecipientIds,
          entity: entityId,
          entityModel,
          organization: organizationId,
          department: departmentId,
        },
      ],
      { session }
    );

    logger.info(LOG_MESSAGES.NOTIFICATION_CREATED, {
      notificationId: notification[0]._id,
      type,
      recipientCount: filteredRecipientIds.length,
    });

    // Emit Socket.IO event
    emitNotificationEvent(notification[0]);

    return { success: true, notification: notification[0], error: null };
  } catch (error) {
    logger.error(LOG_MESSAGES.NOTIFICATION_FAILED, {
      error: error.message,
      stack: error.stack,
      type,
    });
    return { success: false, notification: null, error: error.message };
  }
};

/**
 * Create notification for task assignment (Requirement 48.4)
 * @param {Object} params - Notification parameters
 * @param {mongoose.Types.ObjectId} params.taskId - Task ID
 * @param {string} params.taskTitle - Task title
 * @param {Array<mongoose.Types.ObjectId>} params.assigneeIds - Array of assignee user IDs
 * @param {mongoose.Types.ObjectId} params.assignedBy - User who assigned the task
 * @param {string} params.assignedByName - Name of user who assigned the task
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.ClientSession} [params.session=null] - MongoDB session
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>} Creation result
 */
export const createTaskAssignmentNotification = async ({
  taskId,
  taskTitle,
  assigneeIds,
  assignedBy,
  assignedByName,
  organizationId,
  departmentId,
  session = null,
}) => {
  logger.info("Creating task assignment notification", {
    taskId,
    taskTitle,
    assigneeIds,
    assignedBy,
    organizationId,
    departmentId,
  });

  return createNotificationWithValidation({
    title: "New Task Assigned",
    message: `You have been assigned to task: ${taskTitle} by ${assignedByName}`,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    recipientIds: assigneeIds,
    organizationId,
    departmentId,
    entityId: taskId,
    entityModel: "Task",
    actorId: assignedBy,
    session,
  });
};

/**
 * Create notification for task update (Requirement 48.5)
 * @param {Object} params - Notification parameters
 * @param {mongoose.Types.ObjectId} params.taskId - Task ID
 * @param {string} params.taskTitle - Task title
 * @param {Array<mongoose.Types.ObjectId>} params.recipientIds - Array of recipient user IDs (assignees, watchers)
 * @param {mongoose.Types.ObjectId} params.updatedBy - User who updated the task
 * @param {string} params.updatedByName - Name of user who updated the task
 * @param {string} params.updateDescription - Description of what was updated
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.ClientSession} [params.session=null] - MongoDB session
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>} Creation result
 */
export const createTaskUpdateNotification = async ({
  taskId,
  taskTitle,
  recipientIds,
  updatedBy,
  updatedByName,
  updateDescription,
  organizationId,
  departmentId,
  session = null,
}) => {
  logger.info("Creating task update notification", {
    taskId,
    taskTitle,
    recipientIds,
    updatedBy,
    updateDescription,
    organizationId,
    departmentId,
  });

  return createNotificationWithValidation({
    title: "Task Updated",
    message: `Task "${taskTitle}" was updated by ${updatedByName}: ${updateDescription}`,
    type: NOTIFICATION_TYPES.TASK_UPDATED,
    recipientIds,
    organizationId,
    departmentId,
    entityId: taskId,
    entityModel: "Task",
    actorId: updatedBy,
    session,
  });
};

/**
 * Create notification for comment added (Requirement 48.6)
 * @param {Object} params - Notification parameters
 * @param {mongoose.Types.ObjectId} params.commentId - Comment ID
 * @param {mongoose.Types.ObjectId} params.parentId - Parent entity ID (Task, TaskActivity, or TaskComment)
 * @param {string} params.parentModel - Parent entity model name
 * @param {string} params.parentTitle - Parent entity title/description
 * @param {Array<mongoose.Types.ObjectId>} params.recipientIds - Array of recipient user IDs
 * @param {mongoose.Types.ObjectId} params.commentedBy - User who added the comment
 * @param {string} params.commentedByName - Name of user who added the comment
 * @param {string} params.commentPreview - Preview of comment content (first 100 chars)
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.ClientSession} [params.session=null] - MongoDB session
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>} Creation result
 */
export const createCommentNotification = async ({
  commentId,
  parentId,
  parentModel,
  parentTitle,
  recipientIds,
  commentedBy,
  commentedByName,
  commentPreview,
  organizationId,
  departmentId,
  session = null,
}) => {
  logger.info("Creating comment notification", {
    commentId,
    parentId,
    parentModel,
    recipientIds,
    commentedBy,
    organizationId,
    departmentId,
  });

  return createNotificationWithValidation({
    title: "New Comment Added",
    message: `${commentedByName} commented on "${parentTitle}": ${commentPreview}`,
    type: NOTIFICATION_TYPES.COMMENT_ADDED,
    recipientIds,
    organizationId,
    departmentId,
    entityId: commentId,
    entityModel: "TaskComment",
    actorId: commentedBy,
    session,
  });
};

/**
 * Create notification for user mention (Requirement 48.7)
 * @param {Object} params - Notification parameters
 * @param {mongoose.Types.ObjectId} params.entityId - Entity ID where mention occurred (Task, TaskActivity, TaskComment)
 * @param {string} params.entityModel - Entity model name
 * @param {string} params.entityTitle - Entity title/description
 * @param {Array<mongoose.Types.ObjectId>} params.mentionedUserIds - Array of mentioned user IDs
 * @param {mongoose.Types.ObjectId} params.mentionedBy - User who mentioned others
 * @param {string} params.mentionedByName - Name of user who mentioned others
 * @param {string} params.contextPreview - Preview of context where mention occurred
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.ClientSession} [params.session=null] - MongoDB session
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>} Creation result
 */
export const createMentionNotification = async ({
  entityId,
  entityModel,
  entityTitle,
  mentionedUserIds,
  mentionedBy,
  mentionedByName,
  contextPreview,
  organizationId,
  departmentId,
  session = null,
}) => {
  logger.info("Creating mention notification", {
    entityId,
    entityModel,
    mentionedUserIds,
    mentionedBy,
    organizationId,
    departmentId,
  });

  return createNotificationWithValidation({
    title: "You Were Mentioned",
    message: `${mentionedByName} mentioned you in "${entityTitle}": ${contextPreview}`,
    type: NOTIFICATION_TYPES.MENTION,
    recipientIds: mentionedUserIds,
    organizationId,
    departmentId,
    entityId,
    entityModel,
    actorId: mentionedBy,
    session,
  });
};

/**
 * Create notification for system alert (Requirement 48.8)
 * @param {Object} params - Notification parameters
 * @param {string} params.title - Alert title
 * @param {string} params.message - Alert message
 * @param {Array<mongoose.Types.ObjectId>} params.recipientIds - Array of recipient user IDs
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.Types.ObjectId} [params.entityId=null] - Optional entity ID
 * @param {string} [params.entityModel=null] - Optional entity model name
 * @param {mongoose.ClientSession} [params.session=null] - MongoDB session
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>} Creation result
 */
export const createSystemAlertNotification = async ({
  title,
  message,
  recipientIds,
  organizationId,
  departmentId,
  entityId = null,
  entityModel = null,
  session = null,
}) => {
  logger.info("Creating system alert notification", {
    title,
    recipientIds,
    organizationId,
    departmentId,
    entityId,
    entityModel,
  });

  return createNotificationWithValidation({
    title,
    message,
    type: NOTIFICATION_TYPES.SYSTEM_ALERT,
    recipientIds,
    organizationId,
    departmentId,
    entityId,
    entityModel,
    actorId: null, // System alerts don't have an actor to filter
    session,
  });
};

export default {
  createTaskAssignmentNotification,
  createTaskUpdateNotification,
  createCommentNotification,
  createMentionNotification,
  createSystemAlertNotification,
};
