import { body, param, query } from "express-validator";
import {
  USER_VALIDATION,
  USER_ROLES,
  PASSWORD,
  SKILL_VALIDATION,
  IMAGE_VALIDATION,
  COMMON_VALIDATION,
  SEARCH_VALIDATION,
} from "../../utils/constants.js";
import { User, Organization, Department } from "../../models/index.js";

/**
 * User Validators
 * Validates user-related requests (create, update, delete, role assignment)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.6, 41.7, 41.9, 41.10
 */

/**
 * List Users Validator
 * Validates query parameters for listing users
 * Includes deleted parameter to include/exclude soft-deleted documents
 */
export const listUsersValidator = [
  query("deleted")
    .optional()
    .isBoolean()
    .withMessage("Deleted must be a boolean value")
    .toBoolean(),

  query("page")
    .optional()
    .isInt({ min: SEARCH_VALIDATION.PAGE.MIN, max: SEARCH_VALIDATION.PAGE.MAX })
    .withMessage(
      `Page must be between ${SEARCH_VALIDATION.PAGE.MIN} and ${SEARCH_VALIDATION.PAGE.MAX}`
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: SEARCH_VALIDATION.LIMIT.MIN,
      max: SEARCH_VALIDATION.LIMIT.MAX,
    })
    .withMessage(
      `Limit must be between ${SEARCH_VALIDATION.LIMIT.MIN} and ${SEARCH_VALIDATION.LIMIT.MAX}`
    )
    .toInt(),

  query("search")
    .optional()
    .trim()
    .isLength({
      min: SEARCH_VALIDATION.QUERY.MIN_LENGTH,
      max: SEARCH_VALIDATION.QUERY.MAX_LENGTH,
    })
    .withMessage(
      `Search query must be between ${SEARCH_VALIDATION.QUERY.MIN_LENGTH} and ${SEARCH_VALIDATION.QUERY.MAX_LENGTH} characters`
    ),

  query("role")
    .optional()
    .trim()
    .isIn(Object.values(USER_ROLES))
    .withMessage("Invalid role filter"),

  query("department")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format"),

  query("organization")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format"),

  query("isPlatformUser")
    .optional()
    .isBoolean()
    .withMessage("isPlatformUser must be a boolean value")
    .toBoolean(),

  query("isHod")
    .optional()
    .isBoolean()
    .withMessage("isHod must be a boolean value")
    .toBoolean(),
];

/**
 * Create User Validator
 * Validates user creation request
 */
