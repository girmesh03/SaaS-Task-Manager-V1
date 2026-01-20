import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import { DEPARTMENT_VALIDATION, USER_ROLES } from "../utils/constants.js";

/**
 * Transform function to sanitize department documents
 * Removes virtual 'id' and version key from serialized output
 */
const transformDepartmentDocument = (_doc, ret) => {
  delete ret.id;
  delete ret.__v;
  return ret;
};

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
    // Note: Not required in schema to allow initial creation, but validated in pre-save middleware
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow null during initial creation to resolve circular dependency
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
    // Note: Not required in schema to allow initial creation, but validated in pre-save middleware
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow null during initial creation to resolve circular dependency
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: transformDepartmentDocument,
    },
    toObject: {
      virtuals: true,
      transform: transformDepartmentDocument,
    },
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

// Pre-save middleware to validate manager and createdBy (Requirement 8.3, 8.4)
departmentSchema.pre("save", async function (next) {
  // Skip validation if explicitly disabled (for seeding)
  if (this.$locals.skipValidation) {
    return next();
  }

  try {
    // Import User model dynamically to avoid circular dependency
    const User = mongoose.model("User");

    // Get session from this.$session() if available
    const session = this.$session();

    // Validate manager is present (unless this is initial creation)
    if (!this.manager) {
      return next(new Error("Manager is required"));
    }

    // Validate createdBy is present (unless this is initial creation)
    if (!this.createdBy) {
      return next(new Error("Created by user is required"));
    }

    // Only validate manager details if manager or organization is modified
    if (this.isModified("manager") || this.isModified("organization")) {
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
    }

    next();
  } catch (error) {
    next(error);
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

/**
 * Validate deletion pre-conditions for Department
 * @param {mongoose.Document} document - Department document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
departmentSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const User = mongoose.model("User");
    const Task = mongoose.model("Task");
    const Material = mongoose.model("Material");

    // Check for users in department
    const userCount = await User.countDocuments({
      department: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (userCount > 50) {
      warnings.push({
        code: "LARGE_USER_COUNT",
        message: `This will cascade delete ${userCount} users`,
        count: userCount,
      });
    }

    // Check for tasks in department
    const taskCount = await Task.countDocuments({
      department: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (taskCount > 500) {
      warnings.push({
        code: "LARGE_TASK_COUNT",
        message: `This will cascade delete ${taskCount} tasks`,
        count: taskCount,
      });
    }

    // Check for materials in department
    const materialCount = await Material.countDocuments({
      department: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (materialCount > 100) {
      warnings.push({
        code: "LARGE_MATERIAL_COUNT",
        message: `This will cascade delete ${materialCount} materials`,
        count: materialCount,
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
 * Validate restoration pre-conditions for Department
 * @param {mongoose.Document} document - Department document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
departmentSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
    const User = mongoose.model("User");

    // Pre-condition 1: Parent organization must exist and NOT be deleted
    const organization = await Organization.findById(document.organization)
      .session(session)
      .withDeleted();

    if (!organization) {
      errors.push({
        code: "ORGANIZATION_NOT_FOUND",
        message: "Parent organization not found",
        field: "organization",
      });
    } else if (organization.isDeleted) {
      errors.push({
        code: "ORGANIZATION_DELETED",
        message:
          "Cannot restore department because parent organization is deleted",
        field: "organization",
        organizationId: organization._id,
      });
    }

    // Pre-condition 2: Manager must exist and NOT be deleted
    const manager = await User.findById(document.manager)
      .session(session)
      .withDeleted();

    if (!manager) {
      errors.push({
        code: "MANAGER_NOT_FOUND",
        message: "Department manager not found",
        field: "manager",
      });
    } else if (manager.isDeleted) {
      errors.push({
        code: "MANAGER_DELETED",
        message: "Cannot restore department because manager is deleted",
        field: "manager",
        managerId: manager._id,
      });
    } else {
      // Pre-condition 3: Manager must belong to same organization
      if (
        manager.organization.toString() !== document.organization.toString()
      ) {
        errors.push({
          code: "MANAGER_WRONG_ORGANIZATION",
          message: "Manager must belong to the same organization",
          field: "manager",
          managerId: manager._id,
        });
      }

      // Pre-condition 4: Manager must have SuperAdmin/Admin role with isHod: true
      const validRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
      if (!validRoles.includes(manager.role) || !manager.isHod) {
        errors.push({
          code: "MANAGER_INVALID_ROLE",
          message:
            "Manager must have SuperAdmin or Admin role with isHod set to true",
          field: "manager",
          managerId: manager._id,
          currentRole: manager.role,
          isHod: manager.isHod,
        });
      }
    }

    // Pre-condition 5: Check for duplicate name within organization
    const nameConflict = await this.findOne({
      name: document.name,
      organization: document.organization,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (nameConflict) {
      errors.push({
        code: "DUPLICATE_NAME",
        message: `Another department with name '${document.name}' already exists in this organization`,
        field: "name",
        conflictId: nameConflict._id,
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
 * Cascade delete department with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - Department ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
departmentSchema.statics.cascadeDelete = async function (
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

    const department = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!department) {
      result.errors.push({
        code: "DEPARTMENT_NOT_FOUND",
        message: "Department not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(department, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await department.softDelete(deletedBy, session);
    result.deletedCount++;

    const User = mongoose.model("User");
    const Task = mongoose.model("Task");
    const Material = mongoose.model("Material");
    const Notification = mongoose.model("Notification");

    // Delete users
    const users = await User.find({
      department: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const user of users) {
      const userResult = await User.cascadeDelete(
        user._id,
        deletedBy,
        session,
        { ...options, depth: depth + 1 }
      );
      result.deletedCount += userResult.deletedCount;
      result.warnings.push(...userResult.warnings);
      result.errors.push(...userResult.errors);
    }

    // Delete tasks
    const tasks = await Task.find({
      department: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const task of tasks) {
      const taskResult = await Task.cascadeDelete(
        task._id,
        deletedBy,
        session,
        { ...options, depth: depth + 1 }
      );
      result.deletedCount += taskResult.deletedCount;
      result.warnings.push(...taskResult.warnings);
      result.errors.push(...taskResult.errors);
    }

    // Delete materials
    const materials = await Material.find({
      department: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const material of materials) {
      await material.softDelete(deletedBy, session);
      result.deletedCount++;
    }

    // Delete notifications
    const notifications = await Notification.find({
      department: documentId,
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
 * Cascade restore department with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - Department ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
departmentSchema.statics.cascadeRestore = async function (
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

    const department = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!department) {
      result.errors.push({
        code: "DEPARTMENT_NOT_FOUND",
        message: "Department not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(department, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await department.restore(session);
    result.restoredCount++;

    const User = mongoose.model("User");
    const Task = mongoose.model("Task");
    const Material = mongoose.model("Material");
    const Notification = mongoose.model("Notification");

    // Restore users
    const users = await User.find({
      department: documentId,
      isDeleted: true,
    }).session(session);

    for (const user of users) {
      const userResult = await User.cascadeRestore(user._id, session, {
        ...options,
        depth: depth + 1,
      });
      result.restoredCount += userResult.restoredCount;
      result.warnings.push(...userResult.warnings);
      result.errors.push(...userResult.errors);
    }

    // Restore tasks
    const tasks = await Task.find({
      department: documentId,
      isDeleted: true,
    }).session(session);

    for (const task of tasks) {
      const taskResult = await Task.cascadeRestore(task._id, session, {
        ...options,
        depth: depth + 1,
      });
      result.restoredCount += taskResult.restoredCount;
      result.warnings.push(...taskResult.warnings);
      result.errors.push(...taskResult.errors);
    }

    // Restore materials
    const materials = await Material.find({
      department: documentId,
      isDeleted: true,
    }).session(session);

    for (const material of materials) {
      await material.restore(session);
      result.restoredCount++;
    }

    // Restore notifications
    const notifications = await Notification.find({
      department: documentId,
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

const Department = mongoose.model("Department", departmentSchema);

export default Department;
