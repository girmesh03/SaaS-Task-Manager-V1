/**
 * User Helper Utilities
 * Shared utility functions for user-related operations
 */

/**
 * Get user initials from user object
 * @param {Object} user - User object
 * @returns {string} User initials (e.g., "JD" for John Doe)
 */
export const getUserInitials = (user) => {
  if (!user) return "U";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
};

/**
 * Get user full name from user object
 * @param {Object} user - User object
 * @returns {string} User full name (e.g., "John Doe")
 */
export const getUserFullName = (user) => {
  if (!user) return "Unknown User";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  return `${firstName} ${lastName}`.trim() || "Unknown User";
};
