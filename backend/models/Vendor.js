import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import { VENDOR_VALIDATION, VENDOR_STATUS } from "../utils/constants.js";

/**
 * Vendor Model
 *
 * External clients/vendors who complete outsourced ProjectTasks
 * Name, email, and phone must be unique within organization
 *
 * TTL: 90 days
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.12
 */

const vendorSchema = new mongoose.Schema(
  {
    // Name (Requirement 14.1, 14.2)
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
      minlength: [
        VENDOR_VALIDATION.NAME.MIN_LENGTH,
        `Vendor name must be at least ${VENDOR_VALIDATION.NAME.MIN_LENGTH} characters`,
      ],
      maxlength: [
        VENDOR_VALIDATION.NAME.MAX_LENGTH,
        `Vendor name must not exceed ${VENDOR_VALIDATION.NAME.MAX_LENGTH} characters`,
      ],
    },

    // Email (Requirement 14.1, 14.3)
    email: {
      type: String,
      required: [true, "Vendor email is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        VENDOR_VALIDATION.EMAIL.MAX_LENGTH,
        `Email must not exceed ${VENDOR_VALIDATION.EMAIL.MAX_LENGTH} characters`,
      ],
      match: [
        VENDOR_VALIDATION.EMAIL.PATTERN,
        "Please provide a valid email address",
      ],
    },

    // Phone (Requirement 14.1, 14.4)
    phone: {
      type: String,
      required: [true, "Vendor phone is required"],
      trim: true,
      minlength: [
        VENDOR_VALIDATION.PHONE.MIN_LENGTH,
        `Phone must be at least ${VENDOR_VALIDATION.PHONE.MIN_LENGTH} characters`,
      ],
      maxlength: [
        VENDOR_VALIDATION.PHONE.MAX_LENGTH,
        `Phone must not exceed ${VENDOR_VALIDATION.PHONE.MAX_LENGTH} characters`,
      ],
      match: [
        VENDOR_VALIDATION.PHONE.PATTERN,
        "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)",
      ],
    },

    // Organization (Requirement 14.1)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },

    // Created By (Requirement 14.1)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Rating (Requirement 14.10)
    rating: {
      type: Number,
      min: [
        VENDOR_VALIDATION.RATING.MIN,
        `Rating must be at least ${VENDOR_VALIDATION.RATING.MIN}`,
      ],
      max: [
        VENDOR_VALIDATION.RATING.MAX,
        `Rating must not exceed ${VENDOR_VALIDATION.RATING.MAX}`,
      ],
      default: null,
    },

    // Status (Requirement 14.11)
    status: {
      type: String,
      enum: {
        values: Object.values(VENDOR_STATUS),
        message: "Invalid vendor status",
      },
      default: VENDOR_STATUS.ACTIVE,
    },

    // Address (Requirement 14.1)
    address: {
      type: String,
      trim: true,
      maxlength: [
        VENDOR_VALIDATION.ADDRESS.MAX_LENGTH,
        `Address must not exceed ${VENDOR_VALIDATION.ADDRESS.MAX_LENGTH} characters`,
      ],
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (Requirement 14.2, 14.3, 14.4)
// Compound unique indexes for name, email, phone + organization (only for non-deleted documents)
vendorSchema.index(
  { organization: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

vendorSchema.index(
  { organization: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

vendorSchema.index(
  { organization: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Additional indexes within organization scope
vendorSchema.index(
  { organization: 1, status: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
vendorSchema.index(
  { organization: 1, rating: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
vendorSchema.index(
  { organization: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
vendorSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 14.7, 14.8)
vendorSchema.plugin(mongoosePaginate); // Pagination plugin

// Virtual for project task count
vendorSchema.virtual("projectTaskCount", {
  ref: "ProjectTask",
  localField: "_id",
  foreignField: "vendor",
  count: true,
});

// Virtual for attachment count
vendorSchema.virtual("attachmentCount", {
  ref: "Attachment",
  localField: "_id",
  foreignField: "parent",
  count: true,
});

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
