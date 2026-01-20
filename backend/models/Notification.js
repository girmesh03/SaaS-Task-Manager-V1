import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  NOTIFICATION_VALIDATION,
  NOTIFICATION_TYPES,
  TTL_EXPIRY,
  NOTIFICATION_TITLE_VALIDATION,
  ENTITY_MODEL_TYPES,
} from "../utils/constants.js";

/**
 * Notification Model
 *
 * System notifications for users
 * Automatically expire after 30 days
 *
 * TTL: 30 days
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12
 */

const notificationSchema = new mongoose.Schema(
  {
    // Title (Requirement 16.1)
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [
        NOTIFICATION_TITLE_VALIDATION.MAX_LENGTH,
        `Title must not exceed ${NOTIFICATION_TITLE_VALIDATION.MAX_LENGTH} characters`,
      ],
    },

    // Message (Requirement 16.1)
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      minlength: [
        NOTIFICATION_VALIDATION.MESSAGE.MIN_LENGTH,
        `Message must be at least ${NOTIFICATION_VALIDATION.MESSAGE.MIN_LENGTH} character`,
      ],
      maxlength: [
        NOTIFICATION_VALIDATION.MESSAGE.MAX_LENGTH,
        `Message must not exceed ${NOTIFICATION_VALIDATION.MESSAGE.MAX_LENGTH} characters`,
      ],
    },

    // Type (Requirement 16.2)
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: {
        values: Object.values(NOTIFICATION_TYPES),
        message: "Invalid notification type",
      },
    },

    // Read Status (Requirement 16.3)
    isRead: {
      type: Boolean,
      default: false,
    },

    // Recipients (Requirement 16.4)
    recipients: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: [true, "At least one recipient is required"],
      validate: {
        validator: function (recipients) {
          return (
            recipients.length >= NOTIFICATION_VALIDATION.RECIPIENTS.MIN_COUNT &&
            recipients.length <= NOTIFICATION_VALIDATION.RECIPIENTS.MAX_COUNT
          );
        },
        message: `Recipients must be between ${NOTIFICATION_VALIDATION.RECIPIENTS.MIN_COUNT} and ${NOTIFICATION_VALIDATION.RECIPIENTS.MAX_COUNT}`,
      },
    },

    // Entity Reference (Requirement 16.5)
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "entityModel",
      default: null,
    },

    // Entity Model (Requirement 16.5)
    entityModel: {
      type: String,
      enum: {
        values: Object.values(ENTITY_MODEL_TYPES),
        message: "Invalid entity model",
      },
      default: null,
    },

    // Organization (Requirement 16.6)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },

    // Department (Requirement 16.6)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    // Expiry Date (Requirement 16.7)
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + TTL_EXPIRY.NOTIFICATIONS * 1000);
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

