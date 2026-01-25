/**
 * Application Constants
 * SINGLE SOURCE OF TRUTH for all enums and constants
 * MUST match backend constants EXACTLY
 * NEVER hardcode these values - always import from this file
 */

/**
 * Task Status Enum
 * @readonly
 * @enum {string}
 */
export const TASK_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
};

/**
 * Task Priority Enum
 * @readonly
 * @enum {string}
 */
export const TASK_PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
};

/**
 * User Roles Enum
 * @readonly
 * @enum {string}
 */
export const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  USER: "User",
};

/**
 * Activity Types Enum
 * @readonly
 * @enum {string}
 */
export const ACTIVITY_TYPES = {
  STATUS_CHANGE: "STATUS_CHANGE",
  COMMENT: "COMMENT",
  ATTACHMENT: "ATTACHMENT",
  ASSIGNMENT: "ASSIGNMENT",
  COMPLETION: "COMPLETION",
};

/**
 * Notification Types Enum
 * @readonly
 * @enum {string}
 */
export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_UPDATED: "TASK_UPDATED",
  COMMENT_ADDED: "COMMENT_ADDED",
  MENTION: "MENTION",
  SYSTEM_ALERT: "SYSTEM_ALERT",
};

/**
 * Vendor Status Enum
 * @readonly
 * @enum {string}
 */
export const VENDOR_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
};

/**
 * Material Category Enum
 * @readonly
 * @enum {string}
 */
export const MATERIAL_CATEGORY = {
  ELECTRICAL: "Electrical",
  MECHANICAL: "Mechanical",
  PLUMBING: "Plumbing",
  HARDWARE: "Hardware",
  CLEANING: "Cleaning",
  TEXTILES: "Textiles",
  CONSUMABLES: "Consumables",
  CONSTRUCTION: "Construction",
  OTHER: "Other",
};

/**
 * Task Types Enum (Discriminator)
 * @readonly
 * @enum {string}
 */
export const TASK_TYPES = {
  PROJECT: "ProjectTask",
  ROUTINE: "RoutineTask",
  ASSIGNED: "AssignedTask",
};

/**
 * Recurrence Frequency Enum
 * @readonly
 * @enum {string}
 */
export const RECURRENCE_FREQUENCY = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

/**
 * TTL Expiry Periods (in seconds)
 * @readonly
 * @enum {number|null}
 */
export const TTL_EXPIRY = {
  MATERIALS: 90 * 24 * 60 * 60, // 90 days
  VENDORS: 90 * 24 * 60 * 60, // 90 days
  TASKS: 180 * 24 * 60 * 60, // 180 days
  USERS: 365 * 24 * 60 * 60, // 365 days
  DEPARTMENTS: 365 * 24 * 60 * 60, // 365 days
  ORGANIZATIONS: null, // Never auto-delete
  COMMENTS: 180 * 24 * 60 * 60, // 180 days
  ACTIVITIES: 90 * 24 * 60 * 60, // 90 days
  NOTIFICATIONS: 30 * 24 * 60 * 60, // 30 days
  ATTACHMENTS: 30 * 24 * 60 * 60, // 30 days
};

/**
 * HTTP Status Codes
 * @readonly
 * @enum {number}
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Error Codes
 * @readonly
 * @enum {string}
 *
 * IMPORTANT:
 * - UNAUTHENTICATED_ERROR (401): Authentication failure (missing/invalid/expired token)
 * - FORBIDDEN_ERROR (403): Authorization failure (insufficient permissions)
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED_ERROR: "UNAUTHENTICATED_ERROR", // 401 - Authentication failure
  FORBIDDEN_ERROR: "FORBIDDEN_ERROR", // 403 - Authorization failure
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  CONFLICT_ERROR: "CONFLICT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  TOO_MANY_REQUESTS_ERROR: "TOO_MANY_REQUESTS_ERROR",
};

/**
 * Pagination Defaults
 * @readonly
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * Query Filter Values
 * @readonly
 */
