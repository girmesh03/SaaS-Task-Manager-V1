/**
 * Client-side Validation Utilities
 * MUST match backend validation rules exactly
 * Import validation constants from constants.js
 */

import {
  USER_VALIDATION,
  ORGANIZATION_VALIDATION,
  DEPARTMENT_VALIDATION,
  TASK_VALIDATION,
  COMMENT_VALIDATION,
  ACTIVITY_VALIDATION,
  MATERIAL_VALIDATION,
  VENDOR_VALIDATION,
  ATTACHMENT_VALIDATION,
  NOTIFICATION_VALIDATION,
  PASSWORD,
  COMMON_VALIDATION,
  CLOUDINARY_VALIDATION,
  SKILL_VALIDATION,
  TAG_VALIDATION,
  MILESTONE_VALIDATION,
  RECURRENCE_VALIDATION,
} from "./constants";

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return USER_VALIDATION.EMAIL.PATTERN.test(email);
};

/**
 * Validate phone number format (Ethiopian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  return USER_VALIDATION.PHONE.PATTERN.test(phone);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {boolean} isProduction - Whether to use production rules
 * @returns {Object} Validation result with isValid and errors
 */
export const validatePassword = (password, isProduction = false) => {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ["Password is required"] };
  }

  if (password.length < PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD.MIN_LENGTH} characters`);
  }

  if (password.length > USER_VALIDATION.PASSWORD.MAX_LENGTH) {
    errors.push(
      `Password must not exceed ${USER_VALIDATION.PASSWORD.MAX_LENGTH} characters`
    );
  }

  const pattern = isProduction
    ? USER_VALIDATION.PASSWORD.PATTERN_PRODUCTION
    : USER_VALIDATION.PASSWORD.PATTERN_DEVELOPMENT;

  if (!pattern.test(password)) {
    if (isProduction) {
      errors.push(
        "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN.test(id);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (url) => {
  if (!url) return false;
  return COMMON_VALIDATION.URL.PATTERN.test(url);
};

/**
 * Validate Cloudinary URL format
 * @param {string} url - Cloudinary URL to validate
 * @returns {boolean} True if valid Cloudinary URL
 */
export const isValidCloudinaryUrl = (url) => {
  if (!url) return false;
  return CLOUDINARY_VALIDATION.URL_PATTERN.test(url);
};

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {Object} Validation result with isValid and error
 */
export const validateStringLength = (value, minLength, maxLength) => {
  if (!value) {
    return { isValid: false, error: "Value is required" };
  }

  if (value.length < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} characters`,
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `Must not exceed ${maxLength} characters`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate string pattern
 * @param {string} value - String to validate
 * @param {RegExp} pattern - Pattern to match
 * @param {string} errorMessage - Error message
 * @returns {Object} Validation result with isValid and error
 */
export const validateStringPattern = (value, pattern, errorMessage) => {
  if (!value) {
    return { isValid: false, error: "Value is required" };
  }

  if (!pattern.test(value)) {
    return { isValid: false, error: errorMessage };
  }

  return { isValid: true, error: null };
};

/**
 * Validate organization name
 * @param {string} name - Organization name to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateOrganizationName = (name) => {
  const errors = [];

  const lengthResult = validateStringLength(
    name,
    ORGANIZATION_VALIDATION.NAME.MIN_LENGTH,
    ORGANIZATION_VALIDATION.NAME.MAX_LENGTH
  );
  if (!lengthResult.isValid) {
    errors.push(lengthResult.error);
  }

  const patternResult = validateStringPattern(
    name,
    ORGANIZATION_VALIDATION.NAME.PATTERN,
    "Organization name contains invalid characters"
  );
  if (!patternResult.isValid) {
    errors.push(patternResult.error);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate department name
 * @param {string} name - Department name to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateDepartmentName = (name) => {
  const errors = [];

  const lengthResult = validateStringLength(
    name,
    DEPARTMENT_VALIDATION.NAME.MIN_LENGTH,
    DEPARTMENT_VALIDATION.NAME.MAX_LENGTH
  );
  if (!lengthResult.isValid) {
    errors.push(lengthResult.error);
  }

  const patternResult = validateStringPattern(
    name,
    DEPARTMENT_VALIDATION.NAME.PATTERN,
    "Department name contains invalid characters"
  );
  if (!patternResult.isValid) {
    errors.push(patternResult.error);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate user name (first name or last name)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} Validation result with isValid and errors
 */
