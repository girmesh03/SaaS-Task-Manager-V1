/**
 * MuiToggleButton Component - Reusable Toggle Button Group
 *
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";
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

MuiToggleButton.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.any.isRequired,
      label: PropTypes.string,
      icon: PropTypes.node,
      ariaLabel: PropTypes.string,
      disabled: PropTypes.bool,
    })
  ),
  exclusive: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  color: PropTypes.oneOf([
    "standard",
    "primary",
    "secondary",
    "error",
    "info",
    "success",
    "warning",
  ]),
  orientation: PropTypes.oneOf(["horizontal", "vertical"]),
  fullWidth: PropTypes.bool,
  sx: PropTypes.object,
};

export default MuiToggleButton;
