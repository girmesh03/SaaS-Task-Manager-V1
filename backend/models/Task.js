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
    discriminatorKey: "taskType",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

const Task = mongoose.model("Task", taskSchema);

export default Task;