export const createUserValidator = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({
      min: USER_VALIDATION.FIRST_NAME.MIN_LENGTH,
      max: USER_VALIDATION.FIRST_NAME.MAX_LENGTH,
    })
    .withMessage(
      `First name must be between ${USER_VALIDATION.FIRST_NAME.MIN_LENGTH} and ${USER_VALIDATION.FIRST_NAME.MAX_LENGTH} characters`
    )
    .matches(USER_VALIDATION.FIRST_NAME.PATTERN)
    .withMessage("First name contains invalid characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({
      min: USER_VALIDATION.LAST_NAME.MIN_LENGTH,
      max: USER_VALIDATION.LAST_NAME.MAX_LENGTH,
    })
    .withMessage(
      `Last name must be between ${USER_VALIDATION.LAST_NAME.MIN_LENGTH} and ${USER_VALIDATION.LAST_NAME.MAX_LENGTH} characters`
    )
    .matches(USER_VALIDATION.LAST_NAME.PATTERN)
    .withMessage("Last name contains invalid characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: USER_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .custom(async (value, { req }) => {
      // SCOPING: Check uniqueness within req.user's organization (not req.body.organization)
      const existingUser = await User.findOne({
        email: value.toLowerCase(),
        organization: req.user.organization._id,
      })
        .withDeleted()
        .lean();
      if (existingUser) {
        throw new Error("Email already exists in this organization");
      }
      return true;
    }),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({
      min: USER_VALIDATION.PASSWORD.MIN_LENGTH,
      max: USER_VALIDATION.PASSWORD.MAX_LENGTH,
    })
    .withMessage(
      `Password must be between ${USER_VALIDATION.PASSWORD.MIN_LENGTH} and ${USER_VALIDATION.PASSWORD.MAX_LENGTH} characters`
    )
    .matches(
      process.env.NODE_ENV === "production"
        ? USER_VALIDATION.PASSWORD.PATTERN_PRODUCTION
        : USER_VALIDATION.PASSWORD.PATTERN_DEVELOPMENT
    )
    .withMessage(
      process.env.NODE_ENV === "production"
        ? "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
        : "Password must be between 8 and 128 characters"
    ),

  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(Object.values(USER_ROLES))
    .withMessage(
      `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(", ")}`
    ),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid organization ID format")
    .custom(async (value, { req }) => {
      // SCOPING: User can only create users in their own organization
      if (value !== req.user.organization._id.toString()) {
        throw new Error("You can only create users in your own organization");
      }
      // Check if organization exists (including soft-deleted)
      const organization = await Organization.findById(value)
        .withDeleted()
        .lean();
      if (!organization) {
        throw new Error("Organization not found");
      }
      if (organization.isDeleted) {
        throw new Error("Cannot add user to deleted organization");
      }
      return true;
    }),

  body("department")
    .trim()
    .notEmpty()
    .withMessage("Department is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value, { req }) => {
      // Check if department exists (including soft-deleted)
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (department.isDeleted) {
        throw new Error("Cannot add user to deleted department");
      }
      // SCOPING: Department must belong to req.user's organization
      if (
        department.organization.toString() !==
        req.user.organization._id.toString()
      ) {
        throw new Error("Department does not belong to your organization");
      }
      return true;
    }),

  body("isPlatformUser")
    .optional()
    .isBoolean()
    .withMessage("isPlatformUser must be a boolean"),

  body("isHod")
    .optional()
    .isBoolean()
    .withMessage("isHod must be a boolean")
    .custom((value, { req }) => {
      // isHod can only be true for SuperAdmin or Admin roles
      if (
        value === true &&
        req.body.role !== USER_ROLES.SUPER_ADMIN &&
        req.body.role !== USER_ROLES.ADMIN
      ) {
        throw new Error("Only SuperAdmin or Admin can be Head of Department");
      }
      return true;
    }),

  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("Employee ID is required")
    .matches(USER_VALIDATION.EMPLOYEE_ID.PATTERN)
    .withMessage("Employee ID must be a 4-digit number (0001-9999)")
    .custom(async (value, { req }) => {
      // SCOPING: Check uniqueness within req.user's organization (not req.body.organization)
      const existingUser = await User.findOne({
        employeeId: value,
        organization: req.user.organization._id,
      })
        .withDeleted()
        .lean();
      if (existingUser) {
        throw new Error("Employee ID already exists in this organization");
      }
      return true;
    }),

  body("joinedAt")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      const date = new Date(value);
      if (date > new Date()) {
        throw new Error("Joined date cannot be in the future");
      }
      return true;
    }),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      const date = new Date(value);
      if (date > new Date()) {
        throw new Error("Date of birth cannot be in the future");
      }
      return true;
    }),

  body("phone")
    .optional()
    .trim()
    .isLength({
      min: USER_VALIDATION.PHONE.MIN_LENGTH,
      max: USER_VALIDATION.PHONE.MAX_LENGTH,
    })
    .withMessage(
      `Phone must be between ${USER_VALIDATION.PHONE.MIN_LENGTH} and ${USER_VALIDATION.PHONE.MAX_LENGTH} characters`
    )
    .matches(USER_VALIDATION.PHONE.PATTERN)
    .withMessage(
      "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)"
    ),

  body("profilePicture.url")
    .optional()
    .trim()
    .matches(IMAGE_VALIDATION.URL.PATTERN)
    .withMessage("Please provide a valid Cloudinary URL"),

  body("profilePicture.publicId")
    .optional()
    .trim()
    .isLength({ max: IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH })
    .withMessage(
      `Public ID must not exceed ${IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH} characters`
    ),

  body("skills")
    .optional()
    .isArray({ max: SKILL_VALIDATION.MAX_COUNT })
    .withMessage(`Maximum ${SKILL_VALIDATION.MAX_COUNT} skills allowed`),

  body("skills.*.skill")
    .optional()
    .trim()
    .isLength({ max: SKILL_VALIDATION.NAME.MAX_LENGTH })
    .withMessage(
      `Skill name must not exceed ${SKILL_VALIDATION.NAME.MAX_LENGTH} characters`
    ),

  body("skills.*.percentage")
    .optional()
    .isInt({
      min: SKILL_VALIDATION.PERCENTAGE.MIN,
      max: SKILL_VALIDATION.PERCENTAGE.MAX,
    })
    .withMessage(
      `Percentage must be between ${SKILL_VALIDATION.PERCENTAGE.MIN} and ${SKILL_VALIDATION.PERCENTAGE.MAX}`
    ),
];

/**
 * Update User Validator
 * Validates user update request
 */
