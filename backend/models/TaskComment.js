import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  COMMENT_VALIDATION,
  COMMENT_MAX_DEPTH,
  PARENT_MODEL_TYPES,
} from "../utils/constants.js";

/**
 * TaskComment Model
 *
 * Threaded comments on tasks, activities, and other comments
 * Max depth 3 levels (comment → reply → reply to reply)
 *
 * Cascade Delete: Child Comments (recursive), Attachments
 * TTL: 180 days
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12
 */

const taskCommentSchema = new mongoose.Schema(
  {
    // Comment Content (Requirement 12.1)
    comment: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [
        COMMENT_VALIDATION.CONTENT.MIN_LENGTH,
        `Comment must be at least ${COMMENT_VALIDATION.CONTENT.MIN_LENGTH} characters`,
      ],
      maxlength: [
        COMMENT_VALIDATION.CONTENT.MAX_LENGTH,
        `Comment must not exceed ${COMMENT_VALIDATION.CONTENT.MAX_LENGTH} characters`,
      ],
    },

    // Parent Reference (polymorphic) (Requirement 12.2)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "parentModel",
      required: [true, "Parent reference is required"],
    },

    parentModel: {
      type: String,
      required: [true, "Parent model is required"],
      enum: {
        values: Object.values(PARENT_MODEL_TYPES),
        message: "Invalid parent model",
      },
    },

    // Mentions (array max 5) (Requirement 12.10)
    mentions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator: function (mentions) {
          return mentions.length <= COMMENT_VALIDATION.MENTIONS.MAX_COUNT;
        },
        message: `Maximum ${COMMENT_VALIDATION.MENTIONS.MAX_COUNT} mentions allowed`,
      },
      default: [],
    },

    // Created By (Requirement 12.1)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Department and Organization (Requirement 12.1)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },

    // Depth (for threading validation) (Requirement 12.3)
    depth: {
      type: Number,
      default: 0,
      min: [0, "Depth cannot be negative"],
      max: [COMMENT_MAX_DEPTH, `Maximum depth is ${COMMENT_MAX_DEPTH}`],
    },

    // Edit History (Requirement 12.11)
    editHistory: {
      type: [
        {
          content: {
            type: String,
            required: true,
          },
          editedAt: {
            type: Date,
            required: true,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // Attachments (Requirement 12.12)
    attachments: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Attachment",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes (Requirement 12.6)
// Indexes within organization and department scope
taskCommentSchema.index(
  { organization: 1, department: 1, parent: 1, parentModel: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskCommentSchema.index(
  { organization: 1, department: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Compound indexes for common queries
taskCommentSchema.index(
  { parent: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskCommentSchema.index(
  { organization: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
taskCommentSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 12.7, 12.8)
taskCommentSchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to validate depth and mentions (Requirement 12.3, 12.4, 12.10)
taskCommentSchema.pre("save", async function (next) {
  try {
    // Get session from this.$session() if available
    const session = this.$session();

    // Validate depth for threaded comments (Requirement 12.3)
    if (this.parentModel === "TaskComment") {
      // Import TaskComment model dynamically to avoid circular dependency
      const TaskComment = mongoose.model("TaskComment");

      // Find the parent comment
      const parentComment = await TaskComment.findById(this.parent).session(
        session
      );

      if (!parentComment) {
        return next(new Error("Parent comment not found"));
      }

      // Calculate depth (parent depth + 1)
      this.depth = parentComment.depth + 1;

      // Validate depth does not exceed max (Requirement 12.3)
      if (this.depth > COMMENT_MAX_DEPTH) {
        return next(
          new Error(`Comment depth cannot exceed ${COMMENT_MAX_DEPTH} levels`)
        );
      }
    } else {
      // Top-level comment (on Task or TaskActivity)
      this.depth = 0;
    }

    // Validate user belongs to same organization (Requirement 12.4)
    const User = mongoose.model("User");
    const user = await User.findById(this.createdBy).session(session);

    if (!user) {
      return next(new Error("User not found"));
    }

    if (user.organization.toString() !== this.organization.toString()) {
      return next(new Error("User must belong to the same organization"));
    }

    // Validate mentions belong to same organization (Requirement 12.10)
    if (this.isModified("mentions") && this.mentions.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $in: this.mentions },
      }).session(session);

      const invalidMentions = mentionedUsers.filter(
        (mentionedUser) =>
          mentionedUser.organization.toString() !== this.organization.toString()
      );

      if (invalidMentions.length > 0) {
        return next(
          new Error("All mentioned users must belong to the same organization")
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to add edit history (Requirement 12.11)
taskCommentSchema.methods.addEditHistory = function () {
  this.editHistory.push({
    content: this.comment,
    editedAt: new Date(),
  });
};

// Virtual for child comment count
taskCommentSchema.virtual("childCommentCount", {
  ref: "TaskComment",
  localField: "_id",
  foreignField: "parent",
  count: true,
});

// Virtual to check if comment is edited
taskCommentSchema.virtual("isEdited").get(function () {
  return this.editHistory.length > 0;
});

/**
 * Validate deletion pre-conditions for TaskComment
 * @param {mongoose.Document} document - TaskComment document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
taskCommentSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    // Pre-condition 1: Check depth
    if (document.depth > COMMENT_MAX_DEPTH) {
      errors.push({
        code: "INVALID_DEPTH",
        message: `Comment depth ${document.depth} exceeds maximum ${COMMENT_MAX_DEPTH}`,
        field: "depth",
      });
    }

    // Pre-condition 2: Check for child comments (recursive warning)
    const childCommentCount = await this.countDocuments({
      parent: document._id,
      parentModel: "TaskComment",
      isDeleted: { $ne: true },
    }).session(session);

    if (childCommentCount > 0) {
      warnings.push({
        code: "RECURSIVE_CHILD_COMMENTS",
        message: `This will recursively delete ${childCommentCount} child comments`,
        childCommentCount,
      });
    }

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
 * Validate restoration pre-conditions for TaskComment
 * @param {mongoose.Document} document - TaskComment document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
taskCommentSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");

    // Pre-condition 1: Parent entity validation (polymorphic)
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
        message: `Cannot restore comment because parent ${document.parentModel} is deleted`,
        field: "parent",
        parentId: parent._id,
      });
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
        message: "Cannot restore comment because organization is deleted",
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
        message: "Cannot restore comment because department is deleted",
        field: "department",
      });
    }

    // Pre-condition 4: CreatedBy user must exist and NOT be deleted
    const createdBy = await User.findById(document.createdBy)
      .session(session)
      .withDeleted();

    if (!createdBy) {
      errors.push({
        code: "CREATED_BY_NOT_FOUND",
        message: "Comment creator not found",
        field: "createdBy",
      });
    } else if (createdBy.isDeleted) {
      errors.push({
        code: "CREATED_BY_DELETED",
        message: "Cannot restore comment because creator is deleted",
        field: "createdBy",
      });
    }

    // Pre-condition 5: Depth validation
    if (document.depth > COMMENT_MAX_DEPTH) {
      errors.push({
        code: "INVALID_DEPTH",
        message: `Comment depth ${document.depth} exceeds maximum ${COMMENT_MAX_DEPTH}`,
        field: "depth",
      });
    }

    // Pre-condition 6: Mentioned users validation
    if (document.mentions && document.mentions.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $in: document.mentions },
      })
        .session(session)
        .withDeleted();

      const deletedMentions = mentionedUsers.filter((u) => u.isDeleted);
      if (deletedMentions.length > 0) {
        warnings.push({
          code: "MENTIONS_DELETED",
          message: `${deletedMentions.length} mentioned users are deleted and will be removed`,
          deletedMentionIds: deletedMentions.map((u) => u._id),
        });
      }

      const invalidMentions = mentionedUsers.filter(
        (u) => u.organization.toString() !== document.organization.toString()
      );

      if (invalidMentions.length > 0) {
        errors.push({
          code: "MENTIONS_WRONG_ORG",
          message: "All mentioned users must belong to the same organization",
          field: "mentions",
        });
      }
    }

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
 * Cascade delete TaskComment with all pre-condition validations
 * Recursively deletes child comments
 * @param {mongoose.Types.ObjectId} documentId - TaskComment ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
taskCommentSchema.statics.cascadeDelete = async function (
  documentId,
  deletedBy,
  session,
  options = {}
) {
  const {
    skipValidation = false,
    force = false,
    depth = 0,
    maxDepth = 10,
  } = options;

  const result = {
    success: false,
    deletedCount: 0,
    warnings: [],
    errors: [],
  };

  try {
    if (depth >= maxDepth) {
      result.errors.push({
        code: "MAX_DEPTH_EXCEEDED",
        message: `Maximum cascade depth of ${maxDepth} exceeded`,
      });
      return result;
    }

    const comment = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!comment) {
      result.errors.push({
        code: "TASK_COMMENT_NOT_FOUND",
        message: "Task comment not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(comment, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await comment.softDelete(deletedBy, session);
    result.deletedCount++;

    const Attachment = mongoose.model("Attachment");

    // Recursively delete child comments
    const childComments = await this.find({
      parent: documentId,
      parentModel: "TaskComment",
      isDeleted: { $ne: true },
    }).session(session);

    for (const childComment of childComments) {
      const childResult = await this.cascadeDelete(
        childComment._id,
        deletedBy,
        session,
        { ...options, depth: depth + 1 }
      );
      result.deletedCount += childResult.deletedCount;
      result.warnings.push(...childResult.warnings);
      result.errors.push(...childResult.errors);
    }

    // Delete attachments
    const attachments = await Attachment.find({
      parent: documentId,
      parentModel: "TaskComment",
      isDeleted: { $ne: true },
    }).session(session);

    for (const attachment of attachments) {
      await attachment.softDelete(deletedBy, session);
      result.deletedCount++;
    }

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
 * Cascade restore TaskComment with all pre-condition validations
 * Recursively restores child comments
 * @param {mongoose.Types.ObjectId} documentId - TaskComment ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
taskCommentSchema.statics.cascadeRestore = async function (
  documentId,
  session,
  options = {}
) {
  const { skipValidation = false, depth = 0, maxDepth = 10 } = options;

  const result = {
    success: false,
    restoredCount: 0,
    warnings: [],
    errors: [],
  };

  try {
    if (depth >= maxDepth) {
      result.errors.push({
        code: "MAX_DEPTH_EXCEEDED",
        message: `Maximum cascade depth of ${maxDepth} exceeded`,
      });
      return result;
    }

    const comment = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!comment) {
      result.errors.push({
        code: "TASK_COMMENT_NOT_FOUND",
        message: "Task comment not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(comment, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await comment.restore(session);
    result.restoredCount++;

    const Attachment = mongoose.model("Attachment");

    // Recursively restore child comments
    const childComments = await this.find({
      parent: documentId,
      parentModel: "TaskComment",
      isDeleted: true,
    }).session(session);

    for (const childComment of childComments) {
      const childResult = await this.cascadeRestore(childComment._id, session, {
        ...options,
        depth: depth + 1,
      });
      result.restoredCount += childResult.restoredCount;
      result.warnings.push(...childResult.warnings);
      result.errors.push(...childResult.errors);
    }

    // Restore attachments
    const attachments = await Attachment.find({
      parent: documentId,
      parentModel: "TaskComment",
      isDeleted: true,
    }).session(session);

    for (const attachment of attachments) {
      await attachment.restore(session);
      result.restoredCount++;
    }

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

const TaskComment = mongoose.model("TaskComment", taskCommentSchema);

export default TaskComment;
