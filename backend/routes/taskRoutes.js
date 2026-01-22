import express from "express";
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
} from "../controllers/taskController.js";
import {
  getAllTaskActivities,
  createTaskActivity,
  getTaskActivityById,
  updateTaskActivity,
  deleteTaskActivity,
  restoreTaskActivity,
} from "../controllers/taskActivityController.js";
import {
  getAllTaskComments,
  getTaskCommentById,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
  restoreTaskComment,
} from "../controllers/taskCommentController.js";
import {
  listTasksValidator,
  createTaskValidator,
  updateTaskValidator,
  deleteTaskValidator,
  restoreTaskValidator,
  getTaskByIdValidator,
} from "../middlewares/validators/taskValidators.js";
import {
  listTaskActivitiesValidator,
  createTaskActivityValidator,
  updateTaskActivityValidator,
  deleteTaskActivityValidator,
  restoreTaskActivityValidator,
  getTaskActivityByIdValidator,
} from "../middlewares/validators/taskActivityValidators.js";
import {
  listTaskCommentsValidator,
  createTaskCommentValidator,
  updateTaskCommentValidator,
  deleteTaskCommentValidator,
  restoreTaskCommentValidator,
  getTaskCommentByIdValidator,
} from "../middlewares/validators/taskCommentValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import { Task, TaskActivity, TaskComment } from "../models/index.js";
import { findResourceById } from "../utils/controllerHelpers.js";

/**
 * Task Routes
 * Defines routes for task management operations (all task types)
 * Defines routes for task activity management (nested under tasks)
 * Applies authentication, authorization, and validation middleware in correct order
 *
 * MIDDLEWARE ORDER (Requirement 39.3 & User Request):
 * 1. Authentication (authMiddleware) - Verify JWT token
 * 2. Authorization (authorize) - Check permissions
 * 3. Validation (validators + validate) - Validate request data
 * 4. Controller - Execute business logic
 *
 * Requirements: 39.1, 39.2, 39.3, 39.5, 11.1 - 11.11
 */

const router = express.Router();

// Apply authentication to all routes (Requirement 39.1)
router.use(authMiddleware);

/**
 * Helper function to get task document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} Task document or null
 */
const getTaskDocument = async (req) => {
  const taskId = req.params.taskId;
  if (!taskId) return null;

  const task = await Task.findById(taskId).withDeleted().lean();
  return task;
};

/**
 * Helper function to get task activity document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} TaskActivity document or null
 */
const getTaskActivityDocument = async (req) => {
  const { activityId } = req.params;
  if (!activityId) return null;

  return findResourceById(TaskActivity, activityId, {
    includeDeleted: true,
  });
};

/**
 * Helper function to get task comment document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} TaskComment document or null
 */
const getTaskCommentDocument = async (req) => {
  const { taskCommentId } = req.params;
  if (!taskCommentId) return null;

  return findResourceById(TaskComment, taskCommentId, {
    includeDeleted: true,
  });
};

/**
 * TASK MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/",
  authorize("tasks", "read"),
  listTasksValidator,
  validate,
  getAllTasks
);

/**
 * @route   GET /api/tasks/:taskId
 * @desc    Get task by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/:taskId",
  authorize("tasks", "read", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  getTaskByIdValidator,
  validate,
  getTaskById
);

/**
 * @route   POST /api/tasks
 * @desc    Create new task (all task types)
 * @access  Private (SuperAdmin, Admin, Manager, User)
 */
router.post(
  "/",
  authorize("tasks", "create"),
  createTaskValidator,
  validate,
  createTask
);

/**
 * @route   PUT /api/tasks/:taskId
 * @desc    Update task (all task types)
 * @access  Private (SuperAdmin, Admin, Manager, User - own tasks)
 */
