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

const ProjectTask = Task.discriminator("ProjectTask", projectTaskSchema);

export default ProjectTask;
