/**
 * Error Handler Utilities
 * Centralized error handling for API calls and application errors
 */

import { HTTP_STATUS, ERROR_CODES } from "./constants";

/**
 * Extract error message from error object
 * @param {Error|Object} error - Error object
 * @returns {string} Error message
 */
export const getErrorMessage = (error) => {
  // API error response
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // API error with message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Network error
  if (error?.message === "Network Error") {
    return "Network error. Please check your internet connection.";
  }

  // Timeout error
  if (error?.code === "ECONNABORTED") {
    return "Request timeout. Please try again.";
  }

  // Generic error message
  if (error?.message) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
};

/**
 * Extract error code from error object
 * @param {Error|Object} error - Error object
 * @returns {string} Error code
 */
export const getErrorCode = (error) => {
  // API error response
  if (error?.response?.data?.error?.code) {
    return error.response.data.error.code;
  }

  // HTTP status code
  if (error?.response?.status) {
    const status = error.response.status;

    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_ERROR;
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHENTICATED_ERROR;
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN_ERROR;
      case HTTP_STATUS.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND_ERROR;
      case HTTP_STATUS.CONFLICT:
        return ERROR_CODES.CONFLICT_ERROR;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return ERROR_CODES.TOO_MANY_REQUESTS_ERROR;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }

  return ERROR_CODES.INTERNAL_ERROR;
};

/**
 * Extract validation errors from error object
 * @param {Error|Object} error - Error object
 * @returns {Array} Array of validation error objects
 */
export const getValidationErrors = (error) => {
  // API validation errors
  if (error?.response?.data?.error?.details) {
    return error.response.data.error.details;
  }

  return [];
};

/**
 * Check if error is authentication error (401)
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if authentication error
 */
export const isAuthError = (error) => {
  return (
    error?.response?.status === HTTP_STATUS.UNAUTHORIZED ||
    getErrorCode(error) === ERROR_CODES.UNAUTHENTICATED_ERROR
  );
};

/**
 * Check if error is authorization error (403)
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if authorization error
 */
export const isForbiddenError = (error) => {
  return (
    error?.response?.status === HTTP_STATUS.FORBIDDEN ||
    getErrorCode(error) === ERROR_CODES.FORBIDDEN_ERROR
  );
};

/**
 * Check if error is validation error (400)
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if validation error
 */
export const isValidationError = (error) => {
  return (
    error?.response?.status === HTTP_STATUS.BAD_REQUEST ||
    getErrorCode(error) === ERROR_CODES.VALIDATION_ERROR
  );
};

/**
 * Check if error is not found error (404)
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if not found error
 */
export const isNotFoundError = (error) => {
  return (
    error?.response?.status === HTTP_STATUS.NOT_FOUND ||
    getErrorCode(error) === ERROR_CODES.NOT_FOUND_ERROR
  );
};

/**
 * Check if error is conflict error (409)
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if conflict error
 */
export const isConflictError = (error) => {
  return (
    error?.response?.status === HTTP_STATUS.CONFLICT ||
    getErrorCode(error) === ERROR_CODES.CONFLICT_ERROR
  );
};

/**
 * Check if error is rate limit error (429)
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if rate limit error
 */
export const isRateLimitError = (error) => {
  return (
    error?.response?.status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    getErrorCode(error) === ERROR_CODES.TOO_MANY_REQUESTS_ERROR
  );
};