export const QUERY_FILTERS = {
  DELETED: {
    ALL: "true", // Include both deleted and non-deleted
    ONLY: "only", // Only deleted items
    NONE: "false", // Only non-deleted items (default)
  },
};

/**
 * Rate Limiting
 * @readonly
 */
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // Max requests per window
};

/**
 * JWT Token Expiry (string format for JWT signing)
 * @readonly
 */
export const TOKEN_EXPIRY = {
  ACCESS: "15m",
  REFRESH: "7d",
};

/**
 * JWT Token Expiry in Milliseconds (for Date calculations)
 * @readonly
 */
export const TOKEN_EXPIRY_MS = {
  ACCESS: 15 * 60 * 1000, // 15 minutes
  REFRESH: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * File Upload Limits
 * @readonly
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

// Industries
export const INDUSTRIES = {
  TECHNOLOGY: "Technology",
  HEALTHCARE: "Healthcare",
  FINANCE: "Finance",
  EDUCATION: "Education",
  RETAIL: "Retail",
  MANUFACTURING: "Manufacturing",
  CONSTRUCTION: "Construction",
  HOSPITALITY: "Hospitality",
  TRANSPORTATION: "Transportation",
  REAL_ESTATE: "Real Estate",
  AGRICULTURE: "Agriculture",
  ENERGY: "Energy",
  TELECOMMUNICATIONS: "Telecommunications",
  MEDIA: "Media",
  ENTERTAINMENT: "Entertainment",
  LEGAL: "Legal",
  CONSULTING: "Consulting",
  INSURANCE: "Insurance",
  AUTOMOTIVE: "Automotive",
  AEROSPACE: "Aerospace",
  PHARMACEUTICAL: "Pharmaceutical",
  FOOD_BEVERAGE: "Food & Beverage",
  GOVERNMENT: "Government",
  NON_PROFIT: "Non-Profit",
};

export const INDUSTRIES_SIZE = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  ENTERPRISE: "Enterprise",
};

/**
 * Comment Depth Limit
 * @readonly
 */
export const COMMENT_MAX_DEPTH = 3;

/**
 * File Types
 * @readonly
 * @enum {string}
 */
export const FILE_TYPES = {
  IMAGE: "Image",
  VIDEO: "Video",
  DOCUMENT: "Document",
  AUDIO: "Audio",
  OTHER: "Other",
};

/**
 * Parent Model Types (for polymorphic references)
 * @readonly
 * @enum {string}
 */
export const PARENT_MODEL_TYPES = {
  TASK: "Task",
  TASK_ACTIVITY: "TaskActivity",
  TASK_COMMENT: "TaskComment",
};

/**
 * Entity Model Types (for notifications)
 * @readonly
 * @enum {string}
 */
export const ENTITY_MODEL_TYPES = {
  TASK: "Task",
  TASK_ACTIVITY: "TaskActivity",
  TASK_COMMENT: "TaskComment",
  USER: "User",
  ORGANIZATION: "Organization",
  DEPARTMENT: "Department",
  MATERIAL: "Material",
  VENDOR: "Vendor",
};

/**
 * Skill Validation
 * @readonly
 */
export const SKILL_VALIDATION = {
  NAME: {
    MAX_LENGTH: 50,
  },
  PERCENTAGE: {
    MIN: 0,
    MAX: 100,
  },
  MAX_COUNT: 10,
};

/**
 * Tag Validation
 * @readonly
 */
export const TAG_VALIDATION = {
  MAX_LENGTH: 50,
  MAX_COUNT: 5,
};

/**
 * Notification Title Validation
 * @readonly
 */
export const NOTIFICATION_TITLE_VALIDATION = {
  MAX_LENGTH: 200,
};

/**
 * Password Requirements
 * @readonly
 */
export const PASSWORD = {
  MIN_LENGTH: 8,
  SALT_ROUNDS: 12,
};

/**
 * Account Lockout Settings
 * @readonly
 */
export const ACCOUNT_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

/**
 * Socket.IO Events
 * @readonly
 */
