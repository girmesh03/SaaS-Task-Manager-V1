import express from "express";
import {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  restoreMaterial,
} from "../controllers/materialController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import {
  listMaterialsValidator,
  createMaterialValidator,
  updateMaterialValidator,
  deleteMaterialValidator,
  restoreMaterialValidator,
  getMaterialByIdValidator,
} from "../middlewares/validators/materialValidators.js";
import { validate } from "../middlewares/validation.js";
import { findResourceById } from "../utils/controllerHelpers.js";
import { Material } from "../models/index.js";

/**
 * Material Routes
 * Routes for material management (materials used to complete tasks)
 * Mounted at: /api/materials
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
 * Helper function to get material document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} Material document or null
 */
const getMaterialDocument = async (req) => {
  const { materialId } = req.params;
  if (!materialId) return null;

  return findResourceById(Material, materialId, {
    includeDeleted: true,
  });
};

/**
 * @route   GET /api/materials
 * @desc    Get all materials with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @query   {boolean} deleted - Include deleted materials (true/false/"only")
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10)
 * @query   {string} search - Search query for material name
 * @query   {string} category - Filter by material category
 * @query   {string} organization - Filter by organization ID
 * @query   {string} department - Filter by department ID
 */
router.get(
  "/",
  authorize("materials", "read"),
  listMaterialsValidator,
  validate,
  getAllMaterials
);

/**
 * @route   POST /api/materials
 * @desc    Create new material
 * @access  Private (SuperAdmin, Admin, Manager)
 * @body    {string} name - Material name (required)
 * @body    {string} unit - Unit of measurement (required)
 * @body    {string} category - Material category (required)
 * @body    {number} price - Material price (optional)
 * @body    {string} organization - Organization ID (required)
 * @body    {string} department - Department ID (required)
 * @body    {string} createdBy - Creator user ID (required)
 * @body    {string} addedBy - User who added the material (optional)
 */
router.post(
  "/",
  authorize("materials", "create"),
  createMaterialValidator,
  validate,
  createMaterial
);

/**
 * @route   GET /api/materials/:materialId
 * @desc    Get material by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @param   {string} materialId - Material ID
 */
router.get(
  "/:materialId",
  authorize("materials", "read", {
    checkScope: true,
    getDocument: getMaterialDocument,
  }),
  getMaterialByIdValidator,
  validate,
  getMaterialById
);

/**
 * @route   PUT /api/materials/:materialId
 * @desc    Update material
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} materialId - Material ID
 * @body    {string} name - Material name (optional)
 * @body    {string} unit - Unit of measurement (optional)
 * @body    {string} category - Material category (optional)
 * @body    {number} price - Material price (optional)
 * @body    {string} addedBy - User who added the material (optional)
 */
router.put(
  "/:materialId",
  authorize("materials", "update", {
    checkScope: true,
    getDocument: getMaterialDocument,
  }),
  updateMaterialValidator,
  validate,
  updateMaterial
);

/**
 * @route   DELETE /api/materials/:materialId
 * @desc    Soft delete material with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} materialId - Material ID
 * @note    Removes material references from tasks and activities
 */
router.delete(
  "/:materialId",
  authorize("materials", "delete", {
    checkScope: true,
    getDocument: getMaterialDocument,
  }),
  deleteMaterialValidator,
  validate,
  deleteMaterial
);

/**
 * @route   PUT /api/materials/:materialId/restore
 * @desc    Restore soft-deleted material with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} materialId - Material ID
 * @note    Validates parent organization and department are not deleted
 * @note    Material references in tasks/activities need manual re-addition
 */
router.put(
  "/:materialId/restore",
  authorize("materials", "restore", {
    checkScope: true,
    getDocument: getMaterialDocument,
  }),
  restoreMaterialValidator,
  validate,
  restoreMaterial
);

export default router;
