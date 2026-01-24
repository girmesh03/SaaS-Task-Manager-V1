/**
 * useTimezone Hook - Timezone Hook
 *
 * Custom hook for timezone conversion and formatting using native JavaScript Intl API.
 * NEVER use dayjs on frontend - use Intl API for all date/time formatting.
 * All dates are stored in UTC on backend and converted to local timezone for display.
 *
 * Requirements: 17.5, 17.6, 17.7, 17.8, 17.9
 */

import { useMemo } from "react";
import {
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
} from "../utils/dateUtils";

/**
 * useTimezone hook
 *
 * @param {string} locale - Locale string (default: user's locale)
 * @returns {Object} Timezone conversion functions
 * @returns {string} return.timezone - User's timezone
 * @returns {string} return.locale - User's locale
 * @returns {Function} return.formatDate - Format date to locale string
 * @returns {Function} return.formatDateTime - Format date and time to locale string
 * @returns {Function} return.formatTime - Format time to locale string
 * @returns {Function} return.formatRelativeTime - Format date to relative time
 * @returns {Function} return.toISOString - Format date to ISO 8601 string
 * @returns {Function} return.fromISOString - Parse ISO 8601 string to Date
 * @returns {Function} return.isValidDate - Check if date is valid
 * @returns {Function} return.isPast - Check if date is in the past
 * @returns {Function} return.isFuture - Check if date is in the future
 * @returns {Function} return.isToday - Check if date is today
 * @returns {Function} return.startOfDay - Get start of day
 * @returns {Function} return.endOfDay - Get end of day
 * @returns {Function} return.addDays - Add days to date
 * @returns {Function} return.subtractDays - Subtract days from date
 * @returns {Function} return.diffInDays - Get difference in days
 * @returns {Function} return.diffInHours - Get difference in hours
 * @returns {Function} return.diffInMinutes - Get difference in minutes
 * @returns {Function} return.formatDateRange - Format date range
 */
const useTimezone = (locale) => {
  // Get user's timezone and locale
  const timezone = useMemo(() => getUserTimezone(), []);
  const userLocale = useMemo(() => locale || getUserLocale(), [locale]);

  /**
   * Format date to locale string
   * @param {Date|string|number} date - Date to format
   * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  const format = (date, options = {}) => {
    return formatDate(date, userLocale, options);
  };

  /**
   * Format date and time to locale string
   * @param {Date|string|number} date - Date to format
   * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date and time string
   */
  const formatDT = (date, options = {}) => {
    return formatDateTime(date, userLocale, options);
  };

  /**
   * Format time to locale string
   * @param {Date|string|number} date - Date to format
   * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
   * @returns {string} Formatted time string
   */
  const formatT = (date, options = {}) => {
    return formatTime(date, userLocale, options);
  };

  /**
   * Format date to relative time (e.g., "2 hours ago", "in 3 days")
   * @param {Date|string|number} date - Date to format
   * @returns {string} Relative time string
   */
  const formatRelative = (date) => {
    return formatRelativeTime(date, userLocale);
  };

  /**
   * Format date range
   * @param {Date|string|number} startDate - Start date
   * @param {Date|string|number} endDate - End date
   * @returns {string} Formatted date range string
   */
  const formatRange = (startDate, endDate) => {
    return formatDateRange(startDate, endDate, userLocale);
  };

  /**
   * Format date for display with common presets
   */
  const presets = useMemo(
    () => ({
      /**
       * Short date format (e.g., "Jan 1, 2024")
       */
      short: (date) =>
        formatDate(date, userLocale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),

      /**
       * Long date format (e.g., "January 1, 2024")
       */
      long: (date) =>
        formatDate(date, userLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),

      /**
       * Full date format (e.g., "Monday, January 1, 2024")
       */
      full: (date) =>
        formatDate(date, userLocale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),

      /**
       * Short date and time format (e.g., "Jan 1, 2024, 12:00 PM")
       */
      shortDateTime: (date) =>
        formatDateTime(date, userLocale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),

      /**
       * Long date and time format (e.g., "January 1, 2024, 12:00:00 PM")
       */
      longDateTime: (date) =>
        formatDateTime(date, userLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),

      /**
       * Time only format (e.g., "12:00 PM")
       */
      time: (date) =>
        formatTime(date, userLocale, {
          hour: "2-digit",
          minute: "2-digit",
        }),

      /**
       * Time with seconds format (e.g., "12:00:00 PM")
       */
      timeWithSeconds: (date) =>
        formatTime(date, userLocale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),

      /**
       * Relative time format (e.g., "2 hours ago")
       */
      relative: (date) => formatRelativeTime(date, userLocale),

      /**
       * ISO 8601 format (e.g., "2024-01-01T12:00:00.000Z")
       */
      iso: (date) => toISOString(date),
    }),
    [userLocale]
  );

  return {
    // User timezone and locale
    timezone,
    locale: userLocale,

    // Formatting functions
    formatDate: format,
    formatDateTime: formatDT,
    formatTime: formatT,
    formatRelativeTime: formatRelative,
    formatDateRange: formatRange,

    // Conversion functions
    toISOString,
    fromISOString,

    // Validation functions
    isValidDate,
    isPast,
    isFuture,
    isToday,

    // Manipulation functions
    startOfDay,
    endOfDay,
    addDays,
    subtractDays,

    // Difference functions
    diffInDays,
    diffInHours,
    diffInMinutes,

    // Preset formats
    presets,
  };
};

export default useTimezone;
