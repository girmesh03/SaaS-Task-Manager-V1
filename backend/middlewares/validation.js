import { validationResult, matchedData } from "express-validator";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import CustomError from "../errorHandler/CustomError.js";

/**
 * Validation Middleware Wrapper
 * Wraps express-validator to format validation errors for consistent responses
 *
 * Requirements: 41.5, 41.10
 */

/**
 * Validation Error Handler Middleware
 * Checks for validation errors and formats them consistently
 * Stores validated data in req.validated for use in controllers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Extract error messages
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    // Create a formatted error message
    const formattedMessage = errorMessages
      .map((err) => `${err.field}: ${err.message}`)
      .join(", ");

    // Throw custom validation error
    throw new CustomError(
      formattedMessage,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      errorMessages
    );
  }

  // Store validated data in req.validated for use in controllers
  req.validated = {
    body: matchedData(req, { locations: ["body"] }),
    params: matchedData(req, { locations: ["params"] }),
    query: matchedData(req, { locations: ["query"] }),
  };

  next();
};

/**
 * Create a validation chain with the validate middleware
 * @param {Array} validators - Array of express-validator validation chains
 * @returns {Array} - Array of validators with validate middleware appended
 */
export const validationChain = (validators) => {
  return [...validators, validate];
};

export default {
  validate,
  validationChain,
};
