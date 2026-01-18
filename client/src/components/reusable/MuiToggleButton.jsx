/**
 * MuiToggleButton Component - Reusable Toggle Button Group
 *
 */

import { forwardRef } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const MuiToggleButton = forwardRef(
  (
    {
      value,
      onChange,
      options = [], // Array of { value, label, icon, ariaLabel }
      exclusive = true,
      size = "medium",
      color = "standard",
      orientation = "horizontal",
      fullWidth = false,
      sx,
      ...muiProps
    },
    ref
  ) => {
    return (
      <ToggleButtonGroup
        ref={ref}
        value={value}
        exclusive={exclusive}
        onChange={onChange}
        size={size}
        color={color}
        orientation={orientation}
        fullWidth={fullWidth}
        sx={sx}
        {...muiProps}
      >
        {options.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel || option.label}
            disabled={option.disabled}
          >
            {option.icon}
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }
);

MuiToggleButton.displayName = "MuiToggleButton";

export default MuiToggleButton;
