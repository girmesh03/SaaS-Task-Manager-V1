import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  ORGANIZATION_VALIDATION,
  SUBSCRIPTION_VALIDATION,
  SETTINGS_VALIDATION,
  IMAGE_VALIDATION,
  INDUSTRIES,
  INDUSTRIES_SIZE,
} from "../utils/constants.js";

/**
 * Organization Model
 *
 * Top-level tenant entity with platform and customer types
 * Platform organization CANNOT be deleted
 *
 * Cascade Delete: Departments → Users → Tasks → Activities → Comments → Attachments → Materials → Vendors
 */

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [
        ORGANIZATION_VALIDATION.NAME.MAX_LENGTH,
        `Organization name must not exceed ${ORGANIZATION_VALIDATION.NAME.MAX_LENGTH} characters`,
      ],
      match: [
        ORGANIZATION_VALIDATION.NAME.PATTERN,
        "Organization name contains invalid characters",
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        ORGANIZATION_VALIDATION.DESCRIPTION.MAX_LENGTH,
        `Description must not exceed ${ORGANIZATION_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,
      ],
      default: "",
    },

    email: {
      type: String,
      required: [true, "Organization email is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        ORGANIZATION_VALIDATION.EMAIL.MAX_LENGTH,
        `Email must not exceed ${ORGANIZATION_VALIDATION.EMAIL.MAX_LENGTH} characters`,
      ],
      match: [
        ORGANIZATION_VALIDATION.EMAIL.PATTERN,
        "Please provide a valid email address",
      ],
    },

    phone: {
      type: String,
      required: [true, "Organization phone is required"],
      trim: true,
      minlength: [
        ORGANIZATION_VALIDATION.PHONE.MIN_LENGTH,
        `Phone must be at least ${ORGANIZATION_VALIDATION.PHONE.MIN_LENGTH} characters`,
      ],
      maxlength: [
        ORGANIZATION_VALIDATION.PHONE.MAX_LENGTH,
        `Phone must not exceed ${ORGANIZATION_VALIDATION.PHONE.MAX_LENGTH} characters`,
      ],
      match: [
        ORGANIZATION_VALIDATION.PHONE.PATTERN,
        "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)",
      ],
    },

    address: {
      type: String,
      required: [true, "Organization address is required"],
      trim: true,
      minlength: [
        ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH,
        `Address must be at least ${ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH} characters`,
      ],
      maxlength: [
        ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH,
        `Address must not exceed ${ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH} characters`,
      ],
    },

    industry: {
      type: String,
      required: [true, "Industry is required"],
      enum: {
        values: Object.values(INDUSTRIES),
        message: "Invalid industry. Please select a valid industry type.",
      },
      trim: true,
    },

    size: {
      type: String,
      required: [true, "Organization size is required"],
      enum: {
        values: Object.values(INDUSTRIES_SIZE),
        message: "Invalid organization size. Please select a valid size.",
      },
      trim: true,
    },

    // Logo (Cloudinary)
    logo: {
      url: {
        type: String,
        trim: true,
        match: [
          IMAGE_VALIDATION.URL.PATTERN,
          "Please provide a valid Cloudinary URL",
        ],
        default: "",
      },
      publicId: {
        type: String,
        trim: true,
        maxlength: [
          IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH,
          `Public ID must not exceed ${IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH} characters`,
        ],
        default: "",
      },
    },

    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Platform Organization Flag (Requirement 7.3, 7.4)
    isPlatformOrg: {
      type: Boolean,
      default: false,
    },

    // Subscription Information (Requirement 7.7)
    subscription: {
      plan: {
        type: String,
        enum: {
          values: SUBSCRIPTION_VALIDATION.PLAN.VALUES,
          message: "Invalid subscription plan",
        },
        default: "Free",
      },
      status: {
        type: String,
        enum: {
          values: SUBSCRIPTION_VALIDATION.STATUS.VALUES,
          message: "Invalid subscription status",
        },
        default: "Active",
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },

    // Settings (Requirement 7.8)
    settings: {
      timezone: {
        type: String,
        match: [
          SETTINGS_VALIDATION.TIMEZONE.PATTERN,
          "Invalid timezone format",
        ],
        default: "Africa/Nairobi",
      },
      dateFormat: {
        type: String,
        enum: {
          values: SETTINGS_VALIDATION.DATE_FORMAT.VALUES,
          message: "Invalid date format",
        },
        default: "DD/MM/YYYY",
      },
      language: {
        type: String,
        enum: {
          values: SETTINGS_VALIDATION.LANGUAGE.VALUES,
          message: "Invalid language",
        },
        default: "en",
      },
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

// Indexes (Requirement 7.2)
// Unique partial indexes for name, email, phone (only for non-deleted documents)
organizationSchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

organizationSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

organizationSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Additional indexes (no partialFilterExpression needed for non-unique indexes used for filtering)
organizationSchema.index({ isPlatformOrg: 1 });
organizationSchema.index({ createdBy: 1 });
organizationSchema.index({ "subscription.status": 1 });

// Apply plugins
organizationSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 7.10, 7.11)
organizationSchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to prevent deletion of platform organization (Requirement 7.12)
organizationSchema.pre("save", function (next) {
  // Prevent changing isPlatformOrg after creation
  if (!this.isNew && this.isModified("isPlatformOrg")) {
    const error = new Error("Cannot modify isPlatformOrg flag after creation");
    error.statusCode = 400;
    error.code = "PLATFORM_FLAG_IMMUTABLE";
    return next(error);
  }

  // Validate logo consistency
  if (this.isModified("logo")) {
    const hasUrl = this.logo.url && this.logo.url.trim() !== "";
    const hasPublicId = this.logo.publicId && this.logo.publicId.trim() !== "";

    if (hasUrl !== hasPublicId) {
      const error = new Error(
        "Logo URL and publicId must both be provided or both be empty"
      );
      error.statusCode = 400;
      error.code = "LOGO_INCOMPLETE";
      return next(error);
    }
  }

  // If attempting to soft delete a platform organization, prevent it
  if (this.isModified("isDeleted") && this.isDeleted && this.isPlatformOrg) {
    const error = new Error("Platform organization cannot be deleted");
    error.statusCode = 403;
    error.code = "PLATFORM_ORG_DELETE_FORBIDDEN";
    return next(error);
  }

  next();
});

// Static method to prevent hard delete of platform organization
organizationSchema.statics.preventPlatformOrgDeletion = async function (
  organizationId,
  session = null
) {
  const organization = await this.findById(organizationId).session(session);

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    error.code = "ORGANIZATION_NOT_FOUND";
    throw error;
  }

  if (organization.isPlatformOrg) {
    const error = new Error("Platform organization cannot be deleted");
    error.statusCode = 403;
    error.code = "PLATFORM_ORG_DELETE_FORBIDDEN";
    throw error;
  }

  return organization;
};

/**
 * Validate deletion pre-conditions for Organization
 * @param {mongoose.Document} document - Organization document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
organizationSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    // Pre-condition 1: Cannot delete platform organization
    if (document.isPlatformOrg === true) {
      errors.push({
        code: "PLATFORM_ORG_DELETE_FORBIDDEN",
        message: "Platform organization cannot be deleted",
        field: "isPlatformOrg",
      });
    }

    // Pre-condition 2: Check for massive cascade operation
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");
    const Task = mongoose.model("Task");

    const departmentCount = await Department.countDocuments({
      organization: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    const userCount = await User.countDocuments({
      organization: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    const taskCount = await Task.countDocuments({
      organization: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (departmentCount > 100 || userCount > 1000 || taskCount > 10000) {
      warnings.push({
        code: "MASSIVE_CASCADE_OPERATION",
        message: `This will cascade delete ${departmentCount} departments, ${userCount} users, and ${taskCount} tasks. This is a massive operation.`,
        counts: { departmentCount, userCount, taskCount },
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
 * Validate restoration pre-conditions for Organization
 * @param {mongoose.Document} document - Organization document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
organizationSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    // Pre-condition 1: Platform organizations cannot be deleted, so restoration is irrelevant
    if (document.isPlatformOrg === true) {
      errors.push({
        code: "PLATFORM_ORG_RESTORE_INVALID",
        message:
          "Platform organizations cannot be deleted, so restoration is not applicable",
        field: "isPlatformOrg",
      });
    }

    // Pre-condition 2: Check for duplicate name conflicts
    const nameConflict = await this.findOne({
      name: document.name,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (nameConflict) {
      errors.push({
        code: "DUPLICATE_NAME",
        message: `Another organization with name '${document.name}' already exists`,
        field: "name",
        conflictId: nameConflict._id,
      });
    }

    // Pre-condition 3: Check for duplicate email conflicts
    const emailConflict = await this.findOne({
      email: document.email,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (emailConflict) {
      errors.push({
        code: "DUPLICATE_EMAIL",
        message: `Another organization with email '${document.email}' already exists`,
        field: "email",
        conflictId: emailConflict._id,
      });
    }

    // Pre-condition 4: Check for duplicate phone conflicts
    const phoneConflict = await this.findOne({
      phone: document.phone,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (phoneConflict) {
      errors.push({
        code: "DUPLICATE_PHONE",
        message: `Another organization with phone '${document.phone}' already exists`,
        field: "phone",
        conflictId: phoneConflict._id,
      });
    }

    // Pre-condition 5: Validate subscription state
    if (
      document.subscription.status === "Active" &&
      document.subscription.expiresAt &&
      new Date(document.subscription.expiresAt) < new Date()
    ) {
      warnings.push({
        code: "SUBSCRIPTION_EXPIRED",
        message: "Subscription has expired during deletion period",
        field: "subscription.expiresAt",
        expiresAt: document.subscription.expiresAt,
      });
    }

    // Warning: Massive cascade restoration
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");

    const deletedDepartmentCount = await Department.countDocuments({
      organization: document._id,
      isDeleted: true,
    }).session(session);

    const deletedUserCount = await User.countDocuments({
      organization: document._id,
      isDeleted: true,
    }).session(session);

    if (deletedDepartmentCount > 50 || deletedUserCount > 500) {
      warnings.push({
        code: "MASSIVE_CASCADE_RESTORATION",
        message: `This will cascade restore ${deletedDepartmentCount} departments and ${deletedUserCount} users. This is a massive operation.`,
        counts: { deletedDepartmentCount, deletedUserCount },
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
 * Cascade delete organization with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - Organization ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
organizationSchema.statics.cascadeDelete = async function (
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
    // Check recursion depth
    if (depth >= maxDepth) {
      result.errors.push({
        code: "MAX_DEPTH_EXCEEDED",
        message: `Maximum cascade depth of ${maxDepth} exceeded`,
      });
      return result;
    }

    // Find organization
    const organization = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!organization) {
      result.errors.push({
        code: "ORGANIZATION_NOT_FOUND",
        message: "Organization not found",
      });
      return result;
    }

    // Run pre-condition validations
    if (!skipValidation) {
      const validation = await this.validateDeletion(organization, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        if (!force) {
          return result;
        }
      }
    }

    // Soft delete organization
    await organization.softDelete(deletedBy, session);
    result.deletedCount++;

    // Cascade delete child resources
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");
    const Task = mongoose.model("Task");
    const Material = mongoose.model("Material");
    const Vendor = mongoose.model("Vendor");
    const Notification = mongoose.model("Notification");

    // Delete departments
    const departments = await Department.find({
      organization: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const dept of departments) {
      const deptResult = await Department.cascadeDelete(
        dept._id,
        deletedBy,
        session,
        { ...options, depth: depth + 1 }
      );
      result.deletedCount += deptResult.deletedCount;
      result.warnings.push(...deptResult.warnings);
      result.errors.push(...deptResult.errors);
    }

    // Delete users
    const users = await User.find({
      organization: documentId,
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
      organization: documentId,
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
      organization: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const material of materials) {
      await material.softDelete(deletedBy, session);
      result.deletedCount++;
    }

    // Delete vendors
    const vendors = await Vendor.find({
      organization: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const vendor of vendors) {
      await vendor.softDelete(deletedBy, session);
      result.deletedCount++;
    }

    // Delete notifications
    const notifications = await Notification.find({
      organization: documentId,
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
 * Cascade restore organization with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - Organization ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
organizationSchema.statics.cascadeRestore = async function (
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
    // Check recursion depth
    if (depth >= maxDepth) {
      result.errors.push({
        code: "MAX_DEPTH_EXCEEDED",
        message: `Maximum cascade depth of ${maxDepth} exceeded`,
      });
      return result;
    }

    // Find organization (including deleted)
    const organization = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!organization) {
      result.errors.push({
        code: "ORGANIZATION_NOT_FOUND",
        message: "Organization not found",
      });
      return result;
    }

    // Organization has no parent, so no parent validation needed

    // Run pre-condition validations
    if (!skipValidation) {
      const validation = await this.validateRestoration(organization, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    // Restore organization
    await organization.restore(session);
    result.restoredCount++;

    // Cascade restore child resources
    const Department = mongoose.model("Department");
    const User = mongoose.model("User");
    const Task = mongoose.model("Task");
    const Material = mongoose.model("Material");
    const Vendor = mongoose.model("Vendor");
    const Notification = mongoose.model("Notification");

    // Restore departments
    const departments = await Department.find({
      organization: documentId,
      isDeleted: true,
    }).session(session);

    for (const dept of departments) {
      const deptResult = await Department.cascadeRestore(dept._id, session, {
        ...options,
        depth: depth + 1,
      });
      result.restoredCount += deptResult.restoredCount;
      result.warnings.push(...deptResult.warnings);
      result.errors.push(...deptResult.errors);
    }

    // Restore users
    const users = await User.find({
      organization: documentId,
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
      organization: documentId,
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
      organization: documentId,
      isDeleted: true,
    }).session(session);

    for (const material of materials) {
      await material.restore(session);
      result.restoredCount++;
    }

    // Restore vendors
    const vendors = await Vendor.find({
      organization: documentId,
      isDeleted: true,
    }).session(session);

    for (const vendor of vendors) {
      await vendor.restore(session);
      result.restoredCount++;
    }

    // Restore notifications
    const notifications = await Notification.find({
      organization: documentId,
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

// Virtual for department count (exclude soft-deleted)
organizationSchema.virtual("departmentCount", {
  ref: "Department",
  localField: "_id",
  foreignField: "organization",
  count: true,
  match: { isDeleted: { $ne: true } },
});

// Virtual for user count (exclude soft-deleted)
organizationSchema.virtual("userCount", {
  ref: "User",
  localField: "_id",
  foreignField: "organization",
  count: true,
  match: { isDeleted: { $ne: true } },
});

// Virtual for task count (exclude soft-deleted)
organizationSchema.virtual("taskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "organization",
  count: true,
  match: { isDeleted: { $ne: true } },
});

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
