import mongoose from "mongoose";
import logger from "../utils/logger.js";

/**
 * MongoDB Connection Configuration
 * Establishes connection with pooling, timeouts, and retry logic
 */

// Set timezone to UTC for consistent date handling
process.env.TZ = "UTC";

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Gracefully close database connection
 * @returns {Promise<void>}
 */
export const closeConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed gracefully");
    }
  } catch (error) {
    logger.error("Error closing MongoDB connection:", error);
    throw error;
  }
};

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  try {
    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    const options = {
      // Connection pooling
      maxPoolSize: 10,
      minPoolSize: 5,

      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // Retry logic
      retryWrites: true,
      retryReads: true,

      // Other options
      autoIndex: process.env.NODE_ENV !== "production", // Disable in production for performance
      family: 4, // Use IPv4
    };

    logger.info("MongoDB connecting...");

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info("MongoDB Connected successfully", {
      database: conn.connection.name,
      host: conn.connection.host,
      port: conn.connection.port,
      readyState: conn.connection.readyState,
      timezone: process.env.TZ,
    });

    // Register connection event handlers AFTER successful connection
    registerConnectionEventHandlers();

    return conn;
  } catch (error) {
    logger.error("MongoDB connection failed:", {
      error: error.message,
      stack: error.stack,
      uri: process.env.MONGODB_URI ? "***configured***" : "missing",
    });

    // Don't exit immediately - allow caller to handle
    throw error;
  }
};

/**
 * Register MongoDB connection event handlers
 * Only registers handlers for future events (reconnection, errors, etc.)
 */
const registerConnectionEventHandlers = () => {
  // Prevent duplicate event listeners
  mongoose.connection.removeAllListeners("error");
  mongoose.connection.removeAllListeners("disconnecting");
  mongoose.connection.removeAllListeners("disconnected");
  mongoose.connection.removeAllListeners("reconnected");
  mongoose.connection.removeAllListeners("close");

  // Only register handlers for events that might occur AFTER initial connection
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error:", {
      error: err.message,
      code: err.code,
      name: err.name,
    });
  });

  mongoose.connection.on("disconnecting", () => {
    logger.warn("MongoDB disconnecting...");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected successfully");
  });

  mongoose.connection.on("close", () => {
    logger.info("MongoDB connection closed");
  });

  // Handle process termination
  process.on("SIGINT", async () => {
    await closeConnection();
  });

  process.on("SIGTERM", async () => {
    await closeConnection();
  });
};

export default connectDB;
