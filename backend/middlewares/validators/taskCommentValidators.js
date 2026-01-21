import { body, param, query } from "express-validator";
import {
  COMMENT_VALIDATION,
  COMMENT_MAX_DEPTH,
  PARENT_MODEL_TYPES,
  COMMON_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import {
  TaskComment,
  Task,
  TaskActivity,
  User,
  Department,
} from "../../models/index.js";

/**
 * TaskComment Validators
 * Validates task comment-related requests (create, update, delete)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.8, 41.9, 41.10
 */

/**
 * List Task Comments Validator
 * Validates query parameters for listing task comments
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listTaskCommentsValidator = [
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

  query("parent")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid parent ID format"),

  query("parentModel")
    .optional()
    .trim()
    .isIn(Object.values(PARENT_MODEL_TYPES))
    .withMessage("Invalid parent model filter"),

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
 * Create TaskComment Validator
 */
export const createTaskCommentValidator = [
  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({
      min: COMMENT_VALIDATION.CONTENT.MIN_LENGTH,
      max: COMMENT_VALIDATION.CONTENT.MAX_LENGTH,
    })
    .withMessage(
      `Comment must be between ${COMMENT_VALIDATION.CONTENT.MIN_LENGTH} and ${COMMENT_VALIDATION.CONTENT.MAX_LENGTH} characters`
    ),

  body("parent")
    .trim()
    .notEmpty()
    .withMessage("Parent reference is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid parent ID format")
    .custom(async (value, { req }) => {
      // Check if parent exists based on parentModel
      const parentModel = req.body.parentModel;
      if (!parentModel) {
        throw new Error("Parent model is required");
      }

      let parent;
      if (parentModel === PARENT_MODEL_TYPES.TASK) {
        parent = await Task.findById(value).withDeleted().lean();
      } else if (parentModel === PARENT_MODEL_TYPES.TASK_ACTIVITY) {
        parent = await TaskActivity.findById(value).withDeleted().lean();
      } else if (parentModel === PARENT_MODEL_TYPES.TASK_COMMENT) {
        parent = await TaskComment.findById(value).withDeleted().lean();
        // Validate depth limit for threaded comments
        if (parent && parent.depth >= COMMENT_MAX_DEPTH) {
          throw new Error(
            `Comment depth cannot exceed ${COMMENT_MAX_DEPTH} levels`
          );
        }
      }

      if (!parent) {
        throw new Error("Parent not found");
      }
      if (parent.isDeleted) {
        throw new Error("Cannot comment on deleted parent");
      }
      return true;
    }),

  body("parentModel")
    .trim()
    .notEmpty()
    .withMessage("Parent model is required")
    .isIn(Object.values(PARENT_MODEL_TYPES))
    .withMessage("Invalid parent model"),

  body("mentions")
    .optional()
    .isArray()
    .withMessage("Mentions must be an array")
    .custom((value) => {
      if (value.length > COMMENT_VALIDATION.MENTIONS.MAX_COUNT) {
        throw new Error(
          `Maximum ${COMMENT_VALIDATION.MENTIONS.MAX_COUNT} mentions allowed`
        );
      }
      // Check for uniqueness
      const uniqueMentions = new Set(value.map((m) => m.toString()));
      if (uniqueMentions.size !== value.length) {
        throw new Error("Mentions must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      if (!value || value.length === 0) return true;
      // SCOPING: Check if all mentioned users exist and belong to req.user's organization
      const users = await User.find({ _id: { $in: value } })
        .withDeleted()
        .lean();
      if (users.length !== value.length) {
        throw new Error("One or more mentioned users not found");
      }
      const invalidUsers = users.filter(
        (user) =>
          user.isDeleted ||
          user.organization.toString() !== req.user.organization._id.toString()
      );
      if (invalidUsers.length > 0) {
        throw new Error(
          "All mentioned users must belong to your organization and not be deleted"
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
        throw new Error("Cannot assign comment to deleted department");
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

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create comments in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error(
          "You can only create comments in your own organization"
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
 * Update TaskComment Validator
 */
export const updateTaskCommentValidator = [
  param("taskCommentId")
    .trim()
    .notEmpty()
    .withMessage("Comment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid comment ID format")
    .custom(async (value) => {
      // Check if comment exists
      const comment = await TaskComment.findById(value).withDeleted().lean();
      if (!comment) {
        throw new Error("Comment not found");
      }
      if (comment.isDeleted) {
        throw new Error("Cannot update deleted comment");
      }
      return true;
    }),

  body("comment")
    .optional()
    .trim()
    .isLength({
      min: COMMENT_VALIDATION.CONTENT.MIN_LENGTH,
      max: COMMENT_VALIDATION.CONTENT.MAX_LENGTH,
    })
    .withMessage(
      `Comment must be between ${COMMENT_VALIDATION.CONTENT.MIN_LENGTH} and ${COMMENT_VALIDATION.CONTENT.MAX_LENGTH} characters`
    ),

  body("mentions")
    .optional()
    .isArray()
    .withMessage("Mentions must be an array")
    .custom((value) => {
      if (value.length > COMMENT_VALIDATION.MENTIONS.MAX_COUNT) {
        throw new Error(
          `Maximum ${COMMENT_VALIDATION.MENTIONS.MAX_COUNT} mentions allowed`
        );
      }
      const uniqueMentions = new Set(value.map((m) => m.toString()));
      if (uniqueMentions.size !== value.length) {
        throw new Error("Mentions must be unique");
      }
      return true;
    })
    .custom(async (value, { req }) => {
      if (!value || value.length === 0) return true;
      const comment = await TaskComment.findById(req.params.taskCommentId)
        .withDeleted()
        .lean();
      const users = await User.find({ _id: { $in: value } })
        .withDeleted()
        .lean();
      if (users.length !== value.length) {
        throw new Error("One or more mentioned users not found");
      }
      const invalidUsers = users.filter(
        (user) =>
          user.isDeleted ||
          user.organization.toString() !== comment.organization.toString()
      );
      if (invalidUsers.length > 0) {
        throw new Error(
          "All mentioned users must belong to the same organization and not be deleted"
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
 * Delete TaskComment Validator
 */
export const deleteTaskCommentValidator = [
  param("taskCommentId")
    .trim()
    .notEmpty()
    .withMessage("Comment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid comment ID format")
    .custom(async (value) => {
      const comment = await TaskComment.findById(value).withDeleted().lean();
      if (!comment) {
        throw new Error("Comment not found");
      }
      if (comment.isDeleted) {
        throw new Error("Comment is already deleted");
      }
      return true;
    }),
];

/**
 * Restore TaskComment Validator
 */
export const restoreTaskCommentValidator = [
  param("taskCommentId")
    .trim()
    .notEmpty()
    .withMessage("Comment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid comment ID format")
    .custom(async (value) => {
      const comment = await TaskComment.findById(value).withDeleted().lean();
      if (!comment) {
        throw new Error("Comment not found");
      }
      if (!comment.isDeleted) {
        throw new Error("Comment is not deleted");
      }
      // Validate parent is not deleted
      let parent;
      if (comment.parentModel === PARENT_MODEL_TYPES.TASK) {
        parent = await Task.findById(comment.parent).withDeleted().lean();
      } else if (comment.parentModel === PARENT_MODEL_TYPES.TASK_ACTIVITY) {
        parent = await TaskActivity.findById(comment.parent)
          .withDeleted()
          .lean();
      } else if (comment.parentModel === PARENT_MODEL_TYPES.TASK_COMMENT) {
        parent = await TaskComment.findById(comment.parent)
          .withDeleted()
          .lean();
      }
      if (parent && parent.isDeleted) {
        throw new Error("Cannot restore comment with deleted parent");
      }
      // Validate parent department is not deleted
      const department = await Department.findById(comment.department)
        .withDeleted()
        .lean();
      if (department && department.isDeleted) {
        throw new Error("Cannot restore comment with deleted department");
      }
      return true;
    }),
];

/**
 * Get TaskComment By ID Validator
 */
export const getTaskCommentByIdValidator = [
  param("taskCommentId")
    .trim()
    .notEmpty()
    .withMessage("Comment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid comment ID format")
    .custom(async (value) => {
      // Check if comment exists (including soft-deleted)
      const comment = await TaskComment.findById(value).withDeleted().lean();
      if (!comment) {
        throw new Error("Comment not found");
      }
      return true;
    }),
];

export default {
  listTaskCommentsValidator,
  createTaskCommentValidator,
  updateTaskCommentValidator,
  deleteTaskCommentValidator,
  restoreTaskCommentValidator,
  getTaskCommentByIdValidator,
};