export const SOCKET_EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  COMMENT_ADDED: "comment:added",
  COMMENT_UPDATED: "comment:updated",
  COMMENT_DELETED: "comment:deleted",
  NOTIFICATION_CREATED: "notification:created",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
};

/**
 * Field Validation Constants
 * Used in schemas and validators for consistent validation
 * @readonly
 */

// Organization Field Validation
export const ORGANIZATION_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9\s\-&.,'()]+$/,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^(\+251\d{9}|0\d{9})$/,
  },
  EMAIL: {
    MAX_LENGTH: 100,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  ADDRESS: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 500,
  },
  DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
};

// Department Field Validation
export const DEPARTMENT_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9\s\-&.,'()]+$/,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
};

// User Field Validation
export const USER_VALIDATION = {
  FIRST_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s\-']+$/,
  },
  LAST_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s\-']+$/,
  },
  EMAIL: {
    MAX_LENGTH: 100,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    // Production: Must contain lowercase, uppercase, digit, and special character
    // Development: Any password with length between 8-128
    PATTERN_PRODUCTION:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
    PATTERN_DEVELOPMENT: /^.{8,128}$/,
  },
  EMPLOYEE_ID: {
    PATTERN: /^(?!0000)\d{4}$/, // 4 digits, cannot be 0000
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^(\+251\d{9}|0\d{9})$/, // Ethiopian phone format: +251XXXXXXXXX or 0XXXXXXXXX
  },
  POSITION: {
    MAX_LENGTH: 100,
  },
};

// Task Field Validation
export const TASK_VALIDATION = {
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 5000,
  },
  MILESTONE_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  ASSIGNEES: {
    MIN_COUNT: 1,
    MAX_COUNT: 50,
  },
  WATCHERS: {
    MAX_COUNT: 100,
  },
};

// Task Comment Field Validation
export const COMMENT_VALIDATION = {
  CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000,
  },
  MAX_DEPTH: 3,
  MENTIONS: {
    MAX_COUNT: 20,
  },
};

// Task Activity Field Validation
export const ACTIVITY_VALIDATION = {
  DESCRIPTION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000,
  },
  MATERIALS: {
    MAX_COUNT: 50,
  },
  ATTACHMENTS: {
    MAX_COUNT: 20,
  },
};

// Material Field Validation
export const MATERIAL_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 200,
  },
  QUANTITY: {
    MIN: 0,
    MAX: 20,
  },
  UNIT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    ALLOWED_UNITS: [
      "kg",
      "g",
      "mg",
      "l",
      "ml",
      "pcs",
      "m",
      "cm",
      "mm",
      "ft",
      "in",
      "lb",
      "oz",
      "gal",
      "qt",
      "pt",
    ],
  },
  CATEGORY: {
    MAX_LENGTH: 100,
  },
};

// Vendor Field Validation
export const VENDOR_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 200,
  },
  EMAIL: {
    MAX_LENGTH: 100,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^(\+251\d{9}|0\d{9})$/,
  },
  ADDRESS: {
    MAX_LENGTH: 500,
  },
  RATING: {
    MIN: 1,
    MAX: 5,
  },
};

// Attachment Field Validation
export const ATTACHMENT_VALIDATION = {
  FILE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  FILE_SIZE: {
    MAX: 10 * 1024 * 1024, // 10MB
  },
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-rar-compressed",
  ],
  ALLOWED_EXTENSIONS: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".zip",
    ".rar",
  ],
};

// Notification Field Validation
export const NOTIFICATION_VALIDATION = {
  MESSAGE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  RECIPIENTS: {
    MIN_COUNT: 1,
    MAX_COUNT: 1000,
  },
};

// Cloudinary URL Validation
export const CLOUDINARY_VALIDATION = {
  URL_PATTERN:
    /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/v\d+\/[a-zA-Z0-9_-]+\.[a-zA-Z]+$/,
  PUBLIC_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
};

// Date Validation
export const DATE_VALIDATION = {
  MIN_DATE: new Date("2020-01-01"),
  MAX_DATE: new Date("2100-12-31"),
};

