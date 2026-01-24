import { useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";
import LoginIcon from "@mui/icons-material/Login";
import LockIcon from "@mui/icons-material/Lock";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import WarningIcon from "@mui/icons-material/Warning";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  getUserFriendlyMessage,
  getValidationErrors,
  isAuthError,
  isForbiddenError,
  isNotFoundError,
  isValidationError,
  isConflictError,
  isRateLimitError,
  isNetworkError,
} from "../../utils/errorHandler";
import { HTTP_STATUS } from "../../utils/constants";

/**
 * API Error Display Component
 * Displays API error information with appropriate actions
 * Handles all HTTP error codes (4xx, 5xx) using errorHandler utilities
 *
 * Features:
 * - Automatic error detection using errorHandler utilities
 * - User-friendly error messages via getUserFriendlyMessage
 * - Validation error display with formatValidationErrors
 * - Appropriate icons for each error type
 * - Context-specific action buttons
 * - Collapsible developer section with error details
 * - Copy to clipboard functionality
 * - Responsive design with proper theme integration
 *
 * @param {Object} props - Component props
 * @param {Object} [props.error] - RTK Query error object (preferred)
 * @param {number} [props.statusCode] - HTTP status code (fallback)
 * @param {string} [props.message] - Custom error message (optional)
 * @param {Function} [props.onRetry] - Retry callback
 * @param {Function} [props.onGoHome] - Go home callback
 * @param {Function} [props.onLogin] - Login callback
 */
