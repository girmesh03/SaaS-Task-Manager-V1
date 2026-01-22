import { body, param, query } from "express-validator";
import {
  ACTIVITY_VALIDATION,
  ACTIVITY_TYPES,
  COMMON_VALIDATION,
  MATERIAL_VALIDATION,
  TASK_TYPES,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import {
  TaskActivity,
  Task,
  User,
  Material,
  Department,
} from "../../models/index.js";

/**
 * TaskActivity Validators
 * Validates task activity-related requests (create, update, delete)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.8, 41.9, 41.10
 */

/**
 * List Task Activities Validator
 * Validates query parameters for listing task activities
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listTaskActivitiesValidator = [
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

  query("activityType")
    .optional()
    .trim()
    .isIn(Object.values(ACTIVITY_TYPES))
    .withMessage("Invalid activity type filter"),

  param("taskId")
    .trim()
    .notEmpty()
    .withMessage("Task ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid task ID format"),

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

  query("createdBy")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid createdBy ID format"),
];

/**
 * Create TaskActivity Validator
 */
export const createTaskActivityValidator = [
  param("taskId")
    .trim()
    .notEmpty()
    .withMessage("Task ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid task ID format")
    .custom(async (value) => {
      // Check if task exists
      const task = await Task.findById(value).withDeleted().lean();
      if (!task) {
        throw new Error("Task not found");
      }
      if (task.isDeleted) {
        throw new Error("Cannot create activity for deleted task");
      }
      // Reject creation for RoutineTask
      if (task.taskType === TASK_TYPES.ROUTINE) {
        throw new Error("TaskActivity cannot be created for RoutineTask");
      }
      // SCOPING: Task must belong to req.user's organization
      if (task.organization.toString() !== req.user.organization._id.toString()) {
        throw new Error("Task must belong to your organization");
      }
      return true;
    }),

  body("activityType")
    .trim()
    .notEmpty()
    .withMessage("Activity type is required")
    .isIn(Object.values(ACTIVITY_TYPES))
    .withMessage("Invalid activity type"),

  body("activity")
    .trim()
    .notEmpty()
    .withMessage("Activity description is required")
    .isLength({
      min: ACTIVITY_VALIDATION.DESCRIPTION.MIN_LENGTH,
      max: ACTIVITY_VALIDATION.DESCRIPTION.MAX_LENGTH,
    })
    .withMessage(
      `Activity description must be between ${ACTIVITY_VALIDATION.DESCRIPTION.MIN_LENGTH} and ${ACTIVITY_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

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

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create activities in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error(
          "You can only create activities in your own organization"
        );
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
        throw new Error("Cannot assign activity to deleted department");
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

  body("materials")
    .optional()
    .isArray()
    .withMessage("Materials must be an array")
    .custom((value) => {
      if (value.length > MATERIAL_VALIDATION.QUANTITY.MAX) {
        throw new Error(
          `Maximum ${MATERIAL_VALIDATION.QUANTITY.MAX} materials allowed per activity`
        );
      }
      // Check for duplicate materials
      const materialIds = value.map((m) => m.material?.toString());
      const uniqueIds = new Set(materialIds);
      if (uniqueIds.size !== materialIds.length) {
        throw new Error("Duplicate materials are not allowed");
      }
      // Validate quantities
      for (const material of value) {
        if (!material.material) {
          throw new Error("Material reference is required");
        }
        if (
          !material.quantity ||
          material.quantity < MATERIAL_VALIDATION.QUANTITY.MIN
        ) {
          throw new Error(
            `Material quantity must be at least ${MATERIAL_VALIDATION.QUANTITY.MIN}`
          );
        }
      }
      return true;
    })
    .custom(async (value, { req }) => {
      if (!value || value.length === 0) return true;
      // SCOPING: Check if all materials exist and belong to req.user's organization/department
      const materialIds = value.map((m) => m.material);
      const materials = await Material.find({ _id: { $in: materialIds } })
        .withDeleted()
        .lean();
      if (materials.length !== materialIds.length) {
        throw new Error("One or more materials not found");
      }
      const invalidMaterials = materials.filter(
        (material) =>
          material.isDeleted ||
          material.organization.toString() !==
            req.user.organization._id.toString() ||
          material.department.toString() !== req.user.department._id.toString()
      );
      if (invalidMaterials.length > 0) {
        throw new Error(
          "All materials must belong to your organization and department and not be deleted"
        );
      }
      return true;
    }),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array")
    .custom((value) => {
      if (value.length > ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT) {
        throw new Error(
          `Maximum ${ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT} attachments allowed`
        );
      }
      return true;
    }),
];

/**
 * Update TaskActivity Validator
 */
export const updateTaskActivityValidator = [
  param("activityId")
    .trim()
    .notEmpty()
    .withMessage("Activity ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid activity ID format")
    .custom(async (value) => {
      // Check if activity exists
      const activity = await TaskActivity.findById(value).withDeleted().lean();
      if (!activity) {
        throw new Error("Activity not found");
      }
      if (activity.isDeleted) {
        throw new Error("Cannot update deleted activity");
      }
      return true;
    }),

  body("activityType")
    .optional()
    .trim()
    .isIn(Object.values(ACTIVITY_TYPES))
    .withMessage("Invalid activity type"),

  body("activity")
    .optional()
    .trim()
    .isLength({
      min: ACTIVITY_VALIDATION.DESCRIPTION.MIN_LENGTH,
      max: ACTIVITY_VALIDATION.DESCRIPTION.MAX_LENGTH,
    })
    .withMessage(
      `Activity description must be between ${ACTIVITY_VALIDATION.DESCRIPTION.MIN_LENGTH} and ${ACTIVITY_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  body("materials")
    .optional()
    .isArray()
    .withMessage("Materials must be an array")
    .custom((value) => {
      if (value.length > MATERIAL_VALIDATION.QUANTITY.MAX) {
        throw new Error(
          `Maximum ${MATERIAL_VALIDATION.QUANTITY.MAX} materials allowed per activity`
        );
      }
      const materialIds = value.map((m) => m.material?.toString());
      const uniqueIds = new Set(materialIds);
      if (uniqueIds.size !== materialIds.length) {
        throw new Error("Duplicate materials are not allowed");
      }
      for (const material of value) {
        if (!material.material) {
          throw new Error("Material reference is required");
        }
        if (
          !material.quantity ||
          material.quantity < MATERIAL_VALIDATION.QUANTITY.MIN
        ) {
          throw new Error(
            `Material quantity must be at least ${MATERIAL_VALIDATION.QUANTITY.MIN}`
          );
        }
      }
      return true;
    })
    .custom(async (value, { req }) => {
      if (!value || value.length === 0) return true;
      const activity = await TaskActivity.findById(req.params.activityId)
        .withDeleted()
        .lean();
      const materialIds = value.map((m) => m.material);
      const materials = await Material.find({ _id: { $in: materialIds } })
        .withDeleted()
        .lean();
      if (materials.length !== materialIds.length) {
        throw new Error("One or more materials not found");
      }
      const invalidMaterials = materials.filter(
        (material) =>
          material.isDeleted ||
          material.organization.toString() !==
            activity.organization.toString() ||
          material.department.toString() !== activity.department.toString()
      );
      if (invalidMaterials.length > 0) {
        throw new Error(
          "All materials must belong to the same organization and department and not be deleted"
        );
      }
      return true;
    }),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array")
    .custom((value) => {
      if (value.length > ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT) {
        throw new Error(
          `Maximum ${ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT} attachments allowed`
        );
      }
      return true;
    }),
];

/**
 * Delete TaskActivity Validator
 */
export const deleteTaskActivityValidator = [
  param("activityId")
    .trim()
    .notEmpty()
    .withMessage("Activity ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid activity ID format")
    .custom(async (value) => {
      const activity = await TaskActivity.findById(value).withDeleted().lean();
      if (!activity) {
        throw new Error("Activity not found");
      }
      if (activity.isDeleted) {
        throw new Error("Activity is already deleted");
      }
      return true;
    }),
];

/**
 * Restore TaskActivity Validator
 */
export const restoreTaskActivityValidator = [
  param("activityId")
    .trim()
    .notEmpty()
    .withMessage("Activity ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid activity ID format")
    .custom(async (value) => {
      const activity = await TaskActivity.findById(value).withDeleted().lean();
      if (!activity) {
        throw new Error("Activity not found");
      }
      if (!activity.isDeleted) {
        throw new Error("Activity is not deleted");
      }
      // Validate parent task is not deleted
      const task = await Task.findById(activity.task).withDeleted().lean();
      if (task && task.isDeleted) {
        throw new Error("Cannot restore activity with deleted task");
      }
      // Validate parent department is not deleted
      const department = await Department.findById(activity.department)
        .withDeleted()
        .lean();
      if (department && department.isDeleted) {
        throw new Error("Cannot restore activity with deleted department");
      }
      return true;
    }),
];

/**
 * Get TaskActivity By ID Validator
 */
export const getTaskActivityByIdValidator = [
  param("activityId")
    .trim()
    .notEmpty()
    .withMessage("Activity ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid activity ID format")
    .custom(async (value) => {
      // Check if activity exists (including soft-deleted)
      const activity = await TaskActivity.findById(value).withDeleted().lean();
      if (!activity) {
        throw new Error("Activity not found");
      }
      return true;
    }),
];

export default {
  listTaskActivitiesValidator,
  createTaskActivityValidator,
  updateTaskActivityValidator,
  deleteTaskActivityValidator,
  restoreTaskActivityValidator,
  getTaskActivityByIdValidator,
};