router.put(
  "/:taskId",
  authorize("tasks", "update", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  updateTaskValidator,
  validate,
  updateTask
);

/**
 * @route   DELETE /api/tasks/:taskId
 * @desc    Soft delete task with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 */
router.delete(
  "/:taskId",
  authorize("tasks", "delete", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  deleteTaskValidator,
  validate,
  deleteTask
);

/**
 * @route   PUT /api/tasks/:taskId/restore
 * @desc    Restore soft-deleted task with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 */
router.put(
  "/:taskId/restore",
  authorize("tasks", "restore", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  restoreTaskValidator,
  validate,
  restoreTask
);

/**
 * TASK ACTIVITY ROUTES
 * Nested under /api/tasks/:taskId/activities
 */

/**
 * @route GET /api/tasks/:taskId/activities
 * @desc Get all task activities for a specific task with pagination and filtering
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/:taskId/activities",
  authorize("activities", "read"),
  listTaskActivitiesValidator,
  validate,
  getAllTaskActivities
);

/**
 * @route POST /api/tasks/:taskId/activities
 * @desc Create new task activity for a specific task
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.post(
  "/:taskId/activities",
  authorize("activities", "create"),
  createTaskActivityValidator,
  validate,
  createTaskActivity
);

/**
 * @route GET /api/tasks/:taskId/activities/:activityId
 * @desc Get task activity by ID
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/:taskId/activities/:activityId",
  authorize("activities", "read", {
    checkScope: true,
    getDocument: getTaskActivityDocument,
  }),
  getTaskActivityByIdValidator,
  validate,
  getTaskActivityById
);

/**
 * @route PUT /api/tasks/:taskId/activities/:activityId
 * @desc Update task activity
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.put(
  "/:taskId/activities/:activityId",
  authorize("activities", "update", {
    checkScope: true,
    getDocument: getTaskActivityDocument,
  }),
  updateTaskActivityValidator,
  validate,
  updateTaskActivity
);

/**
 * @route DELETE /api/tasks/:taskId/activities/:activityId
 * @desc Soft delete task activity
 * @access Private (SuperAdmin, Admin, Manager)
 */
router.delete(
  "/:taskId/activities/:activityId",
  authorize("activities", "delete", {
    checkScope: true,
    getDocument: getTaskActivityDocument,
  }),
  deleteTaskActivityValidator,
  validate,
  deleteTaskActivity
);

/**
 * @route PUT /api/tasks/:taskId/activities/:activityId/restore
 * @desc Restore soft-deleted task activity
 * @access Private (SuperAdmin, Admin, Manager)
 */
router.put(
  "/:taskId/activities/:activityId/restore",
  authorize("activities", "restore", {
    checkScope: true,
    getDocument: getTaskActivityDocument,
  }),
  restoreTaskActivityValidator,
  validate,
  restoreTaskActivity
);

/**
 * TASK COMMENT ROUTES
 * Nested under /api/tasks/comments and /api/tasks/:taskId/comments
 */

/**
 * @route GET /api/tasks/comments
 * @desc Get all task comments with pagination and filtering
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/comments",
  authorize("comments", "read"),
  listTaskCommentsValidator,
  validate,
  getAllTaskComments
);

/**
 * @route POST /api/tasks/comments
 * @desc Create new task comment
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.post(
  "/comments",
  authorize("comments", "create"),
  createTaskCommentValidator,
  validate,
  createTaskComment
);

/**
 * @route GET /api/tasks/:taskId/comments/:taskCommentId
 * @desc Get task comment by ID
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/:taskId/comments/:taskCommentId",
  authorize("comments", "read", {
    checkScope: true,
    getDocument: getTaskCommentDocument,
  }),
  getTaskCommentByIdValidator,
  validate,
  getTaskCommentById
);

/**
 * @route PUT /api/tasks/:taskId/comments/:taskCommentId
 * @desc Update task comment
 * @access Private (SuperAdmin, Admin, Manager, User - own comments)
 */
router.put(
  "/:taskId/comments/:taskCommentId",
  authorize("comments", "update", {
    checkScope: true,
    getDocument: getTaskCommentDocument,
  }),
  updateTaskCommentValidator,
  validate,
  updateTaskComment
);

/**
 * @route DELETE /api/tasks/:taskId/comments/:taskCommentId
 * @desc Soft delete task comment with cascade operations
 * @access Private (SuperAdmin, Admin, Manager)
 */
router.delete(
  "/:taskId/comments/:taskCommentId",
  authorize("comments", "delete", {
    checkScope: true,
    getDocument: getTaskCommentDocument,
  }),
  deleteTaskCommentValidator,
  validate,
  deleteTaskComment
);

/**
 * @route PUT /api/tasks/:taskId/comments/:taskCommentId/restore
 * @desc Restore soft-deleted task comment with cascade operations
 * @access Private (SuperAdmin, Admin, Manager)
 */
router.put(
  "/:taskId/comments/:taskCommentId/restore",
  authorize("comments", "restore", {
    checkScope: true,
    getDocument: getTaskCommentDocument,
  }),
  restoreTaskCommentValidator,
  validate,
  restoreTaskComment
);

export default router;
