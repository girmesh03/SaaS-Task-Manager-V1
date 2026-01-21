import express from "express";
import * as activityController from "../controllers/taskActivityController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import {
  listTaskActivitiesValidator,
  createTaskActivityValidator,
  updateTaskActivityValidator,
  deleteTaskActivityValidator,
  restoreTaskActivityValidator,
  getTaskActivityByIdValidator,
} from "../middlewares/validators/taskActivityValidators.js";
import { runValidation } from "../middlewares/validators/index.js";

/**
 * TaskActivity Routes
 * Routes for task activity management
 * Mounted at: /api/task-activities
 *
 * Requirements: 11.1 - 11.11
 */

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/task-activities
 * @desc Get all task activities with pagination and filtering
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
/**
 * @route GET /api/task-activities
 * @desc Get all task activities with pagination and filtering
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/",
  authorize("TaskActivity", "read"),
  listTaskActivitiesValidator,
  runValidation,
  activityController.getAllTaskActivities
);

/**
 * @route POST /api/task-activities
 * @desc Create new task activity
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.post(
  "/",
  authorize("TaskActivity", "create"),
  createTaskActivityValidator,
  runValidation,
  activityController.createTaskActivity
);

/**
 * @route GET /api/task-activities/:taskActivityId
 * @desc Get task activity by ID
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.get(
  "/:taskActivityId",
  authorize("TaskActivity", "read"),
  getTaskActivityByIdValidator,
  runValidation,
  activityController.getTaskActivityById
);

/**
 * @route PUT /api/task-activities/:taskActivityId
 * @desc Update task activity
 * @access Private (SuperAdmin, Admin, Manager, User)
 */
router.put(
  "/:taskActivityId",
  authorize("TaskActivity", "update"),
  updateTaskActivityValidator,
  runValidation,
  activityController.updateTaskActivity
);

/**
 * @route DELETE /api/task-activities/:taskActivityId
 * @desc Soft delete task activity
 * @access Private (SuperAdmin, Admin, Manager)
 */
router.delete(
  "/:taskActivityId",
  authorize("TaskActivity", "delete"),
  deleteTaskActivityValidator,
  runValidation,
  activityController.deleteTaskActivity
);

/**
 * @route PUT /api/task-activities/:taskActivityId/restore
 * @desc Restore soft-deleted task activity
 * @access Private (SuperAdmin, Admin, Manager)
 */
router.put(
  "/:taskActivityId/restore",
  authorize("TaskActivity", "restore"),
  restoreTaskActivityValidator,
  runValidation,
  activityController.restoreTaskActivity
);

export default router;
