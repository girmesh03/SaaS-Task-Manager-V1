import mongoose from "mongoose";
import Task from "./Task.js";
import { TASK_VALIDATION } from "../utils/constants.js";

/**
 * AssignedTask Model (Discriminator)
 *
 * Tasks assigned to specific users
 * Requires at least one assignee
 *
 * Requirements: 10.7
 */

const assignedTaskSchema = new mongoose.Schema({
  // Title (max 50) (Requirement 10.7)
  title: {
    type: String,
    required: [true, "Assigned task title is required"],
    trim: true,
    minlength: [
      TASK_VALIDATION.TITLE.MIN_LENGTH,
      `Title must be at least ${TASK_VALIDATION.TITLE.MIN_LENGTH} characters`,
    ],
    maxlength: [
      TASK_VALIDATION.TITLE.MAX_LENGTH,
      `Title must not exceed ${TASK_VALIDATION.TITLE.MAX_LENGTH} characters`,
    ],
  },

  // Assignees (array, min 1) (Requirement 10.7)
  assignees: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    required: [true, "At least one assignee is required"],
    validate: [
      {
        validator: function (assignees) {
          return assignees.length >= TASK_VALIDATION.ASSIGNEES.MIN_COUNT;
        },
        message: `At least ${TASK_VALIDATION.ASSIGNEES.MIN_COUNT} assignee is required`,
      },
      {
        validator: function (assignees) {
          return assignees.length <= TASK_VALIDATION.ASSIGNEES.MAX_COUNT;
        },
        message: `Maximum ${TASK_VALIDATION.ASSIGNEES.MAX_COUNT} assignees allowed`,
      },
      {
        validator: function (assignees) {
          // Check for uniqueness
          const uniqueAssignees = new Set(assignees.map((a) => a.toString()));
          return uniqueAssignees.size === assignees.length;
        },
        message: "Assignees must be unique",
      },
    ],
  },

  // Start Date (Requirement 10.7)
  startDate: {
    type: Date,
    required: [true, "Start date is required for assigned tasks"],
  },

  // Due Date (must be after startDate) (Requirement 10.7)
  dueDate: {
    type: Date,
    required: [true, "Due date is required for assigned tasks"],
  },
});