export const validateUserName = (name, fieldName = "Name") => {
  const errors = [];

  const lengthResult = validateStringLength(
    name,
    USER_VALIDATION.FIRST_NAME.MIN_LENGTH,
    USER_VALIDATION.FIRST_NAME.MAX_LENGTH
  );
  if (!lengthResult.isValid) {
    errors.push(lengthResult.error);
  }

  const patternResult = validateStringPattern(
    name,
    USER_VALIDATION.FIRST_NAME.PATTERN,
    `${fieldName} contains invalid characters`
  );
  if (!patternResult.isValid) {
    errors.push(patternResult.error);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate employee ID
 * @param {string} employeeId - Employee ID to validate
 * @returns {Object} Validation result with isValid and error
 */
export const validateEmployeeId = (employeeId) => {
  if (!employeeId) {
    return { isValid: false, error: "Employee ID is required" };
  }

  if (!USER_VALIDATION.EMPLOYEE_ID.PATTERN.test(employeeId)) {
    return {
      isValid: false,
      error: "Employee ID must be a 4-digit number (cannot be 0000)",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate task title
 * @param {string} title - Task title to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateTaskTitle = (title) => {
  return validateStringLength(
    title,
    TASK_VALIDATION.TITLE.MIN_LENGTH,
    TASK_VALIDATION.TITLE.MAX_LENGTH
  );
};

/**
 * Validate task description
 * @param {string} description - Task description to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateTaskDescription = (description) => {
  return validateStringLength(
    description,
    TASK_VALIDATION.DESCRIPTION.MIN_LENGTH,
    TASK_VALIDATION.DESCRIPTION.MAX_LENGTH
  );
};

/**
 * Validate comment content
 * @param {string} content - Comment content to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateCommentContent = (content) => {
  return validateStringLength(
    content,
    COMMENT_VALIDATION.CONTENT.MIN_LENGTH,
    COMMENT_VALIDATION.CONTENT.MAX_LENGTH
  );
};

/**
 * Validate material name
 * @param {string} name - Material name to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateMaterialName = (name) => {
  return validateStringLength(
    name,
    MATERIAL_VALIDATION.NAME.MIN_LENGTH,
    MATERIAL_VALIDATION.NAME.MAX_LENGTH
  );
};

/**
 * Validate material quantity
 * @param {number} quantity - Material quantity to validate
 * @returns {Object} Validation result with isValid and error
 */
export const validateMaterialQuantity = (quantity) => {
  if (quantity === null || quantity === undefined) {
    return { isValid: false, error: "Quantity is required" };
  }

  if (quantity < MATERIAL_VALIDATION.QUANTITY.MIN) {
    return {
      isValid: false,
      error: `Quantity must be at least ${MATERIAL_VALIDATION.QUANTITY.MIN}`,
    };
  }

  if (quantity > MATERIAL_VALIDATION.QUANTITY.MAX) {
    return {
      isValid: false,
      error: `Quantity must not exceed ${MATERIAL_VALIDATION.QUANTITY.MAX}`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate vendor name
 * @param {string} name - Vendor name to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateVendorName = (name) => {
  return validateStringLength(
    name,
    VENDOR_VALIDATION.NAME.MIN_LENGTH,
    VENDOR_VALIDATION.NAME.MAX_LENGTH
  );
};

/**
 * Validate vendor rating
 * @param {number} rating - Vendor rating to validate
 * @returns {Object} Validation result with isValid and error
 */
export const validateVendorRating = (rating) => {
  if (rating === null || rating === undefined) {
    return { isValid: true, error: null }; // Rating is optional
  }

  if (rating < VENDOR_VALIDATION.RATING.MIN) {
    return {
      isValid: false,
      error: `Rating must be at least ${VENDOR_VALIDATION.RATING.MIN}`,
    };
  }

  if (rating > VENDOR_VALIDATION.RATING.MAX) {
    return {
      isValid: false,
      error: `Rating must not exceed ${VENDOR_VALIDATION.RATING.MAX}`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @returns {Object} Validation result with isValid and error
 */
export const validateFileSize = (size) => {
  if (size > ATTACHMENT_VALIDATION.FILE_SIZE.MAX) {
    return {
      isValid: false,
      error: `File size must not exceed ${
        ATTACHMENT_VALIDATION.FILE_SIZE.MAX / (1024 * 1024)
      }MB`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate file type
 * @param {string} mimeType - File MIME type
 * @returns {Object} Validation result with isValid and error
 */
export const validateFileType = (mimeType) => {
  if (!ATTACHMENT_VALIDATION.ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: "File type not allowed",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate file extension
 * @param {string} filename - File name
 * @returns {Object} Validation result with isValid and error
 */
export const validateFileExtension = (filename) => {
  const extension = filename.substring(filename.lastIndexOf(".")).toLowerCase();

  if (!ATTACHMENT_VALIDATION.ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: "File extension not allowed",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate date is not in the future
 * @param {Date|string} date - Date to validate
 * @returns {Object} Validation result with isValid and error
 */
export const validateDateNotFuture = (date) => {
  if (!date) {
    return { isValid: false, error: "Date is required" };
  }

  const dateObj = new Date(date);
  const now = new Date();

  if (dateObj > now) {
    return { isValid: false, error: "Date cannot be in the future" };
  }

  return { isValid: true, error: null };
};

/**
 * Validate date is not in the past
 * @param {Date|string} date - Date to validate
 * @returns {Object} Validation result with isValid and error
 */
export const validateDateNotPast = (date) => {
  if (!date) {
    return { isValid: false, error: "Date is required" };
  }

  const dateObj = new Date(date);
  const now = new Date();

  if (dateObj < now) {
    return { isValid: false, error: "Date cannot be in the past" };
  }

  return { isValid: true, error: null };
};

/**
 * Validate start date is before end date
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Object} Validation result with isValid and error
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { isValid: false, error: "Both dates are required" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return { isValid: false, error: "Start date must be before end date" };
  }

  return { isValid: true, error: null };
};

/**
 * Validate array length
 * @param {Array} array - Array to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} Validation result with isValid and error
 */
export const validateArrayLength = (
  array,
  minLength,
  maxLength,
  fieldName = "Array"
) => {
  if (!Array.isArray(array)) {
    return { isValid: false, error: `${fieldName} must be an array` };
  }

  if (array.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must have at least ${minLength} item(s)`,
    };
  }

  if (array.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} item(s)`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate skill object
 * @param {Object} skill - Skill object with skill and percentage
 * @returns {Object} Validation result with isValid and errors
 */
export const validateSkill = (skill) => {
  const errors = [];

  if (!skill.skill) {
    errors.push("Skill name is required");
  } else if (skill.skill.length > SKILL_VALIDATION.NAME.MAX_LENGTH) {
    errors.push(
      `Skill name must not exceed ${SKILL_VALIDATION.NAME.MAX_LENGTH} characters`
    );
  }

  if (
    skill.percentage === null ||
    skill.percentage === undefined ||
    skill.percentage < SKILL_VALIDATION.PERCENTAGE.MIN ||
    skill.percentage > SKILL_VALIDATION.PERCENTAGE.MAX
  ) {
    errors.push(
      `Skill percentage must be between ${SKILL_VALIDATION.PERCENTAGE.MIN} and ${SKILL_VALIDATION.PERCENTAGE.MAX}`
    );
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate tag
 * @param {string} tag - Tag to validate
 * @returns {Object} Validation result with isValid and error
 */
export const validateTag = (tag) => {
  if (!tag) {
    return { isValid: false, error: "Tag is required" };
  }

  if (tag.length > TAG_VALIDATION.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Tag must not exceed ${TAG_VALIDATION.MAX_LENGTH} characters`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate milestone
 * @param {Object} milestone - Milestone object with name, dueDate, status
 * @returns {Object} Validation result with isValid and errors
 */
export const validateMilestone = (milestone) => {
  const errors = [];

  if (!milestone.name) {
    errors.push("Milestone name is required");
  } else {
    const lengthResult = validateStringLength(
      milestone.name,
      MILESTONE_VALIDATION.NAME.MIN_LENGTH,
      MILESTONE_VALIDATION.NAME.MAX_LENGTH
    );
    if (!lengthResult.isValid) {
      errors.push(lengthResult.error);
    }
  }

  if (
    milestone.status &&
    !MILESTONE_VALIDATION.STATUS.VALUES.includes(milestone.status)
  ) {
    errors.push("Invalid milestone status");
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate recurrence interval
 * @param {number} interval - Recurrence interval
 * @returns {Object} Validation result with isValid and error
 */
export const validateRecurrenceInterval = (interval) => {
  if (interval === null || interval === undefined) {
    return { isValid: false, error: "Interval is required" };
  }

  if (
    interval < RECURRENCE_VALIDATION.INTERVAL.MIN ||
    interval > RECURRENCE_VALIDATION.INTERVAL.MAX
  ) {
    return {
      isValid: false,
      error: `Interval must be between ${RECURRENCE_VALIDATION.INTERVAL.MIN} and ${RECURRENCE_VALIDATION.INTERVAL.MAX}`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Validate form data against schema
 * @param {Object} data - Form data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result with isValid and errors
 */
export const validateFormData = (data, schema) => {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const fieldErrors = [];

    // Required validation
    if (
      rules.required &&
      (!value || (typeof value === "string" && !value.trim()))
    ) {
      fieldErrors.push(`${rules.label || field} is required`);
      isValid = false;
    }

    // Custom validation function
    if (rules.validate && value) {
      const result = rules.validate(value);
      if (!result.isValid) {
        fieldErrors.push(...(result.errors || [result.error]));
        isValid = false;
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return { isValid, errors };
};

export default {
  isValidEmail,
  isValidPhone,
  validatePassword,
  isValidObjectId,
  isValidUrl,
  isValidCloudinaryUrl,
  validateStringLength,
  validateStringPattern,
  validateOrganizationName,
  validateDepartmentName,
  validateUserName,
  validateEmployeeId,
  validateTaskTitle,
  validateTaskDescription,
  validateCommentContent,
  validateMaterialName,
  validateMaterialQuantity,
  validateVendorName,
  validateVendorRating,
  validateFileSize,
  validateFileType,
  validateFileExtension,
  validateDateNotFuture,
  validateDateNotPast,
  validateDateRange,
  validateArrayLength,
  validateSkill,
  validateTag,
  validateMilestone,
  validateRecurrenceInterval,
  sanitizeInput,
  validateFormData,
};
