import mongoose from "mongoose";
import Task from "./Task.js";
import {
  TASK_VALIDATION,
  MILESTONE_VALIDATION,
  TASK_STATUS,
} from "../utils/constants.js";

/**
 * ProjectTask Model (Discriminator)
 *
 * Tasks outsourced to external vendors
 * Includes vendor reference and milestones
 *
 * Requirements: 10.5
 */

const projectTaskSchema = new mongoose.Schema({
  // Title (Requirement 10.5)
  title: {
    type: String,
    required: [true, "Project task title is required"],
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

  // Vendor (Requirement 10.5)
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: [true, "Vendor is required for project tasks"],
  },

  // Milestones (Requirement 10.5)
  milestones: {
    type: [
      {
        name: {
          type: String,
          required: [true, "Milestone name is required"],
          trim: true,
          minlength: [
            MILESTONE_VALIDATION.NAME.MIN_LENGTH,
            `Milestone name must be at least ${MILESTONE_VALIDATION.NAME.MIN_LENGTH} characters`,
          ],
          maxlength: [
            MILESTONE_VALIDATION.NAME.MAX_LENGTH,
            `Milestone name must not exceed ${MILESTONE_VALIDATION.NAME.MAX_LENGTH} characters`,
          ],
        },
        dueDate: {
          type: Date,
          required: [true, "Milestone due date is required"],
        },
        status: {
          type: String,
          enum: {
            values: MILESTONE_VALIDATION.STATUS.VALUES,
            message: "Invalid milestone status",
          },
          default: TASK_STATUS.TODO,
        },
        _id: false,
      },
    ],
    default: [],
  },

  // Start Date (Requirement 10.5)
  startDate: {
    type: Date,
    required: [true, "Start date is required for project tasks"],
  },

  // Due Date (must be after startDate) (Requirement 10.5)
  dueDate: {
    type: Date,
    required: [true, "Due date is required for project tasks"],
  },
});

// Pre-save middleware to validate dueDate is after startDate (Requirement 10.5)
projectTaskSchema.pre("save", function (next) {
  if (this.startDate && this.dueDate && this.dueDate <= this.startDate) {
    return next(new Error("Due date must be after start date"));
  }
  next();
});

// Pre-update middleware to validate dueDate is after startDate
projectTaskSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  const startDate = update.startDate || update.$set?.startDate;
  const dueDate = update.dueDate || update.$set?.dueDate;

  if (startDate && dueDate && dueDate <= startDate) {
    return next(new Error("Due date must be after start date"));
  }
  next();
});

// Indexes for ProjectTask (within organization and department scope via base Task)
projectTaskSchema.index(
  { vendor: 1, startDate: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

/**
 * Validate deletion pre-conditions for ProjectTask
 * Inherits from Task and adds vendor-specific checks
 * @param {mongoose.Document} document - ProjectTask document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
projectTaskSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  // Call base Task validation
  const baseValidation = await Task.validateDeletion(document, session);
  const errors = [...baseValidation.errors];
  const warnings = [...baseValidation.warnings];

  try {
    // Additional validation: Check vendor relationship
    if (document.vendor) {
      warnings.push({
        code: "VENDOR_RELATIONSHIP",
        message: "Vendor relationship will be maintained during soft delete",
        vendorId: document.vendor,
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
 * Validate restoration pre-conditions for ProjectTask
 * Inherits from Task and adds vendor-specific checks
 * @param {mongoose.Document} document - ProjectTask document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
projectTaskSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  // Call base Task validation
  const baseValidation = await Task.validateRestoration(document, session);
  const errors = [...baseValidation.errors];
  const warnings = [...baseValidation.warnings];

  try {
    const Vendor = mongoose.model("Vendor");

    // Pre-condition 1: Vendor must exist and NOT be deleted
    const vendor = await Vendor.findById(document.vendor)
      .session(session)
      .withDeleted();

    if (!vendor) {
      errors.push({
        code: "VENDOR_NOT_FOUND",
        message: "Vendor not found",
        field: "vendor",
      });
    } else if (vendor.isDeleted) {
      errors.push({
        code: "VENDOR_DELETED",
        message: "Cannot restore project task because vendor is deleted",
        field: "vendor",
        vendorId: vendor._id,
      });
    } else if (vendor.status !== "Active") {
      warnings.push({
        code: "VENDOR_NOT_ACTIVE",
        message: `Vendor status is '${vendor.status}', not 'Active'`,
        field: "vendor",
        vendorStatus: vendor.status,
      });
    }

    // Pre-condition 2: Validate milestone due dates
    if (document.milestones && document.milestones.length > 0) {
      const invalidMilestones = document.milestones.filter(
        (m) => m.dueDate < document.startDate || m.dueDate > document.dueDate
      );

      if (invalidMilestones.length > 0) {
        warnings.push({
          code: "INVALID_MILESTONE_DATES",
          message: `${invalidMilestones.length} milestones have due dates outside task date range`,
          field: "milestones",
        });
      }

      // Check for overdue milestones
      const overdueMilestones = document.milestones.filter(
        (m) => m.dueDate < new Date() && m.status !== TASK_STATUS.COMPLETED
      );

      if (overdueMilestones.length > 0) {
        warnings.push({
          code: "OVERDUE_MILESTONES",
          message: `${overdueMilestones.length} milestones are overdue`,
          field: "milestones",
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
 * Cascade delete ProjectTask
 * Inherits from Task base cascade delete
 * @param {mongoose.Types.ObjectId} documentId - ProjectTask ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
projectTaskSchema.statics.cascadeDelete = async function (
  documentId,
  deletedBy,
  session,
  options = {}
) {
  // ProjectTask uses base Task cascade delete behavior
  return await Task.cascadeDelete(documentId, deletedBy, session, options);
};

/**
 * Cascade restore ProjectTask
 * Inherits from Task base cascade restore with vendor validation
 * @param {mongoose.Types.ObjectId} documentId - ProjectTask ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
projectTaskSchema.statics.cascadeRestore = async function (
  documentId,
  session,
  options = {}
) {
  // ProjectTask uses base Task cascade restore behavior
  // Vendor validation is handled in validateRestoration
  return await Task.cascadeRestore(documentId, session, options);
};

const ProjectTask = Task.discriminator("ProjectTask", projectTaskSchema);

export default ProjectTask;
