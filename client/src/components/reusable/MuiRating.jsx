/**
 * MuiRating Component - Reusable Rating with React Hook Form Integration
 *
 * Uses forwardRef for optimal performance with spread register pattern.
 * Provides consistent styling and error handling.
 *
 * Features:
 * - Star rating with customizable max value
 * - Proper ref forwarding with forwardRef
 * - Error and helperText display
 * - Half-star precision support
 * - Read-only mode support
 * - Theme styling applied
 * - NEVER uses watch() method
 *
 */

import { forwardRef } from "react";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Rating from "@mui/material/Rating";
import FormHelperText from "@mui/material/FormHelperText";
import Box from "@mui/material/Box";

/**
 * MuiRating Component
 *
 * @example
 * // Basic usage with spread register
 * const { register, watch, setValue } = useForm();
 * const ratingValue = watch("rating", 0);
 *
 * <MuiRating
 *   {...register("rating", { required: "Rating is required" })}
 *   error={errors.rating}
 *   helperText="Rate your experience"
 *   label="Rate this product"
 *   value={ratingValue}
 *   onChange={(e, newValue) => setValue("rating", newValue)}
 *   readOnly={false}
 * />
 */
const MuiRating = forwardRef(
  (
    {
      name,
      onChange,
      onBlur,
      error,
      helperText,
      label,
      value = 0,
      max = 5,
      precision = 1,
      disabled = false,
      readOnly = false,
      required = false,
      fullWidth = true,
      size = "small",
      icon,
      emptyIcon,
      ...muiProps
    },
    ref
  ) => {
    return (
      <FormControl
        error={!!error}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {label && <FormLabel>{label}</FormLabel>}

          {/* Hidden input for react-hook-form registration */}
          <input
            name={name}
            onBlur={onBlur}
            ref={ref}
            type="hidden"
            value={value}
          />

          <Rating
            value={value || 0}
            onChange={onChange}
            max={max}
            precision={precision}
            disabled={disabled}
            readOnly={readOnly}
            size={size}
            icon={icon}
            emptyIcon={emptyIcon}
            {...muiProps}
          />
        </Box>
        {(error || helperText) && (
          <FormHelperText>{error?.message || helperText}</FormHelperText>
        )}
      </FormControl>
    );
  }
);

MuiRating.displayName = "MuiRating";

export default MuiRating;
