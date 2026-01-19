import { body, param } from "express-validator";
import { DEPARTMENT_VALIDATION, USER_ROLES } from "../../utils/constants.js";
import Department from "../../models/Department.js";
import Organization from "../../models/Organization.js";
import User from "../../models/User.js";
import {
  validateObjectIdParam,
  validateResourceExists,
  validateResourceDeleted,
  validateResourceNotDeleted,
  validateUniqueness,
  validateParentNotDeleted,
  validateSameOrganization,
  validateStringField,
} from "./commonValidators.js";

/**
 * Department Validators (Refactored)
 * Validates department-related requests using common validator patterns
 * Reduces code duplication and improves maintainability
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * Validates manager has correct role and isHod flag
 */
const validateManagerRole = async (value, { req }) => {
  const manager = await User.findById(value).withDeleted().lean();

  if (!manager) {
    throw new Error("Manager not found");
  }

  if (manager.isDeleted) {
    throw new Error("Cannot assign deleted user as manager");
  }

  const validRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
  if (!validRoles.includes(manager.role) || !manager.isHod) {
    throw new Error(
      "Manager must have SuperAdmin or Admin role with isHod set to true"
    );
  }

  return true;
};

/**
 * Create Department Validator
 */
export const createDepartmentValidator = [
  validateStringField("name", DEPARTMENT_VALIDATION.NAME, true).custom(
    validateUniqueness(Department, "name", {
      organization: (req) => req.body.organization,
    })
  ),

  validateStringField("description", DEPARTMENT_VALIDATION.DESCRIPTION, false),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .custom(
      validateResourceExists(Organization, "organization", "Organization", true)
    ),

  body("manager")
    .trim()
    .notEmpty()
    .withMessage("Manager is required")
    .custom(
      validateSameOrganization(
        User,
        "manager",
        "Manager",
        (req) => req.body.organization
      )
    )
    .custom(validateManagerRole),

  body("createdBy")
    .trim()
    .notEmpty()
    .withMessage("Created by user is required")
    .custom(validateResourceExists(User, "createdBy", "User", true)),
];

/**
 * Update Department Validator
 */
export const updateDepartmentValidator = [
  validateObjectIdParam("id", "Department").custom(
    validateResourceExists(Department, "id", "Department", true)
  ),

  validateStringField("name", DEPARTMENT_VALIDATION.NAME, false).custom(
    async (value, { req }) => {
      if (!value) return true; // Skip if not provided

      const department = await Department.findById(req.params.id).lean();
      return validateUniqueness(
        Department,
        "name",
        { organization: department.organization },
        "id"
      )(value, { req });
    }
  ),

  validateStringField("description", DEPARTMENT_VALIDATION.DESCRIPTION, false),

  body("manager")
    .optional()
    .trim()
    .custom(async (value, { req }) => {
      const department = await Department.findById(req.params.id).lean();
      return validateSameOrganization(
        User,
        "manager",
        "Manager",
        () => department.organization
      )(value, { req });
    })
    .custom(validateManagerRole),
];

/**
 * Delete Department Validator
 */
export const deleteDepartmentValidator = [
  validateObjectIdParam("id", "Department").custom(
    validateResourceNotDeleted(Department, "id", "Department")
  ),
];

/**
 * Restore Department Validator
 */
export const restoreDepartmentValidator = [
  validateObjectIdParam("id", "Department")
    .custom(validateResourceDeleted(Department, "id", "Department"))
    .custom(async (value, { req }) => {
      const department = await Department.findById(value).withDeleted().lean();
      return validateParentNotDeleted(
        Organization,
        "organization",
        "Organization"
      )(department.organization, { req });
    }),
];

/**
 * Get Department By ID Validator
 */
export const getDepartmentByIdValidator = [
  validateObjectIdParam("id", "Department"),
];

export default {
  createDepartmentValidator,
  updateDepartmentValidator,
  deleteDepartmentValidator,
  restoreDepartmentValidator,
  getDepartmentByIdValidator,
};
