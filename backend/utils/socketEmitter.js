import logger from "./logger.js";
import { SOCKET_EVENTS } from "./constants.js";
import { getSocketIO } from "./socketInstance.js";

/**
 * Socket.IO Event Emitters
 * Centralized functions for emitting Socket.IO events for real-time updates
 * Emits to organization rooms and specific users
 *
 * Requirements: 18.3, 18.4, 18.5
 */

/**
 * Emit task created event to organization room
 * @param {Object} task - Task document
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitTaskCreated = (task, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping task:created emit"
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(SOCKET_EVENTS.TASK_CREATED, {
      task: task.toObject ? task.toObject() : task,
      timestamp: new Date().toISOString(),
    });

    logger.info("Task created event emitted", {
      taskId: task._id,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit task created event", {
      error: error.message,
      stack: error.stack,
      taskId: task._id,
      organizationId,
    });
  }
};

/**
 * Emit task updated event to organization room and watchers
 * @param {Object} task - Task document
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 * @param {Array<mongoose.Types.ObjectId>} watchers - Array of watcher user IDs
 */
export const emitTaskUpdated = (task, organizationId, watchers = []) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping task:updated emit"
      );
      return;
    }

    const taskData = {
      task: task.toObject ? task.toObject() : task,
      timestamp: new Date().toISOString(),
    };

    // Emit to organization room
    const orgRoom = `org:${organizationId.toString()}`;
    io.to(orgRoom).emit(SOCKET_EVENTS.TASK_UPDATED, taskData);

    logger.info("Task updated event emitted to organization", {
      taskId: task._id,
      organizationId,
      room: orgRoom,
    });

    // Emit to each watcher's room for direct notification
    if (watchers && watchers.length > 0) {
      watchers.forEach((watcherId) => {
        const userRoom = `user:${watcherId.toString()}`;
        io.to(userRoom).emit(SOCKET_EVENTS.TASK_UPDATED, taskData);

        logger.info("Task updated event emitted to watcher", {
          taskId: task._id,
          watcherId,
          room: userRoom,
        });
      });
    }
  } catch (error) {
    logger.error("Failed to emit task updated event", {
      error: error.message,
      stack: error.stack,
      taskId: task._id,
      organizationId,
    });
  }
};

/**
 * Emit task deleted event to organization room
 * @param {mongoose.Types.ObjectId} taskId - Task ID
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitTaskDeleted = (taskId, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping task:deleted emit"
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(SOCKET_EVENTS.TASK_DELETED, {
      taskId: taskId.toString(),
      timestamp: new Date().toISOString(),
    });

    logger.info("Task deleted event emitted", {
      taskId,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit task deleted event", {
      error: error.message,
      stack: error.stack,
      taskId,
      organizationId,
    });
  }
};

/**
 * Emit comment added event to organization room and specific users
 * @param {Object} comment - Comment document
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 * @param {Array<mongoose.Types.ObjectId>} recipientIds - Array of recipient user IDs
 */
export const emitCommentAdded = (
  comment,
  organizationId,
  recipientIds = []
) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping comment:added emit"
      );
      return;
    }

    const commentData = {
      comment: comment.toObject ? comment.toObject() : comment,
      timestamp: new Date().toISOString(),
    };

    // Emit to organization room
    const orgRoom = `org:${organizationId.toString()}`;
    io.to(orgRoom).emit(SOCKET_EVENTS.COMMENT_ADDED, commentData);

    logger.info("Comment added event emitted to organization", {
      commentId: comment._id,
      organizationId,
      room: orgRoom,
    });

    // Emit to each recipient's room for direct notification
    if (recipientIds && recipientIds.length > 0) {
      recipientIds.forEach((recipientId) => {
        const userRoom = `user:${recipientId.toString()}`;
        io.to(userRoom).emit(SOCKET_EVENTS.COMMENT_ADDED, commentData);

        logger.info("Comment added event emitted to recipient", {
          commentId: comment._id,
          recipientId,
          room: userRoom,
        });
      });
    }
  } catch (error) {
    logger.error("Failed to emit comment added event", {
      error: error.message,
      stack: error.stack,
      commentId: comment._id,
      organizationId,
    });
  }
};