export const updateUserValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot update deleted user");
      }
      return true;
    }),

  body("firstName")
    .optional()
    .trim()
    .isLength({
      min: USER_VALIDATION.FIRST_NAME.MIN_LENGTH,
      max: USER_VALIDATION.FIRST_NAME.MAX_LENGTH,
    })
    .withMessage(
      `First name must be between ${USER_VALIDATION.FIRST_NAME.MIN_LENGTH} and ${USER_VALIDATION.FIRST_NAME.MAX_LENGTH} characters`
    )
    .matches(USER_VALIDATION.FIRST_NAME.PATTERN)
    .withMessage("First name contains invalid characters"),

  body("lastName")
    .optional()
    .trim()
    .isLength({
      min: USER_VALIDATION.LAST_NAME.MIN_LENGTH,
      max: USER_VALIDATION.LAST_NAME.MAX_LENGTH,
    })
    .withMessage(
      `Last name must be between ${USER_VALIDATION.LAST_NAME.MIN_LENGTH} and ${USER_VALIDATION.LAST_NAME.MAX_LENGTH} characters`
    )
    .matches(USER_VALIDATION.LAST_NAME.PATTERN)
    .withMessage("Last name contains invalid characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: USER_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .custom(async (value, { req }) => {
      // Check uniqueness within organization (excluding current user, including soft-deleted)
      const user = await User.findById(req.params.userId).withDeleted().lean();
      const existingUser = await User.findOne({
        email: value.toLowerCase(),
        organization: user.organization,
        _id: { $ne: req.params.userId },
      })
        .withDeleted()
        .lean();
      if (existingUser) {
        throw new Error("Email already exists in this organization");
      }
      return true;
    }),

  body("role")
    .optional()
    .trim()
    .isIn(Object.values(USER_ROLES))
    .withMessage(
      `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(", ")}`
    ),

  body("department")
    .optional()
    .trim()
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid department ID format")
    .custom(async (value, { req }) => {
      // Check if department exists (including soft-deleted)
      const department = await Department.findById(value).withDeleted().lean();
      if (!department) {
        throw new Error("Department not found");
      }
      if (department.isDeleted) {
        throw new Error("Cannot assign user to deleted department");
      }
      // Check if department belongs to user's organization
      const user = await User.findById(req.params.userId).withDeleted().lean();
      if (department.organization.toString() !== user.organization.toString()) {
        throw new Error("Department does not belong to user's organization");
      }
      return true;
    }),

  body("isHod")
    .optional()
    .isBoolean()
    .withMessage("isHod must be a boolean")
    .custom(async (value, { req }) => {
      // isHod can only be true for SuperAdmin or Admin roles
      const user = await User.findById(req.params.userId).withDeleted().lean();
      const role = req.body.role || user.role;
      if (
        value === true &&
        role !== USER_ROLES.SUPER_ADMIN &&
        role !== USER_ROLES.ADMIN
      ) {
        throw new Error("Only SuperAdmin or Admin can be Head of Department");
      }
      return true;
    }),

  body("employeeId")
    .optional()
    .trim()
    .matches(USER_VALIDATION.EMPLOYEE_ID.PATTERN)
    .withMessage("Employee ID must be a 4-digit number (0001-9999)")
    .custom(async (value, { req }) => {
      // Check uniqueness within organization (excluding current user, including soft-deleted)
      const user = await User.findById(req.params.userId).withDeleted().lean();
      const existingUser = await User.findOne({
        employeeId: value,
        organization: user.organization,
        _id: { $ne: req.params.userId },
      })
        .withDeleted()
        .lean();
      if (existingUser) {
        throw new Error("Employee ID already exists in this organization");
      }
      return true;
    }),

  body("joinedAt")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      const date = new Date(value);
      if (date > new Date()) {
        throw new Error("Joined date cannot be in the future");
      }
      return true;
    }),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      const date = new Date(value);
      if (date > new Date()) {
        throw new Error("Date of birth cannot be in the future");
      }
      return true;
    }),

  body("phone")
    .optional()
    .trim()
    .isLength({
      min: USER_VALIDATION.PHONE.MIN_LENGTH,
      max: USER_VALIDATION.PHONE.MAX_LENGTH,
    })
    .withMessage(
      `Phone must be between ${USER_VALIDATION.PHONE.MIN_LENGTH} and ${USER_VALIDATION.PHONE.MAX_LENGTH} characters`
    )
    .matches(USER_VALIDATION.PHONE.PATTERN)
    .withMessage(
      "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)"
    ),

  body("profilePicture.url")
    .optional()
    .trim()
    .matches(IMAGE_VALIDATION.URL.PATTERN)
    .withMessage("Please provide a valid Cloudinary URL"),

  body("profilePicture.publicId")
    .optional()
    .trim()
    .isLength({ max: IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH })
    .withMessage(
      `Public ID must not exceed ${IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH} characters`
    ),

  body("skills")
    .optional()
    .isArray({ max: SKILL_VALIDATION.MAX_COUNT })
    .withMessage(`Maximum ${SKILL_VALIDATION.MAX_COUNT} skills allowed`),

  body("skills.*.skill")
    .optional()
    .trim()
    .isLength({ max: SKILL_VALIDATION.NAME.MAX_LENGTH })
    .withMessage(
      `Skill name must not exceed ${SKILL_VALIDATION.NAME.MAX_LENGTH} characters`
    ),

  body("skills.*.percentage")
    .optional()
    .isInt({
      min: SKILL_VALIDATION.PERCENTAGE.MIN,
      max: SKILL_VALIDATION.PERCENTAGE.MAX,
    })
    .withMessage(
      `Percentage must be between ${SKILL_VALIDATION.PERCENTAGE.MIN} and ${SKILL_VALIDATION.PERCENTAGE.MAX}`
    ),
];

