import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";
import { sanitizeErrorMessage } from "../../utils/errorHandler";

/**
 * Error Display Component
 * Displays error information with retry and navigation options
 * Used by ErrorBoundary to show error UI
 *
 * Requirements: 23.1, 23.2, 23.6, 23.7
 */
export default function ErrorDisplay({
  error,
  errorInfo,
  onReset,
  onGoHome,
  retryCount,
}) {
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          gap: (theme) => theme.spacing(3),
        }}
      >
        <Typography variant="h1" color="error">
          Oops!
        </Typography>

        <Typography variant="h5" color="text.primary">
          Something went wrong
        </Typography>

        <Typography variant="body1" color="text.secondary">
          We're sorry for the inconvenience. An unexpected error has occurred.
        </Typography>

        {!canRetry && (
          <Typography variant="body2" color="warning.main">
            Maximum retry attempts reached. Please contact support if the issue
            persists.
          </Typography>
        )}

        {import.meta.env.DEV && error && (
          <Box
            sx={{
              mt: (theme) => theme.spacing(2),
              p: (theme) => theme.spacing(2),
              bgcolor: "error.light",
              borderRadius: (theme) => theme.shape.borderRadius,
              maxWidth: "100%",
              overflow: "auto",
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {sanitizeErrorMessage(error.toString())}
              {errorInfo && (
                <>
                  {"\n\n"}
                  {sanitizeErrorMessage(errorInfo.componentStack)}
                </>
              )}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            gap: (theme) => theme.spacing(2),
            mt: (theme) => theme.spacing(2),
          }}
        >
          {canRetry ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={onReset}
              >
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<HomeIcon />}
                onClick={onGoHome}
              >
                Go to Home
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<HomeIcon />}
              onClick={onGoHome}
            >
              Go to Home
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
}

ErrorDisplay.propTypes = {
  error: PropTypes.object,
  errorInfo: PropTypes.object,
  onReset: PropTypes.func.isRequired,
  onGoHome: PropTypes.func.isRequired,
  retryCount: PropTypes.number,
};

ErrorDisplay.defaultProps = {
  retryCount: 0,
  error: null,
  errorInfo: null,
};
