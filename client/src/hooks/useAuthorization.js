/**
 * useAuthorization Hook - Authorization Hook
 *
 * Custom hook for checking user permissions based on authorization matrix.
 * Returns permission flags for resource operations.
 * Uses Redux auth state and authorization helper utilities.
 *
 * Requirements: 6.4, 6.5
 */

import { useMemo } from "react";
import useAuth from "./useAuth";
import {
  getPermissions,
  canPerformOperation,
  isOwner,
  isSameOrganization,
  isSameDepartment,
  isPlatformSuperAdmin,
  isCustomerSuperAdmin,
  isHOD,
  canAccessCrossOrg,
  canAccessCrossDept,
} from "../utils/authorizationHelper";

/**
 * useAuthorization hook
 *
 * @param {string} resource - Resource name (e.g., 'tasks', 'users', 'organizations')
 * @returns {Object} Permission flags and helper functions
 * @returns {boolean} return.canCreate - True if user can create resource
 * @returns {boolean} return.canRead - True if user can read resource
 * @returns {boolean} return.canUpdate - True if user can update resource
 * @returns {boolean} return.canDelete - True if user can delete resource
 * @returns {boolean} return.canRestore - True if user can restore resource
 * @returns {Function} return.canPerform - Check if user can perform operation on document
 * @returns {Function} return.isOwner - Check if user owns document
 * @returns {Function} return.isSameOrg - Check if document is in same organization
 * @returns {Function} return.isSameDept - Check if document is in same department
 * @returns {boolean} return.isPlatformSuperAdmin - True if user is platform SuperAdmin
 * @returns {boolean} return.isCustomerSuperAdmin - True if user is customer SuperAdmin
 * @returns {boolean} return.isHOD - True if user is HOD
 * @returns {boolean} return.canAccessCrossOrg - True if user can access cross-org resources
 * @returns {boolean} return.canAccessCrossDept - True if user can access cross-dept resources
 */
const useAuthorization = (resource) => {
  // Get current user from useAuth hook
  const { user } = useAuth();

  // Memoize permissions to avoid recalculation on every render
  const permissions = useMemo(() => {
    if (!user || !resource) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canRestore: false,
      };
    }

    return getPermissions(user, resource);
  }, [user, resource]);

  // Memoize user role checks
  const roleChecks = useMemo(() => {
    if (!user) {
      return {
        isPlatformSuperAdmin: false,
        isCustomerSuperAdmin: false,
        isHOD: false,
        canAccessCrossOrg: false,
        canAccessCrossDept: false,
      };
    }

    return {
      isPlatformSuperAdmin: isPlatformSuperAdmin(user),
      isCustomerSuperAdmin: isCustomerSuperAdmin(user),
      isHOD: isHOD(user),
      canAccessCrossOrg: canAccessCrossOrg(user),
      canAccessCrossDept: canAccessCrossDept(user),
    };
  }, [user]);

  /**
   * Check if user can perform operation on specific document
   * @param {string} operation - Operation name (e.g., 'create', 'read', 'update', 'delete')
   * @param {Object} document - Resource document
   * @returns {boolean} True if user can perform operation
   */
  const canPerform = (operation, document) => {
    if (!user || !resource || !operation) {
      return false;
    }

    // For operations without document (e.g., create), check basic permission
    if (!document) {
      switch (operation) {
        case "create":
          return permissions.canCreate;
        case "read":
          return permissions.canRead;
        case "update":
          return permissions.canUpdate;
        case "delete":
          return permissions.canDelete;
        case "restore":
          return permissions.canRestore;
        default:
          return false;
      }
    }

    // For operations with document, check document-specific permission
    return canPerformOperation(user, resource, operation, document);
  };

  /**
   * Check if user owns document
   * @param {Object} document - Resource document
   * @returns {boolean} True if user owns document
   */
  const checkOwnership = (document) => {
    if (!user || !resource || !document) {
      return false;
    }

    return isOwner(user, resource, document);
  };

  /**
   * Check if document is in same organization as user
   * @param {Object} document - Resource document
   * @returns {boolean} True if same organization
   */
  const isSameOrg = (document) => {
    if (!user || !document) {
      return false;
    }

    return isSameOrganization(user, document);
  };

  /**
   * Check if document is in same department as user
   * @param {Object} document - Resource document
   * @returns {boolean} True if same department
   */
  const isSameDept = (document) => {
    if (!user || !document) {
      return false;
    }

    return isSameDepartment(user, document);
  };

  return {
    // Basic permissions
    canCreate: permissions.canCreate,
    canRead: permissions.canRead,
    canUpdate: permissions.canUpdate,
    canDelete: permissions.canDelete,
    canRestore: permissions.canRestore,

    // Helper functions
    canPerform,
    isOwner: checkOwnership,
    isSameOrg,
    isSameDept,

    // Role checks
    isPlatformSuperAdmin: roleChecks.isPlatformSuperAdmin,
    isCustomerSuperAdmin: roleChecks.isCustomerSuperAdmin,
    isHOD: roleChecks.isHOD,
    canAccessCrossOrg: roleChecks.canAccessCrossOrg,
    canAccessCrossDept: roleChecks.canAccessCrossDept,
  };
};

export default useAuthorization;
