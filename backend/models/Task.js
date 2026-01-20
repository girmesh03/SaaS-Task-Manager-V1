import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_VALIDATION,
  TASK_TYPES,
  TAG_VALIDATION,
} from "../utils/constants.js";

/**
 * Task Base Model (Discriminator Pattern)
 *
 * Abstract base for all task types (ProjectTask, RoutineTask, AssignedTask)
 * Uses discriminator pattern with taskType field
 *
 * Cascade Delete: Activities, Comments, Attachments, Notifications
 * TTL: 180 days
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.8, 10.9, 10.10, 10.11, 10.12, 10.13, 10.14, 10.15, 10.16
 */

const taskSchema = new mongoose.Schema(
  {
    // Description (Requirement 10.1)
    description: {
      type: String,
      required: [true, "Task description is required"],
      trim: true,
      minlength: [
        TASK_VALIDATION.DESCRIPTION.MIN_LENGTH,
        `Description must be at least ${TASK_VALIDATION.DESCRIPTION.MIN_LENGTH} characters`,
      ],
      maxlength: [
        TASK_VALIDATION.DESCRIPTION.MAX_LENGTH,
        `Description must not exceed ${TASK_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,
      ],
    },

    // Status (Requirement 10.2)
    status: {
      type: String,
      required: [true, "Task status is required"],
      enum: {
        values: Object.values(TASK_STATUS),
        message: "Invalid task status",
      },
      default: TASK_STATUS.TODO,
    },

    // Priority (Requirement 10.3)
    priority: {
      type: String,
      required: [true, "Task priority is required"],
      enum: {
        values: Object.values(TASK_PRIORITY),
        message: "Invalid task priority",
      },
      default: TASK_PRIORITY.MEDIUM,
    },

    // Organization and Department (Requirement 10.4)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    // Created By (Requirement 10.4)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Attachments (array of references)
    attachments: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Attachment",
        },
      ],
      default: [],
    },

    // Watchers (User, unique, HOD only) (Requirement 10.8)
    watchers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator: function (watchers) {
          // Check for uniqueness
          const uniqueWatchers = new Set(watchers.map((w) => w.toString()));
          return uniqueWatchers.size === watchers.length;
        },
        message: "Watchers must be unique",
      },
      default: [],
    },

    // Task Type (Discriminator Key) (Requirement 10.4)
    taskType: {
      type: String,
      required: [true, "Task type is required"],
      enum: {
        values: Object.values(TASK_TYPES),
        message: "Invalid task type",
      },
    },

    // Tags (array max 5, max 50 each, unique case-insensitive) (Requirement 10.10)
    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: [
            TAG_VALIDATION.MAX_LENGTH,
            `Tag must not exceed ${TAG_VALIDATION.MAX_LENGTH} characters`,
          ],
        },
      ],
      validate: [
        {
          validator: function (tags) {
            return tags.length <= TAG_VALIDATION.MAX_COUNT;
          },
          message: `Maximum ${TAG_VALIDATION.MAX_COUNT} tags allowed`,
        },
        {
          validator: function (tags) {
            // Check for uniqueness (case-insensitive)
            const uniqueTags = new Set(tags.map((t) => t.toLowerCase()));
            return uniqueTags.size === tags.length;
          },
          message: "Tags must be unique (case-insensitive)",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    discriminatorKey: "taskType",
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

// Indexes (Requirement 10.11)
// Indexes within organization and department scope
taskSchema.index(
  { organization: 1, department: 1, status: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskSchema.index(
  { organization: 1, department: 1, priority: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskSchema.index(
  { organization: 1, department: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskSchema.index(
  { organization: 1, department: 1, dueDate: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Compound indexes for common queries
taskSchema.index(
  { organization: 1, status: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskSchema.index(
  { department: 1, status: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
taskSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 10.12)
taskSchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to validate assignees and watchers (Requirement 10.14, 10.15)
taskSchema.pre("save", async function (next) {
  // Only validate if watchers are modified
  if (this.isModified("watchers") && this.watchers.length > 0) {
    try {
      // Import User model dynamically to avoid circular dependency
      const User = mongoose.model("User");

      // Get session from this.$session() if available
      const session = this.$session();

      // Find all watchers
      const watchers = await User.find({
        _id: { $in: this.watchers },
      }).session(session);

      // Validate all watchers belong to same organization (Requirement 10.15)
      const invalidWatchers = watchers.filter(
        (watcher) =>
          watcher.organization.toString() !== this.organization.toString()
      );

      if (invalidWatchers.length > 0) {
        return next(
          new Error("All watchers must belong to the same organization")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Virtual for comment count
taskSchema.virtual("commentCount", {
  ref: "TaskComment",
  localField: "_id",
  foreignField: "task",
  count: true,
});

// Virtual for activity count
taskSchema.virtual("activityCount", {
  ref: "TaskActivity",
  localField: "_id",
  foreignField: "task",
  count: true,
});

// Virtual for attachment count
taskSchema.virtual("attachmentCount", {
  ref: "Attachment",
  localField: "_id",
  foreignField: "parent",
  count: true,
});

// Virtual to check if task is overdue
taskSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate) return false;
  return (
    this.dueDate < new Date() &&
    this.status !== TASK_STATUS.COMPLETED &&
    this.status !== TASK_STATUS.CANCELLED
  );
});

/**
 * Validate deletion pre-conditions for Task
 * @param {mongoose.Document} document - Task document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
taskSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const TaskActivity = mongoose.model("TaskActivity");
    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");

    // Check for activities (except for RoutineTask)
    if (document.taskType !== TASK_TYPES.ROUTINE) {
      const activityCount = await TaskActivity.countDocuments({
        task: document._id,
        isDeleted: { $ne: true },
      }).session(session);

      if (activityCount > 50) {
        warnings.push({
          code: "LARGE_ACTIVITY_COUNT",
          message: `This will cascade delete ${activityCount} task activities`,
          count: activityCount,
        });
      }
    }

    // Check for comments
    const commentCount = await TaskComment.countDocuments({
      parent: document._id,
      parentModel: "Task",
      isDeleted: { $ne: true },
    }).session(session);

    if (commentCount > 100) {
      warnings.push({
        code: "LARGE_COMMENT_COUNT",
        message: `This will cascade delete ${commentCount} task comments`,
        count: commentCount,
      });
    }

    // Check for attachments
    const attachmentCount = await Attachment.countDocuments({
      parent: document._id,
      parentModel: "Task",
      isDeleted: { $ne: true },
    }).session(session);

    if (attachmentCount > 20) {
      warnings.push({
        code: "LARGE_ATTACHMENT_COUNT",
        message: `This will cascade delete ${attachmentCount} attachments`,
        count: attachmentCount,
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
 * Validate restoration pre-conditions for Task
 * @param {mongoose.Document} document - Task document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
taskSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");

    // Pre-condition 1: Parent organization must exist and NOT be deleted
    const organization = await Organization.findById(document.organization)
      .session(session)
      .withDeleted();

    if (!organization) {
      errors.push({
        code: "ORGANIZATION_NOT_FOUND",
        message: "Parent organization not found",
        field: "organization",
      });
    } else if (organization.isDeleted) {
      errors.push({
        code: "ORGANIZATION_DELETED",
        message: "Cannot restore task because parent organization is deleted",
        field: "organization",
        organizationId: organization._id,
      });
    }

    // Pre-condition 2: Parent department must exist and NOT be deleted
    const department = await Department.findById(document.department)
      .session(session)
      .withDeleted();

    if (!department) {
      errors.push({
        code: "DEPARTMENT_NOT_FOUND",
        message: "Parent department not found",
        field: "department",
      });
    } else if (department.isDeleted) {
      errors.push({
        code: "DEPARTMENT_DELETED",
        message: "Cannot restore task because parent department is deleted",
        field: "department",
        departmentId: department._id,
      });
    }

    // Pre-condition 3: CreatedBy user must exist and NOT be deleted
    const createdBy = await User.findById(document.createdBy)
      .session(session)
      .withDeleted();

    if (!createdBy) {
      errors.push({
        code: "CREATED_BY_NOT_FOUND",
        message: "Task creator not found",
        field: "createdBy",
      });
    } else if (createdBy.isDeleted) {
      errors.push({
        code: "CREATED_BY_DELETED",
        message: "Cannot restore task because creator is deleted",
        field: "createdBy",
        createdById: createdBy._id,
      });
    }

    // Pre-condition 4: Watchers must exist and belong to same organization
    if (document.watchers && document.watchers.length > 0) {
      const watchers = await User.find({
        _id: { $in: document.watchers },
      })
        .session(session)
        .withDeleted();

      const deletedWatchers = watchers.filter((w) => w.isDeleted);
      if (deletedWatchers.length > 0) {
        warnings.push({
          code: "WATCHERS_DELETED",
          message: `${deletedWatchers.length} watchers are deleted and will be removed`,
          deletedWatcherIds: deletedWatchers.map((w) => w._id),
        });
      }

      const invalidWatchers = watchers.filter(
        (w) => w.organization.toString() !== document.organization.toString()
      );
      if (invalidWatchers.length > 0) {
        errors.push({
          code: "WATCHERS_WRONG_ORG",
          message: "All watchers must belong to the same organization",
          field: "watchers",
          invalidWatcherIds: invalidWatchers.map((w) => w._id),
        });
      }
    }

    // Warning: Task may be overdue
    if (document.dueDate && document.dueDate < new Date()) {
      warnings.push({
        code: "TASK_OVERDUE",
        message: "Task due date has passed during deletion period",
        field: "dueDate",
        dueDate: document.dueDate,
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
 * Cascade delete task with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - Task ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
taskSchema.statics.cascadeDelete = async function (
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

    const task = await this.findById(documentId).session(session).withDeleted();

    if (!task) {
      result.errors.push({
        code: "TASK_NOT_FOUND",
        message: "Task not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(task, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await task.softDelete(deletedBy, session);
    result.deletedCount++;

    const TaskActivity = mongoose.model("TaskActivity");
    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");
    const Notification = mongoose.model("Notification");

    // Delete task activities (except for RoutineTask)
    if (task.taskType !== TASK_TYPES.ROUTINE) {
      const activities = await TaskActivity.find({
        task: documentId,
        isDeleted: { $ne: true },
      }).session(session);

      for (const activity of activities) {
        const activityResult = await TaskActivity.cascadeDelete(
          activity._id,
          deletedBy,
          session,
          { ...options, depth: depth + 1 }
        );
        result.deletedCount += activityResult.deletedCount;
        result.warnings.push(...activityResult.warnings);
        result.errors.push(...activityResult.errors);
      }
    }

    // Delete task comments
    const comments = await TaskComment.find({
      parent: documentId,
      parentModel: "Task",
      isDeleted: { $ne: true },
    }).session(session);

    for (const comment of comments) {
      const commentResult = await TaskComment.cascadeDelete(
        comment._id,
        deletedBy,
        session,
        { ...options, depth: depth + 1 }
      );
      result.deletedCount += commentResult.deletedCount;
      result.warnings.push(...commentResult.warnings);
      result.errors.push(...commentResult.errors);
    }

    // Delete attachments
    const attachments = await Attachment.find({
      parent: documentId,
      parentModel: "Task",
      isDeleted: { $ne: true },
    }).session(session);

    for (const attachment of attachments) {
      await attachment.softDelete(deletedBy, session);
      result.deletedCount++;
    }

    // Delete notifications
    const notifications = await Notification.find({
      entity: documentId,
      entityModel: "Task",
      isDeleted: { $ne: true },
    }).session(session);

    for (const notification of notifications) {
      await notification.softDelete(deletedBy, session);
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
 * Cascade restore task with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - Task ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
taskSchema.statics.cascadeRestore = async function (
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

    const task = await this.findById(documentId).session(session).withDeleted();

    if (!task) {
      result.errors.push({
        code: "TASK_NOT_FOUND",
        message: "Task not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(task, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await task.restore(session);
    result.restoredCount++;

    const TaskActivity = mongoose.model("TaskActivity");
    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");
    const Notification = mongoose.model("Notification");

    // Restore task activities (except for RoutineTask)
    if (task.taskType !== TASK_TYPES.ROUTINE) {
      const activities = await TaskActivity.find({
        task: documentId,
        isDeleted: true,
      }).session(session);

      for (const activity of activities) {
        const activityResult = await TaskActivity.cascadeRestore(
          activity._id,
          session,
          {
            ...options,
            depth: depth + 1,
          }
        );
        result.restoredCount += activityResult.restoredCount;
        result.warnings.push(...activityResult.warnings);
        result.errors.push(...activityResult.errors);
      }
    }

    // Restore task comments
    const comments = await TaskComment.find({
      parent: documentId,
      parentModel: "Task",
      isDeleted: true,
    }).session(session);

    for (const comment of comments) {
      const commentResult = await TaskComment.cascadeRestore(
        comment._id,
        session,
        {
          ...options,
          depth: depth + 1,
        }
      );
      result.restoredCount += commentResult.restoredCount;
      result.warnings.push(...commentResult.warnings);
      result.errors.push(...commentResult.errors);
    }

    // Restore attachments
    const attachments = await Attachment.find({
      parent: documentId,
      parentModel: "Task",
      isDeleted: true,
    }).session(session);

    for (const attachment of attachments) {
      await attachment.restore(session);
      result.restoredCount++;
    }

    // Restore notifications
    const notifications = await Notification.find({
      entity: documentId,
      entityModel: "Task",
      isDeleted: true,
    }).session(session);

    for (const notification of notifications) {
      await notification.restore(session);
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

const Task = mongoose.model("Task", taskSchema);

export default Task;
