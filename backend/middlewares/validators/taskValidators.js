import { body, param, query } from "express-validator";
import {
  TASK_VALIDATION,
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPES,
  TAG_VALIDATION,
  COMMON_VALIDATION,
  RECURRENCE_FREQUENCY,
  RECURRENCE_VALIDATION,
  MATERIAL_VALIDATION,
  MILESTONE_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import {
  Task,
  User,
  Vendor,
  Material,
  Department,
} from "../../models/index.js";

/**
 * Task Validators
 * Validates task-related requests (create, update, delete) for all task types
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.6, 41.8, 41.9, 41.10
 */

/**
 * Validate Watchers Helper
 * Reusable validation logic for watchers field
 * Ensures watchers are HODs within the organization
 * @param {Array} watcherIds - Array of watcher user IDs
 * @param {String} organizationId - Organization ID to validate against
 * @returns {Promise<void>}
 * @throws {Error} If validation fails
 */
async function validateWatchers(watcherIds, organizationId) {
  if (!watcherIds || watcherIds.length === 0) return;

  const watchers = await User.find({ _id: { $in: watcherIds } })
    .withDeleted()
    .lean();

  if (watchers.length !== watcherIds.length) {
    throw new Error("One or more watchers not found");
  }

  const invalidWatchers = watchers.filter(
    (watcher) =>
      watcher.isDeleted ||
      watcher.organization.toString() !== organizationId.toString() ||
      watcher.isHod !== true
  );

  if (invalidWatchers.length > 0) {
    throw new Error(
      "All watchers must be HODs (Head of Department) within your organization and not be deleted"
    );
  }
}

/**
 * Validate Assignees Helper
 * Reusable validation logic for assignees field
 * Ensures assignees belong to the organization
 * @param {Array} assigneeIds - Array of assignee user IDs
 * @param {String} organizationId - Organization ID to validate against
 * @returns {Promise<void>}
 * @throws {Error} If validation fails
 */
async function validateAssignees(assigneeIds, organizationId) {
  if (!assigneeIds || assigneeIds.length === 0) return;

  const assignees = await User.find({ _id: { $in: assigneeIds } })
    .withDeleted()
    .lean();

  if (assignees.length !== assigneeIds.length) {
    throw new Error("One or more assignees not found");
  }

  const invalidAssignees = assignees.filter(
    (assignee) =>
      assignee.isDeleted ||
      assignee.organization.toString() !== organizationId.toString()
  );

  if (invalidAssignees.length > 0) {
    throw new Error(
      "All assignees must belong to your organization and not be deleted"
    );
  }
}

/**
 * List Tasks Validator
 * Validates query parameters for listing tasks
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listTasksValidator = [
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

  query("taskType")
    .optional()
    .trim()
    .isIn(Object.values(TASK_TYPES))
    .withMessage("Invalid task type filter"),

  query("status")
    .optional()
    .trim()
    .isIn(Object.values(TASK_STATUS))
    .withMessage("Invalid status filter"),

  query("priority")
    .optional()
    .trim()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage("Invalid priority filter"),

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

  query("assignee")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid assignee ID format"),

  query("vendor")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid vendor ID format"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format"),
];

/**
 * Common Task Field Validators
 * Shared validators for all task types
 */
const commonTaskValidators = [
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Task description is required")
    .isLength({
      min: TASK_VALIDATION.DESCRIPTION.MIN_LENGTH,
      max: TASK_VALIDATION.DESCRIPTION.MAX_LENGTH,
    })
    .withMessage(
      `Description must be between ${TASK_VALIDATION.DESCRIPTION.MIN_LENGTH} and ${TASK_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  body("status")
    .optional()
    .trim()
    .isIn(Object.values(TASK_STATUS))
    .withMessage("Invalid task status"),

  body("priority")
    .optional()
    .trim()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage("Invalid task priority")
    .custom((value, { req }) => {
      // RoutineTask CANNOT have LOW priority
      if (
        req.body.taskType === TASK_TYPES.ROUTINE &&
        value === TASK_PRIORITY.LOW
      ) {
        throw new Error(
          "RoutineTask priority cannot be LOW. Must be MEDIUM, HIGH, or URGENT"
        );
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
      // SCOPING: User can only create tasks in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error("You can only create tasks in your own organization");
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
        throw new Error("Cannot assign task to deleted department");
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
      // SCOPING: Creator must belong to req.user's organization (FIXED)
      if (
        user.organization.toString() !== req.user.organization._id.toString()
      ) {
        throw new Error("Creator must belong to your organization");
      }
      return true;
    }),

  body("watchers")
    .optional()
    .isArray()
    .withMessage("Watchers must be an array")
    .custom((value) => {
      if (value.length > TASK_VALIDATION.WATCHERS.MAX_COUNT) {
        throw new Error(
          `Maximum ${TASK_VALIDATION.WATCHERS.MAX_COUNT} watchers allowed`
        );
      }
      // Check for uniqueness
      const uniqueWatchers = new Set(value.map((w) => w.toString()));
      if (uniqueWatchers.size !== value.length) {
        throw new Error("Watchers must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      // Use extracted helper function for watcher validation
      await validateWatchers(value, req.user.organization._id);
      return true;
    }),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .custom((value) => {
      if (value.length > TAG_VALIDATION.MAX_COUNT) {
        throw new Error(`Maximum ${TAG_VALIDATION.MAX_COUNT} tags allowed`);
      }
      // Check each tag length
      const invalidTags = value.filter(
        (tag) => tag.length > TAG_VALIDATION.MAX_LENGTH
      );
      if (invalidTags.length > 0) {
        throw new Error(
          `Each tag must not exceed ${TAG_VALIDATION.MAX_LENGTH} characters`
        );
      }
      // Check for uniqueness (case-insensitive)
      const uniqueTags = new Set(value.map((t) => t.toLowerCase()));
      if (uniqueTags.size !== value.length) {
        throw new Error("Tags must be unique (case-insensitive)");
      }
      return true;
    }),
];

/**
 * Create ProjectTask Validator
 */
export const createProjectTaskValidator = [
  body("taskType")
    .trim()
    .equals(TASK_TYPES.PROJECT)
    .withMessage("Task type must be ProjectTask"),

  ...commonTaskValidators,

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Project task title is required")
    .isLength({
      min: TASK_VALIDATION.TITLE.MIN_LENGTH,
      max: TASK_VALIDATION.TITLE.MAX_LENGTH,
    })
    .withMessage(
      `Title must be between ${TASK_VALIDATION.TITLE.MIN_LENGTH} and ${TASK_VALIDATION.TITLE.MAX_LENGTH} characters`
    ),

  body("vendor")
    .trim()
    .notEmpty()
    .withMessage("Vendor is required for project tasks")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid vendor ID format")
    .custom(async (value, { req }) => {
      // Check if vendor exists and belongs to organization
      const vendor = await Vendor.findById(value).withDeleted().lean();
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      if (vendor.isDeleted) {
        throw new Error("Cannot assign deleted vendor to task");
      }
      // SCOPING: Vendor must belong to req.user's organization (FIXED)
      if (
        vendor.organization.toString() !== req.user.organization._id.toString()
      ) {
        throw new Error("Vendor must belong to your organization");
      }
      return true;
    }),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required for project tasks")
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("dueDate")
    .notEmpty()
    .withMessage("Due date is required for project tasks")
    .isISO8601()
    .withMessage("Invalid due date format")
    .custom((value, { req }) => {
      if (
        req.body.startDate &&
        new Date(value) <= new Date(req.body.startDate)
      ) {
        throw new Error("Due date must be after start date");
      }
      return true;
    }),

  body("milestones")
    .optional()
    .isArray()
    .withMessage("Milestones must be an array")
    .custom((value) => {
      if (!value || value.length === 0) return true;
      // Validate each milestone
      for (const milestone of value) {
        if (
          !milestone.name ||
          milestone.name.trim().length < MILESTONE_VALIDATION.NAME.MIN_LENGTH
        ) {
          throw new Error(
            `Milestone name must be at least ${MILESTONE_VALIDATION.NAME.MIN_LENGTH} characters`
          );
        }
        if (milestone.name.length > MILESTONE_VALIDATION.NAME.MAX_LENGTH) {
          throw new Error(
            `Milestone name must not exceed ${MILESTONE_VALIDATION.NAME.MAX_LENGTH} characters`
          );
        }
        if (!milestone.dueDate) {
          throw new Error("Milestone due date is required");
        }
        if (
          milestone.status &&
          !MILESTONE_VALIDATION.STATUS.VALUES.includes(milestone.status)
        ) {
          throw new Error("Invalid milestone status");
        }
      }
      return true;
    }),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),
];

/**
 * Create RoutineTask Validator
 */
export const createRoutineTaskValidator = [
  body("taskType")
    .trim()
    .equals(TASK_TYPES.ROUTINE)
    .withMessage("Task type must be RoutineTask"),

  ...commonTaskValidators,

  body("date")
    .notEmpty()
    .withMessage("Date is required for routine tasks")
    .isISO8601()
    .withMessage("Invalid date format"),

  body("recurrence.frequency")
    .optional()
    .trim()
    .isIn(Object.values(RECURRENCE_FREQUENCY))
    .withMessage("Invalid recurrence frequency"),

  body("recurrence.interval")
    .optional()
    .isInt({
      min: RECURRENCE_VALIDATION.INTERVAL.MIN,
      max: RECURRENCE_VALIDATION.INTERVAL.MAX,
    })
    .withMessage(
      `Interval must be between ${RECURRENCE_VALIDATION.INTERVAL.MIN} and ${RECURRENCE_VALIDATION.INTERVAL.MAX}`
    ),

  body("recurrence.endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid recurrence end date format")
    .custom((value, { req }) => {
      if (req.body.date && new Date(value) <= new Date(req.body.date)) {
        throw new Error("Recurrence end date must be after task date");
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
          `Maximum ${MATERIAL_VALIDATION.QUANTITY.MAX} materials allowed per routine task`
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
    .withMessage("Attachments must be an array"),
];

/**
 * Create AssignedTask Validator
 */
export const createAssignedTaskValidator = [
  body("taskType")
    .trim()
    .equals(TASK_TYPES.ASSIGNED)
    .withMessage("Task type must be AssignedTask"),

  ...commonTaskValidators,

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Assigned task title is required")
    .isLength({
      min: TASK_VALIDATION.TITLE.MIN_LENGTH,
      max: TASK_VALIDATION.TITLE.MAX_LENGTH,
    })
    .withMessage(
      `Title must be between ${TASK_VALIDATION.TITLE.MIN_LENGTH} and ${TASK_VALIDATION.TITLE.MAX_LENGTH} characters`
    ),

  body("assignees")
    .notEmpty()
    .withMessage("At least one assignee is required")
    .isArray()
    .withMessage("Assignees must be an array")
    .custom((value) => {
      if (value.length < TASK_VALIDATION.ASSIGNEES.MIN_COUNT) {
        throw new Error(
          `At least ${TASK_VALIDATION.ASSIGNEES.MIN_COUNT} assignee is required`
        );
      }
      if (value.length > TASK_VALIDATION.ASSIGNEES.MAX_COUNT) {
        throw new Error(
          `Maximum ${TASK_VALIDATION.ASSIGNEES.MAX_COUNT} assignees allowed`
        );
      }
      // Check for uniqueness
      const uniqueAssignees = new Set(value.map((a) => a.toString()));
      if (uniqueAssignees.size !== value.length) {
        throw new Error("Assignees must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      // Use extracted helper function for assignee validation
      await validateAssignees(value, req.user.organization._id);
      return true;
    }),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required for assigned tasks")
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("dueDate")
    .notEmpty()
    .withMessage("Due date is required for assigned tasks")
    .isISO8601()
    .withMessage("Invalid due date format")
    .custom((value, { req }) => {
      if (
        req.body.startDate &&
        new Date(value) <= new Date(req.body.startDate)
      ) {
        throw new Error("Due date must be after start date");
      }
      return true;
    }),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),
];

/**
 * Update Task Validator (for all task types)
 */
export const updateTaskValidator = [
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
        throw new Error("Cannot update deleted task");
      }
      return true;
    }),

  // All fields are optional for update
  body("description")
    .optional()
    .trim()
    .isLength({
      min: TASK_VALIDATION.DESCRIPTION.MIN_LENGTH,
      max: TASK_VALIDATION.DESCRIPTION.MAX_LENGTH,
    })
    .withMessage(
      `Description must be between ${TASK_VALIDATION.DESCRIPTION.MIN_LENGTH} and ${TASK_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  body("status")
    .optional()
    .trim()
    .isIn(Object.values(TASK_STATUS))
    .withMessage("Invalid task status"),

  body("priority")
    .optional()
    .trim()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage("Invalid task priority")
    .custom(async (value, { req }) => {
      // Get task to check taskType
      const task = await Task.findById(req.params.taskId).withDeleted().lean();
      // RoutineTask CANNOT have LOW priority
      if (task.taskType === TASK_TYPES.ROUTINE && value === TASK_PRIORITY.LOW) {
        throw new Error(
          "RoutineTask priority cannot be LOW. Must be MEDIUM, HIGH, or URGENT"
        );
      }
      return true;
    }),

  body("watchers")
    .optional()
    .isArray()
    .withMessage("Watchers must be an array")
    .custom((value) => {
      if (value.length > TASK_VALIDATION.WATCHERS.MAX_COUNT) {
        throw new Error(
          `Maximum ${TASK_VALIDATION.WATCHERS.MAX_COUNT} watchers allowed`
        );
      }
      const uniqueWatchers = new Set(value.map((w) => w.toString()));
      if (uniqueWatchers.size !== value.length) {
        throw new Error("Watchers must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      const task = await Task.findById(req.params.taskId).withDeleted().lean();
      // Use extracted helper function for watcher validation
      await validateWatchers(value, task.organization);
      return true;
    }),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .custom((value) => {
      if (value.length > TAG_VALIDATION.MAX_COUNT) {
        throw new Error(`Maximum ${TAG_VALIDATION.MAX_COUNT} tags allowed`);
      }
      const invalidTags = value.filter(
        (tag) => tag.length > TAG_VALIDATION.MAX_LENGTH
      );
      if (invalidTags.length > 0) {
        throw new Error(
          `Each tag must not exceed ${TAG_VALIDATION.MAX_LENGTH} characters`
        );
      }
      const uniqueTags = new Set(value.map((t) => t.toLowerCase()));
      if (uniqueTags.size !== value.length) {
        throw new Error("Tags must be unique (case-insensitive)");
      }
      return true;
    }),

  // Task-type specific fields
  body("title")
    .optional()
    .trim()
    .isLength({
      min: TASK_VALIDATION.TITLE.MIN_LENGTH,
      max: TASK_VALIDATION.TITLE.MAX_LENGTH,
    })
    .withMessage(
      `Title must be between ${TASK_VALIDATION.TITLE.MIN_LENGTH} and ${TASK_VALIDATION.TITLE.MAX_LENGTH} characters`
    ),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid due date format")
    .custom(async (value, { req }) => {
      const task = await Task.findById(req.params.taskId).withDeleted().lean();
      const startDate = req.body.startDate || task.startDate;
      if (startDate && new Date(value) <= new Date(startDate)) {
        throw new Error("Due date must be after start date");
      }
      return true;
    }),

  body("assignees")
    .optional()
    .isArray()
    .withMessage("Assignees must be an array")
    .custom((value) => {
      if (value.length < TASK_VALIDATION.ASSIGNEES.MIN_COUNT) {
        throw new Error(
          `At least ${TASK_VALIDATION.ASSIGNEES.MIN_COUNT} assignee is required`
        );
      }
      if (value.length > TASK_VALIDATION.ASSIGNEES.MAX_COUNT) {
        throw new Error(
          `Maximum ${TASK_VALIDATION.ASSIGNEES.MAX_COUNT} assignees allowed`
        );
      }
      const uniqueAssignees = new Set(value.map((a) => a.toString()));
      if (uniqueAssignees.size !== value.length) {
        throw new Error("Assignees must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      const task = await Task.findById(req.params.taskId).withDeleted().lean();
      // Use extracted helper function for assignee validation
      await validateAssignees(value, task.organization);
      return true;
    }),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),
];

/**
 * Delete Task Validator
 */
export const deleteTaskValidator = [
  param("taskId")
    .trim()
    .notEmpty()
    .withMessage("Task ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid task ID format")
    .custom(async (value) => {
      const task = await Task.findById(value).withDeleted().lean();
      if (!task) {
        throw new Error("Task not found");
      }
      if (task.isDeleted) {
        throw new Error("Task is already deleted");
      }
      return true;
    }),
];

/**
 * Restore Task Validator
 */
export const restoreTaskValidator = [
  param("taskId")
    .trim()
    .notEmpty()
    .withMessage("Task ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid task ID format")
    .custom(async (value) => {
      const task = await Task.findById(value).withDeleted().lean();
      if (!task) {
        throw new Error("Task not found");
      }
      if (!task.isDeleted) {
        throw new Error("Task is not deleted");
      }
      // Validate parent department is not deleted
      const department = await Department.findById(task.department)
        .withDeleted()
        .lean();
      if (department && department.isDeleted) {
        throw new Error("Cannot restore task with deleted department");
      }
      return true;
    }),
];

/**
 * Get Task By ID Validator
 */
export const getTaskByIdValidator = [
  param("taskId")
    .trim()
    .notEmpty()
    .withMessage("Task ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid task ID format")
    .custom(async (value) => {
      // Check if task exists (including soft-deleted)
      const task = await Task.findById(value).withDeleted().lean();
      if (!task) {
        throw new Error("Task not found");
      }
      return true;
    }),
];

/**
 * Create Task Validator (Dynamic)
 * Validates task creation based on taskType
 * Returns appropriate validator array based on task type
 * This is a middleware function that dynamically selects the validator
 */
export const createTaskValidator = (req, res, next) => {
  const { taskType } = req.body;

  // Validate taskType exists
  if (!taskType) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Task type is required",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Validate taskType is valid
  if (!Object.values(TASK_TYPES).includes(taskType)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid task type",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Determine which validator to use based on task type
  let validator;
  switch (taskType) {
    case TASK_TYPES.PROJECT:
      validator = createProjectTaskValidator;
      break;
    case TASK_TYPES.ROUTINE:
      validator = createRoutineTaskValidator;
      break;
    case TASK_TYPES.ASSIGNED:
      validator = createAssignedTaskValidator;
      break;
    default:
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid task type",
          timestamp: new Date().toISOString(),
        },
      });
  }

  // Apply the appropriate validator
  Promise.all(validator.map((v) => v.run(req)))
    .then(() => next())
    .catch(next);
};

export default {
  listTasksValidator,
  createProjectTaskValidator,
  createRoutineTaskValidator,
  createAssignedTaskValidator,
  createTaskValidator,
  updateTaskValidator,
  deleteTaskValidator,
  restoreTaskValidator,
  getTaskByIdValidator,
};
