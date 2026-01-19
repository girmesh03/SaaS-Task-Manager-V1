import { body } from "express-validator";
import {
  USER_VALIDATION,
  ORGANIZATION_VALIDATION,
  DEPARTMENT_VALIDATION,
} from "../../utils/constants.js";
import { User, Organization } from "../../models/index.js";

/**
 * Authentication Validators
 * Validates authentication-related requests (register, login, password reset, etc.)
 * Uses express-validator for validation
 * Strictly validates fields with constants from backend/utils/constants.js
 * Validates existence and uniqueness using withDeleted()
 *
 * Requirements: 41.1, 41.2, 41.3, 41.9, 41.10
 */

/**
 * Register Validator
 * Validates registration request with organization, department, and user data
 * Controller creates org/dept/user in transaction, user assigned SuperAdmin role
 */
export const registerValidator = [
  // Organization validation
  body("organization.name")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required")
    .isLength({
      min: ORGANIZATION_VALIDATION.NAME.MIN_LENGTH,
      max: ORGANIZATION_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Organization name must be between ${ORGANIZATION_VALIDATION.NAME.MIN_LENGTH} and ${ORGANIZATION_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .matches(ORGANIZATION_VALIDATION.NAME.PATTERN)
    .withMessage("Organization name contains invalid characters")
    .custom(async (value) => {
      // Check uniqueness including soft-deleted documents
      const existingOrg = await Organization.findOne({ name: value })
        .withDeleted()
        .lean();
      if (existingOrg) {
        throw new Error("Organization name already exists");
      }
      return true;
    }),

  body("organization.email")
    .trim()
    .notEmpty()
    .withMessage("Organization email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: ORGANIZATION_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${ORGANIZATION_VALIDATION.EMAIL.MAX_LENGTH} characters`
    )
    .custom(async (value) => {
      // Check uniqueness including soft-deleted documents
      const existingOrg = await Organization.findOne({
        email: value.toLowerCase(),
      })
        .withDeleted()
        .lean();
      if (existingOrg) {
        throw new Error("Organization email already exists");
      }
      return true;
    }),

  body("organization.phone")
    .trim()
    .notEmpty()
    .withMessage("Organization phone is required")
    .isLength({
      min: ORGANIZATION_VALIDATION.PHONE.MIN_LENGTH,
      max: ORGANIZATION_VALIDATION.PHONE.MAX_LENGTH,
    })
    .withMessage(
      `Phone must be between ${ORGANIZATION_VALIDATION.PHONE.MIN_LENGTH} and ${ORGANIZATION_VALIDATION.PHONE.MAX_LENGTH} characters`
    )
    .matches(ORGANIZATION_VALIDATION.PHONE.PATTERN)
    .withMessage(
      "Please provide a valid Ethiopian phone number (+251XXXXXXXXX or 0XXXXXXXXX)"
    )
    .custom(async (value) => {
      // Check uniqueness including soft-deleted documents
      const existingOrg = await Organization.findOne({ phone: value })
        .withDeleted()
        .lean();
      if (existingOrg) {
        throw new Error("Organization phone already exists");
      }
      return true;
    }),

  body("organization.address")
    .trim()
    .notEmpty()
    .withMessage("Organization address is required")
    .isLength({
      min: ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH,
      max: ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH,
    })
    .withMessage(
      `Address must be between ${ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH} and ${ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH} characters`
    ),

  body("organization.industry")
    .trim()
    .notEmpty()
    .withMessage("Industry is required"),

  body("organization.size")
    .trim()
    .notEmpty()
    .withMessage("Organization size is required"),

  body("organization.description")
    .optional()
    .trim()
    .isLength({ max: ORGANIZATION_VALIDATION.DESCRIPTION.MAX_LENGTH })
    .withMessage(
      `Description must not exceed ${ORGANIZATION_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  // Department validation
  body("department.name")
    .trim()
    .notEmpty()
    .withMessage("Department name is required")
    .isLength({
      min: DEPARTMENT_VALIDATION.NAME.MIN_LENGTH,
      max: DEPARTMENT_VALIDATION.NAME.MAX_LENGTH,
    })
    .withMessage(
      `Department name must be between ${DEPARTMENT_VALIDATION.NAME.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.NAME.MAX_LENGTH} characters`
    )
    .matches(DEPARTMENT_VALIDATION.NAME.PATTERN)
    .withMessage("Department name contains invalid characters"),

  body("department.description")
    .optional()
    .trim()
    .isLength({ max: DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH })
    .withMessage(
      `Description must not exceed ${DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`
    ),

  // User validation
  body("user.firstName")
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

  body("user.lastName")
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

  body("user.email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: USER_VALIDATION.EMAIL.MAX_LENGTH })
    .withMessage(
      `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`
    ),

  body("user.password")
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

  body("user.employeeId")
    .trim()
    .notEmpty()
    .withMessage("Employee ID is required")
    .matches(USER_VALIDATION.EMPLOYEE_ID.PATTERN)
    .withMessage("Employee ID must be a 4-digit number (0001-9999)"),

  body("user.joinedAt")
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

  body("user.dateOfBirth")
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

  body("user.phone")
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
];

/**
 * Login Validator
 * Validates login credentials
 */
export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findOne({ email: value.toLowerCase() })
        .withDeleted()
        .lean();
      if (!user) {
        throw new Error("Invalid email or password");
      }
      if (user.isDeleted) {
        throw new Error("This account has been deleted");
      }
      return true;
    }),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: USER_VALIDATION.PASSWORD.MIN_LENGTH })
    .withMessage(
      `Password must be at least ${USER_VALIDATION.PASSWORD.MIN_LENGTH} characters`
    ),
];

/**
 * Refresh Token Validator
 * Validates refresh token request
 */
export const refreshTokenValidator = [
  // Refresh token is in httpOnly cookie, no body validation needed
  // Validation happens in controller
];

/**
 * Logout Validator
 * No validation needed for logout
 */
export const logoutValidator = [
  // No validation needed
];

/**
 * Forgot Password Validator
 * Validates email for password reset
 */
export const forgotPasswordValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .custom(async (value) => {
      // Check if user exists (including soft-deleted)
      const user = await User.findOne({ email: value.toLowerCase() })
        .withDeleted()
        .lean();
      if (!user) {
        throw new Error("No user found with this email address");
      }
      if (user.isDeleted) {
        throw new Error("This account has been deleted");
      }
      return true;
    }),
];

/**
 * Reset Password Validator
 * Validates password reset with token
 */
export const resetPasswordValidator = [
  body("token").trim().notEmpty().withMessage("Reset token is required"),

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

  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

/**
 * Verify Email Validator
 * Validates email verification token
 */
export const verifyEmailValidator = [
  body("token").trim().notEmpty().withMessage("Verification token is required"),
];

/**
 * Change Password Validator
 * Validates password change request
 */
export const changePasswordValidator = [
  body("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Current password is required"),

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
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),

  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

export default {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  changePasswordValidator,
};
