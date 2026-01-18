/**
 * MuiNumberField Component - Reusable Number Field with React Hook Form Integration
 *
 * Uses forwardRef for optimal performance with spread register pattern.
 * Provides number formatting, min/max validation, and prevents non-numeric input.
 *
 * Features:
 * - Numeric input with increment/decrement buttons
 * - Min/max validation
 * - Prevents non-numeric input
 * - Decimal places support
 * - Memoized for performance
 *
 */

import { forwardRef, useMemo, useCallback } from "react";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import Box from "@mui/material/Box";

/**
 * MuiNumberField Component
 *
 * @example
 * // Basic usage with spread register
 * <MuiNumberField
 *   {...register("quantity", {
 *     required: "Quantity is required",
 *     min: { value: 0, message: "Must be >= 0" }
 *   })}
 *   error={errors.quantity}
 *   label="Quantity"
 *   min={0}
 * />
 */
const MuiNumberField = forwardRef(
  (
    {
      name,
      onChange,
      onBlur,
      error,
      helperText,
      label,
      min,
      max,
      step = 1,
      decimalPlaces = 0,
      placeholder,
      disabled = false,
      required = false,
      fullWidth = true,
      size = "small",
      variant = "outlined",
      margin,
      ...muiProps
    },
    ref
  ) => {
    /**
     * Handle key press to prevent non-numeric input
     */
    const handleKeyPress = useCallback(
      (event) => {
        const { key } = event;
        const currentValue = event.target.value;

        // Allow: backspace, delete, tab, escape, enter
        if (
          ["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(key) ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (event.ctrlKey && ["a", "c", "v", "x"].includes(key.toLowerCase())) ||
          // Allow: home, end, left, right
          ["Home", "End", "ArrowLeft", "ArrowRight"].includes(key)
        ) {
          return;
        }

        // Allow decimal point if decimal places > 0 and not already present
        if (key === "." && decimalPlaces > 0 && !currentValue.includes(".")) {
          return;
        }

        // Allow minus sign at start for negative numbers
        if (
          key === "-" &&
          currentValue.length === 0 &&
          (min === undefined || min < 0)
        ) {
          return;
        }

        // Prevent non-numeric characters
        if (!/^\d$/.test(key)) {
          event.preventDefault();
        }
      },
      [decimalPlaces, min]
    );

    // Memoize min/max hint
    const minMaxHint = useMemo(() => {
      if (min === undefined && max === undefined) return null;

      return (
        <FormHelperText
          sx={{
            textAlign: "right",
            mt: 0.5,
            color: "text.secondary",
          }}
        >
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
            ? `Min: ${min}`
            : `Max: ${max}`}
        </FormHelperText>
      );
    }, [min, max]);

    return (
      <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
        <TextField
          name={name}
          onChange={onChange}
          onBlur={onBlur}
          inputRef={ref}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          type="number"
          error={!!error}
          helperText={error?.message || helperText || " "}
          slotProps={{
            htmlInput: {
              min,
              max,
              step,
              onKeyDown: handleKeyPress,
            },
          }}
          fullWidth={fullWidth}
          size={size}
          variant={variant}
          margin={margin}
          {...muiProps}
        />

        {/* Min/Max hint */}
        {minMaxHint}
      </Box>
    );
  }
);

MuiNumberField.displayName = "MuiNumberField";

export default MuiNumberField;
