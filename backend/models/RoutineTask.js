import mongoose from "mongoose";
import Task from "./Task.js";
import {
  RECURRENCE_FREQUENCY,
  RECURRENCE_VALIDATION,
  MATERIAL_VALIDATION,
} from "../utils/constants.js";

/**
 * RoutineTask Model (Discriminator)
 *
 * Repetitive tasks for a given date
 * Materials added DIRECTLY to task (no TaskActivity)
 *
 * Requirements: 10.6
 */

const routineTaskSchema = new mongoose.Schema({
  // Date (Requirement 10.6)
  date: {
    type: Date,
    required: [true, "Date is required for routine tasks"],
  },

  // Recurrence (Requirement 10.6)
  recurrence: {
    frequency: {
      type: String,
      enum: {
        values: Object.values(RECURRENCE_FREQUENCY),
        message: "Invalid recurrence frequency",
      },
      default: null,
    },
    interval: {
      type: Number,
      min: [
        RECURRENCE_VALIDATION.INTERVAL.MIN,
        `Interval must be at least ${RECURRENCE_VALIDATION.INTERVAL.MIN}`,
      ],
      max: [
        RECURRENCE_VALIDATION.INTERVAL.MAX,
        `Interval must not exceed ${RECURRENCE_VALIDATION.INTERVAL.MAX}`,
      ],
      default: 1,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },

  // Materials (array max 20, added DIRECTLY) (Requirement 10.6)
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
        message: `Maximum ${MATERIAL_VALIDATION.QUANTITY.MAX} materials allowed per routine task`,
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
});

// Pre-save middleware to validate recurrence endDate
routineTaskSchema.pre("save", function (next) {
  if (
    this.recurrence &&
    this.recurrence.endDate &&
    this.recurrence.endDate <= this.date
  ) {
    return next(new Error("Recurrence end date must be after task date"));
  }
  next();
});

// Pre-save middleware to validate materials belong to same organization and department
routineTaskSchema.pre("save", async function (next) {
  if (this.isModified("materials") && this.materials.length > 0) {
    try {
      // Import Material model dynamically to avoid circular dependency
      const Material = mongoose.model("Material");

      // Get session from this.$session() if available
      const session = this.$session();

      // Find all materials
      const materialIds = this.materials.map((m) => m.material);
      const materials = await Material.find({
        _id: { $in: materialIds },
      }).session(session);

      // Validate all materials belong to same organization and department
      const invalidMaterials = materials.filter(
        (material) =>
          material.organization.toString() !== this.organization.toString() ||
          material.department.toString() !== this.department.toString()
      );

      if (invalidMaterials.length > 0) {
        return next(
          new Error(
            "All materials must belong to the same organization and department"
          )
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

// Indexes for RoutineTask (within organization and department scope via base Task)
routineTaskSchema.index(
  { date: 1, "recurrence.frequency": 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

/**
 * Validate deletion pre-conditions for RoutineTask
 * @param {mongoose.Document} document - RoutineTask document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
routineTaskSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  // Call base Task validation
  const baseValidation = await Task.validateDeletion(document, session);
  const errors = [...baseValidation.errors];
  const warnings = [...baseValidation.warnings];

  try {
    // Check for materials
    if (document.materials && document.materials.length > 0) {
      warnings.push({
        code: "MATERIALS_PRESENT",
        message: `Task has ${document.materials.length} materials that will be removed`,
        materialCount: document.materials.length,
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
 * Validate restoration pre-conditions for RoutineTask
 * @param {mongoose.Document} document - RoutineTask document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
routineTaskSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  // Call base Task validation
  const baseValidation = await Task.validateRestoration(document, session);
  const errors = [...baseValidation.errors];
  const warnings = [...baseValidation.warnings];

  try {
    const Material = mongoose.model("Material");

    // Pre-condition 1: Date validation
    if (document.date > new Date() && !document.recurrence.frequency) {
      warnings.push({
        code: "FUTURE_DATE",
        message: "Task date is in the future for non-recurring task",
        field: "date",
        date: document.date,
      });
    }

    // Pre-condition 2: Recurrence validation
    if (
      document.recurrence &&
      document.recurrence.endDate &&
      document.recurrence.endDate <= document.date
    ) {
      errors.push({
        code: "INVALID_RECURRENCE_END_DATE",
        message: "Recurrence end date must be after task date",
        field: "recurrence.endDate",
      });
    }

    // Pre-condition 3: Materials validation
    if (document.materials && document.materials.length > 0) {
      const materialIds = document.materials.map((m) => m.material);
      const materials = await Material.find({
        _id: { $in: materialIds },
      })
        .session(session)
        .withDeleted();

      // Check for deleted materials
      const deletedMaterials = materials.filter((m) => m.isDeleted);
      if (deletedMaterials.length > 0) {
        errors.push({
          code: "MATERIALS_DELETED",
          message: `${deletedMaterials.length} materials are deleted and cannot be restored`,
          field: "materials",
          deletedMaterialIds: deletedMaterials.map((m) => m._id),
        });
      }

      // Check for materials not found
      if (materials.length < materialIds.length) {
        errors.push({
          code: "MATERIALS_NOT_FOUND",
          message: `${
            materialIds.length - materials.length
          } materials not found`,
          field: "materials",
        });
      }

      // Check materials belong to same org/dept
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
          invalidMaterialIds: invalidMaterials.map((m) => m._id),
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
 * Cascade delete RoutineTask
 * NO TaskActivities (design constraint)
 * @param {mongoose.Types.ObjectId} documentId - RoutineTask ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
routineTaskSchema.statics.cascadeDelete = async function (
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
        code: "ROUTINE_TASK_NOT_FOUND",
        message: "Routine task not found",
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

    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");
    const Notification = mongoose.model("Notification");

    // Delete task comments (NO TaskActivities for RoutineTask)
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
 * Cascade restore RoutineTask
 * NO TaskActivities (design constraint)
 * @param {mongoose.Types.ObjectId} documentId - RoutineTask ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
routineTaskSchema.statics.cascadeRestore = async function (
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
        code: "ROUTINE_TASK_NOT_FOUND",
        message: "Routine task not found",
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

    const TaskComment = mongoose.model("TaskComment");
    const Attachment = mongoose.model("Attachment");
    const Notification = mongoose.model("Notification");

    // Restore task comments (NO TaskActivities for RoutineTask)
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

const RoutineTask = Task.discriminator("RoutineTask", routineTaskSchema);

export default RoutineTask;
