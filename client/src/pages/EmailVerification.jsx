import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  useVerifyEmailMutation,
  useResendVerificationMutation,
} from "../redux/features/authSlice";

/**
 * EmailVerification Page
 * Verifies user email with token from URL query parameter
 * Redirects to login on success
 * Provides option to resend verification email if token is invalid/expired
 *
 * Requirements: 32.13, 32.14
 */
const EmailVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email"); // Optional: can be passed from registration

  const [verifyEmail] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();
  const [verificationState, setVerificationState] = useState({
    status: "verifying", // verifying | success | error
    message: "",
  });
  const [resendEmail, setResendEmail] = useState(email || "");
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const verifyEmailToken = async () => {
      if (!token) {
        setVerificationState({
          status: "error",
          message:
            "Verification token is missing. Please check your email link or request a new verification email below.",
        });
        return;
      }

      try {
        const response = await verifyEmail({ token }).unwrap();
        setVerificationState({
          status: "success",
          message: response.message || "Email verified successfully!",
        });
      } catch (error) {
        setVerificationState({
          status: "error",
          message:
            error?.data?.error?.message ||
            "Email verification failed. The link may be invalid or expired.",
        });
      }
    };

    verifyEmailToken();
  }, [token, verifyEmail]);

  const handleNavigateToLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  const handleResendVerification = useCallback(async () => {
    if (!resendEmail || !resendEmail.includes("@")) {
      setVerificationState({
        status: "error",
        message: "Please enter a valid email address to resend verification.",
      });
      return;
    }

    try {
      setResendSuccess(false);
      const response = await resendVerification({
        email: resendEmail,
      }).unwrap();
      setResendSuccess(true);
      setVerificationState({
        status: "error", // Keep error state but show success message
        message:
          response.message ||
          "Verification email sent! Please check your inbox.",
      });
    } catch (error) {
      setVerificationState({
        status: "error",
        message:
          error?.data?.error?.message ||
          "Failed to resend verification email. Please try again later.",
      });
    }
  }, [resendEmail, resendVerification]);

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 3,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: 2,
          p: 3,
        }}
      >
        {/* Verifying State */}
        {verificationState.status === "verifying" && (
          <>
            <CircularProgress size={48} />
            <Typography variant="h6" align="center">
              Verifying your email...
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Please wait while we verify your email address.
            </Typography>
          </>
        )}

        {/* Success State */}
        {verificationState.status === "success" && (
          <>
            <CheckCircleOutlineIcon
              sx={{ fontSize: 56, color: "success.main" }}
            />
            <Typography variant="h6" align="center">
              Email Verified!
            </Typography>
            <Alert severity="success" sx={{ width: "100%" }}>
              {verificationState.message}
            </Alert>
            <Typography variant="body2" color="text.secondary" align="center">
              You can now log in to your account.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={handleNavigateToLogin}
              size="medium"
              sx={{
                py: 1.25,
                textTransform: "none",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              Go to Login
            </Button>
          </>
        )}

        {/* Error State */}
        {verificationState.status === "error" && (
          <>
            <ErrorOutlineIcon
              sx={{
                fontSize: 56,
                color: resendSuccess ? "success.main" : "error.main",
              }}
            />
            <Typography variant="h6" align="center">
              {resendSuccess ? "Email Sent!" : "Verification Failed"}
            </Typography>
            <Alert
              severity={resendSuccess ? "success" : "error"}
              sx={{ width: "100%" }}
            >
              {verificationState.message}
            </Alert>

            {!resendSuccess && (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ mt: 1 }}
                >
                  Didn't receive the email or link expired?
                </Typography>

                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    mt: 1,
                  }}
                >
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleResendVerification}
                    disabled={isResending || !resendEmail}
                    size="medium"
                    sx={{
                      py: 1.25,
                      textTransform: "none",
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                    }}
                  >
                    {isResending ? "Sending..." : "Resend Verification Email"}
                  </Button>
                </Box>
              </>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleNavigateToLogin}
              size="medium"
              sx={{
                mt: 1,
                py: 1.25,
                textTransform: "none",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              Go to Login
            </Button>

            {resendSuccess && (
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
              >
                Check your inbox and click the verification link
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default EmailVerification;
