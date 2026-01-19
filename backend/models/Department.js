import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import { DEPARTMENT_VALIDATION, USER_ROLES } from "../utils/constants.js";

/**
 * Department Model
 *
 * Organizational units within organizations
 * Manager must belong to same organization and have SuperAdmin or Admin role with isHod true
 *
 * Cascade Delete: Users, Tasks, Materials
 * TTL: 365 days
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12
 */

const departmentSchema = new mongoose.Schema(
  {
    // Basic Information (Requirement 8.1)
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      minlength: [
        DEPARTMENT_VALIDATION.NAME.MIN_LENGTH,
        `Department name must be at least ${DEPARTMENT_VALIDATION.NAME.MIN_LENGTH} characters`,
      ],
      maxlength: [
        DEPARTMENT_VALIDATION.NAME.MAX_LENGTH,
        `Department name must not exceed ${DEPARTMENT_VALIDATION.NAME.MAX_LENGTH} characters`,
      ],
      match: [
        DEPARTMENT_VALIDATION.NAME.PATTERN,
        "Department name contains invalid characters",
      ],
    },

    // Organization Reference (Requirement 8.1)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },

    // Manager Reference (Requirement 8.1, 8.4)
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Manager is required"],
    },

    // Description
    description: {
      type: String,
      trim: true,
      maxlength: [
        DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH,
        `Description must not exceed ${DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,
      ],
      default: "",
    },

    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (Requirement 8.2)
// Compound unique index for name + organization (only for non-deleted documents)
departmentSchema.index(
  { name: 1, organization: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Additional indexes within organization scope
departmentSchema.index(
  { organization: 1, manager: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
departmentSchema.index(
  { organization: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
departmentSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 8.7, 8.8, 8.9)
departmentSchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to validate manager (Requirement 8.3, 8.4)
departmentSchema.pre("save", async function (next) {
  // Only validate if manager or organization is modified
  if (this.isModified("manager") || this.isModified("organization")) {
    try {
      // Import User model dynamically to avoid circular dependency
      const User = mongoose.model("User");

      // Get session from this.$session() if available
      const session = this.$session();

      // Find the manager
      const manager = await User.findById(this.manager).session(session);

      if (!manager) {
        return next(new Error("Manager not found"));
      }

      // Validate manager belongs to same organization (Requirement 8.3)
      if (manager.organization.toString() !== this.organization.toString()) {
        return next(new Error("Manager must belong to the same organization"));
      }

      // Validate manager has SuperAdmin or Admin role with isHod true (Requirement 8.4)
      const validRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
      if (!validRoles.includes(manager.role) || !manager.isHod) {
        return next(
          new Error(
            "Manager must have SuperAdmin or Admin role with isHod set to true"
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

// Pre-update middleware to validate manager on update (Requirement 8.11)
departmentSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  // Check if manager is being updated
  if (update.manager || update.$set?.manager) {
    const managerId = update.manager || update.$set?.manager;
    const organizationId =
      update.organization ||
      update.$set?.organization ||
      this.getQuery().organization;

    try {
      // Import User model dynamically to avoid circular dependency
      const User = mongoose.model("User");

      // Get session from this.options if available
      const session = this.options.session || null;

      // Find the manager
      const manager = await User.findById(managerId).session(session);

      if (!manager) {
        return next(new Error("Manager not found"));
      }

      // If organization is being updated, validate against new organization
      if (organizationId) {
        if (manager.organization.toString() !== organizationId.toString()) {
          return next(
            new Error("Manager must belong to the same organization")
          );
        }
      }

      // Validate manager has SuperAdmin or Admin role with isHod true
      const validRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
      if (!validRoles.includes(manager.role) || !manager.isHod) {
        return next(
          new Error(
            "Manager must have SuperAdmin or Admin role with isHod set to true"
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

// Virtual for user count
departmentSchema.virtual("userCount", {
  ref: "User",
  localField: "_id",
  foreignField: "department",
  count: true,
});

// Virtual for task count
departmentSchema.virtual("taskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "department",
  count: true,
});

// Virtual for material count
departmentSchema.virtual("materialCount", {
  ref: "Material",
  localField: "_id",
  foreignField: "department",
  count: true,
});

const Department = mongoose.model("Department", departmentSchema);

export default Department;
