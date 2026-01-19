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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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
