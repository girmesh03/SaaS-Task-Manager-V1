import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  USER_VALIDATION,
  USER_ROLES,
  PASSWORD,
  IMAGE_VALIDATION,
  SKILL_VALIDATION,
} from "../utils/constants.js";

/**
 * Transform function to sanitize user documents
 * Removes sensitive fields and virtual 'id' from serialized output
 * Applied to both toJSON and toObject for consistency
 */
const transformUserDocument = (doc, ret) => {
  // Remove virtual 'id' (keep _id only)
  delete ret.id;

  // Remove version key (redundant with versionKey: false, but defensive)
  delete ret.__v;

  // Remove sensitive fields (defense-in-depth: these have select: false)
  delete ret.password;
  delete ret.refreshToken;
  delete ret.refreshTokenExpiry;
  delete ret.passwordResetToken;
  delete ret.passwordResetExpiry;

  return ret;
};

/**
 * User Model
 *
 * System users belonging to department and organization
 * Password hashed using bcrypt with 12+ salt rounds
 * Sensitive fields (password, refreshToken, refreshTokenExpiry) have select: false
 *
 * Cascade Delete: Tasks (createdBy), Activities (createdBy), Comments (createdBy),
 *                 Attachments (uploadedBy), Materials (addedBy), Notifications (remove from recipients),
 *                 remove from task watchers, mentions, assignees
 * Protection: Cannot delete last SuperAdmin in organization, cannot delete last HOD in department
 * TTL: 365 days
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14
 */

const userSchema = new mongoose.Schema(
  {
    // Basic Information (Requirement 9.1)
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [
        USER_VALIDATION.FIRST_NAME.MIN_LENGTH,
        `First name must be at least ${USER_VALIDATION.FIRST_NAME.MIN_LENGTH} characters`,
      ],
      maxlength: [
        USER_VALIDATION.FIRST_NAME.MAX_LENGTH,
        `First name must not exceed ${USER_VALIDATION.FIRST_NAME.MAX_LENGTH} characters`,
      ],
      match: [
        USER_VALIDATION.FIRST_NAME.PATTERN,
        "First name contains invalid characters",
      ],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [
        USER_VALIDATION.LAST_NAME.MIN_LENGTH,
        `Last name must be at least ${USER_VALIDATION.LAST_NAME.MIN_LENGTH} characters`,
      ],
      maxlength: [
        USER_VALIDATION.LAST_NAME.MAX_LENGTH,
        `Last name must not exceed ${USER_VALIDATION.LAST_NAME.MAX_LENGTH} characters`,
      ],
      match: [
        USER_VALIDATION.LAST_NAME.PATTERN,
        "Last name contains invalid characters",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        USER_VALIDATION.EMAIL.MAX_LENGTH,
        `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`,
      ],
      match: [
        USER_VALIDATION.EMAIL.PATTERN,
        "Please provide a valid email address",
      ],
    },

    // Password (Requirement 9.3, 9.7)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [
        USER_VALIDATION.PASSWORD.MIN_LENGTH,
        `Password must be at least ${USER_VALIDATION.PASSWORD.MIN_LENGTH} characters`,
      ],
      maxlength: [
        USER_VALIDATION.PASSWORD.MAX_LENGTH,
        `Password must not exceed ${USER_VALIDATION.PASSWORD.MAX_LENGTH} characters`,
      ],
      select: false, // Exclude from queries by default (Requirement 9.7)
    },

    // Role (Requirement 9.4)
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: Object.values(USER_ROLES),
        message: "Invalid role. Must be SuperAdmin, Admin, Manager, or User",
      },
    },

    // Organization and Department (Requirement 9.1)
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

    // Platform User Flag (Requirement 9.5)
    isPlatformUser: {
      type: Boolean,
      default: false,
    },

    // Head of Department Flag (Requirement 9.6)
    isHod: {
      type: Boolean,
      default: false,
    },

    // Profile Picture (Cloudinary)
    profilePicture: {
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

    // Skills (array max 10)
    skills: {
      type: [
        {
          skill: {
            type: String,
            required: true,
            trim: true,
            maxlength: [
              SKILL_VALIDATION.NAME.MAX_LENGTH,
              `Skill name must not exceed ${SKILL_VALIDATION.NAME.MAX_LENGTH} characters`,
            ],
          },
          percentage: {
            type: Number,
            required: true,
            min: [
              SKILL_VALIDATION.PERCENTAGE.MIN,
              `Percentage must be at least ${SKILL_VALIDATION.PERCENTAGE.MIN}`,
            ],
            max: [
              SKILL_VALIDATION.PERCENTAGE.MAX,
              `Percentage must not exceed ${SKILL_VALIDATION.PERCENTAGE.MAX}`,
            ],
          },
        },
      ],
      validate: {
        validator: function (skills) {
          return skills.length <= SKILL_VALIDATION.MAX_COUNT;
        },
        message: `Maximum ${SKILL_VALIDATION.MAX_COUNT} skills allowed`,
      },
      default: [],
    },

    // Employee ID (4-digit: 0001-9999, unique per org)
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      trim: true,
      match: [
        USER_VALIDATION.EMPLOYEE_ID.PATTERN,
        "Employee ID must be a 4-digit number (0001-9999)",
      ],
    },

    // Date of Birth (not future)
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
      default: null,
    },

    // Joined At (required, not future)
    joinedAt: {
      type: Date,
      required: [true, "Joined date is required"],
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Joined date cannot be in the future",
      },
    },

    // Refresh Token (Requirement 9.7)
    refreshToken: {
      type: String,
      select: false, // Exclude from queries by default
      default: null,
    },

    refreshTokenExpiry: {
      type: Date,
      select: false, // Exclude from queries by default
      default: null,
    },

    // Last Login (Requirement 9.13)
    lastLogin: {
      type: Date,
      default: null,
    },

    // Account Lockout (Requirement 9.14)
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    accountLockedUntil: {
      type: Date,
      default: null,
    },

    // Password Reset Token
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },

    passwordResetExpiry: {
      type: Date,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: transformUserDocument,
    },
    toObject: {
      virtuals: true,
      transform: transformUserDocument,
    },
  }
);

