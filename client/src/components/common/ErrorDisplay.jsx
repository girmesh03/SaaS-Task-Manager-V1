import { useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import BugReportIcon from "@mui/icons-material/BugReport";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { sanitizeErrorMessage } from "../../utils/errorHandler";

/**
 * Error Display Component
 * Displays error information with retry and navigation options
 * Used by ErrorBoundary to show error UI
 *
 * Features:
 * - User-friendly error messages for production
 * - Collapsible detailed developer information in development
 * - Responsive design with proper theme integration
 * - Dynamic error type handling
 * - Retry mechanism with max attempts
 * - Copy error details to clipboard
 * - Smooth animations and transitions
 *
 * Requirements: 23.1, 23.2, 23.6, 23.7
 */

/**
 * Get user-friendly error title based on error type
 */
const getErrorTitle = (errorType) => {
  if (!errorType) return "Something Went Wrong";
  const readable = errorType.replace(/([A-Z])/g, " $1").trim();
  return readable || "Something Went Wrong";
};

/**
 * Get user-friendly error description based on error type
 */
const getErrorDescription = (errorType) => {
  if (!errorType) {
    return "We encountered an unexpected error. Our team has been notified and is working on a fix.";
  }

  const type = errorType.toLowerCase();

  if (type.includes("syntax")) {
    return "There's a syntax error in the application code. Please try refreshing the page.";
  }

  if (type.includes("type")) {
    return "The application encountered a type error. Please try refreshing the page.";
  }

  if (type.includes("reference")) {
    return "The application tried to access something that doesn't exist. Please try refreshing the page.";
  }

  if (type.includes("network")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (type.includes("chunk")) {
    return "Failed to load application resources. The page will reload automatically.";
  }

  if (type.includes("range")) {
    return "A value is outside the allowed range. Please try again.";
  }

  if (type.includes("uri")) {
    return "An invalid URL or URI format was encountered. Please try again.";
  }

  return "We encountered an unexpected error. Our team has been notified and is working on a fix.";
};

/**
 * Get developer-friendly error details
 */
const getDevErrorDetails = (error, errorInfo) => {
  const parts = [];

  if (error) {
    parts.push(`Error: ${error.name || "Unknown"}`);
    parts.push(`Message: ${error.message || "No message"}`);

    if (error.stack) {
      parts.push(`\nStack Trace:`);
      parts.push(error.stack);
    }
  }

  if (errorInfo?.componentStack) {
    parts.push(`\nComponent Stack:`);
    parts.push(errorInfo.componentStack);
  }

  return parts.join("\n");
};

export default function ErrorDisplay({
  error,
  errorInfo,
  errorType,
  onReset,
  onGoHome,
  retryCount,
}) {
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;
  const isDev = import.meta.env.DEV;
  const devErrorDetails = isDev ? getDevErrorDetails(error, errorInfo) : null;

  // State for collapsible developer section
  const [devSectionOpen, setDevSectionOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Get error messages
  const errorTitle = getErrorTitle(errorType);
  const errorDescription = getErrorDescription(errorType);

  // Handle copy to clipboard
  const handleCopyError = async () => {
    if (!devErrorDetails) return;

    try {
      await navigator.clipboard.writeText(devErrorDetails);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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
              bgcolor: "error.main",
            },
          }}
        >
          {/* Error Icon with Animation */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              // mb: 3,
              animation: "pulse 2s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": {
                  transform: "scale(1)",
                },
                "50%": {
                  transform: "scale(1.05)",
                },
              },
            }}
          >
            <Box
              sx={{
                width: { xs: 80, sm: 100, md: 120 },
                height: { xs: 80, sm: 100, md: 120 },
                borderRadius: "50%",
                bgcolor: "error.lighter",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: (theme) =>
                  `0 0 0 8px ${theme.palette.error.light}20`,
              }}
            >
              <ErrorOutlineIcon
                sx={{
                  fontSize: { xs: 48, sm: 60, md: 72 },
                  color: "error.main",
                }}
              />
            </Box>
          </Box>

          {/* Error Title */}
          <Typography
            variant="h6"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: { xs: "1.75rem", sm: "2.25rem", md: "3rem" },
              mb: 2,
            }}
          >
            {errorTitle}
          </Typography>

          {/* Error Type Chip */}
          {errorType && (
            <Box sx={{ mb: 3 }}>
              <Chip
                label={errorType}
                color="error"
                size="medium"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  px: 1,
                }}
              />
            </Box>
          )}

          {/* Error Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              fontSize: { xs: "0.9375rem", sm: "1.0625rem" },
              lineHeight: 1.7,
              maxWidth: "600px",
              mx: "auto",
            }}
          >
            {errorDescription}
          </Typography>

          {/* Max Retries Warning */}
          {!canRetry && (
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
                Maximum retry attempts reached. If the problem persists, please
                contact support or try again later.
              </Typography>
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: isDev && devErrorDetails ? 4 : 0 }}
          >
            {canRetry && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={onReset}
                sx={{
                  minWidth: { xs: "100%", sm: 180 },
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: 2,
                  "&:hover": {
                    boxShadow: 4,
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                Try Again
                {retryCount > 0 && ` (${retryCount}/${maxRetries})`}
              </Button>
            )}
            <Button
              variant={canRetry ? "outlined" : "contained"}
              color="primary"
              size="small"
              startIcon={<HomeIcon />}
              onClick={onGoHome}
              sx={{
                minWidth: { xs: "100%", sm: 180 },
                py: 1.5,
                fontWeight: 600,
                ...(canRetry
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
                transition: "all 0.2s ease-in-out",
              }}
            >
              Go to Home
            </Button>
          </Stack>

          {/* Developer Error Details (Development Only) */}
          {isDev && devErrorDetails && (
            <>
              <Divider sx={{ my: 4 }}>
                <Chip
                  icon={<BugReportIcon />}
                  label="Developer Information"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Divider>

              {/* Collapsible Toggle Button */}
              <Button
                onClick={() => setDevSectionOpen(!devSectionOpen)}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: devSectionOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s ease-in-out",
                    }}
                  />
                }
                variant="outlined"
                color="warning"
                fullWidth
                sx={{
                  mb: 2,
                  py: 1.5,
                  fontWeight: 600,
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                  },
                }}
              >
                {devSectionOpen ? "Hide" : "Show"} Error Details
              </Button>

              {/* Collapsible Developer Section */}
              <Collapse in={devSectionOpen} timeout={300}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    bgcolor: "grey.900",
                    color: "grey.100",
                    textAlign: "left",
                    maxHeight: 500,
                    overflow: "auto",
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: "warning.main",
                    position: "relative",
                    "& pre": {
                      margin: 0,
                      fontFamily: '"Fira Code", "Courier New", monospace',
                      fontSize: "0.8125rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    },
                    "&::-webkit-scrollbar": {
                      width: 8,
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
                  {/* Copy Button */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                    }}
                  >
                    <Tooltip
                      title={copySuccess ? "Copied!" : "Copy to clipboard"}
                      placement="left"
                    >
                      <IconButton
                        onClick={handleCopyError}
                        size="small"
                        sx={{
                          bgcolor: copySuccess
                            ? "success.main"
                            : "warning.main",
                          color: "grey.900",
                          "&:hover": {
                            bgcolor: copySuccess
                              ? "success.dark"
                              : "warning.dark",
                          },
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 2,
                      color: "warning.light",
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      letterSpacing: 0.5,
                    }}
                  >
                    🐛 ERROR DETAILS
                  </Typography>
                  <pre>{sanitizeErrorMessage(devErrorDetails)}</pre>
                </Paper>

                <Alert
                  severity="info"
                  variant="outlined"
                  sx={{
                    mt: 2,
                    textAlign: "left",
                    borderRadius: 2,
                    "& .MuiAlert-message": {
                      width: "100%",
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    💡 This detailed error information is only visible in
                    development mode and will not be shown to users in
                    production.
                  </Typography>
                </Alert>
              </Collapse>
            </>
          )}
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
          If you continue to experience issues, please contact our support team.
        </Typography>
      </Container>
    </Box>
  );
}

ErrorDisplay.propTypes = {
  error: PropTypes.object,
  errorInfo: PropTypes.object,
  errorType: PropTypes.string,
  onReset: PropTypes.func.isRequired,
  onGoHome: PropTypes.func.isRequired,
  retryCount: PropTypes.number,
};

ErrorDisplay.defaultProps = {
  retryCount: 0,
  error: null,
  errorInfo: null,
  errorType: null,
};
