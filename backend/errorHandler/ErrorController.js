import logger from "../utils/logger.js";

/**
 * Global Error Handler Middleware
 * Formats error responses with success, error object, code, message, details, timestamp
 */
const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id,
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "Internal Server Error";
  let details = [];

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    code = "CONFLICT";
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    details = [{ field, message: `Duplicate value for ${field}` }];
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = `Invalid ${err.path}: ${err.value}`;
    details = [{ field: err.path, message: `Invalid ${err.path}` }];
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "UNAUTHORIZED";
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "UNAUTHENTICATED";
    message = "Token expired";
  }

  // Handle express-validator errors
  if (err.array && typeof err.array === "function") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = err.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
    }));
  }

  // Format error response
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development
  // if (process.env.NODE_ENV === "development") {
  //   errorResponse.error.stack = err.stack;
  // }

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
