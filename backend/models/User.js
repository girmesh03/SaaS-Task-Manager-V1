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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

const User = mongoose.model("User", userSchema);

export default User;
