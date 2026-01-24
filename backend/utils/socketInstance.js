import logger from "./logger.js";

/**
 * Socket.IO Instance Management
 * Singleton pattern for Socket.IO instance to be accessed across the application
 *
 * Requirements: 46.2
 */

let io = null;

/**
 * Set Socket.IO instance
 * Should be called once during server initialization
 * @param {import('socket.io').Server} socketIOInstance - Socket.IO server instance
 */
export const setSocketIO = (socketIOInstance) => {
  if (io) {
    logger.warn("Socket.IO instance already set, overwriting");
  }

  io = socketIOInstance;
  logger.info("Socket.IO instance set successfully");
};

/**
 * Get Socket.IO instance
 * Returns null if not initialized
 * @returns {import('socket.io').Server|null} Socket.IO server instance or null
 */
export const getSocketIO = () => {
  if (!io) {
    logger.warn("Socket.IO instance not initialized");
  }

  return io;
};

/**
 * Check if Socket.IO instance is initialized
 * @returns {boolean} True if Socket.IO instance is set
 */
export const isSocketIOInitialized = () => {
  return io !== null;
};

/**
 * Clear Socket.IO instance
 * Useful for testing or graceful shutdown
 */
export const clearSocketIO = () => {
  if (io) {
    logger.info("Clearing Socket.IO instance");
    io = null;
  }
};

export default {
  setSocketIO,
  getSocketIO,
  isSocketIOInitialized,
  clearSocketIO,
};
