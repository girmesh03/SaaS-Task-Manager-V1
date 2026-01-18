/**
 * MuiFAB Component - Reusable Floating Action Button
 *
 */

import { forwardRef } from "react";
import Fab from "@mui/material/Fab";
import Zoom from "@mui/material/Zoom";

const MuiFAB = forwardRef(
  (
    {
      color = "primary",
      size = "small",
      variant = "circular",
      onClick,
      disabled = false,
      children, // Icon
      sx,
      position, // { top, right, bottom, left } for absolute positioning
      animated = true,
      ...muiProps
    },
    ref
  ) => {
    const fab = (
      <Fab
        ref={ref}
        color={color}
        size={size}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        sx={{
          ...(position && {
            position: "absolute",
            ...position,
          }),
          ...sx,
        }}
        {...muiProps}
      >
        {children}
      </Fab>
    );

    if (animated) {
      return (
        <Zoom in={true} timeout={{ enter: 500, exit: 500 }} unmountOnExit>
          {fab}
        </Zoom>
      );
    }

    return fab;
  }
);

MuiFAB.displayName = "MuiFAB";

export default MuiFAB;
