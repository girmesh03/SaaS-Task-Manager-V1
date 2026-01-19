import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import softDeletePlugin from "./plugins/softDelete.js";
import {
  COMMENT_VALIDATION,
  COMMENT_MAX_DEPTH,
  PARENT_MODEL_TYPES,
} from "../utils/constants.js";

/**
 * TaskComment Model
 *
 * Threaded comments on tasks, activities, and other comments
 * Max depth 3 levels (comment → reply → reply to reply)
 *
 * Cascade Delete: Child Comments (recursive), Attachments
 * TTL: 180 days
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12
 */

const taskCommentSchema = new mongoose.Schema(
  {
    // Comment Content (Requirement 12.1)
    comment: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [
        COMMENT_VALIDATION.CONTENT.MIN_LENGTH,
        `Comment must be at least ${COMMENT_VALIDATION.CONTENT.MIN_LENGTH} characters`,
      ],
      maxlength: [
        COMMENT_VALIDATION.CONTENT.MAX_LENGTH,
        `Comment must not exceed ${COMMENT_VALIDATION.CONTENT.MAX_LENGTH} characters`,
      ],
    },

    // Parent Reference (polymorphic) (Requirement 12.2)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "parentModel",
      required: [true, "Parent reference is required"],
    },

    parentModel: {
      type: String,
      required: [true, "Parent model is required"],
      enum: {
        values: Object.values(PARENT_MODEL_TYPES),
        message: "Invalid parent model",
      },
    },

    // Mentions (array max 5) (Requirement 12.10)
    mentions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator: function (mentions) {
          return mentions.length <= COMMENT_VALIDATION.MENTIONS.MAX_COUNT;
        },
        message: `Maximum ${COMMENT_VALIDATION.MENTIONS.MAX_COUNT} mentions allowed`,
      },
      default: [],
    },

    // Created By (Requirement 12.1)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },

    // Department and Organization (Requirement 12.1)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },

    // Depth (for threading validation) (Requirement 12.3)
    depth: {
      type: Number,
      default: 0,
      min: [0, "Depth cannot be negative"],
      max: [COMMENT_MAX_DEPTH, `Maximum depth is ${COMMENT_MAX_DEPTH}`],
    },

    // Edit History (Requirement 12.11)
    editHistory: {
      type: [
        {
          content: {
            type: String,
            required: true,
          },
          editedAt: {
            type: Date,
            required: true,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (Requirement 12.6)
// Indexes within organization and department scope
taskCommentSchema.index(
  { organization: 1, department: 1, parent: 1, parentModel: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskCommentSchema.index(
  { organization: 1, department: 1, createdBy: 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Compound indexes for common queries
taskCommentSchema.index(
  { parent: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);
taskCommentSchema.index(
  { organization: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Apply plugins
taskCommentSchema.plugin(softDeletePlugin); // Soft delete plugin (Requirement 12.7, 12.8)
taskCommentSchema.plugin(mongoosePaginate); // Pagination plugin

// Pre-save middleware to validate depth and mentions (Requirement 12.3, 12.4, 12.10)
taskCommentSchema.pre("save", async function (next) {
  try {
    // Get session from this.$session() if available
    const session = this.$session();

    // Validate depth for threaded comments (Requirement 12.3)
    if (this.parentModel === "TaskComment") {
      // Import TaskComment model dynamically to avoid circular dependency
      const TaskComment = mongoose.model("TaskComment");

      // Find the parent comment
      const parentComment = await TaskComment.findById(this.parent).session(
        session
      );

      if (!parentComment) {
        return next(new Error("Parent comment not found"));
      }

      // Calculate depth (parent depth + 1)
      this.depth = parentComment.depth + 1;

      // Validate depth does not exceed max (Requirement 12.3)
      if (this.depth > COMMENT_MAX_DEPTH) {
        return next(
          new Error(`Comment depth cannot exceed ${COMMENT_MAX_DEPTH} levels`)
        );
      }
    } else {
      // Top-level comment (on Task or TaskActivity)
      this.depth = 0;
    }

    // Validate user belongs to same organization (Requirement 12.4)
    const User = mongoose.model("User");
    const user = await User.findById(this.createdBy).session(session);

    if (!user) {
      return next(new Error("User not found"));
    }

    if (user.organization.toString() !== this.organization.toString()) {
      return next(new Error("User must belong to the same organization"));
    }

    // Validate mentions belong to same organization (Requirement 12.10)
    if (this.isModified("mentions") && this.mentions.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $in: this.mentions },
      }).session(session);

      const invalidMentions = mentionedUsers.filter(
        (mentionedUser) =>
          mentionedUser.organization.toString() !== this.organization.toString()
      );

      if (invalidMentions.length > 0) {
        return next(
          new Error("All mentioned users must belong to the same organization")
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to add edit history (Requirement 12.11)
taskCommentSchema.methods.addEditHistory = function () {
  this.editHistory.push({
    content: this.comment,
    editedAt: new Date(),
  });
};

// Virtual for child comment count
taskCommentSchema.virtual("childCommentCount", {
  ref: "TaskComment",
  localField: "_id",
  foreignField: "parent",
  count: true,
});

// Virtual to check if comment is edited
taskCommentSchema.virtual("isEdited").get(function () {
  return this.editHistory.length > 0;
});

const TaskComment = mongoose.model("TaskComment", taskCommentSchema);

export default TaskComment;
