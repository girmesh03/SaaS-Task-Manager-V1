import express from "express";
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  restoreVendor,
} from "../controllers/vendorController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/authorization.js";
import {
  listVendorsValidator,
  createVendorValidator,
  updateVendorValidator,
  deleteVendorValidator,
  restoreVendorValidator,
  getVendorByIdValidator,
} from "../middlewares/validators/vendorValidators.js";
import { validate } from "../middlewares/validation.js";
import { findResourceById } from "../utils/controllerHelpers.js";
import { Vendor } from "../models/index.js";

/**
 * Vendor Routes
 * Routes for vendor management (external clients/vendors who complete outsourced ProjectTasks)
 * Mounted at: /api/vendors
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
 * Helper function to get vendor document from request
 * Used by authorization middleware to check ownership and scope
 * @param {import('express').Request} req - Express request object
 * @returns {Promise<Object|null>} Vendor document or null
 */
const getVendorDocument = async (req) => {
  const { vendorId } = req.params;
  if (!vendorId) return null;

  return findResourceById(Vendor, vendorId, {
    includeDeleted: true,
  });
};

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors with pagination and filtering
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @query   {boolean} deleted - Include deleted vendors (true/false/"only")
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10)
 * @query   {string} search - Search query for vendor name, email, or phone
 * @query   {string} status - Filter by vendor status (ACTIVE, INACTIVE, BLOCKED)
 * @query   {string} organization - Filter by organization ID
 * @query   {number} minRating - Filter by minimum rating (1-5)
 * @query   {number} maxRating - Filter by maximum rating (1-5)
 */
router.get(
  "/",
  authorize("vendors", "read"),
  listVendorsValidator,
  validate,
  getAllVendors
);

/**
 * @route   POST /api/vendors
 * @desc    Create new vendor
 * @access  Private (SuperAdmin, Admin, Manager)
 * @body    {string} name - Vendor name (required)
 * @body    {string} email - Vendor email (required)
 * @body    {string} phone - Vendor phone (required)
 * @body    {string} organization - Organization ID (required)
 * @body    {string} createdBy - Creator user ID (required)
 * @body    {number} rating - Vendor rating (optional, 1-5)
 * @body    {string} status - Vendor status (optional, ACTIVE/INACTIVE/BLOCKED)
 * @body    {string} address - Vendor address (optional)
 */
router.post(
  "/",
  authorize("vendors", "create"),
  createVendorValidator,
  validate,
  createVendor
);

/**
 * @route   GET /api/vendors/:vendorId
 * @desc    Get vendor by ID
 * @access  Private (SuperAdmin, Admin, Manager, User)
 * @param   {string} vendorId - Vendor ID
 */
router.get(
  "/:vendorId",
  authorize("vendors", "read", {
    checkScope: true,
    getDocument: getVendorDocument,
  }),
  getVendorByIdValidator,
  validate,
  getVendorById
);

/**
 * @route   PUT /api/vendors/:vendorId
 * @desc    Update vendor
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} vendorId - Vendor ID
 * @body    {string} name - Vendor name (optional)
 * @body    {string} email - Vendor email (optional)
 * @body    {string} phone - Vendor phone (optional)
 * @body    {number} rating - Vendor rating (optional, 1-5)
 * @body    {string} status - Vendor status (optional, ACTIVE/INACTIVE/BLOCKED)
 * @body    {string} address - Vendor address (optional)
 */
router.put(
  "/:vendorId",
  authorize("vendors", "update", {
    checkScope: true,
    getDocument: getVendorDocument,
  }),
  updateVendorValidator,
  validate,
  updateVendor
);

/**
 * @route   DELETE /api/vendors/:vendorId
 * @desc    Soft delete vendor with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} vendorId - Vendor ID
 * @note    Maintains vendor references in ProjectTasks during soft delete
 */
router.delete(
  "/:vendorId",
  authorize("vendors", "delete", {
    checkScope: true,
    getDocument: getVendorDocument,
  }),
  deleteVendorValidator,
  validate,
  deleteVendor
);

/**
 * @route   PUT /api/vendors/:vendorId/restore
 * @desc    Restore soft-deleted vendor with cascade operations
 * @access  Private (SuperAdmin, Admin, Manager)
 * @param   {string} vendorId - Vendor ID
 * @note    Validates parent organization and createdBy user are not deleted
 */
router.put(
  "/:vendorId/restore",
  authorize("vendors", "restore", {
    checkScope: true,
    getDocument: getVendorDocument,
  }),
  restoreVendorValidator,
  validate,
  restoreVendor
);

export default router;
