import crypto from "crypto";
import { PAGINATION, COMMON_VALIDATION } from "./constants.js";

/**
 * Utility Helper Functions
 * Common utility functions used across the application
 */

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string (default: 32)
 * @returns {string} Random hexadecimal string
 */
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Generate a unique request ID for tracing
 * @returns {string} Unique request ID (timestamp-randomstring format)
 */
export const generateRequestId = () => {
  return `${Date.now()}-${generateRandomString(8)}`;
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string|*} Sanitized input or original if not string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid 24-character hex ObjectId
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN.test(id);
};

/**
 * Format error response with consistent structure
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Error message
 * @param {Array} details - Optional error details array
 * @returns {Object} Formatted error response
 */
export const formatErrorResponse = (code, message, details = []) => {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Format success response with consistent structure
 * @param {*} data - Response data
 * @param {string} message - Success message (default: "Success")
 * @returns {Object} Formatted success response
 */
export const formatSuccessResponse = (data, message = "Success") => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Sleep/delay for specified milliseconds
 * Useful for rate limiting, retries, or testing
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after sleep
 */
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get pagination options with validation
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Items per page
 * @returns {Object} Pagination options { page, limit, skip }
 */
export const getPaginationOptions = (page = 1, limit = 10) => {
  let pageNum = parseInt(page, 10);
  let limitNum = parseInt(limit, 10);

  // Validate and apply defaults
  if (isNaN(pageNum) || pageNum < 1) {
    pageNum = PAGINATION.DEFAULT_PAGE;
  }

  if (isNaN(limitNum) || limitNum < 1) {
    limitNum = PAGINATION.DEFAULT_LIMIT;
  }

  // Apply max limit
  if (limitNum > PAGINATION.MAX_LIMIT) {
    limitNum = PAGINATION.MAX_LIMIT;
  }

  const skip = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    skip,
  };
};

/**
 * Format pagination metadata for API responses
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export const formatPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};

/**
 * Remove undefined and null values from object
 * Useful for cleaning query parameters or request bodies
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object without undefined/null values
 */
export const removeEmptyValues = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Convert string to URL-friendly slug
 * @param {string} str - String to convert
 * @returns {string} Slugified string
 */
export const slugify = (str) => {
  if (!str || typeof str !== "string") return "";

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Check if email is valid using regex pattern
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return (
    COMMON_VALIDATION.URL.PATTERN.test(email) === false &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
};

/**
 * Check if phone number is valid (E.164 format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const phoneRegex = /^(\+251\d{9}|0\d{9})$/;
  return phoneRegex.test(phone);
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: "...")
 * @returns {string} Truncated string
 */
export const truncate = (str, length = 100, suffix = "...") => {
  if (!str || typeof str !== "string") return "";
  if (str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to pick
 * @returns {Object} New object with only specified keys
 */
export const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to omit
 * @returns {Object} New object without specified keys
 */
export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

export default {
  generateRandomString,
  generateRequestId,
  sanitizeInput,
  isValidObjectId,
  formatErrorResponse,
  formatSuccessResponse,
  sleep,
  getPaginationOptions,
  formatPaginationMeta,
  removeEmptyValues,
  slugify,
  isValidEmail,
  isValidPhone,
  capitalize,
  truncate,
  deepClone,
  isEmptyObject,
  randomInt,
  pick,
  omit,
};
