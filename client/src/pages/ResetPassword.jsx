/**
 * Reset Password Page
 * Validates reset token
 * Displays password reset form
 * Updates user password
 * Redirects to login on success
 *
 * Requirements: 32.7, 32.8, 32.12, 22.1, 22.2, 22.3, 22.5, 22.6, 22.7
 */

import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { useForm } from "react-hook-form";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import { MuiTextField, MuiLoading } from "../components/reusable";
import { useAuth } from "../hooks";
import { validatePassword } from "../utils/validators";

/**
 * Reset Password Page Component
 * @component
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Get token from URL query params
  const token = searchParams.get("token");

  // Initialize token error state
  const [tokenError] = useState(() => {
    if (!token) {
      return "Invalid or missing reset token. Please request a new password reset link.";
    }
    return "";
  });

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Toggle password visibility - memoized for stable reference
  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleToggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  // Password visibility icons - memoized to prevent re-renders
  const passwordVisibilityIcon = useMemo(
    () => (
      <IconButton
        onClick={handleTogglePasswordVisibility}
        edge="end"
        size="small"
        aria-label={showPassword ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {showPassword ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
      </IconButton>
    ),
    [showPassword, handleTogglePasswordVisibility]
  );

  const confirmPasswordVisibilityIcon = useMemo(
    () => (
      <IconButton
        onClick={handleToggleConfirmPasswordVisibility}
        edge="end"
        size="small"
        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {showConfirmPassword ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
      </IconButton>
    ),
    [showConfirmPassword, handleToggleConfirmPasswordVisibility]
  );

  // Form submission handler
  const onSubmit = useCallback(
    async (data) => {
      try {
        setApiError("");
        setSuccessMessage("");

        // Call reset password mutation
        await resetPassword({
          token,
          password: data.password,
        });

        // Show success message
        setSuccessMessage("Password reset successful! Redirecting to login...");

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
      } catch (error) {
        // Handle API errors
        const errorMessage =
          error?.data?.error?.message ||
          error?.message ||
          "Failed to reset password. Please try again.";
        setApiError(errorMessage);
      }
    },
    [resetPassword, token, navigate]
  );

  // Loading state
  if (isLoading && !isSubmitting) {
    return <MuiLoading />;
  }

  // Token error state
  if (tokenError) {
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
        <Box
          sx={{
            width: "100%",
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 1,
            p: { xs: 2, sm: 2.5 },
            textAlign: "center",
          }}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            {tokenError}
          </Alert>

          <Button
            component={RouterLink}
            to="/forgot-password"
            variant="contained"
            fullWidth
            size="medium"
            sx={{
              py: 1,
              textTransform: "none",
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            Request New Reset Link
          </Button>

          <Box sx={{ mt: 1.5 }}>
            <Link
              component={RouterLink}
              to="/login"
              sx={{
                color: "primary.main",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Back to Login
            </Link>
          </Box>
        </Box>
      </Box>
    );
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
      {/* Reset Password Card */}
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
            Reset Password
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Enter your new password below
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

        {/* Reset Password Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          {/* Password Field */}
          <MuiTextField
            {...register("password", {
              required: "Password is required",
              validate: {
                validPassword: (value) => {
                  const result = validatePassword(value, false);
                  return result.isValid || result.errors[0];
                },
              },
            })}
            error={errors.password}
            label="New Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your new password"
            autoComplete="new-password"
            autoFocus
            fullWidth
            size="small"
            startAdornment={<LockIcon fontSize="small" color="action" />}
            endAdornment={passwordVisibilityIcon}
            disabled={isSubmitting}
          />

          {/* Confirm Password Field */}
          <MuiTextField
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: {
                matchesPassword: (value) => {
                  const password = getValues("password");
                  return value === password || "Passwords do not match";
                },
              },
            })}
            error={errors.confirmPassword}
            label="Confirm New Password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your new password"
            autoComplete="new-password"
            fullWidth
            size="small"
            startAdornment={<LockIcon fontSize="small" color="action" />}
            endAdornment={confirmPasswordVisibilityIcon}
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
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </Box>

        {/* Back to Login Link */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link
            component={RouterLink}
            to="/login"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Back to Login
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default ResetPassword;
