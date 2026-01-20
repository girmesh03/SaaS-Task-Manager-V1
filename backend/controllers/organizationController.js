import mongoose from "mongoose";
import { Organization } from "../models/index.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  formatSuccessResponse,
  getPaginationOptions,
  escapeRegex,
  isPlatformSuperAdmin as checkIsPlatformSuperAdmin,
} from "../utils/helpers.js";

/**
 * @typedef {Object} OrganizationDocument
 * @property {mongoose.Types.ObjectId} _id - Organization ID
 * @property {string} name - Organization name
 * @property {string} description - Organization description
 * @property {string} email - Organization email
 * @property {string} phone - Organization phone
 * @property {string} address - Organization address
 * @property {string} industry - Industry type
 * @property {string} size - Organization size
 * @property {Object} logo - Logo information
 * @property {string} logo.url - Cloudinary URL
 * @property {string} logo.publicId - Cloudinary public ID
 * @property {mongoose.Types.ObjectId} createdBy - User who created the organization
 * @property {boolean} isPlatformOrg - Platform organization flag
 * @property {Object} subscription - Subscription information
 * @property {string} subscription.plan - Subscription plan
 * @property {string} subscription.status - Subscription status
 * @property {Date} subscription.expiresAt - Subscription expiry date
 * @property {Object} settings - Organization settings
 * @property {string} settings.timezone - Timezone
 * @property {string} settings.dateFormat - Date format
 * @property {string} settings.language - Language
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
 * Organization Controller
 * Handles organization management operations: list, read, update, delete, restore
 *
 * NOTE: Organization creation is NOT done via API route - it's done via register endpoint
 * These controllers are for Platform SuperAdmin managing customer organizations
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7, 40.8, 40.9, 40.10, 40.11, 40.12, 40.14
 */

