// import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

import logger from "./utils/logger.js";

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

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  // Close HTTP server
  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      // Close MongoDB connection
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      logger.info("MongoDB connection closed");

      // Close Socket.IO if initialized
      // if (io) {
      //   io.close(() => {
      //     logger.info('Socket.IO closed');
      //   });
      // }

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
