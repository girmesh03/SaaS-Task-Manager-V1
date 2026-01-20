import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  ATTACHMENT_VALIDATION,
  CLOUDINARY_VALIDATION,
  FILE_TYPES,
  PARENT_MODEL_TYPES,
} from "../utils/constants.js";

/**
 * Transform function to sanitize attachment documents
 * Removes virtual 'id' and version key from serialized output
 * Note: Attachment model has no sensitive fields requiring removal
 */
const transformAttachmentDocument = (_doc, ret) => {
  delete ret.id;
  delete ret.__v;
  return ret;
};

/**
 * Attachment Model
 *
 * File attachments for tasks, activities, and comments
 * Uploaded to Cloudinary, URL stored in database
 *
 * TTL: 30 days
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.10, 15.11, 15.12
 */

const attachmentSchema = new mongoose.Schema(
  {
    // File Name (Requirement 15.1)
    filename: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      minlength: [
        ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH,
        `File name must be at least ${ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH} character`,
      ],
      maxlength: [
        ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH,
        `File name must not exceed ${ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH} characters`,
      ],
    },

    // File URL (Cloudinary) (Requirement 15.2)
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
      match: [
        CLOUDINARY_VALIDATION.URL_PATTERN,
        "Please provide a valid Cloudinary URL",
      ],
    },

    // File Type (Requirement 15.3)
    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: {
        values: Object.values(FILE_TYPES),
        message: "Invalid file type",
      },
    },

    // File Size (bytes) (Requirement 15.4)
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size must be positive"],
      max: [
        ATTACHMENT_VALIDATION.FILE_SIZE.MAX,
        `File size must not exceed ${ATTACHMENT_VALIDATION.FILE_SIZE.MAX} bytes`,
      ],
    },

    // Parent Reference (Requirement 15.5)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Parent reference is required"],
      refPath: "parentModel",
    },

    // Parent Model (Requirement 15.5)
    parentModel: {
      type: String,
      required: [true, "Parent model is required"],
      enum: {
        values: Object.values(PARENT_MODEL_TYPES),
        message: "Invalid parent model",
      },
    },

    // Uploaded By (Requirement 15.6)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploaded by user is required"],
    },

    // Department (Requirement 15.6)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    // Organization (Requirement 15.6)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: transformAttachmentDocument,
    },
    toObject: {
      virtuals: true,
      transform: transformAttachmentDocument,
    },
  }
);

