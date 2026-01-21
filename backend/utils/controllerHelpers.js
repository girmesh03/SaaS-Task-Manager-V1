import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "./constants.js";

/**
 * Controller Helper Functions
 * Shared validation and utility functions used across controllers
 */

/**
 * Validate resource belongs to same organization as authenticated user
 * @param {Object} resource - Resource document to validate
 * @param {Object} authenticatedUser - Authenticated user from req.user
 * @param {string} action - Action being performed (for error message)
 * @param {string} resourceType - Type of resource (for error message)
 * @throws {CustomError} If organization mismatch
 */
export const validateOrganizationScope = (
  resource,
  authenticatedUser,
  action,
  resourceType = "resource"
) => {
  const resourceOrgId = resource.organization?._id || resource.organization;
  const authOrgId = authenticatedUser.organization._id;

  if (resourceOrgId.toString() !== authOrgId.toString()) {
    throw new CustomError(
      `You do not have permission to ${action} this ${resourceType}`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN_ERROR
    );
  }
};

/**
 * Validate resource is not soft-deleted
 * @param {Object} resource - Resource document to validate
 * @param {string} action - Action being performed (for error message)
 * @param {string} resourceType - Type of resource (for error message)
 * @throws {CustomError} If resource is soft-deleted
 */
export const validateNotDeleted = (
  resource,
  action,
  resourceType = "resource"
) => {
  if (resource.isDeleted) {
    throw new CustomError(
      `Cannot ${action} deleted ${resourceType}`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Validate resource is soft-deleted
 * @param {Object} resource - Resource document to validate
 * @param {string} resourceType - Type of resource (for error message)
 * @throws {CustomError} If resource is not soft-deleted
 */
export const validateIsDeleted = (resource, resourceType = "resource") => {
  if (!resource.isDeleted) {
    throw new CustomError(
      `${resourceType} is not deleted`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Find resource by ID with error handling
 * @param {Object} Model - Mongoose model
 * @param {string} resourceId - Resource ID to find
 * @param {Object} options - Query options
 * @param {boolean} options.includeDeleted - Include soft-deleted resources
 * @param {import('mongoose').ClientSession} options.session - MongoDB session
 * @param {string} options.resourceType - Type of resource (for error message)
 * @returns {Promise<Object>} Resource document
 * @throws {CustomError} If resource not found
 */
export const findResourceById = async (Model, resourceId, options = {}) => {
  const {
    includeDeleted = false,
    session = null,
    resourceType = "Resource",
  } = options;

  let query = Model.findById(resourceId);

  if (includeDeleted) {
    query = query.withDeleted();
  }

  if (session) {
    query = query.session(session);
  }

  const resource = await query;

  if (!resource) {
    throw new CustomError(
      `${resourceType} with ID ${resourceId} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND_ERROR
    );
  }

  return resource;
};

/**
 * Handle cascade operation result
 * @param {Object} cascadeResult - Result from cascade operation
 * @param {string} operation - Operation type (delete/restore)
 * @param {string} userId - User ID
 * @param {Object} logger - Logger instance
 * @param {string} resourceType - Type of resource
 * @throws {CustomError} If cascade operation failed
 */
export const handleCascadeResult = (
  cascadeResult,
  operation,
  userId,
  logger,
  resourceType = "resource"
) => {
  if (!cascadeResult.success) {
    const errorMessage = `Cascade ${operation} failed: ${cascadeResult.errors
      .map((e) => e.message)
      .join(", ")}`;

    logger.error(`Cascade ${operation} failed`, {
      userId,
      errors: cascadeResult.errors,
      warnings: cascadeResult.warnings,
      operationType: `CASCADE_${operation.toUpperCase()}`,
      resourceType: resourceType.toUpperCase(),
    });

    throw new CustomError(
      errorMessage,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Build search filter with regex escaping
 * @param {string} search - Search query
 * @param {Array<string>} fields - Fields to search
 * @param {Function} escapeRegex - Regex escape function
 * @param {number} maxLength - Maximum search query length
 * @returns {Object|null} MongoDB $or filter or null
 * @throws {CustomError} If search query too long
 */
export const buildSearchFilter = (
  search,
  fields,
  escapeRegex,
  maxLength = 100
) => {
  if (!search || search.trim() === "") {
    return null;
  }

  const trimmedSearch = search.trim();

  // Validate search length
  if (trimmedSearch.length > maxLength) {
    throw new CustomError(
      `Search query must not exceed ${maxLength} characters`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const escapedSearch = escapeRegex(trimmedSearch);

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escapedSearch, $options: "i" },
    })),
  };
};

export default {
  validateOrganizationScope,
  validateNotDeleted,
  validateIsDeleted,
  findResourceById,
  handleCascadeResult,
  buildSearchFilter,
};
