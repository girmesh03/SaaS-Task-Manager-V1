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
  listTasksValidator,
  createTaskValidator,
  updateTaskValidator,
  deleteTaskValidator,
  restoreTaskValidator,
  getTaskByIdValidator,
} from "../middlewares/validators/taskValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import { Task } from "../models/index.js";

/**
 * Task Routes
 * Defines routes for task management operations (all task types)
 * Applies authentication, validation, and authorization middleware in correct order
 *
 * MIDDLEWARE ORDER (Requirement 39.3):
 * 1. Authentication (authMiddleware) - Verify JWT token
 * 2. Validation (validators + validate) - Validate request data
 * 3. Authorization (authorize) - Check permissions
 * 4. Controller - Execute business logic
 *
 * Requirements: 39.1, 39.2, 39.3, 39.5
 */

const router = express.Router();

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
 * @route   GET /api/tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware listTasksValidator - Validate query parameters
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/",
  authMiddleware,
  listTasksValidator,
  validate,
  authorize("tasks", "read"),
  getAllTasks
);

/**
 * @route   GET /api/tasks/:taskId
 * @desc    Get task by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware getTaskByIdValidator - Validate task ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/:taskId",
  authMiddleware,
  getTaskByIdValidator,
  validate,
  authorize("tasks", "read", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  getTaskById
);

/**
 * @route   POST /api/tasks
 * @desc    Create new task (all task types)
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware createTaskValidator - Validate task data based on task type
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.post(
  "/",
  authMiddleware,
  createTaskValidator,
  validate,
  authorize("tasks", "create"),
  createTask
);

/**
 * @route   PUT /api/tasks/:taskId
 * @desc    Update task (all task types)
 * @access  Private (SuperAdmin, Admin, Manager, User - own tasks)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware updateTaskValidator - Validate update data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:taskId",
  authMiddleware,
  updateTaskValidator,
  validate,
  authorize("tasks", "update", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  updateTask
);

/**
 * @route   DELETE /api/tasks/:taskId
 * @desc    Soft delete task with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware deleteTaskValidator - Validate task ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.delete(
  "/:taskId",
  authMiddleware,
  deleteTaskValidator,
  validate,
  authorize("tasks", "delete", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  deleteTask
);

/**
 * @route   PUT /api/tasks/:taskId/restore
 * @desc    Restore soft-deleted task with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware restoreTaskValidator - Validate task ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:taskId/restore",
  authMiddleware,
  restoreTaskValidator,
  validate,
  authorize("tasks", "restore", {
    checkScope: true,
    getDocument: getTaskDocument,
  }),
  restoreTask
);

export default router;
