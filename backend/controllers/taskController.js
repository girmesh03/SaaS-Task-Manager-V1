import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Task } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import {
  HTTP_STATUS,
  ERROR_CODES,
  TASK_ERROR_MESSAGES,
  TASK_LOG_MESSAGES,
  QUERY_FILTERS,
} from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  withTransaction,
} from "../utils/helpers.js";
import {
  validateOrganizationScope,
  validateNotDeleted,
  validateIsDeleted,
  findResourceById,
  handleCascadeResult,
} from "../utils/controllerHelpers.js";
import { getTaskModel } from "../utils/taskTypeRegistry.js";
import {
  buildTaskFilter,
  getTaskPopulateConfig,
  getTaskSelectFields,
} from "../utils/taskHelpers.js";
import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
} from "../utils/socketEmitter.js";

/**
 * @typedef {Object} TaskDocument
 * @property {mongoose.Types.ObjectId} _id - Task ID
 * @property {string} description - Task description
 * @property {string} status - Task status
 * @property {string} priority - Task priority
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} department - Department reference
 * @property {mongoose.Types.ObjectId} createdBy - User who created the task
 * @property {Array<mongoose.Types.ObjectId>} attachments - Attachment references
 * @property {Array<mongoose.Types.ObjectId>} watchers - Watcher references
 * @property {string} taskType - Task type (discriminator key)
 * @property {Array<string>} tags - Task tags
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - Deletion timestamp
 * @property {mongoose.Types.ObjectId} deletedBy - User who deleted
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} softDelete - Soft delete method
 * @property {Function} restore - Restore method
 * @property {Function} save - Save document
 * @property {Function} toObject - Convert to plain object
 */

