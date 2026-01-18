/**
 * MuiSlider Component - Reusable Slider with React Hook Form Integration
 *
 * Uses forwardRef for integration.
 * Implements local state for performance optimization (smoother sliding).
 *
 * Features:
 * - Slider with value display
 * - Proper ref forwarding with forwardRef
 * - Error and helperText display
 * - Min/max/step support
 * - Theme styling applied
 * - Memoized value display
 * - NEVER uses watch() method
 *
 */

import { forwardRef, useMemo, useState, useEffect, useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Slider from "@mui/material/Slider";
import FormHelperText from "@mui/material/FormHelperText";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/**
 * MuiSlider Component
 */
const MuiSlider = forwardRef(
  (
    {
      name,
      onChange,
      onBlur,
      error,
      helperText,
      label,
      value: propValue = 0,
      min = 0,
      max = 100,
      step = 1,
      marks,
      disabled = false,
      required = false,
      valueLabelDisplay = "auto",
      valueLabelFormat,
      color = "primary",
      fullWidth = true,
      size = "small",
      showValue = true,
      ...muiProps
    },
    ref
  ) => {
    // Local state for smooth sliding without waiting for parent re-render
    const [localValue, setLocalValue] = useState(propValue);

    // Sync local state with prop value when it changes (external update)
    useEffect(() => {
      setLocalValue(propValue);
    }, [propValue]);

    // Handle slider change (dragging) - updates local UI immediately
    const handleChange = useCallback(
      (_event, newValue) => {
        setLocalValue(newValue);
        // We can also propagate to parent here, but if parent is slow, it might cause lag.
        // For Controller usage, we typically want to propagate.
        // If lag persists, we can use onChangeCommitted to propagation.
        // For now, let's propagate immediately but relying on localValue for rendering
        // should make the UI responsive.
        if (onChange) {
          onChange(newValue); // Pass simple value
        }
      },
      [onChange]
    );

    // Memoize value display
    const displayValue = useMemo(() => {
      if (!showValue) return null;
      return valueLabelFormat ? valueLabelFormat(localValue) : localValue;
    }, [showValue, localValue, valueLabelFormat]);

    return (
      <FormControl
        fullWidth={fullWidth}
        error={!!error}
        required={required}
        disabled={disabled}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <FormLabel>{label}</FormLabel>
          {showValue && (
            <Typography variant="body2" color="text.secondary">
              {displayValue}
            </Typography>
          )}
        </Box>

        <Slider
          name={name}
          ref={ref}
          value={localValue}
          onChange={handleChange}
          onBlur={onBlur} // Important for RHF touched state
          min={min}
          max={max}
          step={step}
          marks={marks}
          disabled={disabled}
          valueLabelDisplay={valueLabelDisplay}
          valueLabelFormat={valueLabelFormat}
          color={color}
          size={size}
          {...muiProps}
        />
        {(error || helperText) && (
          <FormHelperText>{error?.message || helperText}</FormHelperText>
        )}
      </FormControl>
    );
  }
);

MuiSlider.displayName = "MuiSlider";

export default MuiSlider;
