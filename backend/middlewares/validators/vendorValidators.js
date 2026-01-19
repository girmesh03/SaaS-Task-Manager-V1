import { body, param, query } from "express-validator";
import {
  VENDOR_VALIDATION,
  VENDOR_STATUS,
  COMMON_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import { Vendor, User, Organization } from "../../models/index.js";

/**
 * Vendor Validators
 * Validates vendor-related requests (create, update, delete)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * List Vendors Validator
 * Validates query parameters for listing vendors
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listVendorsValidator = [
  query("deleted")
    .optional()
    .isBoolean()
    .withMessage("Deleted must be a boolean value")
    .toBoolean(),

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

  query("status")
    .optional()
    .trim()
    .isIn(Object.values(VENDOR_STATUS))
    .withMessage("Invalid status filter"),

  query("organization")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format"),

  query("minRating")
    .optional()
    .isFloat({
      min: VENDOR_VALIDATION.RATING.MIN,
      max: VENDOR_VALIDATION.RATING.MAX,
    })
    .withMessage(
      `Min rating must be between ${VENDOR_VALIDATION.RATING.MIN} and ${VENDOR_VALIDATION.RATING.MAX}`
    )
    .toFloat(),

  query("maxRating")
    .optional()
    .isFloat({
      min: VENDOR_VALIDATION.RATING.MIN,
      max: VENDOR_VALIDATION.RATING.MAX,
    })
    .withMessage(
      `Max rating must be between ${VENDOR_VALIDATION.RATING.MIN} and ${VENDOR_VALIDATION.RATING.MAX}`
    )
    .toFloat(),
];

/**
 * Create Vendor Validator
 */
export const createVendorValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Vendor name is required")
    .isLength({
      min: VENDOR_VALIDATION.NAME.MIN_LENGTH,
      max: VENDOR_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Vendor name must be between ${VENDOR_VALIDATION.NAME.MIN_LENGTH} and ${VENDOR_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .custom(async (value, { req }) => {
      // SCOPING: Check uniqueness within req.user's organization (not req.body.organization)
      const existingVendor = await Vendor.findOne({
        name: value,
        organization: req.user.organization._id,
      })
        .withDeleted()
        .lean();
      if (existingVendor) {
        throw new Error("Vendor name already exists in this organization");
      }
      return true;
    }),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Vendor email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: VENDOR_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${VENDOR_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .matches(VENDOR_VALIDATION.EMAIL.PATTERN)
    .withMessage("Please provide a valid email address")
    .custom(async (value, { req }) => {
      // SCOPING: Check uniqueness within req.user's organization (not req.body.organization)
      const existingVendor = await Vendor.findOne({
        email: value.toLowerCase(),
        organization: req.user.organization._id,
      })
        .withDeleted()
        .lean();
      if (existingVendor) {
        throw new Error("Vendor email already exists in this organization");
      }
      return true;
    }),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Vendor phone is required")
    .isLength({
      min: VENDOR_VALIDATION.PHONE.MIN_LENGTH,
      max: VENDOR_VALIDATION.PHONE.MAX_LENGTH,
    })
    .withMessage(
      `Phone must be between ${VENDOR_VALIDATION.PHONE.MIN_LENGTH} and ${VENDOR_VALIDATION.PHONE.MAX_LENGTH} characters`
    )
    .matches(VENDOR_VALIDATION.PHONE.PATTERN)
    .withMessage(
      "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)"
    )
    .custom(async (value, { req }) => {
      // SCOPING: Check uniqueness within req.user's organization (not req.body.organization)
      const existingVendor = await Vendor.findOne({
        phone: value,
        organization: req.user.organization._id,
      })
        .withDeleted()
        .lean();
      if (existingVendor) {
        throw new Error("Vendor phone already exists in this organization");
      }
      return true;
    }),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create vendors in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error("You can only create vendors in your own organization");
      }
      // Check if organization exists
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (organization.isDeleted) {
        throw new Error("Cannot add vendor to deleted organization");
      }
      return true;
    }),

  body("createdBy")
    .trim()
    .notEmpty()
    .withMessage("Created by user is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value, { req }) => {
      // Check if user exists and belongs to organization
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot assign deleted user as creator");
      }
      // SCOPING: Creator must belong to req.user's organization
      if (
        user.organization.toString() !== req.user.organization._id.toString()
      ) {
        throw new Error("Creator must belong to your organization");
      }
      return true;
    }),

  body("rating")
    .optional()
    .isFloat({
      min: VENDOR_VALIDATION.RATING.MIN,
      max: VENDOR_VALIDATION.RATING.MAX,
    })
    .withMessage(
      `Rating must be between ${VENDOR_VALIDATION.RATING.MIN} and ${VENDOR_VALIDATION.RATING.MAX}`
    ),

  body("status")
    .optional()
    .trim()
    .isIn(Object.values(VENDOR_STATUS))
    .withMessage("Invalid vendor status"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: VENDOR_VALIDATION.ADDRESS.MAX_LENGTH })
    .withMessage(
      `Address must not exceed ${VENDOR_VALIDATION.ADDRESS.MAX_LENGTH} characters`
    ),
];

/**
 * Update Vendor Validator
 */
