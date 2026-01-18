/**
 * MuiSwitch Component - Reusable Switch with React Hook Form Integration
 *
 * Uses forwardRef for optimal performance with spread register pattern.
 * Provides consistent styling and error handling.
 *
 * Features:
 * - Switch with label
 * - Proper ref forwarding with forwardRef
 * - Error and helperText display
 * - Theme styling applied
 * - NEVER uses watch() method
 *
 */

import { forwardRef } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import FormHelperText from "@mui/material/FormHelperText";
import Box from "@mui/material/Box";

/**
 * MuiSwitch Component
 *
 * @example
 * // Basic usage with spread register
 * <MuiSwitch
 *   {...register("emailNotifications")}
 *   error={errors.emailNotifications}
 *   helperText="Receive email updates"
 *   label="Email Notifications"
 * />
 */
const MuiSwitch = forwardRef(
  (
    {
      name,
      onChange,
      onBlur,
      error,
      helperText,
      label,
      disabled = false,
      fullWidth = true,
      size = "small",
      color = "primary",
      labelPlacement = "end",
      ...muiProps
    },
    ref
  ) => {
    return (
      <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
        <FormControlLabel
          control={
            <Switch
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
      </Box>
    );
  }
);

MuiSwitch.displayName = "MuiSwitch";

export default MuiSwitch;
