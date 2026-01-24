/**
 * Authorization Helper Utilities
 * Permission check utilities based on authorization matrix
 * MUST match backend authorization logic exactly
 */

import { USER_ROLES } from "./constants";

/**
 * Authorization Matrix
 * MUST match backend/config/authorizationMatrix.json exactly
 */
const AUTHORIZATION_MATRIX = {
  [USER_ROLES.SUPER_ADMIN]: {
    own: ["read", "write", "delete"],
    ownDept: ["read", "write", "delete"],
    crossDept: ["read"],
    crossOrg: ["read", "write", "delete"], // Platform only
    resources: {
      users: ["create", "read", "update", "delete", "restore"],
      departments: ["create", "read", "update", "delete", "restore"],
      organizations: ["create", "read", "update", "delete", "restore"], // Platform only
      tasks: ["create", "read", "update", "delete", "restore"],
      materials: ["create", "read", "update", "delete", "restore"],
      vendors: ["create", "read", "update", "delete", "restore"],
      notifications: ["read", "update", "delete"],
    },
  },
  [USER_ROLES.ADMIN]: {
    own: ["read", "write", "delete"],
    ownDept: ["read", "write", "delete"],
    crossDept: ["read"],
    crossOrg: [],
    resources: {
      users: ["create", "read", "update", "delete"],
      departments: ["read"],
      organizations: ["read"],
      tasks: ["create", "read", "update", "delete"],
      materials: ["create", "read", "update", "delete"],
      vendors: ["create", "read", "update", "delete"],
      notifications: ["read", "update", "delete"],
    },
  },
  [USER_ROLES.MANAGER]: {
    own: ["read", "write", "delete"],
    ownDept: ["read", "write"],
    crossDept: ["read"],
    crossOrg: [],
    resources: {
      users: ["read", "update"],
      departments: ["read"],
      organizations: ["read"],
      tasks: ["create", "read", "update", "delete"],
      materials: ["create", "read", "update"],
      vendors: ["read", "update"],
      notifications: ["read", "update"],
    },
  },
  [USER_ROLES.USER]: {
    own: ["read", "write"],
    ownDept: ["read"],
    crossDept: [],
    crossOrg: [],
    resources: {
      users: ["read"],
      departments: ["read"],
      organizations: ["read"],
      tasks: ["create", "read", "update"],
      materials: ["read"],
      vendors: ["read"],
      notifications: ["read", "update"],
    },
  },
};

/**
 * Ownership Fields by Resource
 * MUST match backend authorization logic
 */
const OWNERSHIP_FIELDS = {
  tasks: ["createdBy", "assignees", "watchers"],
  comments: ["createdBy"],
  activities: ["createdBy"],
  notifications: ["recipients"],
  materials: ["createdBy", "uploadedBy"],
  vendors: ["createdBy"],
};

/**
 * Check if user has permission for resource operation
 * @param {Object} user - User object with role, organization, department
 * @param {string} resource - Resource name (e.g., 'tasks', 'users')
 * @param {string} operation - Operation name (e.g., 'create', 'read', 'update', 'delete')
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (user, resource, operation) => {
  if (!user || !user.role) return false;

  const rolePermissions = AUTHORIZATION_MATRIX[user.role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions.resources[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(operation);
};

/**
 * Check if user can create resource
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {boolean} True if user can create
 */
export const canCreate = (user, resource) => {
  return hasPermission(user, resource, "create");
};

/**
 * Check if user can read resource
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {boolean} True if user can read
 */
export const canRead = (user, resource) => {
  return hasPermission(user, resource, "read");
};

/**
 * Check if user can update resource
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {boolean} True if user can update
 */
export const canUpdate = (user, resource) => {
  return hasPermission(user, resource, "update");
};

/**
 * Check if user can delete resource
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {boolean} True if user can delete
 */
export const canDelete = (user, resource) => {
  return hasPermission(user, resource, "delete");
};

/**
 * Check if user can restore resource
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {boolean} True if user can restore
 */
export const canRestore = (user, resource) => {
  return hasPermission(user, resource, "restore");
};

/**
 * Check if user owns resource
 * @param {Object} user - User object with _id
 * @param {string} resource - Resource name
 * @param {Object} document - Resource document
 * @returns {boolean} True if user owns resource
 */
