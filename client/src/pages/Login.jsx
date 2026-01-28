/**
 * Login Page
 * Displays login form with email and password fields
 * Uses react-hook-form for form state management
 * Validates credentials and authenticates user
 * Redirects to dashboard on success
 *
 * Requirements: 32.1, 32.2, 32.9, 32.10, 22.1, 22.2, 22.3, 22.5, 22.6, 22.7
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, Link as RouterLink, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { MuiTextField } from "../components/reusable";
import { useAuth } from "../hooks";
import { isValidEmail } from "../utils/validators";
import { USER_VALIDATION } from "../utils/constants";

/**
 * Login Page Component
 * @component
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  // Initialize infoMessage from location state to avoid useEffect setState
  const [infoMessage, setInfoMessage] = useState(location.state?.message || "");

  // Clear navigation state on mount to prevent message from showing on refresh
  useEffect(() => {
    if (location.state?.message) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.message]);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Toggle password visibility - memoized for stable reference
  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // Password visibility icon - memoized to prevent re-renders
  const passwordVisibilityIcon = useMemo(
    () => (
      <IconButton
        onClick={handleTogglePasswordVisibility}
        edge="end"
        size="small"
        aria-label={showPassword ? "Hide password" : "Show password"}
        tabIndex={-1}
        sx={{ color: "text.secondary" }}
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

  // Form submission handler
  const onSubmit = useCallback(
    async (data) => {
      try {
        setApiError("");

        // Call login mutation
        await login({
          email: data.email, // Already normalized via setValueAs
          password: data.password,
        });

        // Redirect to dashboard on success
        navigate("/dashboard", { replace: true });
      } catch (error) {
        // Handle API errors - RTK Query error structure
        const errorMessage =
          error?.data?.error?.message ||
          error?.data?.message ||
          error?.error ||
          error?.message ||
          "Login failed. Please try again.";
        setApiError(errorMessage);
      }
    },
    [login, navigate]
  );

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
      {/* Login Card */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: 24,
          px: { xs: 2, sm: 2.5 },
          py: 8,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          {/* Logo Icon */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 50,
              height: 50,
              bgcolor: "primary.main",
              borderRadius: 2,
              mb: 1.5,
            }}
          >
            <TaskAltIcon sx={{ fontSize: 40, color: "primary.contrastText" }} />
          </Box>

          {/* Title */}
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              mb: 0.5,
            }}
          >
            TaskManager
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Welcome back! Please sign in to your account.
          </Typography>
        </Box>

        {/* Info Message Alert (from navigation state) */}
        {infoMessage && (
          <Alert
            severity="info"
            sx={{ mb: 1.5 }}
            onClose={() => setInfoMessage("")}
          >
            {infoMessage}
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

        {/* Login Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Login form"
        >
          <Grid container spacing={1.5}>
            {/* Email Field */}
            <Grid size={12}>
              <MuiTextField
                {...register("email", {
                  required: "Email is required",
                  setValueAs: (value) => value?.toLowerCase().trim() || "",
                  validate: {
                    validEmail: (value) =>
                      isValidEmail(value) ||
                      "Please provide a valid email address",
                  },
                  maxLength: {
                    value: USER_VALIDATION.EMAIL.MAX_LENGTH,
                    message: `Email must not exceed ${USER_VALIDATION.EMAIL.MAX_LENGTH} characters`,
                  },
                })}
                error={errors.email}
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                autoFocus
                fullWidth
                size="small"
                startAdornment={
                  <EmailIcon
                    fontSize="small"
                    sx={{ color: "text.secondary" }}
                  />
                }
                disabled={isSubmitting}
              />
            </Grid>

            {/* Password Field with Forgot Password Link */}
            <Grid size={12}>
              <Box sx={{ position: "relative" }}>
                {/* Forgot Password Link - Top Right */}
                <Box
                  sx={{
                    position: "absolute",
                    top: -24,
                    right: 0,
                    zIndex: 1,
                  }}
                >
                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                {/* Password Field */}
                <MuiTextField
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: USER_VALIDATION.PASSWORD.MIN_LENGTH,
                      message: `Password must be at least ${USER_VALIDATION.PASSWORD.MIN_LENGTH} characters`,
                    },
                  })}
                  error={errors.password}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  fullWidth
                  size="small"
                  startAdornment={
                    <LockIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                  }
                  endAdornment={passwordVisibilityIcon}
                  disabled={isSubmitting}
                />
              </Box>
            </Grid>

            {/* Submit Button */}
            <Grid size={12}>
              <Button
                type="submit"
                size="medium"
                fullWidth
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : null
                }
                sx={{
                  mt: 0.5,
                  py: 1,
                  textTransform: "none",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  bgcolor: "primary.main",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                }}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Register Link */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Don't have an account?{" "}
            <Link
              component={RouterLink}
              to="/register"
              sx={{
                color: "primary.main",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>

        {/* Resend Verification Link */}
        {apiError && apiError.toLowerCase().includes("verify") && (
          <Box sx={{ mt: 1.5, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Didn't receive the verification email?{" "}
              <Link
                component={RouterLink}
                to="/verify-email"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Resend verification email
              </Link>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Login;
