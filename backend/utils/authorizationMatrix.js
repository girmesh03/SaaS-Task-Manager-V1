import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { USER_ROLES } from "./constants.js";
import logger from "./logger.js";

/**
 * Authorization Matrix Utilities
 * Permission check functions based on role-based access control
 *
 * Requirements: 6.4, 6.5, 6.11, 6.12, 6.13
 */

// Get current file directory (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load authorization matrix from JSON file
const authorizationMatrixPath = path.join(
  __dirname,
  "../config/authorizationMatrix.json"
);
let authorizationMatrix;

try {
  const matrixData = fs.readFileSync(authorizationMatrixPath, "utf8");
  authorizationMatrix = JSON.parse(matrixData);
  logger.info("Authorization matrix loaded successfully");
} catch (error) {
  logger.error("Failed to load authorization matrix:", {
    error: error.message,
    path: authorizationMatrixPath,
  });
  throw new Error("Authorization matrix configuration not found");
}

/**
 * Get permissions for a specific role and resource
 * @param {string} role - User role (SuperAdmin, Admin, Manager, User)
 * @param {string} resource - Resource name (users, tasks, etc.)
 * @returns {Array<string>} Array of allowed operations
 */
export const getPermissions = (role, resource) => {
  try {
    if (!authorizationMatrix[role]) {
      logger.warn(`Role not found in authorization matrix: ${role}`);
      return [];
    }

    const permissions = authorizationMatrix[role].resources[resource] || [];
    return permissions;
  } catch (error) {
    logger.error("Error getting permissions:", {
      error: error.message,
      role,
      resource,
    });
    return [];
  }
};

/**
 * Check if user has permission for specific operation on resource
 * @param {string} role - User role
 * @param {string} resource - Resource name
 * @param {string} operation - Operation (create, read, update, delete, restore)
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (role, resource, operation) => {
  try {
    const permissions = getPermissions(role, resource);
    return permissions.includes(operation);
  } catch (error) {
    logger.error("Error checking permission:", {
      error: error.message,
      role,
      resource,
      operation,
    });
    return false;
  }
};

/**
 * Get scope permissions for a role
 * @param {string} role - User role
 * @returns {Object} Scope permissions (own, ownDept, crossDept, crossOrg)
 */
export const getScopePermissions = (role) => {
  try {
    if (!authorizationMatrix[role]) {
      logger.warn(`Role not found in authorization matrix: ${role}`);
      return {
        own: [],
        ownDept: [],
        crossDept: [],
        crossOrg: [],
      };
    }

    return {
      own: authorizationMatrix[role].own || [],
      ownDept: authorizationMatrix[role].ownDept || [],
      crossDept: authorizationMatrix[role].crossDept || [],
      crossOrg: authorizationMatrix[role].crossOrg || [],
    };
  } catch (error) {
    logger.error("Error getting scope permissions:", {
      error: error.message,
      role,
    });
    return {
      own: [],
      ownDept: [],
      crossDept: [],
      crossOrg: [],
    };
  }
};

/**
 * Get ownership fields for a resource
 * @param {string} resource - Resource name
 * @returns {Array<string>} Array of ownership field names
 */
export const getOwnershipFields = (resource) => {
  try {
    return authorizationMatrix.ownershipFields[resource] || [];
  } catch (error) {
    logger.error("Error getting ownership fields:", {
      error: error.message,
      resource,
    });
    return [];
  }
};

/**
 * Check if user owns a resource
 * @param {Object} user - User object from req.user
 * @param {Object} document - Resource document from database
 * @param {string} resource - Resource name
 * @returns {boolean} True if user owns the resource
 */
