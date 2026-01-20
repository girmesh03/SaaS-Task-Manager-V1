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

/**
 * Validate deletion pre-conditions for Material
 * @param {mongoose.Document} document - Material document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
materialSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Task = mongoose.model("Task");
    const TaskActivity = mongoose.model("TaskActivity");

    // Check usage in tasks
    const taskUsageCount = await Task.countDocuments({
      "materials.material": document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (taskUsageCount > 0) {
      warnings.push({
        code: "MATERIAL_USED_IN_TASKS",
        message: `Material is used in ${taskUsageCount} tasks and will be removed from them`,
        taskUsageCount,
      });
    }

    // Check usage in activities
    const activityUsageCount = await TaskActivity.countDocuments({
      "materials.material": document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (activityUsageCount > 0) {
      warnings.push({
        code: "MATERIAL_USED_IN_ACTIVITIES",
        message: `Material is used in ${activityUsageCount} activities and will be removed from them`,
        activityUsageCount,
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
 * Validate restoration pre-conditions for Material
 * @param {mongoose.Document} document - Material document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
materialSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");

    // Pre-condition 1: Organization must exist and NOT be deleted
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
        message: "Cannot restore material because organization is deleted",
        field: "organization",
      });
    }

    // Pre-condition 2: Department must exist and NOT be deleted
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
        message: "Cannot restore material because department is deleted",
        field: "department",
      });
    }

    // Pre-condition 3: CreatedBy user must exist and NOT be deleted
    const createdBy = await User.findById(document.createdBy)
      .session(session)
      .withDeleted();

    if (!createdBy) {
      errors.push({
        code: "CREATED_BY_NOT_FOUND",
        message: "Material creator not found",
        field: "createdBy",
      });
    } else if (createdBy.isDeleted) {
      errors.push({
        code: "CREATED_BY_DELETED",
        message: "Cannot restore material because creator is deleted",
        field: "createdBy",
      });
    }

    // Pre-condition 4: Check for duplicate name within department
    const nameConflict = await this.findOne({
      name: document.name,
      department: document.department,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (nameConflict) {
      errors.push({
        code: "DUPLICATE_NAME",
        message: `Another material with name '${document.name}' already exists in this department`,
        field: "name",
        conflictId: nameConflict._id,
      });
    }

    // Pre-condition 5: Category validation
    if (!Object.values(MATERIAL_CATEGORY).includes(document.category)) {
      errors.push({
        code: "INVALID_CATEGORY",
        message: `Invalid material category '${document.category}'`,
        field: "category",
      });
    }

    // Warning: Price may be outdated
    if (document.price > 0) {
      warnings.push({
        code: "PRICE_OUTDATED",
        message: "Material price may be outdated after deletion period",
        field: "price",
        price: document.price,
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
 * Cascade delete Material
 * Removes references from Task.materials and TaskActivity.materials
 * @param {mongoose.Types.ObjectId} documentId - Material ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
materialSchema.statics.cascadeDelete = async function (
  documentId,
  deletedBy,
  session,
  options = {}
) {
  const { skipValidation = false, force = false } = options;

  const result = {
    success: false,
    deletedCount: 0,
    warnings: [],
    errors: [],
  };

  try {
    const material = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!material) {
      result.errors.push({
        code: "MATERIAL_NOT_FOUND",
        message: "Material not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(material, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await material.softDelete(deletedBy, session);
    result.deletedCount++;

    const Task = mongoose.model("Task");
    const TaskActivity = mongoose.model("TaskActivity");

    // Remove material references from tasks
    await Task.updateMany(
      { "materials.material": documentId },
      { $pull: { materials: { material: documentId } } },
      { session }
    );

    // Remove material references from activities
    await TaskActivity.updateMany(
      { "materials.material": documentId },
      { $pull: { materials: { material: documentId } } },
      { session }
    );

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
 * Cascade restore Material
 * Restores references in Task.materials and TaskActivity.materials
 * @param {mongoose.Types.ObjectId} documentId - Material ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
materialSchema.statics.cascadeRestore = async function (
  documentId,
  session,
  options = {}
) {
  const { skipValidation = false } = options;

  const result = {
    success: false,
    restoredCount: 0,
    warnings: [],
    errors: [],
  };

  try {
    const material = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!material) {
      result.errors.push({
        code: "MATERIAL_NOT_FOUND",
        message: "Material not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(material, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await material.restore(session);
    result.restoredCount++;

    // Note: Material references in tasks/activities are not automatically restored
    // They were removed during deletion and would need manual re-addition
    result.warnings.push({
      code: "MANUAL_REFERENCE_RESTORATION",
      message:
        "Material references in tasks/activities were removed during deletion and need manual re-addition",
    });

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

const Material = mongoose.model("Material", materialSchema);

export default Material;