export default function ApiErrorDisplay({
  error,
  statusCode,
  message,
  onRetry,
  onGoHome,
  onLogin,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract status code from error object or use provided statusCode
  const status =
    error?.status || statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Get user-friendly message using errorHandler utility
  const displayMessage =
    message ||
    (error ? getUserFriendlyMessage(error) : "An unexpected error occurred.");

  // Get validation errors if available
  const validationErrors = error ? getValidationErrors(error) : [];
  const hasValidationErrors = validationErrors.length > 0;

  // Determine error type using errorHandler utilities
  const isAuth = error
    ? isAuthError(error)
    : status === HTTP_STATUS.UNAUTHORIZED;
  const isForbidden = error
    ? isForbiddenError(error)
    : status === HTTP_STATUS.FORBIDDEN;
  const isNotFound = error
    ? isNotFoundError(error)
    : status === HTTP_STATUS.NOT_FOUND;
  const isValidation = error
    ? isValidationError(error)
    : status === HTTP_STATUS.BAD_REQUEST;
  const isConflict = error
    ? isConflictError(error)
    : status === HTTP_STATUS.CONFLICT;
  const isRateLimit = error
    ? isRateLimitError(error)
    : status === HTTP_STATUS.TOO_MANY_REQUESTS;
  const isNetwork = error ? isNetworkError(error) : false;

  // Get error configuration based on error type
  const getErrorConfig = () => {
    if (isAuth) {
      return {
        icon: LockIcon,
        color: "error",
        title: "Authentication Required",
        showRetry: false,
        showHome: false,
        showLogin: true,
      };
    }

    if (isForbidden) {
      return {
        icon: LockIcon,
        color: "error",
        title: "Access Denied",
        showRetry: false,
        showHome: true,
        showLogin: false,
      };
    }

    if (isNotFound) {
      return {
        icon: SearchOffIcon,
        color: "info",
        title: "Not Found",
        showRetry: false,
        showHome: true,
        showLogin: false,
      };
    }

    if (isValidation) {
      return {
        icon: WarningIcon,
        color: "warning",
        title: "Validation Error",
        showRetry: true,
        showHome: true,
        showLogin: false,
      };
    }

    if (isConflict) {
      return {
        icon: WarningIcon,
        color: "warning",
        title: "Conflict",
        showRetry: true,
        showHome: true,
        showLogin: false,
      };
    }

    if (isRateLimit) {
      return {
        icon: WarningIcon,
        color: "warning",
        title: "Too Many Requests",
        showRetry: true,
        showHome: true,
        showLogin: false,
      };
    }

    if (isNetwork) {
      return {
        icon: CloudOffIcon,
        color: "error",
        title: "Network Error",
        showRetry: true,
        showHome: true,
        showLogin: false,
      };
    }

    // Server errors (5xx)
    if (status >= 500) {
      return {
        icon: ErrorOutlineIcon,
        color: "error",
        title: "Server Error",
        showRetry: true,
        showHome: true,
        showLogin: false,
      };
    }

    // Default for unknown errors
    return {
      icon: ErrorOutlineIcon,
      color: "error",
      title: "Something Went Wrong",
      showRetry: true,
      showHome: true,
      showLogin: false,
    };
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  // Get status category for styling
  const category =
    status >= 400 && status < 500
      ? "client"
      : status >= 500
      ? "server"
      : "unknown";

  // Copy error details to clipboard
  const handleCopyError = async () => {
    const errorDetails = JSON.stringify(
      {
        status,
        message: displayMessage,
        validationErrors,
        error: error?.data || error,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
      null,
      2
    );

    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error details:", err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 4, md: 6 },
            borderRadius: 3,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              bgcolor: `${config.color}.main`,
            },
          }}
        >
          {/* Error Icon */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: { xs: 80, sm: 100, md: 120 },
                height: { xs: 80, sm: 100, md: 120 },
                borderRadius: "50%",
                bgcolor: `${config.color}.lighter`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: (theme) =>
                  `0 0 0 8px ${theme.palette[config.color].light}20`,
                animation: "pulse 2s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": {
                    boxShadow: (theme) =>
                      `0 0 0 8px ${theme.palette[config.color].light}20`,
                  },
                  "50%": {
                    boxShadow: (theme) =>
                      `0 0 0 12px ${theme.palette[config.color].light}10`,
                  },
                },
              }}
            >
              <IconComponent
                sx={{
                  fontSize: { xs: 48, sm: 60, md: 72 },
                  color: `${config.color}.main`,
                }}
              />
            </Box>
          </Box>

          {/* Error Title */}
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: { xs: "1.75rem", sm: "2.25rem", md: "3rem" },
              mb: 2,
            }}
          >
            {config.title}
          </Typography>

          {/* Status Code Chips */}
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            sx={{ mb: 3 }}
          >
            <Chip
              label={`HTTP ${status}`}
              color={config.color}
              size="medium"
              sx={{
                fontWeight: 600,
                fontSize: "0.875rem",
                px: 1,
              }}
            />
            <Chip
              label={
                category === "client"
                  ? "Client Error"
                  : category === "server"
                  ? "Server Error"
                  : "Unknown Error"
              }
              variant="outlined"
              color={config.color}
              size="medium"
              sx={{
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            />
          </Stack>

          {/* Error Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: hasValidationErrors ? 2 : 4,
              fontSize: { xs: "0.9375rem", sm: "1.0625rem" },
              lineHeight: 1.7,
              maxWidth: "600px",
              mx: "auto",
            }}
          >
            {displayMessage}
          </Typography>

          {/* Validation Errors */}
          {hasValidationErrors && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                mb: 4,
                textAlign: "left",
                borderRadius: 2,
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Validation Errors:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {validationErrors.map((err, index) => (
                  <Typography
                    key={index}
                    component="li"
                    variant="body2"
                    sx={{ mb: 0.5 }}
                  >
                    {err.msg || err.message}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          {/* Additional Info for Specific Errors */}
          {isRateLimit && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                mb: 4,
                textAlign: "left",
                borderRadius: 2,
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Rate limit exceeded. Please wait a few minutes before trying
                again.
              </Typography>
            </Alert>
          )}

          {status === HTTP_STATUS.SERVICE_UNAVAILABLE && (
            <Alert
              severity="info"
              variant="outlined"
              sx={{
                mb: 4,
                textAlign: "left",
                borderRadius: 2,
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                We're performing scheduled maintenance. The service should be
                back online shortly.
              </Typography>
            </Alert>
          )}

          {/* Developer Section (Collapsible) */}
          {import.meta.env.DEV && (
            <Box sx={{ mb: 4 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  borderRadius: 2,
                }}
              >
                {showDetails ? "Hide" : "Show"} Error Details
              </Button>

              <Collapse in={showDetails}>
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 2,
                    p: 2,
                    textAlign: "left",
                    bgcolor: "grey.50",
                    borderRadius: 2,
                    position: "relative",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: "text.primary" }}
                    >
                      Developer Information
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyError}
                      sx={{
                        color: copied ? "success.main" : "text.secondary",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      {copied ? (
                        <CheckCircleIcon fontSize="small" />
                      ) : (
                        <ContentCopyIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Stack>

                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: "grey.900",
                      color: "grey.100",
                      borderRadius: 1,
                      overflow: "auto",
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      maxHeight: 300,
                      "&::-webkit-scrollbar": {
                        width: 8,
                        height: 8,
                      },
                      "&::-webkit-scrollbar-track": {
                        bgcolor: "grey.800",
                        borderRadius: 1,
                      },
                      "&::-webkit-scrollbar-thumb": {
                        bgcolor: "warning.main",
                        borderRadius: 1,
                        "&:hover": {
                          bgcolor: "warning.dark",
                        },
                      },
                    }}
                  >
                    {JSON.stringify(
                      {
                        status,
                        message: displayMessage,
                        validationErrors,
                        error: error?.data || error,
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                      },
                      null,
                      2
                    )}
                  </Box>
                </Paper>
              </Collapse>
            </Box>
          )}

          {/* Action Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            {config.showRetry && onRetry && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
                sx={{
                  minWidth: { xs: "100%", sm: 160 },
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: 2,
                  "&:hover": {
                    boxShadow: 4,
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease-in-out",
                }}
              >
                Try Again
              </Button>
            )}

            {config.showLogin && onLogin && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<LoginIcon />}
                onClick={onLogin}
                sx={{
                  minWidth: { xs: "100%", sm: 160 },
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: 2,
                  "&:hover": {
                    boxShadow: 4,
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease-in-out",
                }}
              >
                Log In
              </Button>
            )}

            {config.showHome && onGoHome && (
              <Button
                variant={
                  config.showRetry || config.showLogin
                    ? "outlined"
                    : "contained"
                }
                color="primary"
                size="large"
                startIcon={<HomeIcon />}
                onClick={onGoHome}
                sx={{
                  minWidth: { xs: "100%", sm: 160 },
                  py: 1.5,
                  fontWeight: 600,
                  ...(config.showRetry || config.showLogin
                    ? {
                        borderWidth: 2,
                        "&:hover": {
                          borderWidth: 2,
                          transform: "translateY(-2px)",
                        },
                      }
                    : {
                        boxShadow: 2,
                        "&:hover": {
                          boxShadow: 4,
                          transform: "translateY(-2px)",
                        },
                      }),
                  transition: "all 0.3s ease-in-out",
                }}
              >
                Go to Home
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Additional Help Text */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 3,
            fontSize: "0.8125rem",
          }}
        >
          {status >= 500
            ? "If the problem persists, please contact our support team."
            : "Need help? Contact our support team for assistance."}
        </Typography>
      </Container>
    </Box>
  );
}

ApiErrorDisplay.propTypes = {
  error: PropTypes.object,
  statusCode: PropTypes.number,
  message: PropTypes.string,
  onRetry: PropTypes.func,
  onGoHome: PropTypes.func,
  onLogin: PropTypes.func,
};

ApiErrorDisplay.defaultProps = {
  error: null,
  statusCode: null,
  message: null,
  onRetry: null,
  onGoHome: null,
  onLogin: null,
};
