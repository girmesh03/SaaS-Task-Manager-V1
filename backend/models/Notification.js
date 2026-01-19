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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
