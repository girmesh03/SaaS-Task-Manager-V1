import { param, body } from "express-validator";
import { COMMON_VALIDATION } from "../../utils/constants.js";

/**
 * Common Validators
 * Reusable validation patterns to reduce code duplication
 * Provides factory functions for common validation scenarios
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * Validates MongoDB ObjectId format for route parameters
 * @param {string} paramName - Name of the parameter to validate
 * @param {string} resourceName - Human-readable resource name for error messages
 * @returns {ValidationChain}
 */
export const validateObjectIdParam = (
  paramName = "id",
  resourceName = "Resource"
) => {
  return param(paramName)
    .trim()
    .notEmpty()
    .withMessage(`${resourceName} ID is required`)
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage(`Invalid ${resourceName.toLowerCase()} ID format`);
};

/**
 * Validates resource existence (including soft-deleted)
 * @param {Model} Model - Mongoose model to query
 * @param {string} paramName - Name of the parameter containing the ID
 * @param {string} resourceName - Human-readable resource name for error messages
 * @param {boolean} checkDeleted - Whether to check if resource is deleted
 * @returns {Function} Custom validator function
 */
export const validateResourceExists = (
  Model,
  paramName = "id",
  resourceName = "Resource",
  checkDeleted = false
) => {
  return async (value, { req }) => {
    const id = req.params[paramName] || value;
    const resource = await Model.findById(id).withDeleted().lean();

    if (!resource) {
      throw new Error(`${resourceName} not found`);
    }

    if (checkDeleted && resource.isDeleted) {
      throw new Error(`Cannot update deleted ${resourceName.toLowerCase()}`);
    }

    return true;
  };
};

/**
 * Validates resource is soft-deleted (for restore operations)
 * @param {Model} Model - Mongoose model to query
 * @param {string} paramName - Name of the parameter containing the ID
 * @param {string} resourceName - Human-readable resource name for error messages
 * @returns {Function} Custom validator function
 */
export const validateResourceDeleted = (
  Model,
  paramName = "id",
  resourceName = "Resource"
) => {
  return async (value, { req }) => {
    const id = req.params[paramName] || value;
    const resource = await Model.findById(id).withDeleted().lean();

    if (!resource) {
      throw new Error(`${resourceName} not found`);
    }

    if (!resource.isDeleted) {
      throw new Error(`${resourceName} is not deleted`);
    }

    return true;
  };
};

/**
 * Validates resource is NOT soft-deleted (for delete operations)
 * @param {Model} Model - Mongoose model to query
 * @param {string} paramName - Name of the parameter containing the ID
 * @param {string} resourceName - Human-readable resource name for error messages
 * @returns {Function} Custom validator function
 */
export const validateResourceNotDeleted = (
  Model,
  paramName = "id",
  resourceName = "Resource"
) => {
  return async (value, { req }) => {
    const id = req.params[paramName] || value;
    const resource = await Model.findById(id).withDeleted().lean();

    if (!resource) {
      throw new Error(`${resourceName} not found`);
    }

    if (resource.isDeleted) {
      throw new Error(`${resourceName} is already deleted`);
    }

    return true;
  };
};

/**
 * Validates field uniqueness within a scope (e.g., organization)
 * @param {Model} Model - Mongoose model to query
 * @param {string} fieldName - Name of the field to check uniqueness
 * @param {Object} scopeFields - Additional fields to scope the uniqueness check (e.g., {organization: req.body.organization})
 * @param {string} excludeIdParam - Parameter name containing ID to exclude from check (for updates)
 * @returns {Function} Custom validator function
 */
