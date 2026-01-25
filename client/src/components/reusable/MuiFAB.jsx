/**
 * MuiFAB Component - Reusable Floating Action Button with Accessibility
 *
 * Enhanced FAB component with proper accessibility support including
 * ARIA labels, keyboard navigation, and focus management.
 *
 * Features:
 * - Keyboard navigation support
 * - ARIA labels for screen readers
 * - Animated entrance/exit
 * - Absolute positioning support
 * - Theme-based styling
 * - Extended variant with label
 * - Disabled state handling
 *
 * @example
 * // Basic FAB
 * <MuiFAB aria-label="Add new task" onClick={handleAdd}>
 *   <AddIcon />
 * </MuiFAB>
 *
 * @example
 * // Extended FAB with label
 * <MuiFAB variant="extended" aria-label="Create task" onClick={handleCreate}>
 *   <AddIcon sx={{ mr: 1 }} />
 *   Create Task
 * </MuiFAB>
 *
 * @example
 * // Positioned FAB
 * <MuiFAB
 *   position={{ bottom: 16, right: 16 }}
 *   color="primary"
 *   aria-label="Add"
 * >
 *   <AddIcon />
 * </MuiFAB>
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";
import Fab from "@mui/material/Fab";
import Zoom from "@mui/material/Zoom";

const MuiFAB = forwardRef(
  (
    {
      color = "primary",
      size = "medium",
      variant = "circular",
      onClick,
      disabled = false,
      children, // Icon or content
      sx,
      position, // { top, right, bottom, left } for absolute positioning
      animated = true,
      "aria-label": ariaLabel,
      ...muiProps
    },
    ref
  ) => {
    // Ensure aria-label is provided for accessibility
    if (!ariaLabel && !muiProps["aria-labelledby"]) {
      console.warn(
        "MuiFAB: Please provide an aria-label or aria-labelledby for accessibility"
      );
    }

    const fab = (
      <Fab
        ref={ref}
        color={color}
        size={size}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        sx={{
          ...(position && {
            position: "fixed",
            zIndex: (theme) => theme.zIndex.speedDial,
            ...position,
          }),
          boxShadow: (theme) => theme.shadows[6],
          "&:hover": {
            boxShadow: (theme) => theme.shadows[12],
          },
          "&:active": {
            boxShadow: (theme) => theme.shadows[8],
          },
          "&.Mui-disabled": {
            boxShadow: (theme) => theme.shadows[0],
          },
          ...sx,
        }}
        {...muiProps}
      >
        {children}
      </Fab>
    );

    if (animated) {
      return (
        <Zoom in={!disabled} timeout={{ enter: 500, exit: 500 }} unmountOnExit>
          {fab}
        </Zoom>
      );
    }

    return fab;
  }
);

MuiFAB.displayName = "MuiFAB";

MuiFAB.propTypes = {
  color: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "error",
    "info",
    "success",
    "warning",
  ]),
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.oneOf(["circular", "extended"]),
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
  position: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number,
  }),
  animated: PropTypes.bool,
  "aria-label": PropTypes.string,
};

export default MuiFAB;