export const isOwner = (user, resource, document) => {
  if (!user || !user._id || !document) return false;

  const ownershipFields = OWNERSHIP_FIELDS[resource];
  if (!ownershipFields) return false;

  return ownershipFields.some((field) => {
    const fieldValue = document[field];

    // Check if field is array (e.g., assignees, watchers, recipients)
    if (Array.isArray(fieldValue)) {
      return fieldValue.some((item) => {
        // Handle populated references
        if (typeof item === "object" && item._id) {
          return item._id === user._id;
        }
        // Handle ObjectId strings
        return item === user._id;
      });
    }

    // Handle populated reference
    if (typeof fieldValue === "object" && fieldValue?._id) {
      return fieldValue._id === user._id;
    }

    // Handle ObjectId string
    return fieldValue === user._id;
  });
};

/**
 * Check if user is in same organization as resource
 * @param {Object} user - User object with organization
 * @param {Object} document - Resource document with organization
 * @returns {boolean} True if same organization
 */
export const isSameOrganization = (user, document) => {
  if (!user || !document) return false;

  const userOrgId =
    typeof user.organization === "object"
      ? user.organization._id
      : user.organization;
  const docOrgId =
    typeof document.organization === "object"
      ? document.organization._id
      : document.organization;

  return userOrgId === docOrgId;
};

/**
 * Check if user is in same department as resource
 * @param {Object} user - User object with department
 * @param {Object} document - Resource document with department
 * @returns {boolean} True if same department
 */
export const isSameDepartment = (user, document) => {
  if (!user || !document) return false;

  const userDeptId =
    typeof user.department === "object" ? user.department._id : user.department;
  const docDeptId =
    typeof document.department === "object"
      ? document.department._id
      : document.department;

  return userDeptId === docDeptId;
};

/**
 * Check if user is platform SuperAdmin
 * @param {Object} user - User object
 * @returns {boolean} True if platform SuperAdmin
 */
export const isPlatformSuperAdmin = (user) => {
  return user?.isPlatformUser === true && user?.role === USER_ROLES.SUPER_ADMIN;
};

/**
 * Check if user is customer SuperAdmin
 * @param {Object} user - User object
 * @returns {boolean} True if customer SuperAdmin
 */
export const isCustomerSuperAdmin = (user) => {
  return (
    user?.isPlatformUser === false && user?.role === USER_ROLES.SUPER_ADMIN
  );
};

/**
 * Check if user is HOD (Head of Department)
 * @param {Object} user - User object
 * @returns {boolean} True if HOD
 */
export const isHOD = (user) => {
  return user?.isHod === true;
};

/**
 * Check if user can access cross-organization resources
 * @param {Object} user - User object
 * @returns {boolean} True if can access cross-org
 */
export const canAccessCrossOrg = (user) => {
  return isPlatformSuperAdmin(user);
};

/**
 * Check if user can access cross-department resources
 * @param {Object} user - User object
 * @returns {boolean} True if can access cross-dept
 */
export const canAccessCrossDept = (user) => {
  if (!user || !user.role) return false;

  const rolePermissions = AUTHORIZATION_MATRIX[user.role];
  if (!rolePermissions) return false;

  return rolePermissions.crossDept.length > 0;
};

/**
 * Get all permissions for user and resource
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {Object} Object with permission flags
 */
export const getPermissions = (user, resource) => {
  return {
    canCreate: canCreate(user, resource),
    canRead: canRead(user, resource),
    canUpdate: canUpdate(user, resource),
    canDelete: canDelete(user, resource),
    canRestore: canRestore(user, resource),
  };
};

/**
 * Check if user can perform operation on specific document
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @param {string} operation - Operation name
 * @param {Object} document - Resource document
 * @returns {boolean} True if user can perform operation
 */
export const canPerformOperation = (user, resource, operation, document) => {
  // Check basic permission
  if (!hasPermission(user, resource, operation)) {
    return false;
  }

  // Platform SuperAdmin can access all
  if (isPlatformSuperAdmin(user)) {
    return true;
  }

  // Check organization scope
  if (!isSameOrganization(user, document)) {
    return false;
  }

  // For "own" operations, check ownership
  const rolePermissions = AUTHORIZATION_MATRIX[user.role];
  if (rolePermissions?.own.includes(operation)) {
    return isOwner(user, resource, document);
  }

  // For "ownDept" operations, check department
  if (rolePermissions?.ownDept.includes(operation)) {
    return isSameDepartment(user, document);
  }

  // For "crossDept" operations, allow if in same organization
  if (rolePermissions?.crossDept.includes(operation)) {
    return isSameOrganization(user, document);
  }

  return true;
};

export default {
  hasPermission,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  canRestore,
  isOwner,
  isSameOrganization,
  isSameDepartment,
  isPlatformSuperAdmin,
  isCustomerSuperAdmin,
  isHOD,
  canAccessCrossOrg,
  canAccessCrossDept,
  getPermissions,
  canPerformOperation,
};
