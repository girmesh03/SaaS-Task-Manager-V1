import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  ATTACHMENT_VALIDATION,
  CLOUDINARY_VALIDATION,
  FILE_TYPES,
  PARENT_MODEL_TYPES,
} from "../utils/constants.js";

/**
 * Attachment Model
 *
 * File attachments for tasks, activities, and comments
 * Uploaded to Cloudinary, URL stored in database
 *
 * TTL: 30 days
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.10, 15.11, 15.12
 */

const attachmentSchema = new mongoose.Schema(
  {
    // File Name (Requirement 15.1)
    filename: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      minlength: [
        ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH,
        `File name must be at least ${ATTACHMENT_VALIDATION.FILE_NAME.MIN_LENGTH} character`,
      ],
      maxlength: [
        ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH,
        `File name must not exceed ${ATTACHMENT_VALIDATION.FILE_NAME.MAX_LENGTH} characters`,
      ],
    },

    // File URL (Cloudinary) (Requirement 15.2)
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
      match: [
        CLOUDINARY_VALIDATION.URL_PATTERN,
        "Please provide a valid Cloudinary URL",
      ],
    },

    // File Type (Requirement 15.3)
    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: {
        values: Object.values(FILE_TYPES),
        message: "Invalid file type",
      },
    },

    // File Size (bytes) (Requirement 15.4)
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size must be positive"],
      max: [
        ATTACHMENT_VALIDATION.FILE_SIZE.MAX,
        `File size must not exceed ${ATTACHMENT_VALIDATION.FILE_SIZE.MAX} bytes`,
      ],
    },

    // Parent Reference (Requirement 15.5)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Parent reference is required"],
      refPath: "parentModel",
    },

    // Parent Model (Requirement 15.5)
    parentModel: {
      type: String,
      required: [true, "Parent model is required"],
      enum: {
        values: Object.values(PARENT_MODEL_TYPES),
        message: "Invalid parent model",
      },
    },

    // Uploaded By (Requirement 15.6)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploaded by user is required"],
    },

    // Department (Requirement 15.6)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    // Organization (Requirement 15.6)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes within organization and department scope
attachmentSchema.index(
  { organization: 1, department: 1, parent: 1, parentModel: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
attachmentSchema.index(
  { organization: 1, department: 1, uploadedBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
attachmentSchema.index(
  { organization: 1, department: 1, fileType: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
attachmentSchema.index(
  { organization: 1, department: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
attachmentSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 15.10, 15.11)
attachmentSchema.plugin(mongoosePaginate); // Pagination plugin

// Validation middleware (Requirement 15.12)
attachmentSchema.pre("save", async function (next) {
  try {
    // Get session from this.$session() if available
    const session = this.$session();

    // Validate file extension matches allowed extensions
    const fileExtension = this.filename
      .substring(this.filename.lastIndexOf("."))
      .toLowerCase();
    if (!ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error(
        `File extension ${fileExtension} is not allowed. Allowed extensions: ${ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.join(
          ", "
        )}`
      );
    }

    // Validate uploadedBy, department, and organization belong to same context
    if (this.isNew || this.isModified("uploadedBy")) {
      const User = mongoose.model("User");
      const user = await User.findById(this.uploadedBy)
        .select("organization department")
        .session(session);

      if (!user) {
        throw new Error("Uploaded by user not found");
      }

      if (user.organization.toString() !== this.organization.toString()) {
        throw new Error(
          "Uploaded by user must belong to the same organization"
        );
      }

      if (user.department.toString() !== this.department.toString()) {
        throw new Error("Uploaded by user must belong to the same department");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Attachment = mongoose.model("Attachment", attachmentSchema);

export default Attachment;
