import { body, param, query } from "express-validator";
import {
  ATTACHMENT_VALIDATION,
  CLOUDINARY_VALIDATION,
  FILE_TYPES,
  PARENT_MODEL_TYPES,
  COMMON_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import {
  Attachment,
  Task,
  TaskActivity,
  TaskComment,
  User,
  Department,
} from "../../models/index.js";

/**
 * Attachment Validators
 * Validates attachment-related requests (create, update, delete)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.8, 41.9, 41.10
 */

/**
 * List Attachments Validator
 * Validates query parameters for listing attachments
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listAttachmentsValidator = [
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

  query("fileType")
    .optional()
    .trim()
    .isIn(Object.values(FILE_TYPES))
    .withMessage("Invalid file type filter"),

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

  query("uploadedBy")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid uploadedBy ID format"),
];

/**
 * Create Attachment Validator
 */
export const createAttachmentValidator = [
  body("filename")
    .trim()
    .notEmpty()
    .withMessage("File name is required")
    .isLength({
      min: ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH,
      max: ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH,
    })
    .withMessage(
      `File name must be between ${ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH} and ${ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH} characters`
    )
    .custom((value) => {
      // Validate file extension
      const fileExtension = value
        .substring(value.lastIndexOf("."))
        .toLowerCase();
      if (!ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new Error(
          `File extension ${fileExtension} is not allowed. Allowed extensions: ${ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.join(
            ", "
          )}`
        );
      }
      return true;
    }),

  body("fileUrl")
    .trim()
    .notEmpty()
    .withMessage("File URL is required")
    .matches(CLOUDINARY_VALIDATION.URL_PATTERN)
    .withMessage("Please provide a valid Cloudinary URL"),

  body("fileType")
    .trim()
    .notEmpty()
    .withMessage("File type is required")
    .isIn(Object.values(FILE_TYPES))
    .withMessage("Invalid file type"),

  body("fileSize")
    .notEmpty()
    .withMessage("File size is required")
    .isInt({ min: 0, max: ATTACHMENT_VALIDATION.FILE_SIZE.MAX })
    .withMessage(
      `File size must be between 0 and ${ATTACHMENT_VALIDATION.FILE_SIZE.MAX} bytes`
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
      }

      if (!parent) {
        throw new Error("Parent not found");
      }
      if (parent.isDeleted) {
        throw new Error("Cannot attach file to deleted parent");
      }
      return true;
    }),

  body("parentModel")
    .trim()
    .notEmpty()
    .withMessage("Parent model is required")
    .isIn(Object.values(PARENT_MODEL_TYPES))
    .withMessage("Invalid parent model"),

  body("uploadedBy")
    .trim()
    .notEmpty()
    .withMessage("Uploaded by user is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value, { req }) => {
      // Check if user exists and belongs to organization
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot assign deleted user as uploader");
      }
      // SCOPING: Uploader must belong to req.user's organization
      if (
        user.organization.toString() !== req.user.organization._id.toString()
      ) {
        throw new Error("Uploader must belong to your organization");
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
        throw new Error("Cannot assign attachment to deleted department");
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
      // SCOPING: User can only create attachments in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error(
          "You can only create attachments in your own organization"
        );
      }
      return true;
    }),
];

/**
 * Update Attachment Validator
 */
export const updateAttachmentValidator = [
  param("attachmentId")
    .trim()
    .notEmpty()
    .withMessage("Attachment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid attachment ID format")
    .custom(async (value) => {
      // Check if attachment exists
      const attachment = await Attachment.findById(value).withDeleted().lean();
      if (!attachment) {
        throw new Error("Attachment not found");
      }
      if (attachment.isDeleted) {
        throw new Error("Cannot update deleted attachment");
      }
      return true;
    }),

  body("filename")
    .optional()
    .trim()
    .isLength({
      min: ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH,
      max: ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH,
    })
    .withMessage(
      `File name must be between ${ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH} and ${ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH} characters`
    )
    .custom((value) => {
      // Validate file extension
      const fileExtension = value
        .substring(value.lastIndexOf("."))
        .toLowerCase();
      if (!ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new Error(
          `File extension ${fileExtension} is not allowed. Allowed extensions: ${ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.join(
            ", "
          )}`
        );
      }
      return true;
    }),

  body("fileUrl")
    .optional()
    .trim()
    .matches(CLOUDINARY_VALIDATION.URL_PATTERN)
    .withMessage("Please provide a valid Cloudinary URL"),

  body("fileType")
    .optional()
    .trim()
    .isIn(Object.values(FILE_TYPES))
    .withMessage("Invalid file type"),

  body("fileSize")
    .optional()
    .isInt({ min: 0, max: ATTACHMENT_VALIDATION.FILE_SIZE.MAX })
    .withMessage(
      `File size must be between 0 and ${ATTACHMENT_VALIDATION.FILE_SIZE.MAX} bytes`
    ),
];

/**
 * Delete Attachment Validator
 */
export const deleteAttachmentValidator = [
  param("attachmentId")
    .trim()
    .notEmpty()
    .withMessage("Attachment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid attachment ID format")
    .custom(async (value) => {
      const attachment = await Attachment.findById(value).withDeleted().lean();
      if (!attachment) {
        throw new Error("Attachment not found");
      }
      if (attachment.isDeleted) {
        throw new Error("Attachment is already deleted");
      }
      return true;
    }),
];

/**
 * Restore Attachment Validator
 */
export const restoreAttachmentValidator = [
  param("attachmentId")
    .trim()
    .notEmpty()
    .withMessage("Attachment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid attachment ID format")
    .custom(async (value) => {
      const attachment = await Attachment.findById(value).withDeleted().lean();
      if (!attachment) {
        throw new Error("Attachment not found");
      }
      if (!attachment.isDeleted) {
        throw new Error("Attachment is not deleted");
      }
      // Validate parent is not deleted
      let parent;
      if (attachment.parentModel === PARENT_MODEL_TYPES.TASK) {
        parent = await Task.findById(attachment.parent).withDeleted().lean();
      } else if (attachment.parentModel === PARENT_MODEL_TYPES.TASK_ACTIVITY) {
        parent = await TaskActivity.findById(attachment.parent)
          .withDeleted()
          .lean();
      } else if (attachment.parentModel === PARENT_MODEL_TYPES.TASK_COMMENT) {
        parent = await TaskComment.findById(attachment.parent)
          .withDeleted()
          .lean();
      }
      if (parent && parent.isDeleted) {
        throw new Error("Cannot restore attachment with deleted parent");
      }
      // Validate parent department is not deleted
      const department = await Department.findById(attachment.department)
        .withDeleted()
        .lean();
      if (department && department.isDeleted) {
        throw new Error("Cannot restore attachment with deleted department");
      }
      return true;
    }),
];

/**
 * Get Attachment By ID Validator
 */
export const getAttachmentByIdValidator = [
  param("attachmentId")
    .trim()
    .notEmpty()
    .withMessage("Attachment ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid attachment ID format")
    .custom(async (value) => {
      // Check if attachment exists (including soft-deleted)
      const attachment = await Attachment.findById(value).withDeleted().lean();
      if (!attachment) {
        throw new Error("Attachment not found");
      }
      return true;
    }),
];

export default {
  listAttachmentsValidator,
  createAttachmentValidator,
  updateAttachmentValidator,
  deleteAttachmentValidator,
  restoreAttachmentValidator,
  getAttachmentByIdValidator,
};
