/**
 * Forgot Password Page
 * Displays email submission form
 * Sends password reset email
 * Displays success message
 * Implements resend link functionality
 *
 * Requirements: 32.5, 32.6, 32.11, 22.1, 22.2, 22.3, 22.5, 22.6, 22.7
 */

import { useState, useCallback } from "react";
import { Link as RouterLink } from "react-router";
import { useForm } from "react-hook-form";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import EmailIcon from "@mui/icons-material/Email";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { MuiTextField, MuiLoading } from "../components/reusable";
import { useAuth } from "../hooks";
import { isValidEmail } from "../utils/validators";
import { USER_VALIDATION } from "../utils/constants";

/**
 * Forgot Password Page Component
 * @component
 */
const ForgotPassword = () => {
  const { forgotPassword, isLoading } = useAuth();
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  // Start resend countdown
  const startResendCountdown = useCallback(() => {
    setCanResend(false);
    setResendCountdown(60);

    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Form submission handler
  const onSubmit = useCallback(
    async (data) => {
      try {
        setApiError("");
        setSuccessMessage("");

        // Call forgot password mutation
        await forgotPassword({
          email: data.email.toLowerCase().trim(),
        });

        // Show success message
        setSuccessMessage(
          "If the email exists, a password reset link has been sent. Please check your inbox."
        );

        // Start resend countdown
        startResendCountdown();
      } catch (error) {
        // Handle API errors
        const errorMessage =
          error?.data?.error?.message ||
          error?.message ||
          "Failed to send reset email. Please try again.";
        setApiError(errorMessage);
      }
    },
    [forgotPassword, startResendCountdown]
  );

  // Resend handler
  const handleResend = useCallback(() => {
    if (canResend) {
      handleSubmit(onSubmit)();
    }
  }, [canResend, handleSubmit, onSubmit]);

  // Loading state
  if (isLoading && !isSubmitting) {
    return <MuiLoading />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px)",
        px: 1.5,
        py: 2,
      }}
    >
      {/* Forgot Password Card */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: 1,
          p: { xs: 2, sm: 2.5 },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2, textAlign: "center" }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              mb: 0.5,
            }}
          >
            Forgot Password?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Enter your email address and we'll send you a link to reset your
            password
          </Typography>
        </Box>

        {/* Success Alert */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            {successMessage}
          </Alert>
        )}

        {/* API Error Alert */}
        {apiError && (
          <Alert
            severity="error"
            sx={{ mb: 1.5 }}
            onClose={() => setApiError("")}
          >
            {apiError}
          </Alert>
        )}

        {/* Forgot Password Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          {/* Email Field */}
          <MuiTextField
            {...register("email", {
              required: "Email is required",
              validate: {
                validEmail: (value) =>
                  isValidEmail(value) || "Please provide a valid email address",
              },
              maxLength: {
                value: USER_VALIDATION.EMAIL.MAX_LENGTH,
                message: `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`,
              },
            })}
            error={errors.email}
            label="Email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            autoFocus
            fullWidth
            size="small"
            startAdornment={<EmailIcon fontSize="small" color="action" />}
            disabled={isSubmitting}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="medium"
            fullWidth
            disabled={isSubmitting}
            sx={{
              mt: 0.5,
              py: 1,
              textTransform: "none",
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>

          {/* Resend Link */}
          {successMessage && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Didn't receive the email?{" "}
                {canResend ? (
                  <Link
                    component="button"
                    type="button"
                    onClick={handleResend}
                    sx={{
                      color: "primary.main",
                      textDecoration: "none",
                      fontWeight: 600,
                      cursor: "pointer",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Resend
                  </Link>
                ) : (
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ color: "text.disabled" }}
                  >
                    Resend in {resendCountdown}s
                  </Typography>
                )}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Back to Login Link */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link
            component={RouterLink}
            to="/login"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color: "primary.main",
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            <ArrowBackIcon fontSize="small" />
            Back to Login
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