export const checkOwnership = (user, document, resource) => {
  try {
    if (!user || !document) {
      return false;
    }

    const ownershipFields = getOwnershipFields(resource);

    if (ownershipFields.length === 0) {
      logger.warn(`No ownership fields defined for resource: ${resource}`);
      return false;
    }

    // Check each ownership field
    for (const field of ownershipFields) {
      const fieldValue = document[field];

      // Handle single value (ObjectId or string)
      if (fieldValue && !Array.isArray(fieldValue)) {
        const fieldValueStr = fieldValue.toString();
        const userIdStr = user.userId.toString();

        if (fieldValueStr === userIdStr) {
          return true;
        }
      }

      // Handle array of values (e.g., assignees, watchers, recipients)
      if (Array.isArray(fieldValue)) {
        const userIdStr = user.userId.toString();
        const hasMatch = fieldValue.some((val) => val.toString() === userIdStr);

        if (hasMatch) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error("Error checking ownership:", {
      error: error.message,
      userId: user?.userId,
      resource,
    });
    return false;
  }
};

/**
 * Check if user can access resource based on scope
 * @param {Object} user - User object from req.user
 * @param {Object} document - Resource document from database
 * @param {string} operation - Operation (read, write, delete)
 * @returns {boolean} True if user can access resource
 */
export const checkScopeAccess = (user, document, operation) => {
  try {
    if (!user || !document) {
      return false;
    }

    const scopePermissions = getScopePermissions(user.role);

    // Check if user is Platform SuperAdmin
    const isPlatformSuperAdmin =
      user.role === USER_ROLES.SUPER_ADMIN && user.isPlatformUser === true;

    // Platform SuperAdmin has cross-org read access
    if (isPlatformSuperAdmin && scopePermissions.crossOrg.includes(operation)) {
      return true;
    }

    // Check organization scope
    const userOrgStr = user.organization?.toString();
    const docOrgStr = document.organization?.toString();

    // Different organization - deny access (except Platform SuperAdmin)
    if (userOrgStr && docOrgStr && userOrgStr !== docOrgStr) {
      return false;
    }

    // Check department scope
    const userDeptStr = user.department?.toString();
    const docDeptStr = document.department?.toString();

    // Same department
    if (userDeptStr && docDeptStr && userDeptStr === docDeptStr) {
      return scopePermissions.ownDept.includes(operation);
    }

    // Different department within same organization
    if (userDeptStr && docDeptStr && userDeptStr !== docDeptStr) {
      return scopePermissions.crossDept.includes(operation);
    }

    // No department on document (organization-level resource)
    if (!docDeptStr) {
      return scopePermissions.ownDept.includes(operation);
    }

    return false;
  } catch (error) {
    logger.error("Error checking scope access:", {
      error: error.message,
      userId: user?.userId,
      operation,
    });
    return false;
  }
};

/**
 * Check if Platform SuperAdmin can modify customer organization
 * Platform SuperAdmin can only READ customer organizations, not modify
 * @param {Object} user - User object from req.user
 * @param {Object} organization - Organization document
 * @param {string} operation - Operation (read, write, delete)
 * @returns {boolean} True if operation is allowed
 */
export const checkPlatformSuperAdminAccess = (
  user,
  organization,
  operation
) => {
  try {
    // Check if user is Platform SuperAdmin
    const isPlatformSuperAdmin =
      user.role === USER_ROLES.SUPER_ADMIN && user.isPlatformUser === true;

    if (!isPlatformSuperAdmin) {
      return true; // Not Platform SuperAdmin, allow normal checks
    }

    // Check if organization is customer organization
    const isCustomerOrg = organization.isPlatformOrg === false;

    if (!isCustomerOrg) {
      return true; // Platform organization, allow all operations
    }

    // Customer organization - only allow read operations
    if (operation === "read") {
      return true;
    }

    // Deny write/delete operations on customer organizations
    logger.warn(
      "Platform SuperAdmin attempted to modify customer organization",
      {
        userId: user.userId,
        organizationId: organization._id,
        operation,
      }
    );

    return false;
  } catch (error) {
    logger.error("Error checking Platform SuperAdmin access:", {
      error: error.message,
      userId: user?.userId,
      operation,
    });
    return false;
  }
};

/**
 * Check if user can delete platform organization
 * Platform organizations cannot be deleted
 * @param {Object} organization - Organization document
 * @returns {boolean} True if deletion is allowed
 */
export const canDeleteOrganization = (organization) => {
  try {
    // Platform organizations cannot be deleted
    if (organization.isPlatformOrg === true) {
      logger.warn("Attempted to delete platform organization", {
        organizationId: organization._id,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error checking organization deletion:", {
      error: error.message,
      organizationId: organization?._id,
    });
    return false;
  }
};

export default {
  getPermissions,
  hasPermission,
  getScopePermissions,
  getOwnershipFields,
  checkOwnership,
  checkScopeAccess,
  checkPlatformSuperAdminAccess,
  canDeleteOrganization,
};
