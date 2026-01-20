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
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
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

// Pre-save middleware to validate user belongs to same organization (Requirement 14.12)
vendorSchema.pre("save", async function (next) {
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

    // Validate user belongs to same organization (Requirement 14.12)
    if (user.organization.toString() !== this.organization.toString()) {
      return next(new Error("User must belong to the same organization"));
    }

    next();
  } catch (error) {
    next(error);
  }
});

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

/**
 * Validate deletion pre-conditions for Vendor
 * @param {mongoose.Document} document - Vendor document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
vendorSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const ProjectTask = mongoose.model("ProjectTask");

    // Check usage in ProjectTasks
    const projectTaskCount = await ProjectTask.countDocuments({
      vendor: document._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (projectTaskCount > 0) {
      warnings.push({
        code: "VENDOR_USED_IN_PROJECT_TASKS",
        message: `Vendor is referenced in ${projectTaskCount} project tasks. Vendor relationship will be maintained during soft delete.`,
        projectTaskCount,
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
 * Validate restoration pre-conditions for Vendor
 * @param {mongoose.Document} document - Vendor document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
vendorSchema.statics.validateRestoration = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    const Organization = mongoose.model("Organization");
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
        message: "Cannot restore vendor because organization is deleted",
        field: "organization",
      });
    }

    // Pre-condition 2: CreatedBy user must exist and NOT be deleted
    const createdBy = await User.findById(document.createdBy)
      .session(session)
      .withDeleted();

    if (!createdBy) {
      errors.push({
        code: "CREATED_BY_NOT_FOUND",
        message: "Vendor creator not found",
        field: "createdBy",
      });
    } else if (createdBy.isDeleted) {
      errors.push({
        code: "CREATED_BY_DELETED",
        message: "Cannot restore vendor because creator is deleted",
        field: "createdBy",
      });
    }

    // Pre-condition 3: Check for duplicate name within organization
    const nameConflict = await this.findOne({
      name: document.name,
      organization: document.organization,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (nameConflict) {
      errors.push({
        code: "DUPLICATE_NAME",
        message: `Another vendor with name '${document.name}' already exists in this organization`,
        field: "name",
        conflictId: nameConflict._id,
      });
    }

    // Pre-condition 4: Check for duplicate email within organization
    const emailConflict = await this.findOne({
      email: document.email,
      organization: document.organization,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (emailConflict) {
      errors.push({
        code: "DUPLICATE_EMAIL",
        message: `Another vendor with email '${document.email}' already exists in this organization`,
        field: "email",
        conflictId: emailConflict._id,
      });
    }

    // Pre-condition 5: Check for duplicate phone within organization
    const phoneConflict = await this.findOne({
      phone: document.phone,
      organization: document.organization,
      _id: { $ne: document._id },
      isDeleted: { $ne: true },
    }).session(session);

    if (phoneConflict) {
      errors.push({
        code: "DUPLICATE_PHONE",
        message: `Another vendor with phone '${document.phone}' already exists in this organization`,
        field: "phone",
        conflictId: phoneConflict._id,
      });
    }

    // Pre-condition 6: Email format validation
    if (!VENDOR_VALIDATION.EMAIL.PATTERN.test(document.email)) {
      errors.push({
        code: "INVALID_EMAIL_FORMAT",
        message: "Invalid email format",
        field: "email",
      });
    }

    // Pre-condition 7: Phone format validation
    if (!VENDOR_VALIDATION.PHONE.PATTERN.test(document.phone)) {
      errors.push({
        code: "INVALID_PHONE_FORMAT",
        message: "Invalid phone format",
        field: "phone",
      });
    }

    // Warning: Rating may be outdated
    if (document.rating) {
      warnings.push({
        code: "RATING_OUTDATED",
        message: "Vendor rating may be outdated after deletion period",
        field: "rating",
        rating: document.rating,
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
 * Cascade delete Vendor
 * No children to cascade (leaf node)
 * @param {mongoose.Types.ObjectId} documentId - Vendor ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
vendorSchema.statics.cascadeDelete = async function (
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
    const vendor = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!vendor) {
      result.errors.push({
        code: "VENDOR_NOT_FOUND",
        message: "Vendor not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(vendor, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await vendor.softDelete(deletedBy, session);
    result.deletedCount++;

    // Cascade delete attachments if parentModel='Vendor'
    const Attachment = mongoose.model("Attachment");
    const attachments = await Attachment.find({
      parent: documentId,
      parentModel: "Vendor",
      isDeleted: { $ne: true },
    }).session(session);

    for (const attachment of attachments) {
      await attachment.softDelete(deletedBy, session);
      result.deletedCount++;
    }

    // ProjectTasks maintain vendor reference during soft delete

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
 * Cascade restore Vendor
 * Restores attachments if parentModel='Vendor'
 * @param {mongoose.Types.ObjectId} documentId - Vendor ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
vendorSchema.statics.cascadeRestore = async function (
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
    const vendor = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!vendor) {
      result.errors.push({
        code: "VENDOR_NOT_FOUND",
        message: "Vendor not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(vendor, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await vendor.restore(session);
    result.restoredCount++;

    const Attachment = mongoose.model("Attachment");

    // Restore attachments if parentModel='Vendor'
    const attachments = await Attachment.find({
      parent: documentId,
      parentModel: "Vendor",
      isDeleted: true,
    }).session(session);

    for (const attachment of attachments) {
      await attachment.restore(session);
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

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
