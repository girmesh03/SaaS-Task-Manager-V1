import express from "express";
import {
  getAllTaskActivities,
  createTaskActivity,
  getTaskActivityById,
  updateTaskActivity,
  deleteTaskActivity,
  restoreTaskActivity,
} from "../controllers/taskActivityController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import {
  listTaskActivitiesValidator,
  createTaskActivityValidator,
  updateTaskActivityValidator,
  deleteTaskActivityValidator,
  restoreTaskActivityValidator,
  getTaskActivityByIdValidator,
} from "../middlewares/validators/taskActivityValidators.js";
import { validate } from "../middlewares/validation.js";
import { findResourceById } from "../utils/controllerHelpers.js";
import { TaskActivity } from "../models/index.js";

/**
 * TaskActivity Routes
 * Routes for task activity management
 * Mounted at: /api/task-activities
 *
 * Requirements: 11.1 - 11.11
 */

const router = express.Router({ mergeParams: true });

// Apply authentication to all routes
router.use(authMiddleware);

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
 * @route GET /api/tasks/:taskId/activities
 * @desc Get all task activities for a specific task with pagination and filtering
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/",
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
  "/",
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
  "/:activityId",
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
  "/:activityId",
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
  "/:activityId",
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
  "/:activityId/restore",
  authorize("activities", "restore", {
    checkScope: true,
    getDocument: getTaskActivityDocument,
  }),
  restoreTaskActivityValidator,
  validate,
  restoreTaskActivity
);

export default router;