// Indexes (Requirement 9.2)
// Compound unique index for organization + email (only for non-deleted documents)
userSchema.index(
  { organization: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Compound unique index for organization + employeeId (only for non-deleted documents)
userSchema.index(
  { organization: 1, employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Unique index for department (only one HOD per department, only for non-deleted documents)
userSchema.index(
  { organization: 1, department: 1, isHod: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true }, isHod: true },
  }
);

// Additional indexes within organization scope
userSchema.index(
  { organization: 1, role: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
userSchema.index(
  { organization: 1, department: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
userSchema.index(
  { organization: 1, isPlatformUser: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
userSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 9.10, 9.11)
userSchema.plugin(mongoosePaginate); // Pagination plugin

// Virtual: fullName (Requirement 9.8)
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password (Requirement 9.3, 9.9)
userSchema.pre("save", async function (next) {
  // Only hash password if it's modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Hash password using bcrypt with 12+ salt rounds (Requirement 9.3)
    const salt = await bcrypt.genSalt(PASSWORD.SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Method: comparePassword (Requirement 9.8)
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

// Instance Method: generatePasswordResetToken (Requirement 9.8)
userSchema.methods.generatePasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiry to 10 minutes from now
  this.passwordResetExpiry = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Instance Method: verifyPasswordResetToken (Requirement 9.8)
userSchema.methods.verifyPasswordResetToken = function (token) {
  // Hash the provided token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Check if token matches and hasn't expired
  return (
    this.passwordResetToken === hashedToken &&
    this.passwordResetExpiry > Date.now()
  );
};

// Instance Method: clearPasswordResetToken (Requirement 9.8)
userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetToken = null;
  this.passwordResetExpiry = null;
};

// Static Method: Check if last SuperAdmin in organization
userSchema.statics.isLastSuperAdminInOrg = async function (
  userId,
  organizationId,
  session = null
) {
  const superAdminCount = await this.countDocuments(
    {
      organization: organizationId,
      role: USER_ROLES.SUPER_ADMIN,
      isDeleted: { $ne: true },
      _id: { $ne: userId },
    },
    { session }
  );

  return superAdminCount === 0;
};

// Static Method: Check if last HOD in department
userSchema.statics.isLastHodInDept = async function (
  userId,
  departmentId,
  session = null
) {
  const hodCount = await this.countDocuments(
    {
      department: departmentId,
      isHod: true,
      isDeleted: { $ne: true },
      _id: { $ne: userId },
    },
    { session }
  );

  return hodCount === 0;
};

/**
 * Validate deletion pre-conditions for User
 * @param {mongoose.Document} document - User document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
userSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    // Pre-condition 1: Cannot delete last SuperAdmin in organization
    const isLastSuperAdmin = await this.isLastSuperAdminInOrg(
      document._id,
      document.organization,
      session
    );

    if (isLastSuperAdmin && document.role === USER_ROLES.SUPER_ADMIN) {
      errors.push({
        code: "LAST_SUPER_ADMIN",
        message: "Cannot delete the last SuperAdmin in the organization",
        field: "role",
      });
    }

    // Pre-condition 2: Cannot delete last HOD in department
    if (document.isHod) {
      const isLastHod = await this.isLastHodInDept(
        document._id,
        document.department,
        session
      );

      if (isLastHod) {
        errors.push({
          code: "LAST_HOD",
          message: "Cannot delete the last HOD in the department",
          field: "isHod",
        });
      }
    }

    // Pre-condition 3: Cannot delete platform users
    if (document.isPlatformUser === true) {
      errors.push({
        code: "PLATFORM_USER_DELETE_FORBIDDEN",
        message: "Platform users cannot be deleted",
        field: "isPlatformUser",
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
 * Validate restoration pre-conditions for User
 * @param {mongoose.Document} document - User document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
userSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
    const Department = mongoose.model("Department");

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
        message: "Cannot restore user because parent organization is deleted",
        field: "organization",
        organizationId: organization._id,
      });
    }

    // Pre-condition 2: Parent department must exist and NOT be deleted
    const department = await Department.findById(document.department)
      .session(session)
      .withDeleted();

    if (!department) {
      errors.push({
        code: "DEPARTMENT_NOT_FOUND",
        message: "Parent department not found",
        field: "department",
      });
    } else if (department.isDeleted) {
      errors.push({
        code: "DEPARTMENT_DELETED",
        message: "Cannot restore user because parent department is deleted",
        field: "department",
        departmentId: department._id,
      });
    }

    // Pre-condition 3: Check for duplicate email within organization
    const emailConflict = await this.findOne({
      email: document.email,
      organization: document.organization,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (emailConflict) {
      errors.push({
        code: "DUPLICATE_EMAIL",
        message: `Another user with email '${document.email}' already exists in this organization`,
        field: "email",
        conflictId: emailConflict._id,
      });
    }

    // Pre-condition 4: Check for duplicate employeeId within organization
    const employeeIdConflict = await this.findOne({
      employeeId: document.employeeId,
      organization: document.organization,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (employeeIdConflict) {
      errors.push({
        code: "DUPLICATE_EMPLOYEE_ID",
        message: `Another user with employee ID '${document.employeeId}' already exists in this organization`,
        field: "employeeId",
        conflictId: employeeIdConflict._id,
      });
    }

    // Pre-condition 5: Cannot restore platform users to non-platform organizations
    if (
      document.isPlatformUser &&
      organization &&
      !organization.isPlatformOrg
    ) {
      errors.push({
        code: "PLATFORM_USER_NON_PLATFORM_ORG",
        message: "Cannot restore platform user to non-platform organization",
        field: "isPlatformUser",
      });
    }

    // Warning: Password reset tokens and refresh tokens expire
    if (document.passwordResetToken || document.refreshToken) {
      warnings.push({
        code: "TOKENS_EXPIRED",
        message:
          "Password reset tokens and refresh tokens have expired and cannot be restored",
      });
    }

    // Warning: Account lockout status may need resetting
    if (
      document.accountLockedUntil &&
      document.accountLockedUntil > new Date()
    ) {
      warnings.push({
        code: "ACCOUNT_LOCKED",
        message: "Account is locked and may need manual unlocking",
        lockedUntil: document.accountLockedUntil,
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
 * Cascade delete user with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - User ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
userSchema.statics.cascadeDelete = async function (
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

    const user = await this.findById(documentId).session(session).withDeleted();

    if (!user) {
      result.errors.push({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(user, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await user.softDelete(deletedBy, session);
    result.deletedCount++;

    const Task = mongoose.model("Task");
    const TaskActivity = mongoose.model("TaskActivity");
    const TaskComment = mongoose.model("TaskComment");

    // Delete tasks created by user
    const tasks = await Task.find({
      createdBy: documentId,
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

    // Delete task activities created by user
    const activities = await TaskActivity.find({
      createdBy: documentId,
      isDeleted: { $ne: true },
    }).session(session);

    for (const activity of activities) {
      const activityResult = await TaskActivity.cascadeDelete(
        activity._id,
        deletedBy,
        session,
        { ...options, depth: depth + 1 }
      );
      result.deletedCount += activityResult.deletedCount;
      result.warnings.push(...activityResult.warnings);
      result.errors.push(...activityResult.errors);
    }

    // Delete task comments created by user
    const comments = await TaskComment.find({
      createdBy: documentId,
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

    // Remove user from task watchers, assignees, mentions, notification recipients
    await Task.updateMany(
      { watchers: documentId },
      { $pull: { watchers: documentId } },
      { session }
    );

    await Task.updateMany(
      { assignees: documentId },
      { $pull: { assignees: documentId } },
      { session }
    );

    await TaskComment.updateMany(
      { mentions: documentId },
      { $pull: { mentions: documentId } },
      { session }
    );

    const Notification = mongoose.model("Notification");
    await Notification.updateMany(
      { recipients: documentId },
      { $pull: { recipients: documentId } },
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
 * Cascade restore user with all pre-condition validations
 * @param {mongoose.Types.ObjectId} documentId - User ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
userSchema.statics.cascadeRestore = async function (
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
    if (depth >= maxDepth) {
      result.errors.push({
        code: "MAX_DEPTH_EXCEEDED",
        message: `Maximum cascade depth of ${maxDepth} exceeded`,
      });
      return result;
    }

    const user = await this.findById(documentId).session(session).withDeleted();

    if (!user) {
      result.errors.push({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(user, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await user.restore(session);
    result.restoredCount++;

    const Task = mongoose.model("Task");
    const TaskActivity = mongoose.model("TaskActivity");
    const TaskComment = mongoose.model("TaskComment");

    // Restore tasks created by user
    const tasks = await Task.find({
      createdBy: documentId,
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

    // Restore task activities created by user
    const activities = await TaskActivity.find({
      createdBy: documentId,
      isDeleted: true,
    }).session(session);

    for (const activity of activities) {
      const activityResult = await TaskActivity.cascadeRestore(
        activity._id,
        session,
        {
          ...options,
          depth: depth + 1,
        }
      );
      result.restoredCount += activityResult.restoredCount;
      result.warnings.push(...activityResult.warnings);
      result.errors.push(...activityResult.errors);
    }

    // Restore task comments created by user
    const comments = await TaskComment.find({
      createdBy: documentId,
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

const User = mongoose.model("User", userSchema);

export default User;
