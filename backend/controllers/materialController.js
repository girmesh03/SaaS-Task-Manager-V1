import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Material } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES, USER_ROLES } from "../utils/constants.js";
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
import { emitToOrganization } from "../utils/socketEmitter.js";

/**
 * Material Controller
 * Handles material management operations: list, read, create, update, delete, restore
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * @typedef {Object} MaterialDocument
 * @property {mongoose.Types.ObjectId} _id - Material ID
 * @property {string} name - Material name
 * @property {string} unit - Unit of measurement
 * @property {string} category - Material category
 * @property {number} price - Material price
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} department - Department reference
 * @property {mongoose.Types.ObjectId} createdBy - User who created the material
 * @property {mongoose.Types.ObjectId} addedBy - User who added the material
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
 * Standard population configuration for material queries
 * @constant
 */
const MATERIAL_POPULATE_CONFIG = [
  {
    path: "createdBy",
    select: "firstName lastName email profilePicture",
  },
  {
    path: "addedBy",
    select: "firstName lastName email profilePicture",
  },
  {
    path: "organization",
    select: "name",
  },
  {
    path: "department",
    select: "name",
  },
];

/**
 * Get all materials with pagination and filtering
 * Filtered by organization and department scope
 *
 * @route GET /api/materials
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllMaterials = asyncHandler(async (req, res, next) => {
  try {
    const {
      organization: userOrganization,
      department: userDepartment,
      isHod,
    } = req.user;

    // Extract query parameters from validated data
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      category,
      organization,
      department,
    } = req.validated.query || {};

    logger.info("Get all materials request", {
      userId: req.user.userId,
      role: req.user.role,
      filters: {
        deleted,
        page,
        limit,
        search,
        category,
        organization,
        department,
      },
    });

    // Build filter query
    const filter = {};

    // Organization Scope (always applied)
    filter.organization = userOrganization._id;

    // Department Scope
    // If explicit department filter provided, use it (validated by validator/middleware to be within org)
    // If no explicit filter:
    // - If SuperAdmin/Admin/Manager: Can see all departments they have access to
    // - If User (not HOD): Scoped to their department
    if (department) {
      filter.department = department;
    } else if (!isHod && req.user.role === USER_ROLES.USER) {
      filter.department = userDepartment._id;
    }

    // Category Filter
    if (category) {
      filter.category = category;
    }

    // Search Filter (Name)
    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: "i" };
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: MATERIAL_POPULATE_CONFIG,
      lean: true,
    };

    let query = Material.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await Material.paginate(query, options);

    logger.info("Materials retrieved successfully", {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          materials: result.docs,
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
        "Materials retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Get all materials failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Get material by ID
 * Filtered by organization scope
 *
 * @route GET /api/materials/:materialId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getMaterialById = asyncHandler(async (req, res, next) => {
  try {
    const { materialId } = req.params;

    logger.info("Get material by ID request", {
      userId: req.user.userId,
      materialId,
      role: req.user.role,
    });

    // Find material (including soft-deleted) using helper
    const material = await findResourceById(Material, materialId, {
      includeDeleted: true,
      resourceType: "Material",
    });

    // Populate and convert to plain object
    await material.populate(MATERIAL_POPULATE_CONFIG);
    const materialObj = material.toObject();

    // Validate organization scope
    validateOrganizationScope(materialObj, req.user, "access", "material");

    logger.info("Material retrieved successfully", {
      userId: req.user.userId,
      materialId: materialObj._id,
      category: materialObj.category,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { material: materialObj },
          "Material retrieved successfully"
        )
      );
  } catch (error) {
    logger.error("Get material by ID failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      materialId: req.params.materialId,
    });
    next(error);
  }
});

/**
 * Create new material
 * Transactional
 * Filtered by organization scope
 *
 * @route POST /api/materials
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createMaterial = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization: userOrganization, userId } = req.user;
    const materialData = req.validated.body;

    logger.info("Create material request", {
      userId,
      role: req.user.role,
      category: materialData.category,
    });

    // Validate organization scope
    if (materialData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        "You can only create materials in your own organization",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Create material with session
    const material = new Material(materialData);
    await material.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await material.populate(MATERIAL_POPULATE_CONFIG);

    logger.info("Material created successfully", {
      userId,
      materialId: material._id,
      category: material.category,
      operationType: "CREATE",
      resourceType: "MATERIAL",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization("material:created", { material }, material.organization);

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        formatSuccessResponse({ material }, "Material created successfully")
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Create material failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Update material
 * Transactional
 * Filtered by organization scope
 *
 * @route PUT /api/materials/:materialId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateMaterial = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { materialId } = req.params;
    const updateData = req.validated.body;

    logger.info("Update material request", {
      userId: req.user.userId,
      materialId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Find material with session
    const material = await findResourceById(Material, materialId, {
      session,
      resourceType: "Material",
    });

    // Validate material is not soft-deleted
    validateNotDeleted(material, "update", "material");

    // Validate organization scope
    validateOrganizationScope(material, req.user, "update", "material");

    // Update fields
    Object.keys(updateData).forEach((key) => {
      material[key] = updateData[key];
    });

    // Save with session
    await material.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response
    await material.populate(MATERIAL_POPULATE_CONFIG);

    logger.info("Material updated successfully", {
      userId: req.user.userId,
      materialId: material._id,
      operationType: "UPDATE",
      resourceType: "MATERIAL",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization("material:updated", { material }, material.organization);

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse({ material }, "Material updated successfully")
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Update material failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      materialId: req.params.materialId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Soft delete material with cascade operations
 * Filtered by organization scope
 * Removes material references from tasks and activities
 *
 * @route DELETE /api/materials/:materialId
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteMaterial = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { materialId } = req.params;
    const { userId } = req.user;

    logger.info("Delete material request", {
      userId,
      materialId,
      role: req.user.role,
    });

    // Find material
    const material = await findResourceById(Material, materialId, {
      session,
      resourceType: "Material",
    });

    // Validate not already deleted
    if (material.isDeleted) {
      throw new CustomError(
        "Material is already deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope
    validateOrganizationScope(material, req.user, "delete", "material");

    // Perform cascade delete with validation
    const cascadeResult = await Material.cascadeDelete(
      materialId,
      userId,
      session,
      {
        skipValidation: false,
        force: false,
      }
    );

    // Handle cascade result
    handleCascadeResult(cascadeResult, "delete", userId, logger, "MATERIAL");

    // Commit transaction
    await session.commitTransaction();

    logger.info("Material deleted successfully", {
      userId,
      materialId,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "MATERIAL",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization(
      "material:deleted",
      { materialId, deletedCount: cascadeResult.deletedCount },
      material.organization
    );

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          materialId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        "Material deleted successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Delete material failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      materialId: req.params.materialId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Restore soft-deleted material with cascade operations
 * Filtered by organization scope
 * Validates parent organization and department are not deleted
 *
 * @route PUT /api/materials/:materialId/restore
 * @access Private (SuperAdmin, Admin, Manager)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreMaterial = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { materialId } = req.params;
    const { userId } = req.user;

    logger.info("Restore material request", {
      userId,
      materialId,
      role: req.user.role,
    });

    // Find material (including soft-deleted)
    const material = await findResourceById(Material, materialId, {
      includeDeleted: true,
      session,
      resourceType: "Material",
    });

    // Validate material is deleted
    validateIsDeleted(material, "material");

    // Validate organization scope
    validateOrganizationScope(material, req.user, "restore", "material");

    // Perform cascade restore with validation
    const cascadeResult = await Material.cascadeRestore(materialId, session, {
      skipValidation: false,
      validateParents: true,
    });

    // Handle cascade result
    handleCascadeResult(cascadeResult, "restore", userId, logger, "MATERIAL");

    // Commit transaction
    await session.commitTransaction();

    logger.info("Material restored successfully", {
      userId,
      materialId,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "MATERIAL",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization(
      "material:restored",
      { materialId, restoredCount: cascadeResult.restoredCount },
      material.organization
    );

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          materialId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        "Material restored successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Restore material failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      materialId: req.params.materialId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

export default {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  restoreMaterial,
};
