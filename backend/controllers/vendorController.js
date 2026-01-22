import mongoose from "mongoose";
import { Vendor } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  safeAbortTransaction,
  escapeRegex,
} from "../utils/helpers.js";
import {
  validateOrganizationScope,
  validateNotDeleted,
  validateIsDeleted,
  findResourceById,
  handleCascadeResult,
} from "../utils/controllerHelpers.js";

/**
 * Vendor Controller
 * Handles vendor management operations: list, read, create, update, delete, restore
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * @typedef {Object} VendorDocument
 * @property {mongoose.Types.ObjectId} _id - Vendor ID
 * @property {string} name - Vendor name
 * @property {string} email - Vendor email
 * @property {string} phone - Vendor phone
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} createdBy - User who created the vendor
 * @property {number} rating - Vendor rating (1-5)
 * @property {string} status - Vendor status (ACTIVE, INACTIVE, BLOCKED)
 * @property {string} address - Vendor address
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - Deletion timestamp
 * @property {mongoose.Types.ObjectId} deletedBy - User who deleted
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} save - Save document
 * @property {Function} populate - Populate references
 * @property {Function} toObject - Convert to plain object
 */

/**
 * Get all vendors with pagination and filtering
 * Filtered by organization scope
 *
 * @route GET /api/vendors
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllVendors = async (req, res, next) => {
  try {
    const { organization: userOrganization } = req.user;

    // Extract query parameters from validated data
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      status,
      organization,
      minRating,
      maxRating,
    } = req.validated.query || {};

    logger.info("Get all vendors request", {
      userId: req.user.userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        status,
        organization,
        minRating,
        maxRating,
      },
    });

    // Build filter query
    const filter = {};

    // Organization Scope (always applied)
    filter.organization = userOrganization._id;

    // Status Filter
    if (status) {
      filter.status = status;
    }

    // Rating Filter
    if (minRating !== undefined || maxRating !== undefined) {
      filter.rating = {};
      if (minRating !== undefined) {
        filter.rating.$gte = minRating;
      }
      if (maxRating !== undefined) {
        filter.rating.$lte = maxRating;
      }
    }

    // Search Filter (Name, Email, Phone)
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: [
        {
          path: "createdBy",
          select: "firstName lastName email profilePicture",
        },
        {
          path: "organization",
          select: "name",
        },
      ],
      lean: true,
    };

    let query = Vendor.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await Vendor.paginate(query, options);

    logger.info("Vendors retrieved successfully", {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          vendors: result.docs,
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
        "Vendors retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Get all vendors failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
};

/**
 * Get vendor by ID
 * Filtered by organization scope
 *
 * @route GET /api/vendors/:vendorId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getVendorById = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    logger.info("Get vendor by ID request", {
      userId: req.user.userId,
      vendorId,
      role: req.user.role,
    });

    // Find vendor (including soft-deleted) using helper
    const vendor = await findResourceById(Vendor, vendorId, {
      includeDeleted: true,
      resourceType: "Vendor",
    });

    // Populate and convert to plain object
    await vendor.populate([
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "organization",
        select: "name",
      },
    ]);
    const vendorObj = vendor.toObject();

    // Validate organization scope
    validateOrganizationScope(vendorObj, req.user, "access", "vendor");

    logger.info("Vendor retrieved successfully", {
      userId: req.user.userId,
      vendorId: vendorObj._id,
      status: vendorObj.status,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { vendor: vendorObj },
          "Vendor retrieved successfully"
        )
      );
  } catch (error) {
    logger.error("Get vendor by ID failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      vendorId: req.params.vendorId,
    });
    next(error);
  }
};

/**
 * Create new vendor
 * Transactional
 * Filtered by organization scope
 *
 * @route POST /api/vendors
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createVendor = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization: userOrganization, userId } = req.user;
    const vendorData = req.validated.body;

    logger.info("Create vendor request", {
      userId,
      role: req.user.role,
      vendorName: vendorData.name,
    });

    // Validate organization scope
    if (vendorData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        "You can only create vendors in your own organization",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Create vendor with session
    const vendor = new Vendor(vendorData);
    await vendor.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await vendor.populate([
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "organization",
        select: "name",
      },
    ]);

    logger.info("Vendor created successfully", {
      userId,
      vendorId: vendor._id,
      vendorName: vendor.name,
      operationType: "CREATE",
      resourceType: "VENDOR",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(formatSuccessResponse({ vendor }, "Vendor created successfully"));
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Create vendor failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Update vendor
 * Transactional
 * Filtered by organization scope
 *
 * @route PUT /api/vendors/:vendorId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateVendor = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vendorId } = req.params;
    const updateData = req.validated.body;

    logger.info("Update vendor request", {
      userId: req.user.userId,
      vendorId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Find vendor with session
    const vendor = await findResourceById(Vendor, vendorId, {
      session,
      resourceType: "Vendor",
    });

    // Validate vendor is not soft-deleted
    validateNotDeleted(vendor, "update", "vendor");

    // Validate organization scope
    validateOrganizationScope(vendor, req.user, "update", "vendor");

    // Update fields
    Object.keys(updateData).forEach((key) => {
      vendor[key] = updateData[key];
    });

    // Save with session
    await vendor.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await vendor.populate([
      {
        path: "createdBy",
        select: "firstName lastName email profilePicture",
      },
      {
        path: "organization",
        select: "name",
      },
    ]);

    logger.info("Vendor updated successfully", {
      userId: req.user.userId,
      vendorId: vendor._id,
      operationType: "UPDATE",
      resourceType: "VENDOR",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(formatSuccessResponse({ vendor }, "Vendor updated successfully"));
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Update vendor failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      vendorId: req.params.vendorId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete vendor with cascade operations
 * Filtered by organization scope
 * Maintains vendor references in ProjectTasks during soft delete
 *
 * @route DELETE /api/vendors/:vendorId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteVendor = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vendorId } = req.params;
    const { userId } = req.user;

    logger.info("Delete vendor request", {
      userId,
      vendorId,
      role: req.user.role,
    });

    // Find vendor
    const vendor = await findResourceById(Vendor, vendorId, {
      session,
      resourceType: "Vendor",
    });

    // Validate not already deleted
    if (vendor.isDeleted) {
      throw new CustomError(
        "Vendor is already deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope
    validateOrganizationScope(vendor, req.user, "delete", "vendor");

    // Perform cascade delete with validation
    const cascadeResult = await Vendor.cascadeDelete(
      vendorId,
      userId,
      session,
      {
        skipValidation: false,
        force: false,
      }
    );

    // Handle cascade result
    handleCascadeResult(cascadeResult, "delete", userId, logger, "VENDOR");

    // Commit transaction
    await session.commitTransaction();

    logger.info("Vendor deleted successfully", {
      userId,
      vendorId,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "VENDOR",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          vendorId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        "Vendor deleted successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Delete vendor failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      vendorId: req.params.vendorId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Restore soft-deleted vendor with cascade operations
 * Filtered by organization scope
 * Validates parent organization and createdBy user are not deleted
 *
 * @route PUT /api/vendors/:vendorId/restore
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreVendor = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vendorId } = req.params;
    const { userId } = req.user;

    logger.info("Restore vendor request", {
      userId,
      vendorId,
      role: req.user.role,
    });

    // Find vendor (including soft-deleted)
    const vendor = await findResourceById(Vendor, vendorId, {
      includeDeleted: true,
      session,
      resourceType: "Vendor",
    });

    // Validate vendor is deleted
    validateIsDeleted(vendor, "vendor");

    // Validate organization scope
    validateOrganizationScope(vendor, req.user, "restore", "vendor");

    // Perform cascade restore with validation
    const cascadeResult = await Vendor.cascadeRestore(vendorId, session, {
      skipValidation: false,
      validateParents: true,
    });

    // Handle cascade result
    handleCascadeResult(cascadeResult, "restore", userId, logger, "VENDOR");

    // Commit transaction
    await session.commitTransaction();

    logger.info("Vendor restored successfully", {
      userId,
      vendorId,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "VENDOR",
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          vendorId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        "Vendor restored successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Restore vendor failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      vendorId: req.params.vendorId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

export default {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  restoreVendor,
};
