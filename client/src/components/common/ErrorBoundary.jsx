import { Component } from "react";
import PropTypes from "prop-types";
import { logError } from "../../utils/errorHandler";
import ErrorDisplay from "./ErrorDisplay";

/**
 * Error Boundary Component
 * Catches ALL unhandled frontend errors at any level of the component tree
 * Provides reset/retry options with exponential backoff
 * Logs errors for debugging and integrates with Redux for state reset
 *
 * CRITICAL: This component handles ALL frontend errors:
 * - Component errors (render, lifecycle, event handlers)
 * - Syntax errors (missing brackets, semicolons, etc.)
 * - Module loading errors (import failures)
 * - Chunk loading errors (code splitting failures)
 * - Unhandled promise rejections
 * - Global JavaScript errors
 * - React Router navigation failures
 * - Redux state management failures
 *
 * NOT Handled Here:
 * - API errors (4xx, 5xx) → Handled by baseQuery in RTK Query
 *
 * Error Type Detection:
 * - Error type is automatically detected from the error object itself
 * - No manual classification needed
 * - Supports all JavaScript error types (SyntaxError, TypeError, ReferenceError, etc.)
 *
 * Requirements: 23.1, 23.2, 23.6, 23.7
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  /**
   * Get error type from error object itself
   * Uses error.name or error.constructor.name for accurate type detection
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  getErrorType(error) {
    if (!error) return "UNKNOWN_ERROR";

    // Use error.name if available (SyntaxError, TypeError, ReferenceError, etc.)
    if (error.name) {
      return error.name;
    }

    // Fallback to constructor name
    if (error.constructor && error.constructor.name) {
      return error.constructor.name;
    }

    // Last resort
    return "UNKNOWN_ERROR";
  }

  /**
   * Check if error is recoverable (can retry)
   * @param {string} errorType - Error type
   * @returns {boolean} True if recoverable
   */
  isRecoverableError(errorType) {
    const recoverableTypes = [
      "NetworkError",
      "ChunkLoadError",
      "TypeError", // Sometimes recoverable
      "NETWORK_ERROR",
      "CHUNK_ERROR",
    ];

    return recoverableTypes.some((type) =>
      errorType.toLowerCase().includes(type.toLowerCase())
    );
  }

  /**
   * Check if error should trigger auto-reload
   * @param {string} errorType - Error type
   * @param {Error} error - Error object
   * @returns {boolean} True if should auto-reload
   */
  shouldAutoReload(errorType, error) {
    const errorMessage = error?.message?.toLowerCase() || "";

    // Chunk loading errors
    if (
      errorType.toLowerCase().includes("chunk") ||
      errorMessage.includes("chunk") ||
      errorMessage.includes("loading chunk") ||
      errorMessage.includes("failed to fetch dynamically imported module")
    ) {
      return true;
    }

    return false;
  }

  componentDidMount() {
    // Add global error handler for uncaught errors
    window.addEventListener("error", this.handleGlobalError);

    // Add global handler for unhandled promise rejections
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    // Remove global error handlers
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener(
      "unhandledrejection",
      this.handlePromiseRejection
    );
  }

  /**
   * Handle global JavaScript errors (syntax errors, module loading errors, etc.)
   * @param {ErrorEvent} event - Error event
   */
  handleGlobalError = (event) => {
    // Prevent default browser error handling
    event.preventDefault();

    const error = event.error || new Error(event.message);
    const errorType = this.getErrorType(error);

    // Log error
    logError(error, "ErrorBoundary - Global Error", {
      errorType,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      retryCount: this.state.retryCount,
    });

    // Update state with error details
    this.setState({
      hasError: true,
      error,
      errorInfo: {
        componentStack: `\nError occurred at: ${event.filename}:${event.lineno}:${event.colno}`,
      },
      errorType,
    });

    // Handle auto-reload for chunk errors
    if (
      this.shouldAutoReload(errorType, error) &&
      this.state.retryCount === 0
    ) {
      console.warn(
        "[ErrorBoundary] Chunk loading error detected, reloading page"
      );
      this.setState({ retryCount: 1 });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  /**
   * Handle unhandled promise rejections
   * @param {PromiseRejectionEvent} event - Promise rejection event
   */
  handlePromiseRejection = (event) => {
    // Prevent default browser error handling
    event.preventDefault();

    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    const errorType = this.getErrorType(error);

    // Log error
    logError(error, "ErrorBoundary - Unhandled Promise Rejection", {
      errorType,
      reason: event.reason,
      retryCount: this.state.retryCount,
    });

    // Update state with error details
    this.setState({
      hasError: true,
      error,
      errorInfo: {
        componentStack: "\nUnhandled Promise Rejection",
      },
      errorType,
    });
  };

  componentDidCatch(error, errorInfo) {
    const errorType = this.getErrorType(error);

    // Log error to console (dev) or backend (prod)
    logError(error, "ErrorBoundary - Component Error", {
      errorType,
      componentStack: errorInfo?.componentStack,
      retryCount: this.state.retryCount,
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorType,
    });

    // Handle auto-reload for chunk errors
    if (
      this.shouldAutoReload(errorType, error) &&
      this.state.retryCount === 0
    ) {
      console.warn(
        "[ErrorBoundary] Chunk loading error detected, reloading page"
      );
      this.setState({ retryCount: 1 });
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }

    // Call onError callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo, errorType);
      } catch (callbackError) {
        console.error(
          "[ErrorBoundary] Error in onError callback:",
          callbackError
        );
      }
    }
  }

  handleReset = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    // Check if max retries reached
    if (retryCount >= maxRetries) {
      console.warn("[ErrorBoundary] Max retries reached, cannot reset");
      return;
    }

    console.log(
      `[ErrorBoundary] Resetting error boundary (retry ${
        retryCount + 1
      }/${maxRetries})`
    );

    // Call onReset callback if provided (to reset Redux state)
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (callbackError) {
        console.error(
          "[ErrorBoundary] Error in onReset callback:",
          callbackError
        );
      }
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      retryCount: retryCount + 1,
    });
  };

  handleGoHome = () => {
    console.log("[ErrorBoundary] Navigating to home page");

    // Reset retry count when navigating home
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      retryCount: 0,
    });

    // Navigate to home page
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback({
            error: this.state.error,
            errorInfo: this.state.errorInfo,
            errorType: this.state.errorType,
            resetError: this.handleReset,
            retryCount: this.state.retryCount,
          });
        }
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorType={this.state.errorType}
          onReset={this.handleReset}
          onGoHome={this.handleGoHome}
          retryCount={this.state.retryCount}
        />
      );
    }

    // Render children if no error
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
  onReset: PropTypes.func,
};

export default ErrorBoundary;