/**
 * Check if error is network error
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  return error?.message === "Network Error" || !error?.response;
};

/**
 * Format validation errors for display
 * @param {Array} errors - Array of validation error objects
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || errors.length === 0) {
    return "";
  }

  return errors.map((err) => err.msg || err.message).join(", ");
};

/**
 * Create user-friendly error message
 * @param {Error|Object} error - Error object
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyMessage = (error) => {
  if (isAuthError(error)) {
    return "Your session has expired. Please log in again.";
  }

  if (isForbiddenError(error)) {
    return "You don't have permission to perform this action.";
  }

  if (isValidationError(error)) {
    const validationErrors = getValidationErrors(error);
    if (validationErrors.length > 0) {
      return formatValidationErrors(validationErrors);
    }
    return "Please check your input and try again.";
  }

  if (isNotFoundError(error)) {
    return "The requested resource was not found.";
  }

  if (isConflictError(error)) {
    return "This resource already exists or conflicts with existing data.";
  }

  if (isRateLimitError(error)) {
    return "Too many requests. Please try again later.";
  }

  if (isNetworkError(error)) {
    return "Network error. Please check your internet connection.";
  }

  return getErrorMessage(error);
};

/**
 * Sanitize error message to remove sensitive information
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
export const sanitizeErrorMessage = (message) => {
  if (!message) return "";

  return message
    .replace(/Bearer\s+[\w-]+/g, "Bearer [REDACTED]")
    .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]")
    .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[REDACTED]")
    .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]");
};

/**
 * Log error to console (development) or send to backend (production)
 * @param {Error|Object} error - Error object
 * @param {string} context - Context where error occurred
 */
export const logError = (error, context = "") => {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` - ${context}` : ""}]:`, error);

    if (error?.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
  } else {
    // Send to backend logging endpoint in production
    const errorData = {
      message: sanitizeErrorMessage(error?.message || "Unknown error"),
      stack: error?.stack ? sanitizeErrorMessage(error.stack) : undefined,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Send to backend (fail silently if logging fails)
    fetch("/api/logs/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorData),
      credentials: "include",
    }).catch(() => {
      // Fail silently - don't throw error if logging fails
      console.error("Failed to log error to backend");
    });
  }
};

/**
 * Handle API error
 * @param {Error|Object} error - Error object
 * @param {Object} options - Options
 * @param {Function} options.onAuthError - Callback for auth errors (401)
 * @param {Function} options.onForbiddenError - Callback for forbidden errors (403)
 * @param {Function} options.onValidationError - Callback for validation errors (400)
 * @param {Function} options.onNotFoundError - Callback for not found errors (404)
 * @param {Function} options.onConflictError - Callback for conflict errors (409)
 * @param {Function} options.onRateLimitError - Callback for rate limit errors (429)
 * @param {Function} options.onNetworkError - Callback for network errors
 * @param {Function} options.onGenericError - Callback for generic errors
 * @param {string} options.context - Context where error occurred
 * @returns {string} Error message
 */
export const handleApiError = (error, options = {}) => {
  const {
    onAuthError,
    onForbiddenError,
    onValidationError,
    onNotFoundError,
    onConflictError,
    onRateLimitError,
    onNetworkError,
    onGenericError,
    context = "",
  } = options;

  // Log error
  logError(error, context);

  // Handle specific error types
  if (isAuthError(error) && onAuthError) {
    onAuthError(error);
  } else if (isForbiddenError(error) && onForbiddenError) {
    onForbiddenError(error);
  } else if (isValidationError(error) && onValidationError) {
    onValidationError(error);
  } else if (isNotFoundError(error) && onNotFoundError) {
    onNotFoundError(error);
  } else if (isConflictError(error) && onConflictError) {
    onConflictError(error);
  } else if (isRateLimitError(error) && onRateLimitError) {
    onRateLimitError(error);
  } else if (isNetworkError(error) && onNetworkError) {
    onNetworkError(error);
  } else if (onGenericError) {
    onGenericError(error);
  }

  return getUserFriendlyMessage(error);
};

export default {
  getErrorMessage,
  getErrorCode,
  getValidationErrors,
  isAuthError,
  isForbiddenError,
  isValidationError,
  isNotFoundError,
  isConflictError,
  isRateLimitError,
  isNetworkError,
  formatValidationErrors,
  getUserFriendlyMessage,
  logError,
  handleApiError,
  sanitizeErrorMessage,
};
