import {
  hasPermission,
  checkOwnership,
  checkScopeAccess,
  checkPlatformSuperAdminAccess,
  canDeleteOrganization,
} from "../utils/authorizationMatrix.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES, USER_ROLES } from "../utils/constants.js";
import logger from "../utils/logger.js";

/**
 * Authorization Middleware
 * Checks user role against authorization matrix
 * Validates organization/department scope
 * Verifies ownership for "own" permissions
 * Returns 403 for authorization failures (not 401)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 6.9, 6.10, 39.2
 */

/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {CustomError} error - Custom error object
 * @returns {Object} JSON response
 */
const sendErrorResponse = (res, error) => {
  return res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Create authorization middleware for specific resource and operation
 * @param {string} resource - Resource name (users, tasks, etc.)
 * @param {string} operation - Operation (create, read, update, delete, restore)
 * @param {Object} options - Additional options
 * @param {boolean} options.checkOwnership - Whether to check ownership
 * @param {boolean} options.checkScope - Whether to check scope
 * @param {Function} options.getDocument - Function to get document from request
 * @returns {Function} Express middleware function
 */
export const authorize = (resource, operation, options = {}) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (should be set by authMiddleware)
      if (!req.user) {
        throw new CustomError(
          "Authentication required",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHENTICATED_ERROR
        );
      }

      const { role, userId, organization, department } = req.user;

      // Check if user has permission for this operation on this resource
      const hasResourcePermission = hasPermission(role, resource, operation);

      if (!hasResourcePermission) {
        logger.warn("Authorization failed - insufficient permissions", {
          userId,
          role,
          resource,
          operation,
          path: req.path,
          method: req.method,
        });

        throw new CustomError(
          `Insufficient permissions to ${operation} ${resource}`,
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN_ERROR
        );
      }

      // If checkOwnership or checkScope is enabled, get the document
      if (options.checkOwnership || options.checkScope) {
        let document = null;

        // Get document using custom function if provided
        if (options.getDocument && typeof options.getDocument === "function") {
          document = await options.getDocument(req);
        }

        // Check ownership if required
        if (options.checkOwnership && document) {
          const isOwner = checkOwnership(req.user, document, resource);

          if (!isOwner) {
            logger.warn("Authorization failed - not owner", {
              userId,
              role,
              resource,
              operation,
              documentId: document._id,
            });

            throw new CustomError(
              `You do not have permission to ${operation} this ${resource}`,
              HTTP_STATUS.FORBIDDEN,
              ERROR_CODES.FORBIDDEN_ERROR
            );
          }
        }

        // Check scope if required
        if (options.checkScope && document) {
          const hasScope = checkScopeAccess(req.user, document, operation);

          if (!hasScope) {
            logger.warn("Authorization failed - scope violation", {
              userId,
              role,
              resource,
              operation,
              userOrg: organization,
              userDept: department,
              docOrg: document.organization,
              docDept: document.department,
            });

            throw new CustomError(
              `You do not have permission to ${operation} this ${resource} in this scope`,
              HTTP_STATUS.FORBIDDEN,
              ERROR_CODES.FORBIDDEN_ERROR
            );
          }
        }

        // Special check for Platform SuperAdmin modifying customer organizations
        if (resource === "organizations" && document) {
          const canAccess = checkPlatformSuperAdminAccess(
            req.user,
            document,
            operation
          );

          if (!canAccess) {
            logger.warn(
              "Authorization failed - Platform SuperAdmin cannot modify customer organization",
              {
                userId,
                organizationId: document._id,
                operation,
              }
            );

            throw new CustomError(
              "Platform SuperAdmin can only read customer organizations",
              HTTP_STATUS.FORBIDDEN,
              ERROR_CODES.FORBIDDEN_ERROR
            );
          }
        }

        // Special check for deleting platform organization
        if (
          resource === "organizations" &&
          operation === "delete" &&
          document
        ) {
          const canDelete = canDeleteOrganization(document);

          if (!canDelete) {
            logger.warn(
              "Authorization failed - cannot delete platform organization",
              {
                userId,
                organizationId: document._id,
              }
            );

            throw new CustomError(
              "Platform organizations cannot be deleted",
              HTTP_STATUS.FORBIDDEN,
              ERROR_CODES.FORBIDDEN_ERROR
            );
          }
        }
      }

      // Authorization successful
      logger.debug("Authorization successful", {
        userId,
        role,
        resource,
        operation,
      });

      next();
    } catch (error) {
      // Return 403 for authorization failures (not 401)
      if (error instanceof CustomError) {
        return sendErrorResponse(res, error);
      }

      // Handle unexpected errors
      logger.error("Authorization error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.userId,
        resource,
        operation,
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN_ERROR,
          message: "Authorization failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
};

/**
 * Check if user can access organization
 * Validates organization scope for multi-tenancy
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export const checkOrganizationAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new CustomError(
        "Authentication required",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    const { organization, isPlatformUser, role } = req.user;

    // Platform SuperAdmin can access all organizations
    const isPlatformSuperAdmin =
      role === USER_ROLES.SUPER_ADMIN && isPlatformUser === true;

    if (isPlatformSuperAdmin) {
      return next();
    }

    // Get organization ID from request (params, body, or query)
    const requestedOrgId =
      req.params.organizationId ||
      req.body.organization ||
      req.query.organization;

    // If no organization ID in request, use user's organization
    if (!requestedOrgId) {
      return next();
    }

    // Check if user's organization matches requested organization
    const userOrgStr = organization?.toString();
    const requestedOrgStr = requestedOrgId.toString();

    if (userOrgStr !== requestedOrgStr) {
      logger.warn("Organization access denied", {
        userId: req.user.userId,
        userOrg: userOrgStr,
        requestedOrg: requestedOrgStr,
      });

      throw new CustomError(
        "You do not have access to this organization",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    next();
  } catch (error) {
    if (error instanceof CustomError) {
      return sendErrorResponse(res, error);
    }

    logger.error("Organization access check error:", {
      error: error.message,
      userId: req.user?.userId,
    });

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN_ERROR,
        message: "Organization access check failed",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Check if user can access department
 * Validates department scope for multi-tenancy
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export const checkDepartmentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new CustomError(
        "Authentication required",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHENTICATED_ERROR
      );
    }

    const { department, role } = req.user;

    // SuperAdmin and Admin can access all departments in their organization
    if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN) {
      return next();
    }

    // Get department ID from request (params, body, or query)
    const requestedDeptId =
      req.params.departmentId || req.body.department || req.query.department;

    // If no department ID in request, use user's department
    if (!requestedDeptId) {
      return next();
    }

    // Check if user's department matches requested department
    const userDeptStr = department?.toString();
    const requestedDeptStr = requestedDeptId.toString();

    if (userDeptStr !== requestedDeptStr) {
      logger.warn("Department access denied", {
        userId: req.user.userId,
        userDept: userDeptStr,
        requestedDept: requestedDeptStr,
      });

      throw new CustomError(
        "You do not have access to this department",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN_ERROR
      );
    }

    next();
  } catch (error) {
    if (error instanceof CustomError) {
      return sendErrorResponse(res, error);
    }

    logger.error("Department access check error:", {
      error: error.message,
      userId: req.user?.userId,
    });

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN_ERROR,
        message: "Department access check failed",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export default {
  authorize,
  checkOrganizationAccess,
  checkDepartmentAccess,
};
