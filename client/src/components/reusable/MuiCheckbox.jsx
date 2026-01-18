/**
 * MuiCheckbox Component - Reusable Checkbox with React Hook Form Integration
 *
 * Uses forwardRef for optimal performance with spread register pattern.
 * Provides consistent styling and error handling.
 *
 * Features:
 * - Checkbox with label
 * - Proper ref forwarding with forwardRef
 * - Error and helperText display
 * - Theme styling applied
 * - NEVER uses watch() method
 *
 */

import { forwardRef } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormHelperText from "@mui/material/FormHelperText";

/**
 * MuiCheckbox Component
 *
 * @example
 * // Basic usage with spread register
 * <MuiCheckbox
 *   {...register("rememberMe")}
 *   error={errors.rememberMe}
 *   helperText="Keep me signed in"
 *   label="Remember Me"
 * />
 */
const MuiCheckbox = forwardRef(
  (
    {
      name,
      onChange,
      onBlur,
      error,
      helperText,
      label,
      disabled = false,
      size = "small",
      color = "primary",
      labelPlacement = "end",
      ...muiProps
    },
    ref
  ) => {
    return (
      <>
        <FormControlLabel
          control={
            <Checkbox
              name={name}
              onChange={onChange}
              onBlur={onBlur}
              slotProps={{ input: { ref } }}
              disabled={disabled}
              size={size}
              color={color}
              {...muiProps}
            />
          }
          label={label}
          labelPlacement={labelPlacement}
        />
        {(error || helperText) && (
          <FormHelperText error={!!error} sx={{ ml: 2 }}>
            {error?.message || helperText}
          </FormHelperText>
        )}
      </>
    );
  }
);

MuiCheckbox.displayName = "MuiCheckbox";

export default MuiCheckbox;
