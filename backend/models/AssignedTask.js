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

const AssignedTask = Task.discriminator("AssignedTask", assignedTaskSchema);

export default AssignedTask;
