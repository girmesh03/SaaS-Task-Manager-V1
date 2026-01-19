import { body, param, query } from "express-validator";
import {
  DEPARTMENT_VALIDATION,
  COMMON_VALIDATION,
  USER_ROLES,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import { Department, Organization, User } from "../../models/index.js";

/**
 * Department Validators
 * Validates department-related requests (create, update, delete)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * List Departments Validator
 * Validates query parameters for listing departments
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listDepartmentsValidator = [
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

  query("organization")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format"),

  query("manager")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid manager ID format"),
];

/**
 * Create Department Validator
 * Validates department creation request
 * Scoped to req.user.organization._id and req.user.department._id
 */
export const createDepartmentValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Department name is required")
    .isLength({
      min: DEPARTMENT_VALIDATION.NAME.MIN_LENGTH,
      max: DEPARTMENT_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Department name must be between ${DEPARTMENT_VALIDATION.NAME.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .matches(DEPARTMENT_VALIDATION.NAME.PATTERN)
    .withMessage("Department name contains invalid characters")
    .custom(async (value, { req }) => {
      // SCOPING: Check uniqueness within req.user's organization (not req.body.organization)
      const existingDept = await Department.findOne({
        name: value,
        organization: req.user.organization._id,
      })
        .withDeleted()
        .lean();
      if (existingDept) {
        throw new Error("Department name already exists in this organization");
      }
      return true;
    }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH })
    .withMessage(
      `Description must not exceed ${DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create departments in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error(
          "You can only create departments in your own organization"
        );
      }
      // Check if organization exists (including soft-deleted)
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (organization.isDeleted) {
        throw new Error("Cannot add department to deleted organization");
      }
      return true;
    }),

  body("manager")
    .trim()
    .notEmpty()
    .withMessage("Manager is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid manager ID format")
    .custom(async (value, { req }) => {
      // Check if manager exists (including soft-deleted)
      const manager = await User.findById(value).withDeleted().lean();
      if (!manager) {
        throw new Error("Manager not found");
      }
      if (manager.isDeleted) {
        throw new Error("Cannot assign deleted user as manager");
      }
      // SCOPING: Validate manager belongs to req.user's organization
      if (
        manager.organization.toString() !== req.user.organization._id.toString()
      ) {
        throw new Error("Manager must belong to your organization");
      }
      // Validate manager has SuperAdmin or Admin role with isHod true
      const validRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
      if (!validRoles.includes(manager.role) || !manager.isHod) {
        throw new Error(
          "Manager must have SuperAdmin or Admin role with isHod set to true"
        );
      }
      return true;
    }),

  body("createdBy")
    .trim()
    .notEmpty()
    .withMessage("Created by user is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot assign deleted user as creator");
      }
      return true;
    }),
];

/**
 * Update Department Validator
 * Validates department update request
 * Scoped to req.user.organization._id and req.user.department._id
 */
export const updateDepartmentValidator = [
  param("departmentId")
    .trim()
    .notEmpty()
    .withMessage("Department ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value) => {
      // Check if department exists (including soft-deleted)
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (department.isDeleted) {
        throw new Error("Cannot update deleted department");
      }
      return true;
    }),

  body("name")
    .optional()
    .trim()
    .isLength({
      min: DEPARTMENT_VALIDATION.NAME.MIN_LENGTH,
      max: DEPARTMENT_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Department name must be between ${DEPARTMENT_VALIDATION.NAME.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .matches(DEPARTMENT_VALIDATION.NAME.PATTERN)
    .withMessage("Department name contains invalid characters")
    .custom(async (value, { req }) => {
      // Check uniqueness within organization excluding current department (including soft-deleted)
      const department = await Department.findById(req.params.departmentId)
        .withDeleted()
        .lean();
      const existingDept = await Department.findOne({
        name: value,
        organization: department.organization,
        _id: { $ne: req.params.departmentId },
      })
        .withDeleted()
        .lean();
      if (existingDept) {
        throw new Error("Department name already exists in this organization");
      }
      return true;
    }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH })
    .withMessage(
      `Description must not exceed ${DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  body("manager")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid manager ID format")
    .custom(async (value, { req }) => {
      // Check if manager exists (including soft-deleted)
      const manager = await User.findById(value).withDeleted().lean();
      if (!manager) {
        throw new Error("Manager not found");
      }
      if (manager.isDeleted) {
        throw new Error("Cannot assign deleted user as manager");
      }
      // Validate manager belongs to same organization as department
      const department = await Department.findById(req.params.departmentId)
        .withDeleted()
        .lean();
      if (
        manager.organization.toString() !== department.organization.toString()
      ) {
        throw new Error("Manager must belong to the same organization");
      }
      // Validate manager has SuperAdmin or Admin role with isHod true
      const validRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
      if (!validRoles.includes(manager.role) || !manager.isHod) {
        throw new Error(
          "Manager must have SuperAdmin or Admin role with isHod set to true"
        );
      }
      return true;
    }),
];

/**
 * Delete Department Validator
 * Validates department deletion request
 * Scoped to req.user.organization._id and req.user.department._id
 */
export const deleteDepartmentValidator = [
  param("departmentId")
    .trim()
    .notEmpty()
    .withMessage("Department ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value) => {
      // Check if department exists (including soft-deleted)
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (department.isDeleted) {
        throw new Error("Department is already deleted");
      }
      return true;
    }),
];

/**
 * Restore Department Validator
 * Validates department restoration request
 * Scoped to req.user.organization._id and req.user.department._id
 */
export const restoreDepartmentValidator = [
  param("departmentId")
    .trim()
    .notEmpty()
    .withMessage("Department ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value) => {
      // Check if department exists and is deleted
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (!department.isDeleted) {
        throw new Error("Department is not deleted");
      }
      // Validate parent organization is not deleted
      const organization = await Organization.findById(department.organization)
        .withDeleted()
        .lean();
      if (organization && organization.isDeleted) {
        throw new Error("Cannot restore department with deleted organization");
      }
      return true;
    }),
];

/**
 * Get Department By ID Validator
 * Validates department ID parameter
 * Scoped to req.user.organization._id and req.user.department._id
 */
export const getDepartmentByIdValidator = [
  param("departmentId")
    .trim()
    .notEmpty()
    .withMessage("Department ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value) => {
      // Check if department exists (including soft-deleted)
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      return true;
    }),
];

export default {
  listDepartmentsValidator,
  createDepartmentValidator,
  updateDepartmentValidator,
  deleteDepartmentValidator,
  restoreDepartmentValidator,
  getDepartmentByIdValidator,
};
