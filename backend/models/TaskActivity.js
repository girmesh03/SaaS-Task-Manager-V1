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
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
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

/**
 * Validate deletion pre-conditions for TaskActivity
 * @param {mongoose.Document} document - TaskActivity document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
taskActivitySchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Task = mongoose.model("Task");

    // Pre-condition 1: Check parent task type (cannot exist for RoutineTask)
    const task = await Task.findById(document.task)
      .session(session)
      .withDeleted();

    if (!task) {
      errors.push({
        code: "TASK_NOT_FOUND",
        message: "Parent task not found",
        field: "task",
      });
    } else if (task.taskType === TASK_TYPES.ROUTINE) {
      errors.push({
        code: "ROUTINE_TASK_ACTIVITY",
        message: "TaskActivity cannot exist for RoutineTask",
        field: "task",
      });
    }

    // Warning: TTL check
    const daysSinceCreation = Math.floor(
      (new Date() - document.createdAt) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > 60) {
      warnings.push({
        code: "APPROACHING_TTL",
        message: `Activity is ${daysSinceCreation} days old (TTL: 90 days)`,
        daysSinceCreation,
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
 * Validate restoration pre-conditions for TaskActivity
 * @param {mongoose.Document} document - TaskActivity document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
taskActivitySchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Task = mongoose.model("Task");
    const Organization = mongoose.model("Organization");
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");
    const Material = mongoose.model("Material");

    // Pre-condition 1: Parent task must exist and NOT be deleted
    const task = await Task.findById(document.task)
      .session(session)
      .withDeleted();

    if (!task) {
      errors.push({
        code: "TASK_NOT_FOUND",
        message: "Parent task not found",
        field: "task",
      });
    } else if (task.isDeleted) {
      errors.push({
        code: "TASK_DELETED",
        message: "Cannot restore activity because parent task is deleted",
        field: "task",
        taskId: task._id,
      });
    } else if (task.taskType === TASK_TYPES.ROUTINE) {
      errors.push({
        code: "ROUTINE_TASK_ACTIVITY",
        message: "TaskActivity cannot be restored for RoutineTask",
        field: "task",
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
        message: "Cannot restore activity because organization is deleted",
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
        message: "Cannot restore activity because department is deleted",
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
        message: "Activity creator not found",
        field: "createdBy",
      });
    } else if (createdBy.isDeleted) {
      errors.push({
        code: "CREATED_BY_DELETED",
        message: "Cannot restore activity because creator is deleted",
        field: "createdBy",
      });
    }

    // Pre-condition 5: Materials validation
    if (document.materials && document.materials.length > 0) {
      const materialIds = document.materials.map((m) => m.material);
      const materials = await Material.find({
        _id: { $in: materialIds },
      })
        .session(session)
        .withDeleted();

      const deletedMaterials = materials.filter((m) => m.isDeleted);
      if (deletedMaterials.length > 0) {
        warnings.push({
          code: "MATERIALS_DELETED",
          message: `${deletedMaterials.length} materials are deleted and will be removed`,
          deletedMaterialIds: deletedMaterials.map((m) => m._id),
        });
      }

      const invalidMaterials = materials.filter(
        (m) =>
          m.organization.toString() !== document.organization.toString() ||
          m.department.toString() !== document.department.toString()
      );

      if (invalidMaterials.length > 0) {
        errors.push({
          code: "MATERIALS_WRONG_ORG_DEPT",
          message:
            "All materials must belong to the same organization and department",
          field: "materials",
        });
      }
    }

    // Pre-condition 6: Attachment count within limits
    if (
      document.attachments &&
      document.attachments.length > ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT
    ) {
      errors.push({
        code: "TOO_MANY_ATTACHMENTS",
        message: `Attachment count exceeds maximum of ${ACTIVITY_VALIDATION.ATTACHMENTS.MAX_COUNT}`,
        field: "attachments",
        count: document.attachments.length,
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
 * Cascade delete TaskActivity with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - TaskActivity ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
taskActivitySchema.statics.cascadeDelete = async function (
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

    const activity = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!activity) {
      result.errors.push({
        code: "TASK_ACTIVITY_NOT_FOUND",
        message: "Task activity not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(activity, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await activity.softDelete(deletedBy, session);
    result.deletedCount++;

    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");

    // Delete task comments
    const comments = await TaskComment.find({
      parent: documentId,
      parentModel: "TaskActivity",
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
      parentModel: "TaskActivity",
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
 * Cascade restore TaskActivity with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - TaskActivity ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
taskActivitySchema.statics.cascadeRestore = async function (
  documentId,
  session,
  options = {}
) {
  const {
    skipValidation = false,
    validateParents = true,
    depth = 0,
    maxDepth = 10,
  } = options;

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

    const activity = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!activity) {
      result.errors.push({
        code: "TASK_ACTIVITY_NOT_FOUND",
        message: "Task activity not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(activity, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await activity.restore(session);
    result.restoredCount++;

    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");

    // Restore task comments
    const comments = await TaskComment.find({
      parent: documentId,
      parentModel: "TaskActivity",
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
      parentModel: "TaskActivity",
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

const TaskActivity = mongoose.model("TaskActivity", taskActivitySchema);

export default TaskActivity;
