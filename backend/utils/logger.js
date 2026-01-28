import winston from "winston";

/**
 * Winston Logger Configuration
 * Structured logging with different levels and formats
 */
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Constants for file rotation
const FILE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const FILE_MAX_FILES = 5;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Shared timestamp format
const timestampFormat = timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

// Custom log format for development
const logFormat = printf(
  ({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    // Add stack trace for errors
    if (stack) {
      msg += `\n${stack}`;
    }

    // Add newline for better readability
    return msg + "\n";
  }
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestampFormat,
    IS_PRODUCTION ? json() : logFormat
  ),
  transports: [
    // Console transport (development only, with colors)
    ...(!IS_PRODUCTION
      ? [
          new winston.transports.Console({
            format: combine(colorize(), timestampFormat, logFormat),
          }),
        ]
      : []),
    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: FILE_MAX_SIZE,
      maxFiles: FILE_MAX_FILES,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: FILE_MAX_SIZE,
      maxFiles: FILE_MAX_FILES,
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

export default logger;
