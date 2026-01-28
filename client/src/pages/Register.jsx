/**
 * Register Page
 * Displays registration form with organization, department, and user fields
 * Uses react-hook-form for form state management
 * Creates new organization with department and SuperAdmin user
 * Redirects to login on success
 *
 * Requirements: 32.3, 32.4, 32.9, 22.1, 22.2, 22.3, 22.5, 22.6, 22.7
 */

import { useState, useCallback, useMemo } from "react";
import { useNavigate, Link as RouterLink } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import BusinessIcon from "@mui/icons-material/Business";
import DepartmentIcon from "@mui/icons-material/AccountTree";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BadgeIcon from "@mui/icons-material/Badge";
import {
  MuiTextField,
  MuiLoading,
  MuiSelectAutocomplete,
} from "../components/reusable";
import { useAuth } from "../hooks";
import {
  isValidEmail,
  isValidPhone,
  validatePassword,
  validateOrganizationName,
  validateDepartmentName,
  validateUserName,
  validateEmployeeId,
} from "../utils/validators";
import {
  USER_VALIDATION,
  ORGANIZATION_VALIDATION,
  INDUSTRIES,
  INDUSTRIES_SIZE,
} from "../utils/constants";

/**
 * Register Page Component
 * @component
 */
const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      // Organization fields
      organizationName: "",
      organizationEmail: "",
      organizationPhone: "",
      organizationAddress: "",
      organizationIndustry: null,
      organizationSize: null,
      organizationDescription: "",
      // Department fields
      departmentName: "",
      departmentDescription: "",
      // User fields
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      employeeId: "",
      phone: "",
    },
  });

  // Industry options from constants
  const industryOptions = useMemo(
    () =>
      Object.values(INDUSTRIES).map((industry) => ({
        label: industry,
        value: industry,
      })),
    []
  );

  // Size options from constants
  const sizeOptions = useMemo(
    () =>
      Object.values(INDUSTRIES_SIZE).map((size) => ({
        label: size,
        value: size,
      })),
    []
  );

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

        // Prepare registration data
        const registrationData = {
          organization: {
            name: data.organizationName.trim(),
            email: data.organizationEmail.toLowerCase().trim(),
            phone: data.organizationPhone.trim(),
            address: data.organizationAddress.trim(),
            industry:
              data.organizationIndustry?.value || data.organizationIndustry,
            size: data.organizationSize?.value || data.organizationSize,
            description: data.organizationDescription?.trim() || "",
          },
          department: {
            name: data.departmentName.trim(),
            description: data.departmentDescription?.trim() || "",
          },
          user: {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: data.email.toLowerCase().trim(),
            password: data.password,
            ...(data.employeeId?.trim() && {
              employeeId: data.employeeId.trim(),
            }),
            ...(data.phone?.trim() && { phone: data.phone.trim() }),
          },
        };

        // Call register mutation
        await registerUser(registrationData);

        // Show success message about email verification
        setSuccessMessage(
          "Registration successful! We've sent a verification email to your inbox. Please verify your email before logging in."
        );

        // Redirect to login after 6 seconds to give user time to read message
        setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              message:
                "Please check your email to verify your account before logging in",
            },
          });
        }, 6000);
      } catch (error) {
        // Handle API errors
        const errorMessage =
          error?.data?.error?.message ||
          error?.message ||
          "Registration failed. Please try again.";
        setApiError(errorMessage);
      }
    },
    [registerUser, navigate]
  );

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
      {/* Register Card */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
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
            Create Account
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Register your organization to get started
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

        {/* Registration Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          {/* Organization Section */}
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}
            >
              <BusinessIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Organization Information
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <MuiTextField
                {...register("organizationName", {
                  required: "Organization name is required",
                  validate: {
                    validName: (value) => {
                      const result = validateOrganizationName(value);
                      return result.isValid || result.errors[0];
                    },
                  },
                })}
                error={errors.organizationName}
                label="Organization Name"
                placeholder="Enter organization name"
                autoFocus
                fullWidth
                size="small"
                disabled={isSubmitting}
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <MuiTextField
                  {...register("organizationEmail", {
                    required: "Organization email is required",
                    validate: {
                      validEmail: (value) =>
                        isValidEmail(value) ||
                        "Please provide a valid email address",
                    },
                  })}
                  error={errors.organizationEmail}
                  label="Organization Email"
                  type="email"
                  placeholder="Enter organization email"
                  fullWidth
                  size="small"
                  startAdornment={<EmailIcon fontSize="small" color="action" />}
                  disabled={isSubmitting}
                />

                <MuiTextField
                  {...register("organizationPhone", {
                    required: "Organization phone is required",
                    validate: {
                      validPhone: (value) =>
                        isValidPhone(value) ||
                        "Please provide a valid Ethiopian phone number",
                    },
                  })}
                  error={errors.organizationPhone}
                  label="Organization Phone"
                  placeholder="+251XXXXXXXXX"
                  fullWidth
                  size="small"
                  startAdornment={<PhoneIcon fontSize="small" color="action" />}
                  disabled={isSubmitting}
                />
              </Box>

              <MuiTextField
                {...register("organizationAddress", {
                  required: "Organization address is required",
                  minLength: {
                    value: ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH,
                    message: `Address must be at least ${ORGANIZATION_VALIDATION.ADDRESS.MIN_LENGTH} characters`,
                  },
                  maxLength: {
                    value: ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH,
                    message: `Address must not exceed ${ORGANIZATION_VALIDATION.ADDRESS.MAX_LENGTH} characters`,
                  },
                })}
                error={errors.organizationAddress}
                label="Organization Address"
                placeholder="Enter organization address"
                fullWidth
                size="small"
                startAdornment={
                  <LocationOnIcon fontSize="small" color="action" />
                }
                disabled={isSubmitting}
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <Controller
                  name="organizationIndustry"
                  control={control}
                  rules={{
                    required: "Industry is required",
                  }}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <MuiSelectAutocomplete
                      ref={ref}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      options={industryOptions}
                      label="Industry"
                      placeholder="Select industry"
                      error={errors.organizationIndustry}
                      disabled={isSubmitting}
                      fullWidth
                      size="small"
                      disableClearable={false}
                      getOptionLabel={(option) => option?.label || ""}
                      isOptionEqualToValue={(option, value) =>
                        option?.value === value?.value
                      }
                    />
                  )}
                />

                <Controller
                  name="organizationSize"
                  control={control}
                  rules={{
                    required: "Organization size is required",
                  }}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <MuiSelectAutocomplete
                      ref={ref}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      options={sizeOptions}
                      label="Organization Size"
                      placeholder="Select size"
                      error={errors.organizationSize}
                      disabled={isSubmitting}
                      fullWidth
                      size="small"
                      disableClearable={false}
                      getOptionLabel={(option) => option?.label || ""}
                      isOptionEqualToValue={(option, value) =>
                        option?.value === value?.value
                      }
                    />
                  )}
                />
              </Box>

              <MuiTextField
                {...register("organizationDescription")}
                error={errors.organizationDescription}
                label="Description (Optional)"
                placeholder="Brief description of your organization"
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                size="small"
                disabled={isSubmitting}
              />
            </Box>
          </Box>

          <Divider />

          {/* Department Section */}
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}
            >
              <DepartmentIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Department Information
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <MuiTextField
                {...register("departmentName", {
                  required: "Department name is required",
                  validate: {
                    validName: (value) => {
                      const result = validateDepartmentName(value);
                      return result.isValid || result.errors[0];
                    },
                  },
                })}
                error={errors.departmentName}
                label="Department Name"
                placeholder="Enter department name"
                fullWidth
                size="small"
                disabled={isSubmitting}
              />

              <MuiTextField
                {...register("departmentDescription")}
                error={errors.departmentDescription}
                label="Description (Optional)"
                placeholder="Brief description of the department"
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                size="small"
                disabled={isSubmitting}
              />
            </Box>
          </Box>

          <Divider />

          {/* User Section */}
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}
            >
              <PersonIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Your Information
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <MuiTextField
                  {...register("firstName", {
                    required: "First name is required",
                    validate: {
                      validName: (value) => {
                        const result = validateUserName(value, "First name");
                        return result.isValid || result.errors[0];
                      },
                    },
                  })}
                  error={errors.firstName}
                  label="First Name"
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                />

                <MuiTextField
                  {...register("lastName", {
                    required: "Last name is required",
                    validate: {
                      validName: (value) => {
                        const result = validateUserName(value, "Last name");
                        return result.isValid || result.errors[0];
                      },
                    },
                  })}
                  error={errors.lastName}
                  label="Last Name"
                  placeholder="Enter your last name"
                  autoComplete="family-name"
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                />
              </Box>

              <MuiTextField
                {...register("email", {
                  required: "Email is required",
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
                label="Email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                fullWidth
                size="small"
                startAdornment={<EmailIcon fontSize="small" color="action" />}
                disabled={isSubmitting}
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <MuiTextField
                  {...register("employeeId", {
                    validate: {
                      validId: (value) => {
                        // Optional field - only validate if provided
                        if (!value || value.trim() === "") return true;
                        const result = validateEmployeeId(value);
                        return result.isValid || result.error;
                      },
                    },
                  })}
                  error={errors.employeeId}
                  label="Employee ID (Optional)"
                  placeholder="0001-9999"
                  fullWidth
                  size="small"
                  startAdornment={<BadgeIcon fontSize="small" color="action" />}
                  disabled={isSubmitting}
                />

                <MuiTextField
                  {...register("phone", {
                    validate: {
                      validPhone: (value) =>
                        !value ||
                        isValidPhone(value) ||
                        "Please provide a valid Ethiopian phone number",
                    },
                  })}
                  error={errors.phone}
                  label="Phone (Optional)"
                  placeholder="+251XXXXXXXXX"
                  autoComplete="tel"
                  fullWidth
                  size="small"
                  startAdornment={<PhoneIcon fontSize="small" color="action" />}
                  disabled={isSubmitting}
                />
              </Box>

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
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="new-password"
                fullWidth
                size="small"
                startAdornment={<LockIcon fontSize="small" color="action" />}
                endAdornment={passwordVisibilityIcon}
                disabled={isSubmitting}
              />

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
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                autoComplete="new-password"
                fullWidth
                size="small"
                startAdornment={<LockIcon fontSize="small" color="action" />}
                endAdornment={confirmPasswordVisibilityIcon}
                disabled={isSubmitting}
              />
            </Box>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="medium"
            fullWidth
            disabled={isSubmitting}
            sx={{
              mt: 1,
              py: 1,
              textTransform: "none",
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
        </Box>

        {/* Login Link */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Already have an account?{" "}
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
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;
