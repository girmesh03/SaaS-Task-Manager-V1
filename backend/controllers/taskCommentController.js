import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { TaskComment } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import {
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  COMMENT_ERROR_MESSAGES,
  COMMENT_LOG_MESSAGES,
} from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  safeAbortTransaction,
  escapeRegex,
} from "../utils/helpers.js";
import {
  validateOrganizationScope,
  validateNotDeleted,
  validateIsDeleted,
  findResourceById,
  handleCascadeResult,
} from "../utils/controllerHelpers.js";
import {
  emitCommentAdded,
  emitCommentUpdated,
  emitCommentDeleted,
} from "../utils/socketEmitter.js";
import {
  createCommentNotification,
  createMentionNotification,
} from "../services/notificationService.js";

/**
 * TaskComment Controller
 * Handles task comment management operations: list, read, create, update, delete, restore
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * @typedef {Object} TaskCommentDocument
 * @property {mongoose.Types.ObjectId} _id - Comment ID
 * @property {string} comment - Comment content
 * @property {mongoose.Types.ObjectId} parent - Parent reference (Task/TaskActivity/TaskComment)
 * @property {string} parentModel - Parent model type
 * @property {Array<mongoose.Types.ObjectId>} mentions - Mentioned users
 * @property {mongoose.Types.ObjectId} createdBy - User reference
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} department - Department reference
 * @property {number} depth - Comment depth (0-3)
 * @property {Array<{content: string, editedAt: Date}>} editHistory - Edit history
 * @property {Array<mongoose.Types.ObjectId>} attachments - Attachments
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - Deletion timestamp
 * @property {mongoose.Types.ObjectId} deletedBy - User who deleted
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} save - Save document
 * @property {Function} populate - Populate references
 * @property {Function} toObject - Convert to plain object
 * @property {Function} addEditHistory - Add edit history entry
 */