// Indexes within organization and department scope
attachmentSchema.index(
  { organization: 1, department: 1, parent: 1, parentModel: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
attachmentSchema.index(
  { organization: 1, department: 1, uploadedBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
attachmentSchema.index(
  { organization: 1, department: 1, fileType: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
attachmentSchema.index(
  { organization: 1, department: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
attachmentSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 15.10, 15.11)
attachmentSchema.plugin(mongoosePaginate); // Pagination plugin

// Validation middleware (Requirement 15.12)
attachmentSchema.pre("save", async function (next) {
  try {
    // Get session from this.$session() if available
    const session = this.$session();

    // Validate file extension matches allowed extensions
    const fileExtension = this.filename
      .substring(this.filename.lastIndexOf("."))
      .toLowerCase();
    if (!ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error(
        `File extension ${fileExtension} is not allowed. Allowed extensions: ${ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.join(
          ", "
        )}`
      );
    }

    // Validate uploadedBy, department, and organization belong to same context
    if (this.isNew || this.isModified("uploadedBy")) {
      const User = mongoose.model("User");
      const user = await User.findById(this.uploadedBy)
        .select("organization department")
        .session(session);

      if (!user) {
        throw new Error("Uploaded by user not found");
      }

      if (user.organization.toString() !== this.organization.toString()) {
        throw new Error(
          "Uploaded by user must belong to the same organization"
        );
      }

      if (user.department.toString() !== this.department.toString()) {
        throw new Error("Uploaded by user must belong to the same department");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Validate deletion pre-conditions for Attachment
 * @param {mongoose.Document} document - Attachment document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
attachmentSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    // Warning: TTL check
    const daysSinceCreation = Math.floor(
      (new Date() - document.createdAt) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > 20) {
      warnings.push({
        code: "APPROACHING_TTL",
        message: `Attachment is ${daysSinceCreation} days old (TTL: 30 days)`,
        daysSinceCreation,
      });
    }

    // No children to cascade delete (leaf node)
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: error.message,
    });
    return {
      valid: false,
      errors,
      warnings,
    };
  }
};

/**
 * Validate restoration pre-conditions for Attachment
 * @param {mongoose.Document} document - Attachment document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
attachmentSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");

    // Pre-condition 1: Parent entity validation (polymorphic based on parentModel)
    const parentModel = mongoose.model(document.parentModel);
    const parent = await parentModel
      .findById(document.parent)
      .session(session)
      .withDeleted();

    if (!parent) {
      errors.push({
        code: "PARENT_NOT_FOUND",
        message: `Parent ${document.parentModel} not found`,
        field: "parent",
      });
    } else if (parent.isDeleted) {
      errors.push({
        code: "PARENT_DELETED",
        message: `Cannot restore attachment because parent ${document.parentModel} is deleted`,
        field: "parent",
        parentId: parent._id,
      });
    }

    // Special check: If parent is TaskActivity, ensure parent task is NOT RoutineTask
    if (document.parentModel === "TaskActivity" && parent) {
      const Task = mongoose.model("Task");
      const task = await Task.findById(parent.task)
        .session(session)
        .withDeleted();

      if (task && task.taskType === "RoutineTask") {
        errors.push({
          code: "ROUTINE_TASK_ACTIVITY_ATTACHMENT",
          message: "Cannot restore attachment for TaskActivity of RoutineTask",
          field: "parent",
        });
      }
    }

    // Pre-condition 2: Organization must exist and NOT be deleted
    const organization = await Organization.findById(document.organization)
      .session(session)
      .withDeleted();

    if (!organization) {
      errors.push({
        code: "ORGANIZATION_NOT_FOUND",
        message: "Organization not found",
        field: "organization",
      });
    } else if (organization.isDeleted) {
      errors.push({
        code: "ORGANIZATION_DELETED",
        message: "Cannot restore attachment because organization is deleted",
        field: "organization",
      });
    }

    // Pre-condition 3: Department must exist and NOT be deleted
    const department = await Department.findById(document.department)
      .session(session)
      .withDeleted();

    if (!department) {
      errors.push({
        code: "DEPARTMENT_NOT_FOUND",
        message: "Department not found",
        field: "department",
      });
    } else if (department.isDeleted) {
      errors.push({
        code: "DEPARTMENT_DELETED",
        message: "Cannot restore attachment because department is deleted",
        field: "department",
      });
    }

    // Pre-condition 4: UploadedBy user must exist and NOT be deleted
    const uploadedBy = await User.findById(document.uploadedBy)
      .session(session)
      .withDeleted();

    if (!uploadedBy) {
      errors.push({
        code: "UPLOADED_BY_NOT_FOUND",
        message: "Uploader not found",
        field: "uploadedBy",
      });
    } else if (uploadedBy.isDeleted) {
      errors.push({
        code: "UPLOADED_BY_DELETED",
        message: "Cannot restore attachment because uploader is deleted",
        field: "uploadedBy",
      });
    }

    // Pre-condition 5: File extension validation
    const fileExtension = document.filename
      .substring(document.filename.lastIndexOf("."))
      .toLowerCase();
    if (!ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      errors.push({
        code: "INVALID_FILE_EXTENSION",
        message: `File extension ${fileExtension} is not allowed`,
        field: "filename",
        extension: fileExtension,
      });
    }

    // Warning: File may have been deleted from Cloudinary
    warnings.push({
      code: "CLOUDINARY_FILE_CHECK",
      message:
        "File may have been deleted from Cloudinary storage. Manual verification recommended.",
      fileUrl: document.fileUrl,
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: error.message,
    });
    return {
      valid: false,
      errors,
      warnings,
    };
  }
};

/**
 * Cascade delete Attachment
 * No children to cascade (leaf node)
 * @param {mongoose.Types.ObjectId} documentId - Attachment ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
attachmentSchema.statics.cascadeDelete = async function (
  documentId,
  deletedBy,
  session,
  options = {}
) {
  const { skipValidation = false, force = false } = options;

  const result = {
    success: false,
    deletedCount: 0,
    warnings: [],
    errors: [],
  };

  try {
    const attachment = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!attachment) {
      result.errors.push({
        code: "ATTACHMENT_NOT_FOUND",
        message: "Attachment not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(attachment, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await attachment.softDelete(deletedBy, session);
    result.deletedCount++;

    // No children to cascade delete (leaf node)

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push({
      code: "CASCADE_DELETE_ERROR",
      message: error.message,
      stack: error.stack,
    });
    return result;
  }
};

/**
 * Cascade restore Attachment
 * No children to cascade (leaf node)
 * @param {mongoose.Types.ObjectId} documentId - Attachment ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
attachmentSchema.statics.cascadeRestore = async function (
  documentId,
  session,
  options = {}
) {
  const { skipValidation = false } = options;

  const result = {
    success: false,
    restoredCount: 0,
    warnings: [],
    errors: [],
  };

  try {
    const attachment = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!attachment) {
      result.errors.push({
        code: "ATTACHMENT_NOT_FOUND",
        message: "Attachment not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(attachment, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await attachment.restore(session);
    result.restoredCount++;

    // No children to cascade restore (leaf node)

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push({
      code: "CASCADE_RESTORE_ERROR",
      message: error.message,
      stack: error.stack,
    });
    return result;
  }
};

const Attachment = mongoose.model("Attachment", attachmentSchema);

export default Attachment;
