import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  ACTIVITY_TYPES,
  ACTIVITY_VALIDATION,
  MATERIAL_VALIDATION,
  TASK_TYPES,
} from "../utils/constants.js";
import { validateMaterialsScope } from "../utils/modelHelpers.js";

/**
 * TaskActivity Model
 *
 * Activities/updates on ProjectTask and AssignedTask (NOT RoutineTask)
 * Materials added to TaskActivity with quantities
 *
 * Cascade Delete: Comments, Attachments
 * TTL: 90 days
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11
 */

const taskActivitySchema = new mongoose.Schema(
  {
    // Task Reference (Requirement 11.1)
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task is required"],
    },

    // Activity Type (Requirement 11.2)
    activityType: {
      type: String,
      required: [true, "Activity type is required"],
      enum: {
        values: Object.values(ACTIVITY_TYPES),
        message: "Invalid activity type",
      },
    },

    // Activity Description (Requirement 11.1)
    activity: {
      type: String,
      required: [true, "Activity description is required"],
      trim: true,
      minlength: [
        ACTIVITY_VALIDATION.DESCRIPTION.MIN_LENGTH,
        `Activity description must be at least ${ACTIVITY_VALIDATION.DESCRIPTION.MIN_LENGTH} characters`,
      ],
      maxlength: [
        ACTIVITY_VALIDATION.DESCRIPTION.MAX_LENGTH,
        `Activity description must not exceed ${ACTIVITY_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,
      ],
    },

    // Created By (Requirement 11.1)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Organization and Department (Requirement 11.1)
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

    // Materials (array max 20) (Requirement 11.1, 11.10)
    materials: {
      type: [
        {
          material: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Material",
            required: [
              true,
              "Material reference is required when adding materials",
            ],
          },
          quantity: {
            type: Number,
            required: [
              true,
              "Material quantity is required when adding materials",
            ],
            min: [
              MATERIAL_VALIDATION.QUANTITY.MIN,
              `Quantity must be at least ${MATERIAL_VALIDATION.QUANTITY.MIN}`,
            ],
          },
          _id: false, // Disable _id for subdocuments
        },
      ],
      validate: [
        {
          validator: function (materials) {
            // Only validate if materials are provided
            if (materials.length === 0) return true;
            return materials.length <= MATERIAL_VALIDATION.QUANTITY.MAX;
          },
          message: `Maximum ${MATERIAL_VALIDATION.QUANTITY.MAX} materials allowed per activity`,
        },
        {
          validator: function (materials) {
            // Only validate if materials are provided
            if (materials.length === 0) return true;
            // Check for duplicate materials
            const materialIds = materials.map((m) => m.material.toString());
            const uniqueIds = new Set(materialIds);
            return uniqueIds.size === materialIds.length;
          },
          message:
            "Duplicate materials are not allowed. Each material can only be added once.",
        },
        {
          validator: function (materials) {
            // Only validate if materials are provided
            if (materials.length === 0) return true;
            // Validate all quantities are positive
            return materials.every((m) => m.quantity > 0);
          },
          message: "All material quantities must be greater than 0",
        },
      ],
      default: [],
    },

    // Attachments (array of references) (Requirement 11.11)
    attachments: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Attachment",
        },
      ],
      validate: {
        validator: function (attachments) {
          return (
            attachments.length <= ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT
          );
        },
        message: `Maximum ${ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT} attachments allowed`,
      },
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (Requirement 11.6)
// Indexes within organization and department scope
taskActivitySchema.index(
  { organization: 1, department: 1, task: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskActivitySchema.index(
  { organization: 1, department: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskActivitySchema.index(
  { organization: 1, department: 1, activityType: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Compound indexes for common queries
taskActivitySchema.index(
  { task: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskActivitySchema.index(
  { organization: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
taskActivitySchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 11.7, 11.8)
taskActivitySchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to reject creation for RoutineTask (Requirement 11.3, 11.4)
taskActivitySchema.pre("save", async function (next) {
  try {
    // Import Task model dynamically to avoid circular dependency
    const Task = mongoose.model("Task");

    // Get session from this.$session() if available
    const session = this.$session();

    // Find the task
    const task = await Task.findById(this.task).session(session);

    if (!task) {
      return next(new Error("Task not found"));
    }

    // Reject creation for RoutineTask (Requirement 11.3)
    if (task.taskType === TASK_TYPES.ROUTINE) {
      return next(new Error("TaskActivity cannot be created for RoutineTask"));
    }

    // Validate materials belong to same organization and department (Requirement 11.10)
    if (this.isModified("materials") && this.materials.length > 0) {
      await validateMaterialsScope(
        this.materials,
        this.organization,
        this.department,
        session
      );
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for comment count
taskActivitySchema.virtual("commentCount", {
  ref: "TaskComment",
  localField: "_id",
  foreignField: "activity",
  count: true,
});

const TaskActivity = mongoose.model("TaskActivity", taskActivitySchema);

export default TaskActivity;
