/**
 * Frontend Logger Utility
 * Provides structured logging with different log levels
 * Replaces console.log with proper logging
 *
 * Requirements: 24.1, 24.2, 24.3
 */

/**
 * Log level enumeration
 * @enum {number}
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Get current log level from environment
 * Supports VITE_LOG_LEVEL env var for fine-grained control
 * Falls back to MODE-based defaults
 * @returns {number} Current log level
 */
const getCurrentLogLevel = () => {
  const envLogLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();

  if (envLogLevel && LOG_LEVELS[envLogLevel] !== undefined) {
    return LOG_LEVELS[envLogLevel];
  }

  return import.meta.env.MODE === "production"
    ? LOG_LEVELS.WARN
    : LOG_LEVELS.DEBUG;
};

const CURRENT_LOG_LEVEL = getCurrentLogLevel();

/**
 * Format log message with timestamp and context
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - Log message
 * @param {Object} [context={}] - Additional context data
 * @returns {Array<string|Object>} Formatted log arguments for console methods
 */
const formatLog = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  // Only include context if it has properties
  if (
    context &&
    typeof context === "object" &&
    Object.keys(context).length > 0
  ) {
    return [prefix, message, context];
  }

  return [prefix, message];
};

/**
 * Logger class
 * Provides structured logging with level-based filtering
 */
class Logger {
  /**
   * Log debug message (development only)
   * Use for detailed debugging information
   * @param {string} message - Log message
   * @param {Object} [context={}] - Additional context data
   */
  debug(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(...formatLog("DEBUG", message, context));
    }
  }

  /**
   * Log info message
   * Use for general informational messages
   * @param {string} message - Log message
   * @param {Object} [context={}] - Additional context data
   */
  info(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.info(...formatLog("INFO", message, context));
    }
  }

  /**
   * Log warning message
   * Use for warning conditions that should be addressed
   * @param {string} message - Log message
   * @param {Object} [context={}] - Additional context data
   */
  warn(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(...formatLog("WARN", message, context));
    }
  }

  /**
   * Log error message
   * Use for error conditions that require attention
   * @param {string} message - Log message
   * @param {Object|Error} [context={}] - Additional context data or Error object
   */
  error(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      // If context is an Error object, extract useful properties
      if (context instanceof Error) {
        const errorContext = {
          name: context.name,
          message: context.message,
          stack: context.stack,
        };
        console.error(...formatLog("ERROR", message, errorContext));
      } else {
        console.error(...formatLog("ERROR", message, context));
      }
    }
  }

  /**
   * Get current log level
   * @returns {number} Current log level
   */
  getLevel() {
    return CURRENT_LOG_LEVEL;
  }

  /**
   * Check if a specific log level is enabled
   * @param {string} level - Log level name (DEBUG, INFO, WARN, ERROR)
   * @returns {boolean} True if level is enabled
   */
  isLevelEnabled(level) {
    const levelValue = LOG_LEVELS[level.toUpperCase()];
    return levelValue !== undefined && CURRENT_LOG_LEVEL <= levelValue;
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
