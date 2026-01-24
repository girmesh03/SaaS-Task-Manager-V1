/**
 * Date Utilities using Native JavaScript Intl API
 * NEVER use dayjs on frontend - use Intl API for all date/time formatting
 * All dates are stored in UTC on backend and converted to local timezone for display
 */

/**
 * Format date to locale string
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, locale = "en-US", options = {}) => {
  if (!date) return "";

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

/**
 * Format date and time to locale string
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, locale = "en-US", options = {}) => {
  if (!date) return "";

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

/**
 * Format time to locale string
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export const formatTime = (date, locale = "en-US", options = {}) => {
  if (!date) return "";

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const defaultOptions = {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

/**
 * Format date to relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date, locale = "en-US") => {
  if (!date) return "";

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((dateObj - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const { unit, seconds } of units) {
    const value = Math.floor(Math.abs(diffInSeconds) / seconds);
    if (value >= 1) {
      return rtf.format(diffInSeconds < 0 ? -value : value, unit);
    }
  }

  return rtf.format(0, "second");
};

/**
 * Format date to ISO 8601 string (for API requests)
 * @param {Date|string|number} date - Date to format
 * @returns {string} ISO 8601 date string
 */
export const toISOString = (date) => {
  if (!date) return "";

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  return dateObj.toISOString();
};

/**
 * Parse ISO 8601 string to Date object
 * @param {string} isoString - ISO 8601 date string
 * @returns {Date|null} Date object or null if invalid
 */
export const fromISOString = (isoString) => {
  if (!isoString) return null;

  const dateObj = new Date(isoString);
  if (isNaN(dateObj.getTime())) return null;

  return dateObj;
};

/**
 * Check if date is valid
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if valid date
 */
export const isValidDate = (date) => {
  if (!date) return false;

  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Check if date is in the past
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPast = (date) => {
  if (!isValidDate(date)) return false;

  const dateObj = new Date(date);
  const now = new Date();

  return dateObj < now;
};

/**
 * Check if date is in the future
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export const isFuture = (date) => {
  if (!isValidDate(date)) return false;

  const dateObj = new Date(date);
  const now = new Date();

  return dateObj > now;
};

/**
 * Check if date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!isValidDate(date)) return false;

  const dateObj = new Date(date);
  const now = new Date();

  return (
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear()
  );
};

/**
 * Get start of day (00:00:00)
 * @param {Date|string|number} date - Date to get start of day
 * @returns {Date} Start of day
 */
export const startOfDay = (date) => {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Get end of day (23:59:59)
 * @param {Date|string|number} date - Date to get end of day
 * @returns {Date} End of day
 */
export const endOfDay = (date) => {
  const dateObj = new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Add days to date
 * @param {Date|string|number} date - Date to add days to
 * @param {number} days - Number of days to add
 * @returns {Date} New date with days added
 */
export const addDays = (date, days) => {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

/**
 * Subtract days from date
 * @param {Date|string|number} date - Date to subtract days from
 * @param {number} days - Number of days to subtract
 * @returns {Date} New date with days subtracted
 */
export const subtractDays = (date, days) => {
  return addDays(date, -days);
};

/**
 * Get difference in days between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} Difference in days
 */
export const diffInDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  const diffInMs = d2 - d1;
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
};

/**
 * Get difference in hours between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} Difference in hours
 */
export const diffInHours = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  const diffInMs = d2 - d1;
  return Math.floor(diffInMs / (1000 * 60 * 60));
};

/**
 * Get difference in minutes between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} Difference in minutes
 */
export const diffInMinutes = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  const diffInMs = d2 - d1;
  return Math.floor(diffInMs / (1000 * 60));
};

/**
 * Format date range
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate, locale = "en-US") => {
  if (!startDate || !endDate) return "";

  const start = formatDate(startDate, locale);
  const end = formatDate(endDate, locale);

  return `${start} - ${end}`;
};

/**
 * Get user's timezone
 * @returns {string} User's timezone (e.g., 'America/New_York')
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Get user's locale
 * @returns {string} User's locale (e.g., 'en-US')
 */
export const getUserLocale = () => {
  return navigator.language || navigator.userLanguage || "en-US";
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  toISOString,
  fromISOString,
  isValidDate,
  isPast,
  isFuture,
  isToday,
  startOfDay,
  endOfDay,
  addDays,
  subtractDays,
  diffInDays,
  diffInHours,
  diffInMinutes,
  formatDateRange,
  getUserTimezone,
  getUserLocale,
};
