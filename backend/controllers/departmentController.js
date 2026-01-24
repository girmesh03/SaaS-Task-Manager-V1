import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Department } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  escapeRegex,
  safeAbortTransaction,
} from "../utils/helpers.js";
import { emitToOrganization } from "../utils/socketEmitter.js";

/**
 * @typedef {Object} DepartmentDocument
 * @property {mongoose.Types.ObjectId} _id - Department ID
 * @property {string} name - Department name
 * @property {mongoose.Types.ObjectId} organization - Organization reference
 * @property {mongoose.Types.ObjectId} manager - Manager reference
 * @property {string} description - Department description
 * @property {mongoose.Types.ObjectId} createdBy - User who created the department
 * @property {boolean} isDeleted - Soft delete flag
 * @property {Date} deletedAt - Deletion timestamp
 * @property {mongoose.Types.ObjectId} deletedBy - User who deleted
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 * @property {Function} softDelete - Soft delete method
 * @property {Function} restore - Restore method
 * @property {Function} save - Save document
 * @property {Function} toObject - Convert to plain object
 */

/**
 * Standard population configuration for department queries
 * @constant
 */
const DEPARTMENT_POPULATE_CONFIG = [
  {
    path: "organization",
    select: "name email phone address industry size logo isPlatformOrg",
  },
  {
    path: "manager",
    select: "firstName lastName email employeeId role isHod profilePicture",
  },
  {
    path: "createdBy",
    select: "firstName lastName email employeeId profilePicture",
  },
];

/**
 * Standard select fields for department queries
 * @constant
 */
const DEPARTMENT_SELECT_FIELDS =
  "name description organization manager createdBy createdAt updatedAt isDeleted deletedAt deletedBy";