/**
 * Task Controller
 * Handles task management operations: list, read, create, update, delete, restore for all task types
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * Get all tasks with pagination and filtering
 * Filtered by organization, if department provided and isHod otherwise req.user.department._id scope
 *
 * @route GET /api/tasks
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllTasks = asyncHandler(async (req, res, next) => {
  try {
    const {
      organization: userOrganization,
      department: userDepartment,
      isHod,
    } = req.user;

    // Extract query parameters from validated data (Requirement 41.5)
    const {
      deleted = QUERY_FILTERS.DELETED.NONE,
      page = 1,
      limit = 10,
      search = "",
      ...filters // taskType, status, priority, organization, department, createdBy, assignee, vendor, startDate, endDate
    } = req.validated.query || {};

    logger.info(TASK_LOG_MESSAGES.GET_ALL_REQUEST, {
      userId: req.user.userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        ...filters,
      },
    });

    // Build filter query using helper (Requirement 40.1)
    const filter = buildTaskFilter(
      {
        search,
        ...filters,
      },
      { organization: userOrganization, department: userDepartment, isHod }
    );

    // Get pagination options (Requirement 40.2)
    const paginationOptions = getPaginationOptions(page, limit);

    // Get populate configuration
    const populateConfig = getTaskPopulateConfig();

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: populateConfig,
      select: getTaskSelectFields(),
      lean: true,
    };

    // Build query with soft delete handling
    const query =
      deleted === QUERY_FILTERS.DELETED.ALL
        ? Task.find(filter).withDeleted()
        : deleted === QUERY_FILTERS.DELETED.ONLY
        ? Task.find(filter).onlyDeleted()
        : Task.find(filter);

    // Execute paginated query
    const result = await Task.paginate(query, options);

    logger.info(TASK_LOG_MESSAGES.GET_ALL_SUCCESS, {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          tasks: result.docs,
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
        TASK_LOG_MESSAGES.GET_ALL_SUCCESS
      )
    );
  } catch (error) {
    logger.error(TASK_LOG_MESSAGES.GET_ALL_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Get task by ID
 * Filtered by organization scope
 *
 * @route GET /api/tasks/:taskId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getTaskById = asyncHandler(async (req, res, next) => {
  try {
    const { taskId } = req.params;

    logger.info(TASK_LOG_MESSAGES.GET_BY_ID_REQUEST, {
      userId: req.user.userId,
      taskId,
      role: req.user.role,
    });

    // Find task (including soft-deleted) using helper
    const task = await findResourceById(Task, taskId, {
      includeDeleted: true,
      resourceType: "Task",
    });

    // Populate and convert to plain object
    await task.populate(getTaskPopulateConfig());
    const taskObj = task.toObject();

    // Validate organization scope (Requirement 40.1)
    validateOrganizationScope(taskObj, req.user, "access", "task");

    logger.info(TASK_LOG_MESSAGES.GET_BY_ID_SUCCESS, {
      userId: req.user.userId,
      taskId: taskObj._id,
      taskType: taskObj.taskType,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { task: taskObj },
          TASK_LOG_MESSAGES.GET_BY_ID_SUCCESS
        )
      );
  } catch (error) {
    logger.error(TASK_LOG_MESSAGES.GET_BY_ID_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskId: req.params.taskId,
    });
    next(error);
  }
});

/**
 * Create new task (all task types)
 * Filtered by organization scope
 * Validates assignees/watchers belong to same organization
 *
 * @route POST /api/tasks
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createTask = asyncHandler(async (req, res, next) => {
  try {
    const { organization: userOrganization, userId } = req.user;
    const taskData = req.validated.body;

    logger.info(TASK_LOG_MESSAGES.CREATE_REQUEST, {
      userId,
      role: req.user.role,
      taskType: taskData.taskType,
    });

    // Validate organization scope (Requirement 40.1)
    if (taskData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        TASK_ERROR_MESSAGES.ORGANIZATION_MISMATCH,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Execute within transaction using helper
    const task = await withTransaction(async (session) => {
      // Get appropriate task model based on task type using registry
      const TaskModel = getTaskModel(taskData.taskType);

      // Create task with session (Requirement 40.4)
      const newTask = new TaskModel(taskData);
      await newTask.save({ session });

      return newTask;
    }, logger);

    // Populate references for response (after transaction commit to avoid locking issues)
    await task.populate(getTaskPopulateConfig());

    logger.info(TASK_LOG_MESSAGES.CREATE_SUCCESS, {
      userId,
      taskId: task._id,
      taskType: task.taskType,
      operationType: "CREATE",
      resourceType: "TASK",
    });

    // Emit Socket.IO event for real-time updates
    emitTaskCreated(task, task.organization);

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(formatSuccessResponse({ task }, TASK_LOG_MESSAGES.CREATE_SUCCESS));
  } catch (error) {
    logger.error(TASK_LOG_MESSAGES.CREATE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Update task (all task types)
 * Filtered by organization scope
 * Validates assignees/watchers belong to same organization
 *
 * @route PUT /api/tasks/:taskId
 * @access Private (SuperAdmin, Admin, Manager, User - own tasks)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateTask = asyncHandler(async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const updateData = req.validated.body;

    logger.info(TASK_LOG_MESSAGES.UPDATE_REQUEST, {
      userId: req.user.userId,
      taskId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Execute within transaction using helper
    const task = await withTransaction(async (session) => {
      // Find task with session using helper (Requirement 40.4)
      const foundTask = await findResourceById(Task, taskId, {
        session,
        resourceType: "Task",
      });

      // Validate task is not soft-deleted
      validateNotDeleted(foundTask, "update", "task");

      // Validate organization scope (Requirement 40.1)
      validateOrganizationScope(foundTask, req.user, "update", "task");

      // Update task fields (let Mongoose handle validation)
      Object.keys(updateData).forEach((key) => {
        foundTask[key] = updateData[key];
      });

      // Save task with session (Requirement 40.4)
      await foundTask.save({ session });

      return foundTask;
    }, logger);

    // Populate references for response (after transaction commit to avoid locking issues)
    await task.populate(getTaskPopulateConfig());

    logger.info(TASK_LOG_MESSAGES.UPDATE_SUCCESS, {
      userId: req.user.userId,
      taskId: task._id,
      taskType: task.taskType,
      operationType: "UPDATE",
      resourceType: "TASK",
    });

    // Emit Socket.IO event for real-time updates
    emitTaskUpdated(task, task.organization, task.watchers || []);

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse({ task }, TASK_LOG_MESSAGES.UPDATE_SUCCESS));
  } catch (error) {
    logger.error(TASK_LOG_MESSAGES.UPDATE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskId: req.params.taskId,
    });
    next(error);
  }
});

/**
 * Soft delete task with cascade operations
 * Filtered by organization scope
 *
 * @route DELETE /api/tasks/:taskId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteTask = asyncHandler(async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.user;

    logger.info(TASK_LOG_MESSAGES.DELETE_REQUEST, {
      userId,
      taskId,
      role: req.user.role,
    });

    // Execute within transaction using helper
    const { task, cascadeResult } = await withTransaction(async (session) => {
      // Find task using helper
      const foundTask = await findResourceById(Task, taskId, {
        session,
        resourceType: "Task",
      });

      // Validate task is not already deleted using helper
      validateNotDeleted(foundTask, "delete", "task");

      // Validate organization scope (Requirement 40.1)
      validateOrganizationScope(foundTask, req.user, "delete", "task");

      // Get appropriate task model for cascade delete using registry
      const TaskModel = getTaskModel(foundTask.taskType);

      // Perform cascade delete with validation (Requirement 40.5, 40.6)
      const result = await TaskModel.cascadeDelete(taskId, userId, session, {
        skipValidation: false,
        force: false,
      });

      return { task: foundTask, cascadeResult: result };
    }, logger);

    // Handle cascade result using helper
    handleCascadeResult(cascadeResult, "delete", userId, logger, "TASK");

    logger.info(TASK_LOG_MESSAGES.DELETE_SUCCESS, {
      userId,
      taskId,
      taskType: task.taskType,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "TASK",
    });

    // Emit Socket.IO event for real-time updates
    emitTaskDeleted(taskId, task.organization);

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          taskId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        TASK_LOG_MESSAGES.DELETE_SUCCESS
      )
    );
  } catch (error) {
    logger.error(TASK_LOG_MESSAGES.DELETE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskId: req.params.taskId,
    });
    next(error);
  }
});

/**
 * Restore soft-deleted task with cascade operations
 * Filtered by organization scope
 *
 * @route PUT /api/tasks/:taskId/restore
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreTask = asyncHandler(async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.user;

    logger.info(TASK_LOG_MESSAGES.RESTORE_REQUEST, {
      userId,
      taskId,
      role: req.user.role,
    });

    // Execute within transaction using helper
    const { task, cascadeResult } = await withTransaction(async (session) => {
      // Find task (including soft-deleted) using helper
      const foundTask = await findResourceById(Task, taskId, {
        includeDeleted: true,
        session,
        resourceType: "Task",
      });

      // Validate task is deleted using helper
      validateIsDeleted(foundTask, "task");

      // Validate organization scope (Requirement 40.1)
      validateOrganizationScope(foundTask, req.user, "restore", "task");

      // Get appropriate task model for cascade restore using registry
      const TaskModel = getTaskModel(foundTask.taskType);

      // Perform cascade restore with validation (Requirement 40.5, 40.6)
      const result = await TaskModel.cascadeRestore(taskId, session, {
        skipValidation: false,
        validateParents: true,
      });

      return { task: foundTask, cascadeResult: result };
    }, logger);

    // Handle cascade result using helper
    handleCascadeResult(cascadeResult, "restore", userId, logger, "TASK");

    logger.info(TASK_LOG_MESSAGES.RESTORE_SUCCESS, {
      userId,
      taskId,
      taskType: task.taskType,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "TASK",
    });

    // Emit Socket.IO event for real-time updates
    emitTaskUpdated(task, task.organization, task.watchers || []);

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          taskId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        TASK_LOG_MESSAGES.RESTORE_SUCCESS
      )
    );
  } catch (error) {
    logger.error(TASK_LOG_MESSAGES.RESTORE_FAILED, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      taskId: req.params.taskId,
    });
    next(error);
  }
});

export default {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
};