// Recurrence Validation
export const RECURRENCE_VALIDATION = {
  INTERVAL: {
    MIN: 1,
    MAX: 365,
  },
  MAX_OCCURRENCES: 1000,
};

// Subscription Field Validation
export const SUBSCRIPTION_VALIDATION = {
  PLAN: {
    VALUES: ["Free", "Basic", "Pro", "Enterprise"],
  },
  STATUS: {
    VALUES: ["Active", "Inactive", "Suspended", "Cancelled"],
  },
};

// Settings Field Validation
export const SETTINGS_VALIDATION = {
  TIMEZONE: {
    PATTERN: /^[A-Za-z]+\/[A-Za-z_]+$/,
  },
  DATE_FORMAT: {
    VALUES: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
  },
  LANGUAGE: {
    VALUES: ["en", "es", "fr", "de", "zh", "ar"],
  },
};

// Common Field Validation
export const COMMON_VALIDATION = {
  MONGODB_OBJECTID: {
    PATTERN: /^[0-9a-fA-F]{24}$/,
  },
  URL: {
    PATTERN: /^https?:\/\/.+$/,
  },
  SLUG: {
    PATTERN: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  COLOR_HEX: {
    PATTERN: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  },
};

// Milestone Field Validation
export const MILESTONE_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  STATUS: {
    VALUES: ["TODO", "IN_PROGRESS", "COMPLETED", "PENDING", "CANCELLED"],
  },
};

// Avatar/Logo Field Validation
export const IMAGE_VALIDATION = {
  URL: {
    PATTERN: /^https:\/\/res\.cloudinary\.com\/.+$/,
  },
  PUBLIC_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
};

// Edit History Field Validation
export const EDIT_HISTORY_VALIDATION = {
  CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000,
  },
  MAX_HISTORY_ENTRIES: 10,
};

// Search and Filter Validation
export const SEARCH_VALIDATION = {
  QUERY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  PAGE: {
    MIN: 1,
    MAX: 10000,
  },
  LIMIT: {
    MIN: 1,
    MAX: 100,
  },
};

/**
 * Application Version
 * @readonly
 */
export const APP_VERSION = "1.0.0";

export default {
  TASK_STATUS,
  TASK_PRIORITY,
  USER_ROLES,
  ACTIVITY_TYPES,
  NOTIFICATION_TYPES,
  VENDOR_STATUS,
  MATERIAL_CATEGORY,
  TASK_TYPES,
  RECURRENCE_FREQUENCY,
  TTL_EXPIRY,
  HTTP_STATUS,
  ERROR_CODES,
  PAGINATION,
  QUERY_FILTERS,
  RATE_LIMIT,
  TOKEN_EXPIRY,
  TOKEN_EXPIRY_MS,
  FILE_UPLOAD,
  COMMENT_MAX_DEPTH,
  FILE_TYPES,
  PARENT_MODEL_TYPES,
  ENTITY_MODEL_TYPES,
  SKILL_VALIDATION,
  TAG_VALIDATION,
  NOTIFICATION_TITLE_VALIDATION,
  PASSWORD,
  ACCOUNT_LOCKOUT,
  SOCKET_EVENTS,
  ORGANIZATION_VALIDATION,
  DEPARTMENT_VALIDATION,
  USER_VALIDATION,
  TASK_VALIDATION,
  COMMENT_VALIDATION,
  ACTIVITY_VALIDATION,
  MATERIAL_VALIDATION,
  VENDOR_VALIDATION,
  ATTACHMENT_VALIDATION,
  NOTIFICATION_VALIDATION,
  CLOUDINARY_VALIDATION,
  DATE_VALIDATION,
  RECURRENCE_VALIDATION,
  SUBSCRIPTION_VALIDATION,
  SETTINGS_VALIDATION,
  COMMON_VALIDATION,
  MILESTONE_VALIDATION,
  IMAGE_VALIDATION,
  EDIT_HISTORY_VALIDATION,
  SEARCH_VALIDATION,
  INDUSTRIES,
  INDUSTRIES_SIZE,
  APP_VERSION,
};
