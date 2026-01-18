/**
 * MuiTextField Component - Reusable Text Field with React Hook Form Integration
 *
 * Uses forwardRef for optimal performance with spread register pattern.
 * Supports start/end adornments and all standard TextField props.
 *
 * Features:
 * - Start and end adornments with memoization
 * - Proper ref forwarding with forwardRef
 * - Error and helperText support
 * - All standard TextField types (text, email, password, etc.)
 * - Theme styling applied
 * - NEVER uses watch() method
 *
 */

import { forwardRef, useMemo } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

/**
 * MuiTextField Component
 *
 * @example
 * // Basic usage with spread register
 * <MuiTextField
 *   {...register("firstName", {
 *     required: "First name is required",
 *     maxLength: { value: 20, message: "Max 20 characters" }
 *   })}
 *   error={errors.firstName}
 *   label="First Name"
 *   type="text"
 *   fullWidth
 *   size="small"
 *   margin="normal"
 *   autoComplete="given-name"
 * />
 *
 * @example
 * // With start and end adornments
 * <MuiTextField
 *   {...register("email", {
 *     required: "Email is required",
 *     pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" }
 *   })}
 *   error={errors.email}
 *   label="Email"
 *   type="email"
 *   fullWidth
 *   size="small"
 *   startAdornment={<EmailIcon fontSize="small" color="primary" />}
 * />
 */
const MuiTextField = forwardRef(
  (
    {
      name,
      onChange,
      onBlur,
      error,
      helperText,
      label,
      type = "text",
      placeholder,
      disabled = false,
      required = false,
      fullWidth = true,
      size = "small",
      variant = "outlined",
      autoFocus = false,
      autoComplete,
      margin,
      maxRows,
      minRows,
      multiline = false,
      startAdornment,
      endAdornment,
      ...muiProps
    },
    ref
  ) => {
    // Memoize start adornment
    const computedStartAdornment = useMemo(
      () =>
        startAdornment ? (
          <InputAdornment position="start">{startAdornment}</InputAdornment>
        ) : null,
      [startAdornment]
    );

    // Memoize end adornment
    const computedEndAdornment = useMemo(
      () =>
        endAdornment ? (
          <InputAdornment position="end">{endAdornment}</InputAdornment>
        ) : null,
      [endAdornment]
    );

    return (
      <TextField
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        inputRef={ref}
        label={label}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        type={type}
        error={!!error}
        helperText={error?.message || helperText || " "}
        slotProps={{
          input: {
            startAdornment: computedStartAdornment,
            endAdornment: computedEndAdornment,
          },
        }}
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        margin={margin}
        maxRows={maxRows}
        minRows={minRows}
        multiline={multiline}
        {...muiProps}
      />
    );
  }
);

MuiTextField.displayName = "MuiTextField";

export default MuiTextField;