/**
 * Get all task comments with pagination and filtering
 * Filtered by organization and department scope
 *
 * @route GET /api/tasks/comments
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllTaskComments = asyncHandler(async (req, res, next) => {
  try {
    const {
      organization: userOrganization,
      department: userDepartment,
      isHod,
    } = req.user;

    // Extract query parameters from validated data
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      parent,
      parentModel,
      organization,
      department,
      createdBy,
    } = req.validated.query || {};

    logger.info(COMMENT_LOG_MESSAGES.GET_ALL_REQUEST, {
      userId: req.user.userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        parent,
        parentModel,
        organization,
        department,
        createdBy,
      },
    });

    // Build filter query
    const filter = {};

    // Organization Scope (always applied)
    filter.organization = userOrganization._id;

    // Department Scope
    // If explicit department filter provided, use it (validated by validator/middleware to be within org)
    // If no explicit filter:
    // - If SuperAdmin/Admin/Manager: Can see all departments they have access to
    // - If User (not HOD): Scoped to their department
    if (department) {
      filter.department = department;
    } else if (!isHod && req.user.role === USER_ROLES.USER) {
      filter.department = userDepartment._id;
    }

    // Parent Filter
    if (parent) {
      filter.parent = parent;
    }

    // Parent Model Filter
    if (parentModel) {
      filter.parentModel = parentModel;
    }

    // CreatedBy Filter
    if (createdBy) {
      filter.createdBy = createdBy;
    }

    // Search Filter (Comment Content)
    if (search) {
      filter.comment = { $regex: escapeRegex(search), $options: "i" };
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: [
        {
          path: "parent",
          select:
            "title taskType status priority activity activityType comment",
        },
        {
          path: "createdBy",
          select: "firstName lastName email profilePicture",
        },
        {
          path: "mentions",
          select: "firstName lastName email profilePicture",
        },
        {
          path: "organization",
          select: "name",
        },
        {
          path: "department",
          select: "name",
        },
        {
          path: "attachments",
        },
      ],
      lean: true,
    };

    let query = TaskComment.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await TaskComment.paginate(query, options);

    logger.info(COMMENT_LOG_MESSAGES.GET_ALL_SUCCESS, {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          comments: result.docs,
          pagination: {
            total: result.totalDocs,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
            nextPage: result.nextPage,
            prevPage: result.prevPage,
          },
        },
        COMMENT_LOG_MESSAGES.GET_ALL_SUCCESS
      )
    );
  } catch (error) {
    logger.error(COMMENT_LOG_MESSAGES.GET_ALL_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Get task comment by ID
 * Filtered by organization scope
 *
 * @route GET /api/tasks/comments/:commentId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getTaskCommentById = asyncHandler(async (req, res, next) => {
  try {
    const { taskCommentId } = req.params;

    logger.info(COMMENT_LOG_MESSAGES.GET_BY_ID_REQUEST, {
      userId: req.user.userId,
      commentId: taskCommentId,
      role: req.user.role,
    });

    // Find comment (including soft-deleted) using helper
    const comment = await findResourceById(TaskComment, taskCommentId, {
      includeDeleted: true,
      resourceType: "TaskComment",
    });

    // Populate and convert to plain object
    await comment.populate([
      {
        path: "parent",
        select: "title taskType status priority activity activityType comment",
      },
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "mentions",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "organization",
        select: "name",
      },
      {
        path: "department",
        select: "name",
      },
      {
        path: "attachments",
      },
    ]);
    const commentObj = comment.toObject();

    // Validate organization scope
    validateOrganizationScope(commentObj, req.user, "access", "comment");

    logger.info(COMMENT_LOG_MESSAGES.GET_BY_ID_SUCCESS, {
      userId: req.user.userId,
      taskCommentId: commentObj._id,
      depth: commentObj.depth,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { comment: commentObj },
          COMMENT_LOG_MESSAGES.GET_BY_ID_SUCCESS
        )
      );
  } catch (error) {
    logger.error(COMMENT_LOG_MESSAGES.GET_BY_ID_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      commentId: req.params.taskCommentId,
    });
    next(error);
  }
});

/**
 * Create new task comment
 * Transactional
 * Filtered by organization scope
 * Validates depth does not exceed 3 levels
 *
 * @route POST /api/tasks/comments
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createTaskComment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization: userOrganization, userId } = req.user;
    const commentData = req.validated.body;

    logger.info(COMMENT_LOG_MESSAGES.CREATE_REQUEST, {
      userId,
      role: req.user.role,
      parentModel: commentData.parentModel,
      parent: commentData.parent,
    });

    // Validate organization scope
    if (commentData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        COMMENT_ERROR_MESSAGES.ORGANIZATION_MISMATCH,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Create comment with session (depth validation happens in pre-save hook)
    const comment = new TaskComment(commentData);
    await comment.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await comment.populate([
      {
        path: "parent",
        select: "title taskType status priority activity activityType comment",
      },
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "mentions",
        select: "firstName lastName email profilePicture",
      },
    ]);

    logger.info(COMMENT_LOG_MESSAGES.CREATE_SUCCESS, {
      userId,
      taskCommentId: comment._id,
      depth: comment.depth,
      operationType: "CREATE",
      resourceType: "TASK_COMMENT",
    });

    // Emit Socket.IO event for real-time updates
    const recipientIds = comment.mentions || [];
    emitCommentAdded(comment, comment.organization, recipientIds);

    // Create notification for comment added
    if (comment.parent && comment.parentModel) {
      const parentTitle =
        comment.parent.title ||
        comment.parent.activity ||
        comment.parent.comment ||
        "Unknown";
      const commentPreview = comment.comment.substring(0, 100);

      await createCommentNotification({
        commentId: comment._id,
        parentId: comment.parent._id || comment.parent,
        parentModel: comment.parentModel,
        parentTitle,
        recipientIds,
        commentedBy: userId,
        commentedByName: `${req.user.firstName} ${req.user.lastName}`,
        commentPreview,
        organizationId: comment.organization,
        departmentId: comment.department,
      });
    }

    // Create notification for mentions
    if (comment.mentions && comment.mentions.length > 0) {
      const entityTitle =
        comment.parent?.title ||
        comment.parent?.activity ||
        comment.parent?.comment ||
        "Unknown";
      const contextPreview = comment.comment.substring(0, 100);

      await createMentionNotification({
        entityId: comment._id,
        entityModel: "TaskComment",
        entityTitle,
        mentionedUserIds: comment.mentions.map((m) => m._id || m),
        mentionedBy: userId,
        mentionedByName: `${req.user.firstName} ${req.user.lastName}`,
        contextPreview,
        organizationId: comment.organization,
        departmentId: comment.department,
      });
    }

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        formatSuccessResponse({ comment }, COMMENT_LOG_MESSAGES.CREATE_SUCCESS)
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(COMMENT_LOG_MESSAGES.CREATE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Update task comment
 * Transactional
 * Filtered by organization scope
 * Tracks edit history
 *
 * @route PUT /api/tasks/comments/:commentId
 * @access Private (SuperAdmin, Admin, Manager, User - own comments)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateTaskComment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskCommentId } = req.params;
    const updateData = req.validated.body;

    logger.info(COMMENT_LOG_MESSAGES.UPDATE_REQUEST, {
      userId: req.user.userId,
      commentId: taskCommentId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Find comment with session
    const comment = await findResourceById(TaskComment, taskCommentId, {
      session,
      resourceType: "TaskComment",
    });

    // Validate comment is not soft-deleted
    validateNotDeleted(comment, "update", "comment");

    // Validate organization scope
    validateOrganizationScope(comment, req.user, "update", "comment");

    // Check ownership for User role (Users can only edit their own comments)
    // Managers/Admins/SuperAdmins can edit any comment in their scope
    if (
      req.user.role === USER_ROLES.USER &&
      comment.createdBy.toString() !== req.user.userId
    ) {
      throw new CustomError(
        "You can only update comments you created",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Track edit history if comment content is being updated
    if (updateData.comment && updateData.comment !== comment.comment) {
      comment.addEditHistory();
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      comment[key] = updateData[key];
    });

    // Save with session
    await comment.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await comment.populate([
      {
        path: "parent",
        select: "title taskType status priority activity activityType comment",
      },
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "mentions",
        select: "firstName lastName email profilePicture",
      },
    ]);

    logger.info(COMMENT_LOG_MESSAGES.UPDATE_SUCCESS, {
      userId: req.user.userId,
      taskCommentId: comment._id,
      operationType: "UPDATE",
      resourceType: "TASK_COMMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitCommentUpdated(comment, comment.organization);

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse({ comment }, COMMENT_LOG_MESSAGES.UPDATE_SUCCESS)
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(COMMENT_LOG_MESSAGES.UPDATE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      commentId: req.params.taskCommentId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Soft delete task comment with cascade operations
 * Filtered by organization scope
 * Recursively deletes child comments
 *
 * @route DELETE /api/tasks/comments/:commentId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteTaskComment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskCommentId } = req.params;
    const { userId } = req.user;

    logger.info(COMMENT_LOG_MESSAGES.DELETE_REQUEST, {
      userId,
      commentId: taskCommentId,
      role: req.user.role,
    });

    // Find comment
    const comment = await findResourceById(TaskComment, taskCommentId, {
      session,
      resourceType: "TaskComment",
    });

    // Validate not already deleted
    if (comment.isDeleted) {
      throw new CustomError(
        COMMENT_ERROR_MESSAGES.ALREADY_DELETED,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope
    validateOrganizationScope(comment, req.user, "delete", "comment");

    // Perform cascade delete with validation
    const cascadeResult = await TaskComment.cascadeDelete(
      taskCommentId,
      userId,
      session,
      {
        skipValidation: false,
        force: false,
      }
    );

    // Handle cascade result
    handleCascadeResult(
      cascadeResult,
      "delete",
      userId,
      logger,
      "TASK_COMMENT"
    );

    // Commit transaction
    await session.commitTransaction();

    logger.info(COMMENT_LOG_MESSAGES.DELETE_SUCCESS, {
      userId,
      commentId: taskCommentId,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "TASK_COMMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitCommentDeleted(taskCommentId, comment.organization);

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          commentId: taskCommentId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        COMMENT_LOG_MESSAGES.DELETE_SUCCESS
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(COMMENT_LOG_MESSAGES.DELETE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      commentId: req.params.taskCommentId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Restore soft-deleted task comment with cascade operations
 * Filtered by organization scope
 * Recursively restores child comments
 *
 * @route PUT /api/tasks/comments/:commentId/restore
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreTaskComment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskCommentId } = req.params;
    const { userId } = req.user;

    logger.info(COMMENT_LOG_MESSAGES.RESTORE_REQUEST, {
      userId,
      commentId: taskCommentId,
      role: req.user.role,
    });

    // Find comment (including soft-deleted)
    const comment = await findResourceById(TaskComment, taskCommentId, {
      includeDeleted: true,
      session,
      resourceType: "TaskComment",
    });

    // Validate comment is deleted
    validateIsDeleted(comment, "comment");

    // Validate organization scope
    validateOrganizationScope(comment, req.user, "restore", "comment");

    // Perform cascade restore with validation
    const cascadeResult = await TaskComment.cascadeRestore(
      taskCommentId,
      session,
      {
        skipValidation: false,
        validateParents: true,
      }
    );

    // Handle cascade result
    handleCascadeResult(
      cascadeResult,
      "restore",
      userId,
      logger,
      "TASK_COMMENT"
    );

    // Commit transaction
    await session.commitTransaction();

    logger.info(COMMENT_LOG_MESSAGES.RESTORE_SUCCESS, {
      userId,
      commentId: taskCommentId,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "TASK_COMMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitCommentUpdated(comment, comment.organization);

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          commentId: taskCommentId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        COMMENT_LOG_MESSAGES.RESTORE_SUCCESS
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(COMMENT_LOG_MESSAGES.RESTORE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      commentId: req.params.taskCommentId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

export default {
  getAllTaskComments,
  getTaskCommentById,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
  restoreTaskComment,
};
