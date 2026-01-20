import express from "express";
import {
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  restoreOrganization,
} from "../controllers/organizationController.js";
import {
  listOrganizationsValidator,
  getOrganizationByIdValidator,
  updateOrganizationValidator,
  deleteOrganizationValidator,
  restoreOrganizationValidator,
} from "../middlewares/validators/organizationValidators.js";
import { validate } from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import { Organization } from "../models/index.js";

/**
 * Organization Routes
 * Defines routes for organization management operations
 * Applies authentication, validation, and authorization middleware in correct order
 *
 * NOTE: Organization creation is NOT done via API route - it's done via register endpoint
 * These routes are for Platform SuperAdmin managing customer organizations
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
 * Helper function to get organization document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} Organization document or null
 */
const getOrganizationDocument = async (req) => {
  const organizationId = req.params.organizationId;
  if (!organizationId) return null;

  const organization = await Organization.findById(organizationId)
    .withDeleted()
    .lean();
  return organization;
};

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations with pagination and filtering
 * @access  Private (SuperAdmin only)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware listOrganizationsValidator - Validate query parameters
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/",
  authMiddleware,
  listOrganizationsValidator,
  validate,
  authorize("organizations", "read"),
  getAllOrganizations
);

/**
 * @route   GET /api/organizations/:organizationId
 * @desc    Get organization by ID
 * @access  Private (SuperAdmin only)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware getOrganizationByIdValidator - Validate organization ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.get(
  "/:organizationId",
  authMiddleware,
  getOrganizationByIdValidator,
  validate,
  authorize("organizations", "read", {
    checkScope: true,
    getDocument: getOrganizationDocument,
  }),
  getOrganizationById
);

/**
 * @route   PUT /api/organizations/:organizationId
 * @desc    Update organization
 * @access  Private (SuperAdmin only)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware updateOrganizationValidator - Validate update data
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:organizationId",
  authMiddleware,
  updateOrganizationValidator,
  validate,
  authorize("organizations", "update", {
    checkScope: true,
    getDocument: getOrganizationDocument,
  }),
  updateOrganization
);

/**
 * @route   DELETE /api/organizations/:organizationId
 * @desc    Soft delete organization with cascade operations
 * @access  Private (Platform SuperAdmin only)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware deleteOrganizationValidator - Validate organization ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.delete(
  "/:organizationId",
  authMiddleware,
  deleteOrganizationValidator,
  validate,
  authorize("organizations", "delete", {
    checkScope: true,
    getDocument: getOrganizationDocument,
  }),
  deleteOrganization
);

/**
 * @route   PUT /api/organizations/:organizationId/restore
 * @desc    Restore soft-deleted organization with cascade operations
 * @access  Private (Platform SuperAdmin only)
 * @middleware authMiddleware - Verify JWT token (Requirement 39.1)
 * @middleware restoreOrganizationValidator - Validate organization ID
 * @middleware validate - Process validation results
 * @middleware authorize - Check permissions (Requirement 39.2)
 */
router.put(
  "/:organizationId/restore",
  authMiddleware,
  restoreOrganizationValidator,
  validate,
  authorize("organizations", "restore", {
    checkScope: true,
    getDocument: getOrganizationDocument,
  }),
  restoreOrganization
);

export default router;
