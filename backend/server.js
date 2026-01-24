// import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import corsOptions from "./config/corsOptions.js";
import logger from "./utils/logger.js";
import { initializeSocketIO } from "./utils/socket.js";
import { setSocketIO } from "./utils/socketInstance.js";
import { startTTLCleanupScheduler } from "./utils/ttlCleanup.js";

// Connect to MongoDB
await connectDB();

// Start server
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
});

/**
 * Initialization Sequence (CRITICAL ORDER):
 * 1. MongoDB connection (connectDB)
 * 2. HTTP server starts listening
 * 3. Socket.IO initialized (requires HTTP server)
 * 4. TTL cleanup scheduler started (requires MongoDB)
 */

// Initialize Socket.IO with error handling
try {
  const io = initializeSocketIO(server, corsOptions);
  setSocketIO(io);
  logger.info("✅ Socket.IO initialized");
} catch (error) {
  logger.error("Failed to initialize Socket.IO", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
}

// Start TTL cleanup scheduler with error handling
try {
  startTTLCleanupScheduler();
  logger.info("✅ TTL cleanup scheduler started");
} catch (error) {
  logger.error("Failed to start TTL cleanup scheduler", {
    error: error.message,
    stack: error.stack,
  });
  // Non-critical, don't exit process
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  // Close HTTP server
  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      // Close Socket.IO connections first
      const { getSocketIO } = await import("./utils/socketInstance.js");
      const io = getSocketIO();
      if (io) {
        io.close(() => {
          logger.info("Socket.IO closed");
        });
      }

      // Close MongoDB connection
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      logger.info("MongoDB connection closed");

      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle SIGTERM (kill command)
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

export default server;