export const validateUniqueness = (
  Model,
  fieldName,
  scopeFields = {},
  excludeIdParam = null
) => {
  return async (value, { req }) => {
    const query = { [fieldName]: value };

    // Add scope fields (e.g., organization)
    for (const [key, valueOrGetter] of Object.entries(scopeFields)) {
      query[key] =
        typeof valueOrGetter === "function"
          ? valueOrGetter(req)
          : valueOrGetter;
    }

    // Exclude current resource for updates
    if (excludeIdParam && req.params[excludeIdParam]) {
      query._id = { $ne: req.params[excludeIdParam] };
    }

    const existing = await Model.findOne(query).withDeleted().lean();

    if (existing) {
      const scopeDesc =
        Object.keys(scopeFields).length > 0
          ? ` in this ${Object.keys(scopeFields).join("/")}`
          : "";
      throw new Error(
        `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } already exists${scopeDesc}`
      );
    }

    return true;
  };
};

/**
 * Validates parent resource is not deleted (for cascade restore validation)
 * @param {Model} ParentModel - Parent mongoose model to query
 * @param {string} parentFieldName - Name of the field containing parent ID
 * @param {string} parentResourceName - Human-readable parent resource name
 * @returns {Function} Custom validator function
 */
export const validateParentNotDeleted = (
  ParentModel,
  parentFieldName,
  parentResourceName
) => {
  return async (value, { req }) => {
    // Get parent ID from request body or from the resource being restored
    const parentId = req.body[parentFieldName] || value;

    if (!parentId) {
      return true; // Skip if no parent
    }

    const parent = await ParentModel.findById(parentId).withDeleted().lean();

    if (parent && parent.isDeleted) {
      throw new Error(
        `Cannot restore resource with deleted ${parentResourceName.toLowerCase()}`
      );
    }

    return true;
  };
};

/**
 * Validates resource belongs to same organization
 * @param {Model} Model - Mongoose model to query
 * @param {string} fieldName - Name of the field containing resource ID
 * @param {string} resourceName - Human-readable resource name
 * @param {Function} getOrganizationId - Function to get organization ID from request
 * @returns {Function} Custom validator function
 */
export const validateSameOrganization = (
  Model,
  fieldName,
  resourceName,
  getOrganizationId
) => {
  return async (value, { req }) => {
    const resource = await Model.findById(value).withDeleted().lean();

    if (!resource) {
      throw new Error(`${resourceName} not found`);
    }

    if (resource.isDeleted) {
      throw new Error(`Cannot assign deleted ${resourceName.toLowerCase()}`);
    }

    const expectedOrgId = getOrganizationId(req);
    if (
      expectedOrgId &&
      resource.organization.toString() !== expectedOrgId.toString()
    ) {
      throw new Error(`${resourceName} must belong to the same organization`);
    }

    return true;
  };
};

/**
 * Validates string length with pattern matching
 * @param {string} fieldName - Name of the field
 * @param {Object} validation - Validation config from constants (MIN_LENGTH, MAX_LENGTH, PATTERN)
 * @param {boolean} required - Whether field is required
 * @returns {ValidationChain}
 */
export const validateStringField = (fieldName, validation, required = true) => {
  const chain = body(fieldName).trim();

  if (required) {
    chain
      .notEmpty()
      .withMessage(
        `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`
      );
  } else {
    chain.optional();
  }

  if (validation.MIN_LENGTH && validation.MAX_LENGTH) {
    chain
      .isLength({
        min: validation.MIN_LENGTH,
        max: validation.MAX_LENGTH,
      })
      .withMessage(
        `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } must be between ${validation.MIN_LENGTH} and ${
          validation.MAX_LENGTH
        } characters`
      );
  } else if (validation.MAX_LENGTH) {
    chain
      .isLength({ max: validation.MAX_LENGTH })
      .withMessage(
        `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } must not exceed ${validation.MAX_LENGTH} characters`
      );
  }

  if (validation.PATTERN) {
    chain
      .matches(validation.PATTERN)
      .withMessage(
        `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } contains invalid characters`
      );
  }

  return chain;
};

export default {
  validateObjectIdParam,
  validateResourceExists,
  validateResourceDeleted,
  validateResourceNotDeleted,
  validateUniqueness,
  validateParentNotDeleted,
  validateSameOrganization,
  validateStringField,
};
