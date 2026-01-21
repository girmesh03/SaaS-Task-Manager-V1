import { body, param, query } from "express-validator";
import {
  ORGANIZATION_VALIDATION,
  SUBSCRIPTION_VALIDATION,
  SETTINGS_VALIDATION,
  IMAGE_VALIDATION,
  COMMON_VALIDATION,
  INDUSTRIES,
  INDUSTRIES_SIZE,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import { Organization } from "../../models/index.js";

/**
 * Organization Validators
 * Validates organization-related requests (update, delete, restore, list)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 * Scoped to req.user.organization._id
 *
 * NOTE: Organization creation is NOT done via API route - it's done via register endpoint
 * These validators are for Platform SuperAdmin managing customer organizations
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * List Organizations Validator
 * Validates query parameters for listing organizations
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listOrganizationsValidator = [
  query("deleted")
    .optional()
    .custom((value) => {
      // Accept true, false, "true", "false", or "only"
      if (
        value === true ||
        value === false ||
        value === "true" ||
        value === "false" ||
        value === "only"
      ) {
        return true;
      }
      throw new Error('Deleted must be true, false, or "only"');
    })
    .customSanitizer((value) => {
      // Convert string "true"/"false" to boolean, keep "only" as string
      if (value === "true") return true;
      if (value === "false") return false;
      return value; // true, false, or "only"
    }),

  query("page")
    .optional()
    .isInt({ min: SEARCH_VALIDATION.PAGE.MIN, max: SEARCH_VALIDATION.PAGE.MAX })
    .withMessage(
      `Page must be between ${SEARCH_VALIDATION.PAGE.MIN} and ${SEARCH_VALIDATION.PAGE.MAX}`
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: SEARCH_VALIDATION.LIMIT.MIN,
      max: SEARCH_VALIDATION.LIMIT.MAX,
    })
    .withMessage(
      `Limit must be between ${SEARCH_VALIDATION.LIMIT.MIN} and ${SEARCH_VALIDATION.LIMIT.MAX}`
    )
    .toInt(),

  query("search")
    .optional()
    .trim()
    .isLength({
      min: SEARCH_VALIDATION.QUERY.MIN_LENGTH,
      max: SEARCH_VALIDATION.QUERY.MAX_LENGTH,
    })
    .withMessage(
      `Search query must be between ${SEARCH_VALIDATION.QUERY.MIN_LENGTH} and ${SEARCH_VALIDATION.QUERY.MAX_LENGTH} characters`
    ),

  query("industry")
    .optional()
    .trim()
    .isIn(Object.values(INDUSTRIES))
    .withMessage("Invalid industry filter"),

  query("size")
    .optional()
    .trim()
    .isIn(Object.values(INDUSTRIES_SIZE))
    .withMessage("Invalid size filter"),

  query("isPlatformOrg")
    .optional()
    .isBoolean()
    .withMessage("isPlatformOrg must be a boolean value")
    .toBoolean(),
];

/**
 * Update Organization Validator
 * Validates organization update request
 * Scoped to req.user.organization._id
 */
export const updateOrganizationValidator = [
  param("organizationId")
    .trim()
    .notEmpty()
    .withMessage("Organization ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value) => {
      // Check if organization exists (including soft-deleted)
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (organization.isDeleted) {
        throw new Error("Cannot update deleted organization");
      }
      return true;
    }),

  body("name")
    .optional()
    .trim()
    .isLength({
      min: ORGANIZATION_VALIDATION.NAME.MIN_LENGTH,
      max: ORGANIZATION_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Organization name must be between ${ORGANIZATION_VALIDATION.NAME.MIN_LENGTH} and ${ORGANIZATION_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .matches(ORGANIZATION_VALIDATION.NAME.PATTERN)
    .withMessage("Organization name contains invalid characters")
    .custom(async (value, { req }) => {
      // Check uniqueness excluding current organization (including soft-deleted)
      const existingOrg = await Organization.findOne({
        name: value,
        _id: { $ne: req.params.organizationId },
      })
        .withDeleted()
        .lean();
      if (existingOrg) {
        throw new Error("Organization name already exists");
      }
      return true;
    }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: ORGANIZATION_VALIDATION.DESCRIPTION.MAX_LENGTH })
    .withMessage(
      `Description must not exceed ${ORGANIZATION_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: ORGANIZATION_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${ORGANIZATION_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .custom(async (value, { req }) => {
      // Check uniqueness excluding current organization (including soft-deleted)
      const existingOrg = await Organization.findOne({
        email: value.toLowerCase(),
        _id: { $ne: req.params.organizationId },
      })
        .withDeleted()
        .lean();
      if (existingOrg) {
        throw new Error("Organization email already exists");
      }
      return true;
    }),

  body("phone")
    .optional()
    .trim()
    .isLength({
      min: ORGANIZATION_VALIDATION.PHONE.MIN_LENGTH,
      max: ORGANIZATION_VALIDATION.PHONE.MAX_LENGTH,
    })
    .withMessage(
      `Phone must be between ${ORGANIZATION_VALIDATION.PHONE.MIN_LENGTH} and ${ORGANIZATION_VALIDATION.PHONE.MAX_LENGTH} characters`
    )
    .matches(ORGANIZATION_VALIDATION.PHONE.PATTERN)
    .withMessage(
      "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)"
    )
    .custom(async (value, { req }) => {
      // Check uniqueness excluding current organization (including soft-deleted)
      const existingOrg = await Organization.findOne({
        phone: value,
        _id: { $ne: req.params.organizationId },
      })
        .withDeleted()
        .lean();
      if (existingOrg) {
        throw new Error("Organization phone already exists");
      }
      return true;
    }),

  body("address")
    .optional()
    .trim()
    .isLength({
      min: ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH,
      max: ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH,
    })
    .withMessage(
      `Address must be between ${ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH} and ${ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH} characters`
    ),

  body("industry")
    .optional()
    .trim()
    .isIn(Object.values(INDUSTRIES))
    .withMessage(
      `Invalid industry. Must be one of: ${Object.values(INDUSTRIES).join(
        ", "
      )}`
    ),

  body("size")
    .optional()
    .trim()
    .isIn(Object.values(INDUSTRIES_SIZE))
    .withMessage(
      `Invalid size. Must be one of: ${Object.values(INDUSTRIES_SIZE).join(
        ", "
      )}`
    ),

  body("logo.url")
    .optional()
    .trim()
    .matches(IMAGE_VALIDATION.URL.PATTERN)
    .withMessage("Please provide a valid Cloudinary URL"),

  body("logo.publicId")
    .optional()
    .trim()
    .isLength({ max: IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH })
    .withMessage(
      `Public ID must not exceed ${IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH} characters`
    ),

  body("isPlatformOrg")
    .optional()
    .custom(() => {
      // Prevent modification of isPlatformOrg flag
      throw new Error("Cannot modify isPlatformOrg flag after creation");
    }),

  body("subscription.plan")
    .optional()
    .trim()
    .isIn(SUBSCRIPTION_VALIDATION.PLAN.VALUES)
    .withMessage(
      `Invalid subscription plan. Must be one of: ${SUBSCRIPTION_VALIDATION.PLAN.VALUES.join(
        ", "
      )}`
    ),

  body("subscription.status")
    .optional()
    .trim()
    .isIn(SUBSCRIPTION_VALIDATION.STATUS.VALUES)
    .withMessage(
      `Invalid subscription status. Must be one of: ${SUBSCRIPTION_VALIDATION.STATUS.VALUES.join(
        ", "
      )}`
    ),

  body("subscription.expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error("Subscription expiry date cannot be in the past");
      }
      return true;
    }),

  body("settings.timezone")
    .optional()
    .trim()
    .matches(SETTINGS_VALIDATION.TIMEZONE.PATTERN)
    .withMessage("Invalid timezone format"),

  body("settings.dateFormat")
    .optional()
    .trim()
    .isIn(SETTINGS_VALIDATION.DATE_FORMAT.VALUES)
    .withMessage(
      `Invalid date format. Must be one of: ${SETTINGS_VALIDATION.DATE_FORMAT.VALUES.join(
        ", "
      )}`
    ),

  body("settings.language")
    .optional()
    .trim()
    .isIn(SETTINGS_VALIDATION.LANGUAGE.VALUES)
    .withMessage(
      `Invalid language. Must be one of: ${SETTINGS_VALIDATION.LANGUAGE.VALUES.join(
        ", "
      )}`
    ),
];

/**
 * Delete Organization Validator
 * Validates organization deletion request
 * Scoped to req.user.organization._id
 */
export const deleteOrganizationValidator = [
  param("organizationId")
    .trim()
    .notEmpty()
    .withMessage("Organization ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value) => {
      // Check if organization exists (including soft-deleted)
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (organization.isDeleted) {
        throw new Error("Organization is already deleted");
      }
      // Prevent deletion of platform organization
      if (organization.isPlatformOrg) {
        throw new Error("Platform organization cannot be deleted");
      }
      return true;
    }),
];

/**
 * Restore Organization Validator
 * Validates organization restoration request
 * Scoped to req.user.organization._id
 */
export const restoreOrganizationValidator = [
  param("organizationId")
    .trim()
    .notEmpty()
    .withMessage("Organization ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value) => {
      // Check if organization exists and is deleted
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (!organization.isDeleted) {
        throw new Error("Organization is not deleted");
      }
      return true;
    }),
];

/**
 * Get Organization By ID Validator
 * Validates organization ID parameter
 * Scoped to req.user.organization._id
 */
export const getOrganizationByIdValidator = [
  param("organizationId")
    .trim()
    .notEmpty()
    .withMessage("Organization ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value) => {
      // Check if organization exists (including soft-deleted)
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      return true;
    }),
];

export default {
  listOrganizationsValidator,
  updateOrganizationValidator,
  deleteOrganizationValidator,
  restoreOrganizationValidator,
  getOrganizationByIdValidator,
};