/**
 * Delete User Validator
 * Validates user deletion request
 */
export const deleteUserValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("User is already deleted");
      }
      return true;
    }),
];

/**
 * Restore User Validator
 * Validates user restoration request
 */
export const restoreUserValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists and is deleted
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (!user.isDeleted) {
        throw new Error("User is not deleted");
      }
      return true;
    }),
];

/**
 * Get User By ID Validator
 * Validates user ID parameter
 */
export const getUserByIdValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      return true;
    }),
];

export default {
  listUsersValidator,
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  restoreUserValidator,
  getUserByIdValidator,
  changePasswordValidator,
  changeEmailValidator,
  uploadAvatarValidator,
};

/**
 * Change Password Validator
 * Validates password change request for user
 */
export const changePasswordValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot change password for deleted user");
      }
      return true;
    }),

  body("oldPassword").trim().notEmpty().withMessage("Old password is required"),

  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New password is required")
    .isLength({
      min: USER_VALIDATION.PASSWORD.MIN_LENGTH,
      max: USER_VALIDATION.PASSWORD.MAX_LENGTH,
    })
    .withMessage(
      `Password must be between ${USER_VALIDATION.PASSWORD.MIN_LENGTH} and ${USER_VALIDATION.PASSWORD.MAX_LENGTH} characters`
    )
    .matches(
      process.env.NODE_ENV === "production"
        ? USER_VALIDATION.PASSWORD.PATTERN_PRODUCTION
        : USER_VALIDATION.PASSWORD.PATTERN_DEVELOPMENT
    )
    .withMessage(
      process.env.NODE_ENV === "production"
        ? "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
        : "Password must be between 8 and 128 characters"
    )
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error("New password must be different from old password");
      }
      return true;
    }),
];

/**
 * Change Email Validator
 * Validates email change request for user
 */
export const changeEmailValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot change email for deleted user");
      }
      return true;
    }),

  body("newEmail")
    .trim()
    .notEmpty()
    .withMessage("New email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: USER_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .custom(async (value, { req }) => {
      // Check uniqueness within organization (excluding current user, including soft-deleted)
      const user = await User.findById(req.params.userId).withDeleted().lean();
      const existingUser = await User.findOne({
        email: value.toLowerCase(),
        organization: user.organization,
        _id: { $ne: req.params.userId },
      })
        .withDeleted()
        .lean();
      if (existingUser) {
        throw new Error("Email already exists in this organization");
      }
      return true;
    }),
];

/**
 * Upload Avatar Validator
 * Validates avatar upload request for user
 */
export const uploadAvatarValidator = [
  param("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .matches(COMMON_VALIDATION.MONGODB_OBJECTID.PATTERN)
    .withMessage("Invalid user ID format")
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findById(value).withDeleted().lean();
      if (!user) {
        throw new Error("User not found");
      }
      if (user.isDeleted) {
        throw new Error("Cannot upload avatar for deleted user");
      }
      return true;
    }),

  body("url")
    .trim()
    .notEmpty()
    .withMessage("Avatar URL is required")
    .matches(IMAGE_VALIDATION.URL.PATTERN)
    .withMessage("Please provide a valid Cloudinary URL"),

  body("publicId")
    .trim()
    .notEmpty()
    .withMessage("Public ID is required")
    .isLength({ max: IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH })
    .withMessage(
      `Public ID must not exceed ${IMAGE_VALIDATION.PUBLIC_ID.MAX_LENGTH} characters`
    ),
];
