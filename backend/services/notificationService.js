import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { NOTIFICATION_TYPES, SOCKET_EVENTS } from "../utils/constants.js";

/**
 * Notification Service
 * Handles notification creation for task assignments, task updates, comments, mentions, and system alerts
 * Validates recipients belong to same organization and department
 * Emits Socket.IO events for real-time notifications
 *
 * Requirements: 48.4, 48.5, 48.6, 48.7, 48.8
 */

/**
 * Validate recipients belong to same organization and department
 * @param {Array<mongoose.Types.ObjectId>} recipientIds - Array of recipient user IDs
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} departmentId - Department ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, invalidRecipients: Array, message: string}>}
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
 * @param {Object} notification - Notification document
 * @param {Object} io - Socket.IO instance
 */
const emitNotificationEvent = (notification, io) => {
  try {
    if (!io) {
      logger.warn("Socket.IO instance not available, skipping real-time emit");
      return;
    }

    // Emit to each recipient's room
    notification.recipients.forEach((recipientId) => {
      const room = `user:${recipientId.toString()}`;
      io.to(room).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notification: notification.toObject(),
      });

      logger.info("Notification emitted via Socket.IO", {
        notificationId: notification._id,
        recipientId,
        room,
        type: notification.type,
      });
    });
  } catch (error) {
    logger.error("Failed to emit notification via Socket.IO", {
      error: error.message,
      stack: error.stack,
      notificationId: notification._id,
    });
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
 * @param {mongoose.ClientSession} params.session - MongoDB session
 * @param {Object} params.io - Socket.IO instance
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>}
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
  io = null,
}) => {
  try {
    logger.info("Creating task assignment notification", {
      taskId,
      taskTitle,
      assigneeIds,
      assignedBy,
      organizationId,
      departmentId,
    });

    // Validate recipients
    const validation = await validateRecipients(
      assigneeIds,
      organizationId,
      departmentId,
      session
    );

    if (!validation.valid) {
      logger.error("Recipient validation failed for task assignment", {
        taskId,
        invalidRecipients: validation.invalidRecipients,
        message: validation.message,
      });

      return {
        success: false,
        notification: null,
        error: validation.message,
      };
    }

    // Create notification
    const notification = await Notification.create(
      [
        {
          title: "New Task Assigned",
          message: `You have been assigned to task: ${taskTitle} by ${assignedByName}`,
          type: NOTIFICATION_TYPES.TASK_ASSIGNED,
          recipients: assigneeIds,
          entity: taskId,
          entityModel: "Task",
          organization: organizationId,
          department: departmentId,
        },
      ],
      { session }
    );

    logger.info("Task assignment notification created successfully", {
      notificationId: notification[0]._id,
      taskId,
      recipientCount: assigneeIds.length,
    });

    // Emit Socket.IO event for real-time notification
    emitNotificationEvent(notification[0], io);

    return {
      success: true,
      notification: notification[0],
      error: null,
    };
  } catch (error) {
    logger.error("Failed to create task assignment notification", {
      error: error.message,
      stack: error.stack,
      taskId,
      assigneeIds,
    });

    return {
      success: false,
      notification: null,
      error: error.message,
    };
  }
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
 * @param {mongoose.ClientSession} params.session - MongoDB session
 * @param {Object} params.io - Socket.IO instance
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>}
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
  io = null,
}) => {
  try {
    logger.info("Creating task update notification", {
      taskId,
      taskTitle,
      recipientIds,
      updatedBy,
      updateDescription,
      organizationId,
      departmentId,
    });

    // Filter out the user who made the update (don't notify themselves)
    const filteredRecipientIds = recipientIds.filter(
      (id) => id.toString() !== updatedBy.toString()
    );

    // If no recipients after filtering, skip notification
    if (filteredRecipientIds.length === 0) {
      logger.info(
        "No recipients for task update notification after filtering",
        {
          taskId,
          updatedBy,
        }
      );

      return {
        success: true,
        notification: null,
        error: null,
      };
    }

    // Validate recipients
    const validation = await validateRecipients(
      filteredRecipientIds,
      organizationId,
      departmentId,
      session
    );

    if (!validation.valid) {
      logger.error("Recipient validation failed for task update", {
        taskId,
        invalidRecipients: validation.invalidRecipients,
        message: validation.message,
      });

      return {
        success: false,
        notification: null,
        error: validation.message,
      };
    }

    // Create notification
    const notification = await Notification.create(
      [
        {
          title: "Task Updated",
          message: `Task "${taskTitle}" was updated by ${updatedByName}: ${updateDescription}`,
          type: NOTIFICATION_TYPES.TASK_UPDATED,
          recipients: filteredRecipientIds,
          entity: taskId,
          entityModel: "Task",
          organization: organizationId,
          department: departmentId,
        },
      ],
      { session }
    );

    logger.info("Task update notification created successfully", {
      notificationId: notification[0]._id,
      taskId,
      recipientCount: filteredRecipientIds.length,
    });

    // Emit Socket.IO event for real-time notification
    emitNotificationEvent(notification[0], io);

    return {
      success: true,
      notification: notification[0],
      error: null,
    };
  } catch (error) {
    logger.error("Failed to create task update notification", {
      error: error.message,
      stack: error.stack,
      taskId,
      recipientIds,
    });

    return {
      success: false,
      notification: null,
      error: error.message,
    };
  }
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
 * @param {mongoose.ClientSession} params.session - MongoDB session
 * @param {Object} params.io - Socket.IO instance
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>}
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
  io = null,
}) => {
  try {
    logger.info("Creating comment notification", {
      commentId,
      parentId,
      parentModel,
      recipientIds,
      commentedBy,
      organizationId,
      departmentId,
    });

    // Filter out the user who made the comment (don't notify themselves)
    const filteredRecipientIds = recipientIds.filter(
      (id) => id.toString() !== commentedBy.toString()
    );

    // If no recipients after filtering, skip notification
    if (filteredRecipientIds.length === 0) {
      logger.info("No recipients for comment notification after filtering", {
        commentId,
        commentedBy,
      });

      return {
        success: true,
        notification: null,
        error: null,
      };
    }

    // Validate recipients
    const validation = await validateRecipients(
      filteredRecipientIds,
      organizationId,
      departmentId,
      session
    );

    if (!validation.valid) {
      logger.error("Recipient validation failed for comment", {
        commentId,
        invalidRecipients: validation.invalidRecipients,
        message: validation.message,
      });

      return {
        success: false,
        notification: null,
        error: validation.message,
      };
    }

    // Create notification
    const notification = await Notification.create(
      [
        {
          title: "New Comment Added",
          message: `${commentedByName} commented on "${parentTitle}": ${commentPreview}`,
          type: NOTIFICATION_TYPES.COMMENT_ADDED,
          recipients: filteredRecipientIds,
          entity: commentId,
          entityModel: "TaskComment",
          organization: organizationId,
          department: departmentId,
        },
      ],
      { session }
    );

    logger.info("Comment notification created successfully", {
      notificationId: notification[0]._id,
      commentId,
      recipientCount: filteredRecipientIds.length,
    });

    // Emit Socket.IO event for real-time notification
    emitNotificationEvent(notification[0], io);

    return {
      success: true,
      notification: notification[0],
      error: null,
    };
  } catch (error) {
    logger.error("Failed to create comment notification", {
      error: error.message,
      stack: error.stack,
      commentId,
      recipientIds,
    });

    return {
      success: false,
      notification: null,
      error: error.message,
    };
  }
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
 * @param {mongoose.ClientSession} params.session - MongoDB session
 * @param {Object} params.io - Socket.IO instance
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>}
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
  io = null,
}) => {
  try {
    logger.info("Creating mention notification", {
      entityId,
      entityModel,
      mentionedUserIds,
      mentionedBy,
      organizationId,
      departmentId,
    });

    // Filter out the user who made the mention (don't notify themselves)
    const filteredMentionedUserIds = mentionedUserIds.filter(
      (id) => id.toString() !== mentionedBy.toString()
    );

    // If no recipients after filtering, skip notification
    if (filteredMentionedUserIds.length === 0) {
      logger.info("No recipients for mention notification after filtering", {
        entityId,
        mentionedBy,
      });

      return {
        success: true,
        notification: null,
        error: null,
      };
    }

    // Validate recipients
    const validation = await validateRecipients(
      filteredMentionedUserIds,
      organizationId,
      departmentId,
      session
    );

    if (!validation.valid) {
      logger.error("Recipient validation failed for mention", {
        entityId,
        invalidRecipients: validation.invalidRecipients,
        message: validation.message,
      });

      return {
        success: false,
        notification: null,
        error: validation.message,
      };
    }

    // Create notification
    const notification = await Notification.create(
      [
        {
          title: "You Were Mentioned",
          message: `${mentionedByName} mentioned you in "${entityTitle}": ${contextPreview}`,
          type: NOTIFICATION_TYPES.MENTION,
          recipients: filteredMentionedUserIds,
          entity: entityId,
          entityModel,
          organization: organizationId,
          department: departmentId,
        },
      ],
      { session }
    );

    logger.info("Mention notification created successfully", {
      notificationId: notification[0]._id,
      entityId,
      recipientCount: filteredMentionedUserIds.length,
    });

    // Emit Socket.IO event for real-time notification
    emitNotificationEvent(notification[0], io);

    return {
      success: true,
      notification: notification[0],
      error: null,
    };
  } catch (error) {
    logger.error("Failed to create mention notification", {
      error: error.message,
      stack: error.stack,
      entityId,
      mentionedUserIds,
    });

    return {
      success: false,
      notification: null,
      error: error.message,
    };
  }
};

