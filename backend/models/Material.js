import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import { MATERIAL_VALIDATION, MATERIAL_CATEGORY } from "../utils/constants.js";

/**
 * Material Model
 *
 * Materials used to complete tasks
 * Usage Patterns:
 * - ProjectTask/AssignedTask: materials added to TaskActivity with quantities
 * - RoutineTask: materials added directly to task (no TaskActivity)
 *
 * When deleted, remove from Task/TaskActivity
 * TTL: 90 days
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
 */

const materialSchema = new mongoose.Schema(
  {
    // Name (Requirement 13.1)
    name: {
      type: String,
      required: [true, "Material name is required"],
      trim: true,
      minlength: [
        MATERIAL_VALIDATION.NAME.MIN_LENGTH,
        `Material name must be at least ${MATERIAL_VALIDATION.NAME.MIN_LENGTH} characters`,
      ],
      maxlength: [
        MATERIAL_VALIDATION.NAME.MAX_LENGTH,
        `Material name must not exceed ${MATERIAL_VALIDATION.NAME.MAX_LENGTH} characters`,
      ],
    },

    // Unit (Requirement 13.1)
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      minlength: [
        MATERIAL_VALIDATION.UNIT.MIN_LENGTH,
        `Unit must be at least ${MATERIAL_VALIDATION.UNIT.MIN_LENGTH} characters`,
      ],
      maxlength: [
        MATERIAL_VALIDATION.UNIT.MAX_LENGTH,
        `Unit must not exceed ${MATERIAL_VALIDATION.UNIT.MAX_LENGTH} characters`,
      ],
    },

    // Category (Requirement 13.1, 13.8)
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: Object.values(MATERIAL_CATEGORY),
        message: "Invalid material category",
      },
      default: MATERIAL_CATEGORY.OTHER,
    },

    // Price (optional)
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: 0,
    },

    // Organization and Department (Requirement 13.1)
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

    // Created By (Requirement 13.1)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Added By (optional)
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (Requirement 13.4)
// Indexes within organization and department scope
materialSchema.index(
  { organization: 1, department: 1, category: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
materialSchema.index(
  { organization: 1, department: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
materialSchema.index(
  { organization: 1, department: 1, name: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
materialSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 13.5, 13.6)
materialSchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to validate user belongs to same organization (Requirement 13.2)
materialSchema.pre("save", async function (next) {
  try {
    // Import User model dynamically to avoid circular dependency
    const User = mongoose.model("User");

    // Get session from this.$session() if available
    const session = this.$session();

    // Find the user
    const user = await User.findById(this.createdBy).session(session);

    if (!user) {
      return next(new Error("User not found"));
    }

    // Validate user belongs to same organization (Requirement 13.2)
    if (user.organization.toString() !== this.organization.toString()) {
      return next(new Error("User must belong to the same organization"));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for usage count in tasks
materialSchema.virtual("usageCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "materials.material",
  count: true,
});

// Virtual for usage count in activities
materialSchema.virtual("activityUsageCount", {
  ref: "TaskActivity",
  localField: "_id",
  foreignField: "materials.material",
  count: true,
});

const Material = mongoose.model("Material", materialSchema);

export default Material;
