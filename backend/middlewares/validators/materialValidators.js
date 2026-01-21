import { body, param, query } from "express-validator";
import {
  MATERIAL_VALIDATION,
  MATERIAL_CATEGORY,
  COMMON_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import {
  Material,
  User,
  Department,
  Organization,
} from "../../models/index.js";

/**
 * Material Validators
 * Validates material-related requests (create, update, delete)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * List Materials Validator
 * Validates query parameters for listing materials
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listMaterialsValidator = [
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

  query("category")
    .optional()
    .trim()
    .isIn(Object.values(MATERIAL_CATEGORY))
    .withMessage("Invalid category filter"),

  query("organization")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format"),

  query("department")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format"),
];

/**
 * Create Material Validator
 */
export const createMaterialValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Material name is required")
    .isLength({
      min: MATERIAL_VALIDATION.NAME.MIN_LENGTH,
      max: MATERIAL_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Material name must be between ${MATERIAL_VALIDATION.NAME.MIN_LENGTH} and ${MATERIAL_VALIDATION.NAME.MAX_LENGTH} characters`
    ),

  body("unit")
    .trim()
    .notEmpty()
    .withMessage("Unit is required")
    .isLength({
      min: MATERIAL_VALIDATION.UNIT.MIN_LENGTH,
      max: MATERIAL_VALIDATION.UNIT.MAX_LENGTH,
    })
    .withMessage(
      `Unit must be between ${MATERIAL_VALIDATION.UNIT.MIN_LENGTH} and ${MATERIAL_VALIDATION.UNIT.MAX_LENGTH} characters`
    ),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isIn(Object.values(MATERIAL_CATEGORY))
    .withMessage("Invalid material category"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create materials in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error(
          "You can only create materials in your own organization"
        );
      }
      // Check if organization exists
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (organization.isDeleted) {
        throw new Error("Cannot add material to deleted organization");
      }
      return true;
    }),

  body("department")
    .trim()
    .notEmpty()
    .withMessage("Department is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value, { req }) => {
      // Check if department exists and belongs to organization
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (department.isDeleted) {
        throw new Error("Cannot add material to deleted department");
      }
      // SCOPING: Department must belong to req.user's organization
      if (
        department.organization.toString() !==
        req.user.organization._id.toString()
      ) {
        throw new Error("Department must belong to your organization");
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

  body("addedBy")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value, { req }) => {
      if (!value) return true;
      // Check if user exists and belongs to organization
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot assign deleted user as addedBy");
      }
      // SCOPING: AddedBy user must belong to req.user's organization
      if (
        user.organization.toString() !== req.user.organization._id.toString()
      ) {
        throw new Error("AddedBy user must belong to your organization");
      }
      return true;
    }),
];

/**
 * Update Material Validator
 */
export const updateMaterialValidator = [
  param("materialId")
    .trim()
    .notEmpty()
    .withMessage("Material ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid material ID format")
    .custom(async (value) => {
      // Check if material exists
      const material = await Material.findById(value).withDeleted().lean();
      if (!material) {
        throw new Error("Material not found");
      }
      if (material.isDeleted) {
        throw new Error("Cannot update deleted material");
      }
      return true;
    }),

  body("name")
    .optional()
    .trim()
    .isLength({
      min: MATERIAL_VALIDATION.NAME.MIN_LENGTH,
      max: MATERIAL_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Material name must be between ${MATERIAL_VALIDATION.NAME.MIN_LENGTH} and ${MATERIAL_VALIDATION.NAME.MAX_LENGTH} characters`
    ),

  body("unit")
    .optional()
    .trim()
    .isLength({
      min: MATERIAL_VALIDATION.UNIT.MIN_LENGTH,
      max: MATERIAL_VALIDATION.UNIT.MAX_LENGTH,
    })
    .withMessage(
      `Unit must be between ${MATERIAL_VALIDATION.UNIT.MIN_LENGTH} and ${MATERIAL_VALIDATION.UNIT.MAX_LENGTH} characters`
    ),

  body("category")
    .optional()
    .trim()
    .isIn(Object.values(MATERIAL_CATEGORY))
    .withMessage("Invalid material category"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("addedBy")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value, { req }) => {
      if (!value) return true;
      const material = await Material.findById(req.params.materialId)
        .withDeleted()
        .lean();
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot assign deleted user as addedBy");
      }
      if (user.organization.toString() !== material.organization.toString()) {
        throw new Error("AddedBy user must belong to the same organization");
      }
      return true;
    }),
];

/**
 * Delete Material Validator
 */
export const deleteMaterialValidator = [
  param("materialId")
    .trim()
    .notEmpty()
    .withMessage("Material ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid material ID format")
    .custom(async (value) => {
      const material = await Material.findById(value).withDeleted().lean();
      if (!material) {
        throw new Error("Material not found");
      }
      if (material.isDeleted) {
        throw new Error("Material is already deleted");
      }
      return true;
    }),
];

/**
 * Restore Material Validator
 */
export const restoreMaterialValidator = [
  param("materialId")
    .trim()
    .notEmpty()
    .withMessage("Material ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid material ID format")
    .custom(async (value) => {
      const material = await Material.findById(value).withDeleted().lean();
      if (!material) {
        throw new Error("Material not found");
      }
      if (!material.isDeleted) {
        throw new Error("Material is not deleted");
      }
      // Validate parent department is not deleted
      const department = await Department.findById(material.department)
        .withDeleted()
        .lean();
      if (department && department.isDeleted) {
        throw new Error("Cannot restore material with deleted department");
      }
      // Validate parent organization is not deleted
      const organization = await Organization.findById(material.organization)
        .withDeleted()
        .lean();
      if (organization && organization.isDeleted) {
        throw new Error("Cannot restore material with deleted organization");
      }
      return true;
    }),
];

/**
 * Get Material By ID Validator
 */
export const getMaterialByIdValidator = [
  param("materialId")
    .trim()
    .notEmpty()
    .withMessage("Material ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid material ID format")
    .custom(async (value) => {
      // Check if material exists (including soft-deleted)
      const material = await Material.findById(value).withDeleted().lean();
      if (!material) {
        throw new Error("Material not found");
      }
      return true;
    }),
];

export default {
  listMaterialsValidator,
  createMaterialValidator,
  updateMaterialValidator,
  deleteMaterialValidator,
  restoreMaterialValidator,
  getMaterialByIdValidator,
};
