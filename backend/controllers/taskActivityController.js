import mongoose from "mongoose";
import { TaskActivity, Task } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import {
  HTTP_STATUS,
  ERROR_CODES,
  ACTIVITY_ERROR_MESSAGES,
  ACTIVITY_LOG_MESSAGES,
} from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  safeAbortTransaction,
} from "../utils/helpers.js";
import {
  validateOrganizationScope,
  validateNotDeleted,
  validateIsDeleted,
  findResourceById,
  handleCascadeResult,
} from "../utils/controllerHelpers.js";

/**
 * TaskActivity Controller
 * Handles task activity management operations: list, read, create, update, delete, restore
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11
 */

/**
 * Get all task activities with pagination and filtering
 * Filtered by organization, if department provided and isHod otherwise req.user.department._id scope
 *
 * @route GET /api/task-activities
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllTaskActivities = async (req, res, next) => {
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
      activityType,
      task,
      organization,
      department,
      createdBy,
    } = req.validated.query || {};

    logger.info(ACTIVITY_LOG_MESSAGES.GET_ALL_REQUEST, {
      userId: req.user.userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        activityType,
        task,
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
    // - If SuperAdmin/Admin/Manager: Can see all departments they have access to (platform logic or just org scope) -> usually just org scope is enough if they have permission
    // - If User (not HOD): Scoped to their department
    if (department) {
      filter.department = department;
    } else if (!isHod && req.user.role === "User") {
      filter.department = userDepartment._id;
    }

    // Task Filter
    if (task) {
      filter.task = task;
    }

    // Activity Type Filter
    if (activityType) {
      filter.activityType = activityType;
    }

    // CreatedBy Filter
    if (createdBy) {
      filter.createdBy = createdBy;
    }

    // Search Filter (Description)
    if (search) {
      filter.activity = { $regex: search, $options: "i" };
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
          path: "task",
          select: "title taskType status priority",
        },
        {
          path: "createdBy",
          select: "firstName lastName email profilePicture",
        },
        {
          path: "materials.material",
          select: "name unit category",
        },
        {
          path: "organization",
          select: "name",
        },
        {
          path: "department",
          select: "name",
        },
      ],
      lean: true,
    };

    let query = TaskActivity.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await TaskActivity.paginate(query, options);

    logger.info(ACTIVITY_LOG_MESSAGES.GET_ALL_SUCCESS, {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          activities: result.docs,
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
        ACTIVITY_LOG_MESSAGES.GET_ALL_SUCCESS
      )
    );
  } catch (error) {
    logger.error(ACTIVITY_LOG_MESSAGES.GET_ALL_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
};

/**
 * Get task activity by ID
 * Filtered by organization scope
 *
 * @route GET /api/task-activities/:taskActivityId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getTaskActivityById = async (req, res, next) => {
  try {
    const { taskActivityId } = req.params;

    logger.info(ACTIVITY_LOG_MESSAGES.GET_BY_ID_REQUEST, {
      userId: req.user.userId,
      taskActivityId,
      role: req.user.role,
    });

    // Find activity (including soft-deleted) using helper
    const activity = await findResourceById(TaskActivity, taskActivityId, {
      includeDeleted: true,
      resourceType: "TaskActivity",
    });

    // Populate and convert to plain object
    await activity.populate([
      {
        path: "task",
        select: "title taskType status priority",
      },
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "materials.material",
        select: "name unit category",
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
    const activityObj = activity.toObject();

    // Validate organization scope
    validateOrganizationScope(activityObj, req.user, "access", "activity");

    logger.info(ACTIVITY_LOG_MESSAGES.GET_BY_ID_SUCCESS, {
      userId: req.user.userId,
      taskActivityId: activityObj._id,
      activityType: activityObj.activityType,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { activity: activityObj },
          ACTIVITY_LOG_MESSAGES.GET_BY_ID_SUCCESS
        )
      );
  } catch (error) {
    logger.error(ACTIVITY_LOG_MESSAGES.GET_BY_ID_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskActivityId: req.params.taskActivityId,
    });
    next(error);
  }
};

/**
 * Create new task activity
 * Transactional
 * Filtered by organization scope
 *
 * @route POST /api/task-activities
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createTaskActivity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization: userOrganization, userId } = req.user;
    const activityData = req.validated.body;

    logger.info(ACTIVITY_LOG_MESSAGES.CREATE_REQUEST, {
      userId,
      role: req.user.role,
      activityType: activityData.activityType,
      taskId: activityData.task,
    });

    // Validate organization scope
    if (activityData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        ACTIVITY_ERROR_MESSAGES.ORGANIZATION_MISMATCH,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Create activity with session
    const activity = new TaskActivity(activityData);
    await activity.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await activity.populate([
      {
        path: "task",
        select: "title taskType status priority",
      },
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "materials.material",
        select: "name unit category",
      },
    ]);

    logger.info(ACTIVITY_LOG_MESSAGES.CREATE_SUCCESS, {
      userId,
      taskActivityId: activity._id,
      activityType: activity.activityType,
      operationType: "CREATE",
      resourceType: "TASK_ACTIVITY",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        formatSuccessResponse(
          { activity },
          ACTIVITY_LOG_MESSAGES.CREATE_SUCCESS
        )
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(ACTIVITY_LOG_MESSAGES.CREATE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Update task activity
 * Transactional
 * Filtered by organization scope
 *
 * @route PUT /api/task-activities/:taskActivityId
 * @access Private (SuperAdmin, Admin, Manager, User - own activities)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateTaskActivity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskActivityId } = req.params;
    const updateData = req.validated.body;

    logger.info(ACTIVITY_LOG_MESSAGES.UPDATE_REQUEST, {
      userId: req.user.userId,
      taskActivityId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Find activity with session
    const activity = await findResourceById(TaskActivity, taskActivityId, {
      session,
      resourceType: "TaskActivity",
    });

    // Validate activity is not soft-deleted
    validateNotDeleted(activity, "update", "activity");

    // Validate organization scope
    validateOrganizationScope(activity, req.user, "update", "activity");

    // Check ownership if User role (Managers/Admins can edit any in their scope typically, but requirement isn't explicit so I'll assume standard RBAC: Users edit own, Managers/Admins edit any in scope. Wait, usually activities are immutable logs or comment-like. Requirements 11.1 says "Activities/updates on ProjectTask". Often activities are history. But if it wraps "materials added", maybe editable. Given we have an update route, we support it. I will enforce createdBy check for strictness unless Admin/Manager.)
    // Actually, authorization matrix says: User - Read/Write access to own resources.
    if (
      req.user.role === "User" &&
      activity.createdBy.toString() !== req.user.userId
    ) {
      throw new CustomError(
        "You can only update activities you created",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      activity[key] = updateData[key];
    });

    // Save with session
    await activity.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await activity.populate([
      {
        path: "task",
        select: "title taskType status priority",
      },
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "materials.material",
        select: "name unit category",
      },
    ]);

    logger.info(ACTIVITY_LOG_MESSAGES.UPDATE_SUCCESS, {
      userId: req.user.userId,
      taskActivityId: activity._id,
      operationType: "UPDATE",
      resourceType: "TASK_ACTIVITY",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { activity },
          ACTIVITY_LOG_MESSAGES.UPDATE_SUCCESS
        )
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(ACTIVITY_LOG_MESSAGES.UPDATE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskActivityId: req.params.taskActivityId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete task activity with cascade operations
 * Filtered by organization scope
 *
 * @route DELETE /api/task-activities/:taskActivityId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteTaskActivity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskActivityId } = req.params;
    const { userId } = req.user;

    logger.info(ACTIVITY_LOG_MESSAGES.DELETE_REQUEST, {
      userId,
      taskActivityId,
      role: req.user.role,
    });

    // Find activity
    const activity = await findResourceById(TaskActivity, taskActivityId, {
      session,
      resourceType: "TaskActivity",
    });

    // Validate not already deleted
    if (activity.isDeleted) {
      throw new CustomError(
        ACTIVITY_ERROR_MESSAGES.ALREADY_DELETED,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope
    validateOrganizationScope(activity, req.user, "delete", "activity");

    // Perform cascade delete with validation
    const cascadeResult = await TaskActivity.cascadeDelete(
      taskActivityId,
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
      "TASK_ACTIVITY"
    );

    // Commit transaction
    await session.commitTransaction();

    logger.info(ACTIVITY_LOG_MESSAGES.DELETE_SUCCESS, {
      userId,
      taskActivityId,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "TASK_ACTIVITY",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          taskActivityId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        ACTIVITY_LOG_MESSAGES.DELETE_SUCCESS
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(ACTIVITY_LOG_MESSAGES.DELETE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskActivityId: req.params.taskActivityId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Restore soft-deleted task activity with cascade operations
 * Filtered by organization scope
 *
 * @route PUT /api/task-activities/:taskActivityId/restore
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreTaskActivity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskActivityId } = req.params;
    const { userId } = req.user;

    logger.info(ACTIVITY_LOG_MESSAGES.RESTORE_REQUEST, {
      userId,
      taskActivityId,
      role: req.user.role,
    });

    // Find activity (including soft-deleted)
    const activity = await findResourceById(TaskActivity, taskActivityId, {
      includeDeleted: true,
      session,
      resourceType: "TaskActivity",
    });

    // Validate activity is deleted
    validateIsDeleted(activity, "activity");

    // Validate organization scope
    validateOrganizationScope(activity, req.user, "restore", "activity");

    // Perform cascade restore with validation
    const cascadeResult = await TaskActivity.cascadeRestore(
      taskActivityId,
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
      "TASK_ACTIVITY"
    );

    // Commit transaction
    await session.commitTransaction();

    logger.info(ACTIVITY_LOG_MESSAGES.RESTORE_SUCCESS, {
      userId,
      taskActivityId,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "TASK_ACTIVITY",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          taskActivityId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        ACTIVITY_LOG_MESSAGES.RESTORE_SUCCESS
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error(ACTIVITY_LOG_MESSAGES.RESTORE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskActivityId: req.params.taskActivityId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

export default {
  getAllTaskActivities,
  getTaskActivityById,
  createTaskActivity,
  updateTaskActivity,
  deleteTaskActivity,
  restoreTaskActivity,
};