/**
 * Department Controller
 * Handles department management operations: list, read, create, update, delete, restore
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * Get all departments with pagination and filtering
 * Filtered by organization scope
 *
 * @route GET /api/departments
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllDepartments = asyncHandler(async (req, res, next) => {
  try {
    const { organization: userOrganization } = req.user;

    // Extract query parameters from validated data (Requirement 41.5)
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      organization,
      manager,
    } = req.validated.query || {};

    logger.info("Get all departments request", {
      userId: req.user.userId,
      role: req.user.role,
      filters: { deleted, page, limit, search, organization, manager },
    });

    // Build filter query (Requirement 40.1)
    const filter = {};

    // Filter by organization scope - users can only see departments in their organization
    filter.organization = userOrganization._id;

    // Apply search filter with regex escaping to prevent injection
    if (search && search.trim() !== "") {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Apply manager filter
    if (manager) {
      filter.manager = manager;
    }

    // Get pagination options (Requirement 40.2)
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: DEPARTMENT_POPULATE_CONFIG,
      select: DEPARTMENT_SELECT_FIELDS,
      lean: true,
    };

    // Build query with soft delete handling (Requirement 40.3)
    let query = Department.find(filter);
    if (deleted === "true" || deleted === true) query = query.withDeleted();
    else if (deleted === "only") query = query.onlyDeleted();

    // Execute paginated query
    const result = await Department.paginate(query, options);

    logger.info("Departments retrieved successfully", {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          departments: result.docs,
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
        "Departments retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Get all departments failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * Get department by ID
 * Filtered by organization scope
 *
 * @route GET /api/departments/:departmentId
 * @access Private (SuperAdmin, Admin, Manager, User)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getDepartmentById = asyncHandler(async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { organization: userOrganization } = req.user;

    logger.info("Get department by ID request", {
      userId: req.user.userId,
      departmentId,
      role: req.user.role,
    });

    // Find department (including soft-deleted)
    /** @type {DepartmentDocument | null} */
    const department = await Department.findById(departmentId)
      .withDeleted()
      .populate(DEPARTMENT_POPULATE_CONFIG)
      .select(DEPARTMENT_SELECT_FIELDS)
      .lean();

    if (!department) {
      throw new CustomError(
        `Department with ID ${departmentId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Validate organization scope (Requirement 40.1)
    if (
      department.organization._id.toString() !== userOrganization._id.toString()
    ) {
      throw new CustomError(
        "You do not have permission to access this department",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    logger.info("Department retrieved successfully", {
      userId: req.user.userId,
      departmentId: department._id,
      departmentName: department.name,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { department },
          "Department retrieved successfully"
        )
      );
  } catch (error) {
    logger.error("Get department by ID failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      departmentId: req.params.departmentId,
    });
    next(error);
  }
});

/**
 * Create new department
 * Filtered by organization scope
 * Validates manager belongs to same organization
 *
 * @route POST /api/departments
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const createDepartment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization: userOrganization, userId } = req.user;
    const departmentData = req.validated.body;

    logger.info("Create department request", {
      userId,
      role: req.user.role,
      departmentName: departmentData.name,
    });

    // Validate organization scope (Requirement 40.1)
    if (departmentData.organization !== userOrganization._id.toString()) {
      throw new CustomError(
        "You can only create departments in your own organization",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Create department with session (Requirement 40.4)
    const department = new Department({
      ...departmentData,
      createdBy: userId,
    });

    await department.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response (after transaction commit)
    await department.populate(DEPARTMENT_POPULATE_CONFIG);

    logger.info("Department created successfully", {
      userId,
      departmentId: department._id,
      departmentName: department.name,
      operationType: "CREATE",
      resourceType: "DEPARTMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization(
      "department:created",
      { department },
      department.organization
    );

    // Return success response
    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        formatSuccessResponse({ department }, "Department created successfully")
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Create department failed", {
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
 * Update department
 * Filtered by organization scope
 * Validates manager belongs to same organization
 *
 * @route PUT /api/departments/:departmentId
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateDepartment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { departmentId } = req.params;
    const { organization: userOrganization } = req.user;
    const updateData = req.validated.body;

    logger.info("Update department request", {
      userId: req.user.userId,
      departmentId,
      role: req.user.role,
      updateFields: Object.keys(updateData),
    });

    // Find department with session (Requirement 40.4)
    /** @type {DepartmentDocument | null} */
    const department = await Department.findById(departmentId).session(session);

    if (!department) {
      throw new CustomError(
        `Department with ID ${departmentId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Check if department is soft-deleted
    if (department.isDeleted) {
      throw new CustomError(
        "Cannot update deleted department",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope (Requirement 40.1)
    if (
      department.organization.toString() !== userOrganization._id.toString()
    ) {
      throw new CustomError(
        "You do not have permission to update this department",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Update department fields (let Mongoose handle validation)
    Object.keys(updateData).forEach((key) => {
      department[key] = updateData[key];
    });

    // Save department with session (Requirement 40.4)
    await department.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate references for response (after transaction commit)
    await department.populate(DEPARTMENT_POPULATE_CONFIG);

    logger.info("Department updated successfully", {
      userId: req.user.userId,
      departmentId: department._id,
      departmentName: department.name,
      operationType: "UPDATE",
      resourceType: "DEPARTMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization(
      "department:updated",
      { department },
      department.organization
    );

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse({ department }, "Department updated successfully")
      );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Update department failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      departmentId: req.params.departmentId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Soft delete department with cascade operations
 * Filtered by organization scope
 *
 * @route DELETE /api/departments/:departmentId
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteDepartment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { departmentId } = req.params;
    const { organization: userOrganization, userId } = req.user;

    logger.info("Delete department request", {
      userId,
      departmentId,
      role: req.user.role,
    });

    // Find department
    /** @type {DepartmentDocument | null} */
    const department = await Department.findById(departmentId).session(session);

    if (!department) {
      throw new CustomError(
        `Department with ID ${departmentId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Check if department is already deleted
    if (department.isDeleted) {
      throw new CustomError(
        "Department is already deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope (Requirement 40.1)
    if (
      department.organization.toString() !== userOrganization._id.toString()
    ) {
      throw new CustomError(
        "You do not have permission to delete this department",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Perform cascade delete with validation (Requirement 40.5, 40.6)
    const cascadeResult = await Department.cascadeDelete(
      departmentId,
      userId,
      session,
      {
        skipValidation: false,
        force: false,
      }
    );

    // Check if cascade delete was successful
    if (!cascadeResult.success) {
      // Rollback transaction
      const cascadeError = new Error(
        `Cascade delete failed: ${cascadeResult.errors
          .map((e) => e.message)
          .join(", ")}`
      );
      await safeAbortTransaction(session, cascadeError, logger);

      logger.error("Cascade delete failed", {
        userId,
        departmentId,
        errors: cascadeResult.errors,
        warnings: cascadeResult.warnings,
        operationType: "CASCADE_DELETE",
        resourceType: "DEPARTMENT",
      });

      throw new CustomError(
        `Cascade delete failed: ${cascadeResult.errors
          .map((e) => e.message)
          .join(", ")}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Commit transaction (Requirement 40.4)
    await session.commitTransaction();

    logger.info("Department deleted successfully", {
      userId,
      departmentId,
      departmentName: department.name,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_DELETE",
      resourceType: "DEPARTMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization(
      "department:deleted",
      { departmentId, deletedCount: cascadeResult.deletedCount },
      department.organization
    );

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          departmentId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        "Department deleted successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Delete department failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      departmentId: req.params.departmentId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

/**
 * Restore soft-deleted department with cascade operations
 * Filtered by organization scope
 *
 * @route PUT /api/departments/:departmentId/restore
 * @access Private (SuperAdmin, Admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreDepartment = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { departmentId } = req.params;
    const { organization: userOrganization, userId } = req.user;

    logger.info("Restore department request", {
      userId,
      departmentId,
      role: req.user.role,
    });

    // Find department (including soft-deleted)
    /** @type {DepartmentDocument | null} */
    const department = await Department.findById(departmentId)
      .withDeleted()
      .session(session);

    if (!department) {
      throw new CustomError(
        `Department with ID ${departmentId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Check if department is deleted
    if (!department.isDeleted) {
      throw new CustomError(
        "Department is not deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate organization scope (Requirement 40.1)
    if (
      department.organization.toString() !== userOrganization._id.toString()
    ) {
      throw new CustomError(
        "You do not have permission to restore this department",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Perform cascade restore with validation (Requirement 40.5, 40.6)
    const cascadeResult = await Department.cascadeRestore(
      departmentId,
      session,
      {
        skipValidation: false,
        validateParents: true,
      }
    );

    // Check if cascade restore was successful
    if (!cascadeResult.success) {
      // Rollback transaction
      const cascadeError = new Error(
        `Cascade restore failed: ${cascadeResult.errors
          .map((e) => e.message)
          .join(", ")}`
      );
      await safeAbortTransaction(session, cascadeError, logger);

      logger.error("Cascade restore failed", {
        userId,
        departmentId,
        errors: cascadeResult.errors,
        warnings: cascadeResult.warnings,
        operationType: "CASCADE_RESTORE",
        resourceType: "DEPARTMENT",
      });

      throw new CustomError(
        `Cascade restore failed: ${cascadeResult.errors
          .map((e) => e.message)
          .join(", ")}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Commit transaction (Requirement 40.4)
    await session.commitTransaction();

    logger.info("Department restored successfully", {
      userId,
      departmentId,
      departmentName: department.name,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
      operationType: "CASCADE_RESTORE",
      resourceType: "DEPARTMENT",
    });

    // Emit Socket.IO event for real-time updates
    emitToOrganization(
      "department:restored",
      { departmentId, restoredCount: cascadeResult.restoredCount },
      department.organization
    );

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          departmentId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        "Department restored successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    await safeAbortTransaction(session, error, logger);

    logger.error("Restore department failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      departmentId: req.params.departmentId,
    });
    next(error);
  } finally {
    session.endSession();
  }
});

export default {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
};