/**
 * Emit comment updated event to organization room
 * @param {Object} comment - Comment document
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitCommentUpdated = (comment, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping comment:updated emit"
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(SOCKET_EVENTS.COMMENT_UPDATED, {
      comment: comment.toObject ? comment.toObject() : comment,
      timestamp: new Date().toISOString(),
    });

    logger.info("Comment updated event emitted", {
      commentId: comment._id,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit comment updated event", {
      error: error.message,
      stack: error.stack,
      commentId: comment._id,
      organizationId,
    });
  }
};

/**
 * Emit comment deleted event to organization room
 * @param {mongoose.Types.ObjectId} commentId - Comment ID
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitCommentDeleted = (commentId, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping comment:deleted emit"
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(SOCKET_EVENTS.COMMENT_DELETED, {
      commentId: commentId.toString(),
      timestamp: new Date().toISOString(),
    });

    logger.info("Comment deleted event emitted", {
      commentId,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit comment deleted event", {
      error: error.message,
      stack: error.stack,
      commentId,
      organizationId,
    });
  }
};

/**
 * Emit notification created event to specific recipients
 * @param {Object} notification - Notification document
 * @param {Array<mongoose.Types.ObjectId>} recipientIds - Array of recipient user IDs
 */
export const emitNotificationCreated = (notification, recipientIds) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping notification:created emit"
      );
      return;
    }

    const notificationData = {
      notification: notification.toObject
        ? notification.toObject()
        : notification,
      timestamp: new Date().toISOString(),
    };

    // Emit to each recipient's room
    recipientIds.forEach((recipientId) => {
      const userRoom = `user:${recipientId.toString()}`;
      io.to(userRoom).emit(
        SOCKET_EVENTS.NOTIFICATION_CREATED,
        notificationData
      );

      logger.info("Notification created event emitted", {
        notificationId: notification._id,
        recipientId,
        room: userRoom,
      });
    });
  } catch (error) {
    logger.error("Failed to emit notification created event", {
      error: error.message,
      stack: error.stack,
      notificationId: notification._id,
    });
  }
};

/**
 * Emit user online status to organization room
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitUserOnline = (userId, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping user:online emit"
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(SOCKET_EVENTS.USER_ONLINE, {
      userId: userId.toString(),
      timestamp: new Date().toISOString(),
    });

    logger.info("User online event emitted", {
      userId,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit user online event", {
      error: error.message,
      stack: error.stack,
      userId,
      organizationId,
    });
  }
};

/**
 * Emit user offline status to organization room
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitUserOffline = (userId, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        "Socket.IO instance not available, skipping user:offline emit"
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(SOCKET_EVENTS.USER_OFFLINE, {
      userId: userId.toString(),
      timestamp: new Date().toISOString(),
    });

    logger.info("User offline event emitted", {
      userId,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit user offline event", {
      error: error.message,
      stack: error.stack,
      userId,
      organizationId,
    });
  }
};

/**
 * Emit generic event to organization room
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @param {mongoose.Types.ObjectId} organizationId - Organization ID
 */
export const emitToOrganization = (eventName, data, organizationId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        `Socket.IO instance not available, skipping ${eventName} emit`
      );
      return;
    }

    const room = `org:${organizationId.toString()}`;
    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.info("Generic event emitted to organization", {
      eventName,
      organizationId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit generic event to organization", {
      error: error.message,
      stack: error.stack,
      eventName,
      organizationId,
    });
  }
};

/**
 * Emit generic event to specific user
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @param {mongoose.Types.ObjectId} userId - User ID
 */
export const emitToUser = (eventName, data, userId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        `Socket.IO instance not available, skipping ${eventName} emit`
      );
      return;
    }

    const room = `user:${userId.toString()}`;
    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.info("Generic event emitted to user", {
      eventName,
      userId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit generic event to user", {
      error: error.message,
      stack: error.stack,
      eventName,
      userId,
    });
  }
};

/**
 * Emit generic event to department room
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @param {mongoose.Types.ObjectId} departmentId - Department ID
 */
export const emitToDepartment = (eventName, data, departmentId) => {
  try {
    const io = getSocketIO();
    if (!io) {
      logger.warn(
        `Socket.IO instance not available, skipping ${eventName} emit`
      );
      return;
    }

    const room = `dept:${departmentId.toString()}`;
    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.info("Generic event emitted to department", {
      eventName,
      departmentId,
      room,
    });
  } catch (error) {
    logger.error("Failed to emit generic event to department", {
      error: error.message,
      stack: error.stack,
      eventName,
      departmentId,
    });
  }
};

export default {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
  emitCommentAdded,
  emitCommentUpdated,
  emitCommentDeleted,
  emitNotificationCreated,
  emitUserOnline,
  emitUserOffline,
  emitToOrganization,
  emitToUser,
  emitToDepartment,
};