/**
 * Get all organizations with pagination and filtering
 * Platform SuperAdmin can read all organizations
 * Customer SuperAdmin can only read own organization
 *
 * @route GET /api/organizations
 * @access Private (SuperAdmin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getAllOrganizations = async (req, res, next) => {
  try {
    const { role, isPlatformUser, organization: userOrganization } = req.user;

    // Extract query parameters from validated data (Requirement 41.5)
    const {
      deleted = false,
      page = 1,
      limit = 10,
      search = "",
      industry,
      size,
      isPlatformOrg,
    } = req.validated.query || {};

    logger.info("Get all organizations request", {
      userId: req.user.userId,
      role,
      isPlatformUser,
      filters: { deleted, page, limit, search, industry, size, isPlatformOrg },
    });

    // Build filter query
    const filter = {};

    // Platform SuperAdmin can read all organizations (Requirement 6.1)
    // Customer SuperAdmin can only read own organization (Requirement 6.3)
    const isPlatformSuperAdmin = checkIsPlatformSuperAdmin(req.user);

    if (!isPlatformSuperAdmin) {
      // Customer users can only see their own organization
      filter._id = userOrganization._id;
    }

    // Apply search filter with regex escaping to prevent injection
    if (search && search.trim() !== "") {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Apply industry filter
    if (industry) {
      filter.industry = industry;
    }

    // Apply size filter
    if (size) {
      filter.size = size;
    }

    // Apply isPlatformOrg filter
    if (isPlatformOrg !== undefined) {
      filter.isPlatformOrg = isPlatformOrg === "true" || isPlatformOrg === true;
    }

    // Get pagination options (Requirement 40.2)
    const paginationOptions = getPaginationOptions(page, limit);

    // Configure mongoose-paginate-v2 options
    const options = {
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      sort: { createdAt: -1 },
      populate: [
        {
          path: "createdBy",
          select: "firstName lastName email employeeId",
        },
      ],
      select:
        "name description email phone address industry size logo isPlatformOrg subscription settings createdAt updatedAt isDeleted deletedAt",
      lean: true,
      // Include deleted documents if requested (Requirement 40.3)
      ...(deleted === "true" || deleted === true ? { withDeleted: true } : {}),
    };

    // Execute paginated query
    const result = await Organization.paginate(filter, options);

    logger.info("Organizations retrieved successfully", {
      userId: req.user.userId,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
    });

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          organizations: result.docs,
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
        "Organizations retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Get all organizations failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    next(error);
  }
};

/**
 * Get organization by ID
 * Platform SuperAdmin can read all organizations
 * Customer SuperAdmin can only read own organization
 *
 * @route GET /api/organizations/:organizationId
 * @access Private (SuperAdmin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const getOrganizationById = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const { role, isPlatformUser, organization: userOrganization } = req.user;

    logger.info("Get organization by ID request", {
      userId: req.user.userId,
      organizationId,
      role,
      isPlatformUser,
    });

    // Platform SuperAdmin can read all organizations (Requirement 6.1)
    // Customer SuperAdmin can only read own organization (Requirement 6.3)
    const isPlatformSuperAdmin = checkIsPlatformSuperAdmin(req.user);

    if (!isPlatformSuperAdmin) {
      // Customer users can only see their own organization
      if (organizationId !== userOrganization._id.toString()) {
        throw new CustomError(
          "You do not have permission to access this organization",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN_ERROR
        );
      }
    }

    // Find organization (including soft-deleted for Platform SuperAdmin)
    /** @type {OrganizationDocument | null} */
    const organization = await Organization.findById(organizationId)
      .withDeleted()
      .populate({
        path: "createdBy",
        select: "firstName lastName email employeeId",
      })
      .select(
        "name description email phone address industry size logo isPlatformOrg subscription settings createdAt updatedAt isDeleted deletedAt deletedBy"
      )
      .lean();

    if (!organization) {
      throw new CustomError(
        `Organization with ID ${organizationId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    logger.info("Organization retrieved successfully", {
      userId: req.user.userId,
      organizationId: organization._id,
      organizationName: organization.name,
    });

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { organization },
          "Organization retrieved successfully"
        )
      );
  } catch (error) {
    logger.error("Get organization by ID failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      organizationId: req.params.organizationId,
    });
    next(error);
  }
};

/**
 * Update organization
 * Platform SuperAdmin can only read customer organizations (Requirement 6.2)
 * Customer SuperAdmin can update own organization
 *
 * @route PUT /api/organizations/:organizationId
 * @access Private (SuperAdmin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const updateOrganization = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organizationId } = req.params;
    const { role, isPlatformUser, organization: userOrganization } = req.user;
    const updateData = req.validated.body;

    logger.info("Update organization request", {
      userId: req.user.userId,
      organizationId,
      role,
      isPlatformUser,
      updateFields: Object.keys(updateData),
    });

    // Platform SuperAdmin CANNOT modify customer organizations (Requirement 6.2)
    const isPlatformSuperAdmin = checkIsPlatformSuperAdmin(req.user);

    // Find organization with session (Requirement 40.4)
    /** @type {OrganizationDocument | null} */
    const organization = await Organization.findById(organizationId).session(
      session
    );

    if (!organization) {
      throw new CustomError(
        `Organization with ID ${organizationId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Check if organization is soft-deleted
    if (organization.isDeleted) {
      throw new CustomError(
        "Cannot update deleted organization",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Platform SuperAdmin can only read customer organizations, not modify
    if (isPlatformSuperAdmin && !organization.isPlatformOrg) {
      throw new CustomError(
        "Platform SuperAdmin can only read customer organizations",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Customer SuperAdmin can only update own organization
    if (!isPlatformSuperAdmin) {
      if (organizationId !== userOrganization._id.toString()) {
        throw new CustomError(
          "You do not have permission to update this organization",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN_ERROR
        );
      }
    }

    // Update organization fields (let Mongoose handle validation)
    Object.keys(updateData).forEach((key) => {
      organization[key] = updateData[key];
    });

    // Save organization with session (Requirement 40.4)
    await organization.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate createdBy for response (after transaction commit)
    await organization.populate({
      path: "createdBy",
      select: "firstName lastName email employeeId",
    });

    logger.info("Organization updated successfully", {
      userId: req.user.userId,
      organizationId: organization._id,
      organizationName: organization.name,
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res
      .status(HTTP_STATUS.OK)
      .json(
        formatSuccessResponse(
          { organization: organization.toObject() },
          "Organization updated successfully"
        )
      );
  } catch (error) {
    // Rollback transaction on error
    try {
      await session.abortTransaction();
    } catch (abortError) {
      logger.error("Failed to abort transaction", {
        error: abortError.message,
        originalError: error.message,
      });
    }

    logger.error("Update organization failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      organizationId: req.params.organizationId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete organization with cascade operations
 * Platform SuperAdmin can delete customer organizations
 * Customer SuperAdmin CANNOT delete own organization (Requirement 6.3)
 * Platform organization CANNOT be deleted (Requirement 7.12)
 *
 * @route DELETE /api/organizations/:organizationId
 * @access Private (Platform SuperAdmin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const deleteOrganization = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organizationId } = req.params;
    const { role, isPlatformUser, userId } = req.user;

    logger.info("Delete organization request", {
      userId,
      organizationId,
      role,
      isPlatformUser,
    });

    // Only Platform SuperAdmin can delete organizations
    const isPlatformSuperAdmin = checkIsPlatformSuperAdmin(req.user);

    if (!isPlatformSuperAdmin) {
      throw new CustomError(
        "Only Platform SuperAdmin can delete organizations",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Find organization
    /** @type {OrganizationDocument | null} */
    const organization = await Organization.findById(organizationId).session(
      session
    );

    if (!organization) {
      throw new CustomError(
        `Organization with ID ${organizationId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Check if organization is already deleted
    if (organization.isDeleted) {
      throw new CustomError(
        "Organization is already deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Platform organization CANNOT be deleted (Requirement 7.12)
    if (organization.isPlatformOrg) {
      throw new CustomError(
        "Platform organization cannot be deleted",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Perform cascade delete with validation (Requirement 40.5, 40.6)
    const cascadeResult = await Organization.cascadeDelete(
      organizationId,
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
      await session.abortTransaction();

      logger.error("Cascade delete failed", {
        userId,
        organizationId,
        errors: cascadeResult.errors,
        warnings: cascadeResult.warnings,
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

    logger.info("Organization deleted successfully", {
      userId,
      organizationId,
      organizationName: organization.name,
      deletedCount: cascadeResult.deletedCount,
      warnings: cascadeResult.warnings,
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          organizationId,
          deletedCount: cascadeResult.deletedCount,
          warnings: cascadeResult.warnings,
        },
        "Organization deleted successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    try {
      await session.abortTransaction();
    } catch (abortError) {
      logger.error("Failed to abort transaction", {
        error: abortError.message,
        originalError: error.message,
      });
    }

    logger.error("Delete organization failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      organizationId: req.params.organizationId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Restore soft-deleted organization with cascade operations
 * Platform SuperAdmin can restore customer organizations
 *
 * @route PUT /api/organizations/:organizationId/restore
 * @access Private (Platform SuperAdmin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const restoreOrganization = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organizationId } = req.params;
    const { role, isPlatformUser, userId } = req.user;

    logger.info("Restore organization request", {
      userId,
      organizationId,
      role,
      isPlatformUser,
    });

    // Only Platform SuperAdmin can restore organizations
    const isPlatformSuperAdmin = checkIsPlatformSuperAdmin(req.user);

    if (!isPlatformSuperAdmin) {
      throw new CustomError(
        "Only Platform SuperAdmin can restore organizations",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    // Find organization (including soft-deleted)
    /** @type {OrganizationDocument | null} */
    const organization = await Organization.findById(organizationId)
      .withDeleted()
      .session(session);

    if (!organization) {
      throw new CustomError(
        `Organization with ID ${organizationId} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND_ERROR
      );
    }

    // Check if organization is deleted
    if (!organization.isDeleted) {
      throw new CustomError(
        "Organization is not deleted",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Perform cascade restore with validation (Requirement 40.5, 40.6)
    const cascadeResult = await Organization.cascadeRestore(
      organizationId,
      session,
      {
        skipValidation: false,
        validateParents: true,
      }
    );

    // Check if cascade restore was successful
    if (!cascadeResult.success) {
      // Rollback transaction
      await session.abortTransaction();

      logger.error("Cascade restore failed", {
        userId,
        organizationId,
        errors: cascadeResult.errors,
        warnings: cascadeResult.warnings,
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

    logger.info("Organization restored successfully", {
      userId,
      organizationId,
      organizationName: organization.name,
      restoredCount: cascadeResult.restoredCount,
      warnings: cascadeResult.warnings,
    });

    // TODO: Emit Socket.IO event for real-time updates (will be implemented in Task 19.2)

    // Return success response
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(
        {
          organizationId,
          restoredCount: cascadeResult.restoredCount,
          warnings: cascadeResult.warnings,
        },
        "Organization restored successfully"
      )
    );
  } catch (error) {
    // Rollback transaction on error
    try {
      await session.abortTransaction();
    } catch (abortError) {
      logger.error("Failed to abort transaction", {
        error: abortError.message,
        originalError: error.message,
      });
    }

    logger.error("Restore organization failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      organizationId: req.params.organizationId,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

export default {
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  restoreOrganization,
};
