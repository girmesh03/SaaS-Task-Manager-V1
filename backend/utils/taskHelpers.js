import { escapeRegex } from "./helpers.js";
import { buildSearchFilter } from "./controllerHelpers.js";

/**
 * Task-specific Helper Functions
 * Utility functions for task controller operations
 */

/**
 * Build filter query for task list
 * @param {Object} params - Query parameters
 * @param {Object} user - Authenticated user
 * @returns {Object} MongoDB filter query
 */
export const buildTaskFilter = (params, user) => {
  const {
    search,
    taskType,
    status,
    priority,
    department,
    createdBy,
    assignee,
    vendor,
    startDate,
    endDate,
  } = params;

  const {
    organization: userOrganization,
    department: userDepartment,
    isHod,
  } = user;

  const filter = {
    organization: userOrganization._id,
  };

  // Department scoping: if department provided and isHod, use provided department
  // Otherwise, use req.user.department._id
  if (department && isHod) {
    filter.department = department;
  } else {
    filter.department = userDepartment._id;
  }

  // Search filter with validation
  const searchFilter = buildSearchFilter(
    search,
    ["description", "title", "tags"],
    escapeRegex,
    100
  );
  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  // Simple filters
  if (taskType) filter.taskType = taskType;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (createdBy) filter.createdBy = createdBy;
  if (assignee) filter.assignees = assignee;
  if (vendor) filter.vendor = vendor;

  // Date range filters
  if (startDate || endDate) {
    filter.$and = filter.$and || [];

    if (startDate) {
      filter.$and.push({
        $or: [
          { startDate: { $gte: new Date(startDate) } },
          { date: { $gte: new Date(startDate) } },
          { dueDate: { $gte: new Date(startDate) } },
        ],
      });
    }

    if (endDate) {
      filter.$and.push({
        $or: [
          { startDate: { $lte: new Date(endDate) } },
          { date: { $lte: new Date(endDate) } },
          { dueDate: { $lte: new Date(endDate) } },
        ],
      });
    }
  }

  return filter;
};

/**
 * Get populate configuration for task queries
 * @param {Array<string>} requestedFields - Optional fields to populate
 * @returns {Array<Object>} Mongoose populate configuration
 */
export const getTaskPopulateConfig = (requestedFields = []) => {
  // Base configuration (always included)
  const baseConfig = [
    {
      path: "organization",
      select: "name email phone address industry size logo isPlatformOrg",
    },
    {
      path: "department",
      select: "name description manager",
    },
    {
      path: "createdBy",
      select: "firstName lastName email employeeId role profilePicture",
    },
  ];

  // If no specific fields requested, return full configuration
  if (requestedFields.length === 0) {
    return [
      ...baseConfig,
      {
        path: "watchers",
        select: "firstName lastName email employeeId role profilePicture",
      },
      {
        path: "attachments",
        select: "filename fileUrl fileType fileSize uploadedBy",
      },
      {
        path: "vendor",
        select: "name email phone rating status address",
      },
      {
        path: "assignees",
        select: "firstName lastName email employeeId role profilePicture",
      },
      {
        path: "materials.material",
        select: "name unit category price",
      },
    ];
  }

  // Add requested fields
  if (requestedFields.includes("watchers")) {
    baseConfig.push({
      path: "watchers",
      select: "firstName lastName email employeeId role profilePicture",
    });
  }

  if (requestedFields.includes("attachments")) {
    baseConfig.push({
      path: "attachments",
      select: "filename fileUrl fileType fileSize uploadedBy",
    });
  }

  if (requestedFields.includes("vendor")) {
    baseConfig.push({
      path: "vendor",
      select: "name email phone rating status address",
    });
  }

  if (requestedFields.includes("assignees")) {
    baseConfig.push({
      path: "assignees",
      select: "firstName lastName email employeeId role profilePicture",
    });
  }

  if (requestedFields.includes("materials")) {
    baseConfig.push({
      path: "materials.material",
      select: "name unit category price",
    });
  }

  return baseConfig;
};

/**
 * Get select fields for task queries
 * @returns {string} Space-separated field names
 */
export const getTaskSelectFields = () => {
  return "description status priority organization department createdBy attachments watchers taskType tags createdAt updatedAt isDeleted deletedAt deletedBy title vendor milestones startDate dueDate date recurrence materials assignees";
};

export default {
  buildTaskFilter,
  getTaskPopulateConfig,
  getTaskSelectFields,
};