// Pre-save middleware to validate dueDate is after startDate (Requirement 10.7)
assignedTaskSchema.pre("save", async function (next) {
  // Validate dueDate is after startDate
  if (this.startDate && this.dueDate && this.dueDate <= this.startDate) {
    return next(new Error("Due date must be after start date"));
  }

  // Validate assignees belong to same organization (Requirement 10.14)
  if (this.isModified("assignees") && this.assignees.length > 0) {
    try {
      // Import User model dynamically to avoid circular dependency
      const User = mongoose.model("User");

      // Get session from this.$session() if available
      const session = this.$session();

      // Find all assignees
      const assignees = await User.find({
        _id: { $in: this.assignees },
      }).session(session);

      // Validate all assignees belong to same organization
      const invalidAssignees = assignees.filter(
        (assignee) =>
          assignee.organization.toString() !== this.organization.toString()
      );

      if (invalidAssignees.length > 0) {
        return next(
          new Error("All assignees must belong to the same organization")
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

// Pre-update middleware to validate dueDate is after startDate
assignedTaskSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  const startDate = update.startDate || update.$set?.startDate;
  const dueDate = update.dueDate || update.$set?.dueDate;

  if (startDate && dueDate && dueDate <= startDate) {
    return next(new Error("Due date must be after start date"));
  }
  next();
});

// Indexes for AssignedTask (within organization and department scope via base Task)
assignedTaskSchema.index(
  { assignees: 1, startDate: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

/**
 * Validate deletion pre-conditions for AssignedTask
 * Inherits from Task and adds assignee-specific checks
 * @param {mongoose.Document} document - AssignedTask document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
assignedTaskSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  // Call base Task validation
  const baseValidation = await Task.validateDeletion(document, session);
  const errors = [...baseValidation.errors];
  const warnings = [...baseValidation.warnings];

  try {
    // Check for assignees
    if (document.assignees && document.assignees.length > 0) {
      warnings.push({
        code: "ASSIGNEES_PRESENT",
        message: `Task has ${document.assignees.length} assignees`,
        assigneeCount: document.assignees.length,
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
 * Validate restoration pre-conditions for AssignedTask
 * Inherits from Task and adds assignee-specific checks
 * @param {mongoose.Document} document - AssignedTask document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
assignedTaskSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  // Call base Task validation
  const baseValidation = await Task.validateRestoration(document, session);
  const errors = [...baseValidation.errors];
  const warnings = [...baseValidation.warnings];

  try {
    const User = mongoose.model("User");

    // Pre-condition 1: At least one assignee must exist and NOT be deleted
    if (!document.assignees || document.assignees.length === 0) {
      errors.push({
        code: "NO_ASSIGNEES",
        message: "At least one assignee is required",
        field: "assignees",
      });
    } else {
      const assignees = await User.find({
        _id: { $in: document.assignees },
      })
        .session(session)
        .withDeleted();

      // Check for deleted assignees
      const deletedAssignees = assignees.filter((a) => a.isDeleted);
      if (deletedAssignees.length > 0) {
        warnings.push({
          code: "ASSIGNEES_DELETED",
          message: `${deletedAssignees.length} assignees are deleted and will be removed`,
          deletedAssigneeIds: deletedAssignees.map((a) => a._id),
        });
      }

      // Check if at least one active assignee exists
      const activeAssignees = assignees.filter((a) => !a.isDeleted);
      if (activeAssignees.length === 0) {
        errors.push({
          code: "NO_ACTIVE_ASSIGNEES",
          message: "At least one active assignee is required",
          field: "assignees",
        });
      }

      // Pre-condition 2: All assignees must belong to same organization
      const invalidAssignees = assignees.filter(
        (a) => a.organization.toString() !== document.organization.toString()
      );

      if (invalidAssignees.length > 0) {
        errors.push({
          code: "ASSIGNEES_WRONG_ORG",
          message: "All assignees must belong to the same organization",
          field: "assignees",
          invalidAssigneeIds: invalidAssignees.map((a) => a._id),
        });
      }

      // Pre-condition 3: Assignees must be unique
      const uniqueAssignees = new Set(
        document.assignees.map((a) => a.toString())
      );
      if (uniqueAssignees.size !== document.assignees.length) {
        errors.push({
          code: "DUPLICATE_ASSIGNEES",
          message: "Assignees must be unique",
          field: "assignees",
        });
      }

      // Pre-condition 4: Assignees count within limits
      if (
        document.assignees.length < TASK_VALIDATION.ASSIGNEES.MIN_COUNT ||
        document.assignees.length > TASK_VALIDATION.ASSIGNEES.MAX_COUNT
      ) {
        errors.push({
          code: "INVALID_ASSIGNEE_COUNT",
          message: `Assignees count must be between ${TASK_VALIDATION.ASSIGNEES.MIN_COUNT} and ${TASK_VALIDATION.ASSIGNEES.MAX_COUNT}`,
          field: "assignees",
          count: document.assignees.length,
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
 * Cascade delete AssignedTask
 * Inherits from Task base cascade delete
 * @param {mongoose.Types.ObjectId} documentId - AssignedTask ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
assignedTaskSchema.statics.cascadeDelete = async function (
  documentId,
  deletedBy,
  session,
  options = {}
) {
  // AssignedTask uses base Task cascade delete behavior
  return await Task.cascadeDelete(documentId, deletedBy, session, options);
};

/**
 * Cascade restore AssignedTask
 * Inherits from Task base cascade restore with assignee validation
 * @param {mongoose.Types.ObjectId} documentId - AssignedTask ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
assignedTaskSchema.statics.cascadeRestore = async function (
  documentId,
  session,
  options = {}
) {
  // AssignedTask uses base Task cascade restore behavior
  // Assignee validation is handled in validateRestoration
  return await Task.cascadeRestore(documentId, session, options);
};

const AssignedTask = Task.discriminator("AssignedTask", assignedTaskSchema);

export default AssignedTask;
