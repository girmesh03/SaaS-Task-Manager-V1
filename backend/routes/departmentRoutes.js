import express from "express";
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
} from "../controllers/departmentController.js";
import {
  listDepartmentsValidator,
  getDepartmentByIdValidator,
  createDepartmentValidator,
  updateDepartmentValidator,
  deleteDepartmentValidator,
  restoreDepartmentValidator,
} from "../middlewares/validators/departmentValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import { Department } from "../models/index.js";

/**
 * Department Routes
 * Defines routes for department management operations
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
 * Helper function to get department document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} Department document or null
 */
const getDepartmentDocument = async (req) => {
  const departmentId = req.params.departmentId;
  if (!departmentId) return null;

  const department = await Department.findById(departmentId)
    .withDeleted()
    .lean();
  return department;
};

/**
 * @route   GET /api/departments
 * @desc    Get all departments with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware listDepartmentsValidator - Validate query parameters
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/",
  authMiddleware,
  listDepartmentsValidator,
  validate,
  authorize("departments", "read"),
  getAllDepartments
);

/**
 * @route   GET /api/departments/:departmentId
 * @desc    Get department by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware getDepartmentByIdValidator - Validate department ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/:departmentId",
  authMiddleware,
  getDepartmentByIdValidator,
  validate,
  authorize("departments", "read", {
    checkScope: true,
    getDocument: getDepartmentDocument,
  }),
  getDepartmentById
);

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware createDepartmentValidator - Validate department data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.post(
  "/",
  authMiddleware,
  createDepartmentValidator,
  validate,
  authorize("departments", "create"),
  createDepartment
);

/**
 * @route   PUT /api/departments/:departmentId
 * @desc    Update department
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware updateDepartmentValidator - Validate update data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:departmentId",
  authMiddleware,
  updateDepartmentValidator,
  validate,
  authorize("departments", "update", {
    checkScope: true,
    getDocument: getDepartmentDocument,
  }),
  updateDepartment
);

/**
 * @route   DELETE /api/departments/:departmentId
 * @desc    Soft delete department with cascade operations
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware deleteDepartmentValidator - Validate department ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.delete(
  "/:departmentId",
  authMiddleware,
  deleteDepartmentValidator,
  validate,
  authorize("departments", "delete", {
    checkScope: true,
    getDocument: getDepartmentDocument,
  }),
  deleteDepartment
);

/**
 * @route   PUT /api/departments/:departmentId/restore
 * @desc    Restore soft-deleted department with cascade operations
 * @access  Private (SuperAdmin, Admin)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware restoreDepartmentValidator - Validate department ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:departmentId/restore",
  authMiddleware,
  restoreDepartmentValidator,
  validate,
  authorize("departments", "restore", {
    checkScope: true,
    getDocument: getDepartmentDocument,
  }),
  restoreDepartment
);

export default router;
