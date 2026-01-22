import express from "express";
import {
  getAllTaskComments,
  getTaskCommentById,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
  restoreTaskComment,
} from "../controllers/taskCommentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import {
  listTaskCommentsValidator,
  createTaskCommentValidator,
  updateTaskCommentValidator,
  deleteTaskCommentValidator,
  restoreTaskCommentValidator,
  getTaskCommentByIdValidator,
} from "../middlewares/validators/taskCommentValidators.js";
import { validate } from "../middlewares/validation.js";
import { findResourceById } from "../utils/controllerHelpers.js";
import { TaskComment } from "../models/index.js";

/**
 * TaskComment Routes
 * Routes for task comment management (threaded comments on tasks, activities, and other comments)
 * Mounted at: /api/tasks/comments
 *
 * MIDDLEWARE ORDER (Requirement 39.3):
 * 1. Authentication (authMiddleware) - Verify JWT token
 * 2. Authorization (authorize) - Check permissions
 * 3. Validation (validators + validate) - Validate request data
 * 4. Controller - Execute business logic
 *
 * Requirements: 39.1, 39.2, 39.3, 39.5
 */

const router = express.Router();

// Apply authentication to all routes (Requirement 39.1)
router.use(authMiddleware);

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
 * @route   GET /api/tasks/comments
 * @desc    Get all task comments with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @query   {boolean} deleted - Include deleted comments (true/false/"only")
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10)
 * @query   {string} search - Search query for comment content
 * @query   {string} parent - Filter by parent ID
 * @query   {string} parentModel - Filter by parent model type
 * @query   {string} organization - Filter by organization ID
 * @query   {string} department - Filter by department ID
 * @query   {string} createdBy - Filter by creator user ID
 */
router.get(
  "/",
  authorize("comments", "read"),
  listTaskCommentsValidator,
  validate,
  getAllTaskComments
);

/**
 * @route   POST /api/tasks/comments
 * @desc    Create new task comment
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @body    {string} comment - Comment content (required)
 * @body    {string} parent - Parent reference ID (required)
 * @body    {string} parentModel - Parent model type (Task/TaskActivity/TaskComment) (required)
 * @body    {Array<string>} mentions - Array of mentioned user IDs (optional, max 5)
 * @body    {string} createdBy - Creator user ID (required)
 * @body    {string} department - Department ID (required)
 * @body    {string} organization - Organization ID (required)
 * @body    {Array<string>} attachments - Array of attachment IDs (optional)
 */
router.post(
  "/",
  authorize("comments", "create"),
  createTaskCommentValidator,
  validate,
  createTaskComment
);

/**
 * @route   GET /api/tasks/:taskId/comments/:taskCommentId
 * @desc    Get task comment by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @param   {string} taskId - Task ID (for route consistency, not used in query)
 * @param   {string} taskCommentId - Comment ID
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
 * @route   PUT /api/tasks/:taskId/comments/:taskCommentId
 * @desc    Update task comment
 * @access  Private (SuperAdmin, Admin, Manager, User - own comments)
 * @param   {string} taskId - Task ID (for route consistency, not used in query)
 * @param   {string} taskCommentId - Comment ID
 * @body    {string} comment - Comment content (optional)
 * @body    {Array<string>} mentions - Array of mentioned user IDs (optional, max 5)
 * @body    {Array<string>} attachments - Array of attachment IDs (optional)
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
 * @route   DELETE /api/tasks/:taskId/comments/:taskCommentId
 * @desc    Soft delete task comment with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} taskId - Task ID (for route consistency, not used in query)
 * @param   {string} taskCommentId - Comment ID
 * @note    Recursively deletes child comments and attachments
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
 * @route   PUT /api/tasks/:taskId/comments/:taskCommentId/restore
 * @desc    Restore soft-deleted task comment with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} taskId - Task ID (for route consistency, not used in query)
 * @param   {string} taskCommentId - Comment ID
 * @note    Recursively restores child comments and attachments
 * @note    Validates parent is not deleted before restoration
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