// Indexes within organization and department scope
notificationSchema.index(
  { organization: 1, department: 1, recipients: 1, isRead: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
notificationSchema.index(
  { organization: 1, department: 1, type: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
notificationSchema.index(
  { organization: 1, department: 1, entity: 1, entityModel: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
notificationSchema.index(
  { organization: 1, department: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
// TTL index for automatic expiry (no partialFilterExpression needed)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Apply plugins
notificationSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 16.10, 16.11)
notificationSchema.plugin(mongoosePaginate); // Pagination plugin

// Validation middleware (Requirement 16.12)
notificationSchema.pre("save", async function (next) {
  try {
    // Get session from this.$session() if available
    const session = this.$session();

    // Validate recipients belong to same organization and department
    if (this.isNew || this.isModified("recipients")) {
      const User = mongoose.model("User");
      const users = await User.find({
        _id: { $in: this.recipients },
      })
        .select("organization department")
        .session(session);

      if (users.length !== this.recipients.length) {
        throw new Error("One or more recipients not found");
      }

      // Check all recipients belong to same organization
      const invalidOrgUsers = users.filter(
        (user) => user.organization.toString() !== this.organization.toString()
      );
      if (invalidOrgUsers.length > 0) {
        throw new Error("All recipients must belong to the same organization");
      }

      // Check all recipients belong to same department
      const invalidDeptUsers = users.filter(
        (user) => user.department.toString() !== this.department.toString()
      );
      if (invalidDeptUsers.length > 0) {
        throw new Error("All recipients must belong to the same department");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static method to mark as read (Requirement 16.8)
notificationSchema.statics.markAsRead = async function (
  notificationId,
  session = null
) {
  return this.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true, session }
  );
};

// Static method to batch mark as read (Requirement 16.9)
notificationSchema.statics.batchMarkAsRead = async function (
  notificationIds,
  session = null
) {
  return this.updateMany(
    { _id: { $in: notificationIds } },
    { isRead: true },
    { session }
  );
};

/**
 * Validate deletion pre-conditions for Notification
 * @param {mongoose.Document} document - Notification document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
notificationSchema.statics.validateDeletion = async function (
  document,
  session = null
) {
  const errors = [];
  const warnings = [];

  try {
    // Warning: TTL check
    const daysSinceCreation = Math.floor(
      (new Date() - document.createdAt) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > 20) {
      warnings.push({
        code: "APPROACHING_TTL",
        message: `Notification is ${daysSinceCreation} days old (TTL: 30 days)`,
        daysSinceCreation,
      });
    }

    // Warning: Expiry check
    if (document.expiresAt && document.expiresAt < new Date()) {
      warnings.push({
        code: "NOTIFICATION_EXPIRED",
        message: "Notification has already expired",
        expiresAt: document.expiresAt,
      });
    }

    // Note: Notifications are auto-cleaned by TTL after user read and when TTL expires
    warnings.push({
      code: "AUTO_CLEANUP",
      message:
        "Notifications are auto-cleaned by TTL after 30 days. Manual deletion is optional.",
    });

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
 * Validate restoration pre-conditions for Notification
 * @param {mongoose.Document} document - Notification document
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
notificationSchema.statics.validateRestoration = async function (
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
        message: "Cannot restore notification because organization is deleted",
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
        message: "Cannot restore notification because department is deleted",
        field: "department",
      });
    }

    // Pre-condition 3: All recipients must exist and NOT be deleted
    if (document.recipients && document.recipients.length > 0) {
      const recipients = await User.find({
        _id: { $in: document.recipients },
      })
        .session(session)
        .withDeleted();

      const deletedRecipients = recipients.filter((r) => r.isDeleted);
      if (deletedRecipients.length > 0) {
        errors.push({
          code: "RECIPIENTS_DELETED",
          message: `${deletedRecipients.length} recipients are deleted and cannot receive notification`,
          deletedRecipientIds: deletedRecipients.map((r) => r._id),
        });
      }

      const invalidRecipients = recipients.filter(
        (r) =>
          r.organization.toString() !== document.organization.toString() ||
          r.department.toString() !== document.department.toString()
      );

      if (invalidRecipients.length > 0) {
        errors.push({
          code: "RECIPIENTS_WRONG_ORG_DEPT",
          message:
            "All recipients must belong to the same organization and department",
          field: "recipients",
        });
      }
    }

    // Pre-condition 4: Entity reference validation (if exists)
    if (document.entity && document.entityModel) {
      const EntityModel = mongoose.model(document.entityModel);
      const entity = await EntityModel.findById(document.entity)
        .session(session)
        .withDeleted();

      if (!entity) {
        warnings.push({
          code: "ENTITY_NOT_FOUND",
          message: `Referenced ${document.entityModel} not found`,
          field: "entity",
        });
      } else if (entity.isDeleted) {
        warnings.push({
          code: "ENTITY_DELETED",
          message: `Referenced ${document.entityModel} is deleted`,
          field: "entity",
          entityId: entity._id,
        });
      }
    }

    // Pre-condition 5: Expiry date validation
    if (document.expiresAt && document.expiresAt < new Date()) {
      errors.push({
        code: "NOTIFICATION_EXPIRED",
        message: "Cannot restore notification because it has expired",
        field: "expiresAt",
        expiresAt: document.expiresAt,
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
 * Cascade delete Notification
 * No children to cascade (leaf node, auto-cleaned by TTL)
 * @param {mongoose.Types.ObjectId} documentId - Notification ID
 * @param {mongoose.Types.ObjectId} deletedBy - User performing deletion
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, deletedCount: number, warnings: Array, errors: Array}>}
 */
notificationSchema.statics.cascadeDelete = async function (
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
    const notification = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!notification) {
      result.errors.push({
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateDeletion(notification, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid && !force) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await notification.softDelete(deletedBy, session);
    result.deletedCount++;

    // No children to cascade delete (leaf node)
    // Notifications are auto-cleaned by TTL after 30 days

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
 * Cascade restore Notification
 * No children to cascade (leaf node)
 * @param {mongoose.Types.ObjectId} documentId - Notification ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Object} options - Options for cascade operation
 * @returns {Promise<{success: boolean, restoredCount: number, warnings: Array, errors: Array}>}
 */
notificationSchema.statics.cascadeRestore = async function (
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
    const notification = await this.findById(documentId)
      .session(session)
      .withDeleted();

    if (!notification) {
      result.errors.push({
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found",
      });
      return result;
    }

    if (!skipValidation) {
      const validation = await this.validateRestoration(notification, session);
      result.warnings.push(...validation.warnings);

      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
    }

    await notification.restore(session);
    result.restoredCount++;

    // No children to cascade restore (leaf node)

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

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
