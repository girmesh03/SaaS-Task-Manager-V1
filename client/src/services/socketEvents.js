/**
 * Socket.IO Event Handlers
 * Event constants and handlers for Socket.IO events
 * Handles task updates, comments, notifications
 * Updates Redux state on events
 *
 * Requirements: 18.3, 18.4, 18.5, 18.8, 18.9
 */

import { SOCKET_EVENTS } from "../utils/constants";

/**
 * Redux action types for cache invalidation
 */
const REDUX_ACTIONS = {
  INVALIDATE_TAGS: "api/invalidateTags",
};

/**
 * Cache tag types
 */
const CACHE_TAGS = {
  TASK: "Task",
  TASK_COMMENT: "TaskComment",
  NOTIFICATION: "Notification",
  USER: "User",
};

/**
 * Create a standardized event handler
 * @param {string} eventName - Socket event name
 * @param {Function} processData - Function to process event data
 * @returns {Function} Event handler function
 */
const createEventHandler = (eventName, processData) => (data) => {
  console.log(`[Socket] ${eventName} event received:`, data);

  try {
    const result = processData(data);
    console.log(`[Socket] ${eventName} event processed:`, result);
  } catch (error) {
    console.error(`[Socket] Error processing ${eventName} event:`, {
      error: error.message,
      stack: error.stack,
      data,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Event handler configuration
 * Maps socket events to Redux cache invalidation logic
 */
const createEventHandlers = (store) => ({
  [SOCKET_EVENTS.TASK_CREATED]: (data) => {
    const { task, timestamp } = data;

    // Invalidate task list cache to refetch
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [{ type: CACHE_TAGS.TASK, id: "LIST" }],
    });

    return { id: task._id, timestamp };
  },

  [SOCKET_EVENTS.TASK_UPDATED]: (data) => {
    const { task, timestamp } = data;

    // Invalidate specific task cache and list cache
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [
        { type: CACHE_TAGS.TASK, id: task._id },
        { type: CACHE_TAGS.TASK, id: "LIST" },
      ],
    });

    return { id: task._id, timestamp };
  },

  [SOCKET_EVENTS.TASK_DELETED]: (data) => {
    const { taskId, timestamp } = data;

    // Invalidate specific task cache and list cache
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [
        { type: CACHE_TAGS.TASK, id: taskId },
        { type: CACHE_TAGS.TASK, id: "LIST" },
      ],
    });

    return { id: taskId, timestamp };
  },

  [SOCKET_EVENTS.COMMENT_ADDED]: (data) => {
    const { comment, timestamp } = data;

    // Invalidate comment list cache and related task cache
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [
        { type: CACHE_TAGS.TASK_COMMENT, id: "LIST" },
        { type: CACHE_TAGS.TASK, id: comment.parent },
      ],
    });

    return { id: comment._id, timestamp };
  },

  [SOCKET_EVENTS.COMMENT_UPDATED]: (data) => {
    const { comment, timestamp } = data;

    // Invalidate specific comment cache and list cache
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [
        { type: CACHE_TAGS.TASK_COMMENT, id: comment._id },
        { type: CACHE_TAGS.TASK_COMMENT, id: "LIST" },
      ],
    });

    return { id: comment._id, timestamp };
  },

  [SOCKET_EVENTS.COMMENT_DELETED]: (data) => {
    const { commentId, timestamp } = data;

    // Invalidate specific comment cache and list cache
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [
        { type: CACHE_TAGS.TASK_COMMENT, id: commentId },
        { type: CACHE_TAGS.TASK_COMMENT, id: "LIST" },
      ],
    });

    return { id: commentId, timestamp };
  },

  [SOCKET_EVENTS.NOTIFICATION_CREATED]: (data) => {
    const { notification, timestamp } = data;

    // Invalidate notification list cache to refetch
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [{ type: CACHE_TAGS.NOTIFICATION, id: "LIST" }],
    });

    // Show browser notification if permission granted
    if (Notification.permission === "granted") {
      const browserNotification = new Notification(
        notification.title || "New Notification",
        {
          body: notification.message,
          icon: "/favicon.ico",
          tag: notification._id,
        }
      );

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }

    return { id: notification._id, timestamp };
  },

  [SOCKET_EVENTS.USER_ONLINE]: (data) => {
    const { userId, timestamp } = data;

    // Invalidate user cache to update online status
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [{ type: CACHE_TAGS.USER, id: userId }],
    });

    return { id: userId, timestamp };
  },

  [SOCKET_EVENTS.USER_OFFLINE]: (data) => {
    const { userId, timestamp } = data;

    // Invalidate user cache to update online status
    store.dispatch({
      type: REDUX_ACTIONS.INVALIDATE_TAGS,
      payload: [{ type: CACHE_TAGS.USER, id: userId }],
    });

    return { id: userId, timestamp };
  },
});

/**
 * Initialize Socket.IO event handlers
 * Sets up listeners for all Socket.IO events and updates Redux state
 * @param {Object} socketService - Socket service instance
 * @param {Object} store - Redux store instance
 */
export const initializeSocketEventHandlers = (socketService, store) => {
  console.log("[Socket] Initializing event handlers");

  const eventHandlers = createEventHandlers(store);

  // Register all event handlers
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    socketService.on(event, createEventHandler(event, handler));
  });

  console.log("[Socket] Event handlers initialized");
};

/**
 * Clean up Socket.IO event handlers
 * Removes all event listeners
 * @param {Object} socketService - Socket service instance
 */
export const cleanupSocketEventHandlers = (socketService) => {
  console.log("[Socket] Cleaning up event handlers");

  // Remove all event listeners
  Object.values(SOCKET_EVENTS).forEach((event) => {
    socketService.off(event);
  });

  console.log("[Socket] Event handlers cleaned up");
};

/**
 * Request browser notification permission
 * Should be called on user interaction (e.g., button click)
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("[Socket] Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    console.log("[Socket] Notification permission already granted");
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      console.log("[Socket] Notification permission:", permission);
      return permission === "granted";
    } catch (error) {
      console.error(
        "[Socket] Error requesting notification permission:",
        error
      );
      return false;
    }
  }

  return false;
};