export const updateVendorValidator = [
  param("vendorId")
    .trim()
    .notEmpty()
    .withMessage("Vendor ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid vendor ID format")
    .custom(async (value) => {
      // Check if vendor exists
      const vendor = await Vendor.findById(value).withDeleted().lean();
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      if (vendor.isDeleted) {
        throw new Error("Cannot update deleted vendor");
      }
      return true;
    }),

  body("name")
    .optional()
    .trim()
    .isLength({
      min: VENDOR_VALIDATION.NAME.MIN_LENGTH,
      max: VENDOR_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Vendor name must be between ${VENDOR_VALIDATION.NAME.MIN_LENGTH} and ${VENDOR_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .custom(async (value, { req }) => {
      // Check uniqueness within organization excluding current vendor (including soft-deleted)
      const vendor = await Vendor.findById(req.params.vendorId)
        .withDeleted()
        .lean();
      const existingVendor = await Vendor.findOne({
        name: value,
        organization: vendor.organization,
        _id: { $ne: req.params.vendorId },
      })
        .withDeleted()
        .lean();
      if (existingVendor) {
        throw new Error("Vendor name already exists in this organization");
      }
      return true;
    }),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: VENDOR_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${VENDOR_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .matches(VENDOR_VALIDATION.EMAIL.PATTERN)
    .withMessage("Please provide a valid email address")
    .custom(async (value, { req }) => {
      // Check uniqueness within organization excluding current vendor (including soft-deleted)
      const vendor = await Vendor.findById(req.params.vendorId)
        .withDeleted()
        .lean();
      const existingVendor = await Vendor.findOne({
        email: value.toLowerCase(),
        organization: vendor.organization,
        _id: { $ne: req.params.vendorId },
      })
        .withDeleted()
        .lean();
      if (existingVendor) {
        throw new Error("Vendor email already exists in this organization");
      }
      return true;
    }),

  body("phone")
    .optional()
    .trim()
    .isLength({
      min: VENDOR_VALIDATION.PHONE.MIN_LENGTH,
      max: VENDOR_VALIDATION.PHONE.MAX_LENGTH,
    })
    .withMessage(
      `Phone must be between ${VENDOR_VALIDATION.PHONE.MIN_LENGTH} and ${VENDOR_VALIDATION.PHONE.MAX_LENGTH} characters`
    )
    .matches(VENDOR_VALIDATION.PHONE.PATTERN)
    .withMessage(
      "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)"
    )
    .custom(async (value, { req }) => {
      // Check uniqueness within organization excluding current vendor (including soft-deleted)
      const vendor = await Vendor.findById(req.params.vendorId)
        .withDeleted()
        .lean();
      const existingVendor = await Vendor.findOne({
        phone: value,
        organization: vendor.organization,
        _id: { $ne: req.params.vendorId },
      })
        .withDeleted()
        .lean();
      if (existingVendor) {
        throw new Error("Vendor phone already exists in this organization");
      }
      return true;
    }),

  body("rating")
    .optional()
    .isFloat({
      min: VENDOR_VALIDATION.RATING.MIN,
      max: VENDOR_VALIDATION.RATING.MAX,
    })
    .withMessage(
      `Rating must be between ${VENDOR_VALIDATION.RATING.MIN} and ${VENDOR_VALIDATION.RATING.MAX}`
    ),

  body("status")
    .optional()
    .trim()
    .isIn(Object.values(VENDOR_STATUS))
    .withMessage("Invalid vendor status"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: VENDOR_VALIDATION.ADDRESS.MAX_LENGTH })
    .withMessage(
      `Address must not exceed ${VENDOR_VALIDATION.ADDRESS.MAX_LENGTH} characters`
    ),
];

/**
 * Delete Vendor Validator
 */
export const deleteVendorValidator = [
  param("vendorId")
    .trim()
    .notEmpty()
    .withMessage("Vendor ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid vendor ID format")
    .custom(async (value) => {
      const vendor = await Vendor.findById(value).withDeleted().lean();
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      if (vendor.isDeleted) {
        throw new Error("Vendor is already deleted");
      }
      return true;
    }),
];

/**
 * Restore Vendor Validator
 */
export const restoreVendorValidator = [
  param("vendorId")
    .trim()
    .notEmpty()
    .withMessage("Vendor ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid vendor ID format")
    .custom(async (value) => {
      const vendor = await Vendor.findById(value).withDeleted().lean();
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      if (!vendor.isDeleted) {
        throw new Error("Vendor is not deleted");
      }
      // Validate parent organization is not deleted
      const organization = await Organization.findById(vendor.organization)
        .withDeleted()
        .lean();
      if (organization && organization.isDeleted) {
        throw new Error("Cannot restore vendor with deleted organization");
      }
      return true;
    }),
];

/**
 * Get Vendor By ID Validator
 */
export const getVendorByIdValidator = [
  param("vendorId")
    .trim()
    .notEmpty()
    .withMessage("Vendor ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid vendor ID format")
    .custom(async (value) => {
      // Check if vendor exists (including soft-deleted)
      const vendor = await Vendor.findById(value).withDeleted().lean();
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      return true;
    }),
];

export default {
  listVendorsValidator,
  createVendorValidator,
  updateVendorValidator,
  deleteVendorValidator,
  restoreVendorValidator,
  getVendorByIdValidator,
};
