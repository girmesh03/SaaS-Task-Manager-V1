import logger from "./logger.js";

/**
 * User Status Tracking
 * Tracks online/offline status of users connected via Socket.IO
 *
 * Requirements: 46.2
 */

// Map to store online users: userId -> Set of socket IDs
const onlineUsers = new Map();

// Map to store user metadata: userId -> { organizationId, departmentId, lastSeen }
const userMetadata = new Map();

/**
 * Add user as online
 * @param {string} userId - User ID
 * @param {string} socketId - Socket ID
 * @param {string} organizationId - Organization ID
 * @param {string} departmentId - Department ID
 */
export const addOnlineUser = (
  userId,
  socketId,
  organizationId,
  departmentId
) => {
  try {
    // Add socket ID to user's set of connections
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socketId);

    // Store user metadata
    userMetadata.set(userId, {
      organizationId,
      departmentId,
      lastSeen: new Date(),
    });

    logger.info("User added as online", {
      userId,
      socketId,
      organizationId,
      departmentId,
      connectionCount: onlineUsers.get(userId).size,
    });
  } catch (error) {
    logger.error("Failed to add online user", {
      error: error.message,
      stack: error.stack,
      userId,
      socketId,
    });
  }
};

/**
 * Remove user socket connection
 * If user has no more connections, mark as offline
 * @param {string} userId - User ID
 * @param {string} socketId - Socket ID
 * @returns {boolean} True if user is now offline (no more connections)
 */
export const removeOnlineUser = (userId, socketId) => {
  try {
    if (!onlineUsers.has(userId)) {
      logger.warn("Attempted to remove non-existent online user", {
        userId,
        socketId,
      });
      return false;
    }

    // Remove socket ID from user's set
    const userSockets = onlineUsers.get(userId);
    userSockets.delete(socketId);

    // If no more connections, remove user from online users
    if (userSockets.size === 0) {
      onlineUsers.delete(userId);

      // Update last seen timestamp
      if (userMetadata.has(userId)) {
        const metadata = userMetadata.get(userId);
        metadata.lastSeen = new Date();
        userMetadata.set(userId, metadata);
      }

      logger.info("User removed from online users (no more connections)", {
        userId,
        socketId,
      });

      return true; // User is now offline
    }

    logger.info("User socket removed but still has other connections", {
      userId,
      socketId,
      remainingConnections: userSockets.size,
    });

    return false; // User still has other connections
  } catch (error) {
    logger.error("Failed to remove online user", {
      error: error.message,
      stack: error.stack,
      userId,
      socketId,
    });
    return false;
  }
};

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {boolean} True if user has at least one active connection
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
};

/**
 * Get all online users
 * @returns {Array<string>} Array of online user IDs
 */
export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

/**
 * Get online users in organization
 * @param {string} organizationId - Organization ID
 * @returns {Array<string>} Array of online user IDs in organization
 */
export const getOnlineUsersInOrganization = (organizationId) => {
  try {
    const onlineUsersInOrg = [];

    for (const [userId, metadata] of userMetadata.entries()) {
      if (metadata.organizationId === organizationId && isUserOnline(userId)) {
        onlineUsersInOrg.push(userId);
      }
    }

    return onlineUsersInOrg;
  } catch (error) {
    logger.error("Failed to get online users in organization", {
      error: error.message,
      stack: error.stack,
      organizationId,
    });
    return [];
  }
};

/**
 * Get online users in department
 * @param {string} departmentId - Department ID
 * @returns {Array<string>} Array of online user IDs in department
 */
export const getOnlineUsersInDepartment = (departmentId) => {
  try {
    const onlineUsersInDept = [];

    for (const [userId, metadata] of userMetadata.entries()) {
      if (metadata.departmentId === departmentId && isUserOnline(userId)) {
        onlineUsersInDept.push(userId);
      }
    }

    return onlineUsersInDept;
  } catch (error) {
    logger.error("Failed to get online users in department", {
      error: error.message,
      stack: error.stack,
      departmentId,
    });
    return [];
  }
};

/**
 * Get user metadata
 * @param {string} userId - User ID
 * @returns {Object|null} User metadata or null if not found
 */
export const getUserMetadata = (userId) => {
  return userMetadata.get(userId) || null;
};

/**
 * Get user connection count
 * @param {string} userId - User ID
 * @returns {number} Number of active connections for user
 */
export const getUserConnectionCount = (userId) => {
  if (!onlineUsers.has(userId)) {
    return 0;
  }
  return onlineUsers.get(userId).size;
};

/**
 * Get total online user count
 * @returns {number} Total number of online users
 */
export const getOnlineUserCount = () => {
  return onlineUsers.size;
};

/**
 * Get online user statistics
 * @returns {Object} Statistics about online users
 */
export const getOnlineUserStats = () => {
  try {
    const stats = {
      totalOnlineUsers: onlineUsers.size,
      totalConnections: 0,
      usersByOrganization: {},
      usersByDepartment: {},
    };

    // Count total connections
    for (const sockets of onlineUsers.values()) {
      stats.totalConnections += sockets.size;
    }

    // Group by organization and department
    for (const [userId, metadata] of userMetadata.entries()) {
      if (isUserOnline(userId)) {
        // Count by organization
        if (!stats.usersByOrganization[metadata.organizationId]) {
          stats.usersByOrganization[metadata.organizationId] = 0;
        }
        stats.usersByOrganization[metadata.organizationId]++;

        // Count by department
        if (!stats.usersByDepartment[metadata.departmentId]) {
          stats.usersByDepartment[metadata.departmentId] = 0;
        }
        stats.usersByDepartment[metadata.departmentId]++;
      }
    }

    return stats;
  } catch (error) {
    logger.error("Failed to get online user stats", {
      error: error.message,
      stack: error.stack,
    });
    return {
      totalOnlineUsers: 0,
      totalConnections: 0,
      usersByOrganization: {},
      usersByDepartment: {},
    };
  }
};

/**
 * Clear all online users
 * Useful for testing or server restart
 */
export const clearAllOnlineUsers = () => {
  try {
    const count = onlineUsers.size;
    onlineUsers.clear();

    // Update last seen for all users
    const now = new Date();
    for (const [userId, metadata] of userMetadata.entries()) {
      metadata.lastSeen = now;
      userMetadata.set(userId, metadata);
    }

    logger.info("All online users cleared", { count });
  } catch (error) {
    logger.error("Failed to clear online users", {
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Clean up stale user metadata
 * Remove metadata for users who haven't been seen in specified days
 * @param {number} days - Number of days of inactivity before cleanup (default: 30)
 */
export const cleanupStaleMetadata = (days = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let cleanedCount = 0;

    for (const [userId, metadata] of userMetadata.entries()) {
      if (metadata.lastSeen < cutoffDate && !isUserOnline(userId)) {
        userMetadata.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info("Cleaned up stale user metadata", {
        cleanedCount,
        cutoffDate,
      });
    }
  } catch (error) {
    logger.error("Failed to cleanup stale metadata", {
      error: error.message,
      stack: error.stack,
    });
  }
};

export default {
  addOnlineUser,
  removeOnlineUser,
  isUserOnline,
  getOnlineUsers,
  getOnlineUsersInOrganization,
  getOnlineUsersInDepartment,
  getUserMetadata,
  getUserConnectionCount,
  getOnlineUserCount,
  getOnlineUserStats,
  clearAllOnlineUsers,
  cleanupStaleMetadata,
};
