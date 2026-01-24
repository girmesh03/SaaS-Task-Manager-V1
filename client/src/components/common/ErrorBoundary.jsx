import { Component } from "react";
import PropTypes from "prop-types";
import { logError } from "../../utils/errorHandler";
import ErrorDisplay from "./ErrorDisplay";

/**
 * Error Boundary Component
 * Catches unhandled errors in component tree and displays error page
 * Provides reset/retry options with exponential backoff
 * Logs errors for debugging and integrates with Redux for state reset
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
   * Classify error type for appropriate handling
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  classifyError(error) {
    const errorMessage = error?.message?.toLowerCase() || "";

    // Network errors - recoverable
    if (
      errorMessage.includes("fetch") ||
      errorMessage.includes("network") ||
      errorMessage.includes("timeout")
    ) {
      return "NETWORK_ERROR";
    }

    // Auth errors - redirect to login
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("unauthenticated")
    ) {
      return "AUTH_ERROR";
    }

    // Chunk loading errors - recoverable
    if (
      errorMessage.includes("chunk") ||
      errorMessage.includes("loading") ||
      errorMessage.includes("dynamically imported module")
    ) {
      return "CHUNK_ERROR";
    }

    // Fatal errors - show error page
    return "FATAL_ERROR";
  }

  componentDidCatch(error, errorInfo) {
    const errorType = this.classifyError(error);

    // Log error to console (dev) or backend (prod)
    logError(error, "ErrorBoundary");

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorType,
    });

    // Handle auth errors - redirect to login
    if (errorType === "AUTH_ERROR") {
      // Call onAuthError callback if provided (to clear Redux state)
      if (this.props.onAuthError) {
        this.props.onAuthError();
      }

      // Redirect to login
      window.location.href = "/login";
      return;
    }

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorType);
    }
  }

  handleReset = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    // Check if max retries reached
    if (retryCount >= maxRetries) {
      // Don't reset, show "Contact Support" message
      return;
    }

    // Call onReset callback if provided (to reset Redux state)
    if (this.props.onReset) {
      this.props.onReset();
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
            resetError: this.handleReset,
          });
        }
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
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
  onAuthError: PropTypes.func,
};

export default ErrorBoundary;