/**
 * Create notification for system alert (Requirement 48.8)
 * @param {Object} params - Notification parameters
 * @param {string} params.title - Alert title
 * @param {string} params.message - Alert message
 * @param {Array<mongoose.Types.ObjectId>} params.recipientIds - Array of recipient user IDs
 * @param {mongoose.Types.ObjectId} params.organizationId - Organization ID
 * @param {mongoose.Types.ObjectId} params.departmentId - Department ID
 * @param {mongoose.Types.ObjectId} params.entityId - Optional entity ID
 * @param {string} params.entityModel - Optional entity model name
 * @param {mongoose.ClientSession} params.session - MongoDB session
 * @param {Object} params.io - Socket.IO instance
 * @returns {Promise<{success: boolean, notification: Object|null, error: string|null}>}
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
  io = null,
}) => {
  try {
    logger.info("Creating system alert notification", {
      title,
      recipientIds,
      organizationId,
      departmentId,
      entityId,
      entityModel,
    });

    // Validate recipients
    const validation = await validateRecipients(
      recipientIds,
      organizationId,
      departmentId,
      session
    );

    if (!validation.valid) {
      logger.error("Recipient validation failed for system alert", {
        title,
        invalidRecipients: validation.invalidRecipients,
        message: validation.message,
      });

      return {
        success: false,
        notification: null,
        error: validation.message,
      };
    }

    // Create notification
    const notification = await Notification.create(
      [
        {
          title,
          message,
          type: NOTIFICATION_TYPES.SYSTEM_ALERT,
          recipients: recipientIds,
          entity: entityId,
          entityModel,
          organization: organizationId,
          department: departmentId,
        },
      ],
      { session }
    );

    logger.info("System alert notification created successfully", {
      notificationId: notification[0]._id,
      title,
      recipientCount: recipientIds.length,
    });

    // Emit Socket.IO event for real-time notification
    emitNotificationEvent(notification[0], io);

    return {
      success: true,
      notification: notification[0],
      error: null,
    };
  } catch (error) {
    logger.error("Failed to create system alert notification", {
      error: error.message,
      stack: error.stack,
      title,
      recipientIds,
    });

    return {
      success: false,
      notification: null,
      error: error.message,
    };
  }
};

export default {
  createTaskAssignmentNotification,
  createTaskUpdateNotification,
  createCommentNotification,
  createMentionNotification,
  createSystemAlertNotification,
};
