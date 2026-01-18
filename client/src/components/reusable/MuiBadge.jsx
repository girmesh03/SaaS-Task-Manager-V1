/**
 * MuiBadge Component - Reusable Badge
 *
 */

import { forwardRef } from "react";
import Badge from "@mui/material/Badge";

const MuiBadge = forwardRef(
  (
    {
      badgeContent,
      color = "primary",
      max = 99,
      showZero = false,
      variant = "standard",
      overlap = "rectangular",
      anchorOrigin = {
        vertical: "top",
        horizontal: "right",
      },
      invisible,
      children,
      sx,
      ...muiProps
    },
    ref
  ) => {
    return (
      <Badge
        ref={ref}
        badgeContent={badgeContent}
        color={color}
        max={max}
        showZero={showZero}
        variant={variant}
        overlap={overlap}
        anchorOrigin={anchorOrigin}
        invisible={invisible}
        sx={sx}
        {...muiProps}
      >
        {children}
      </Badge>
    );
  }
);

MuiBadge.displayName = "MuiBadge";

export default MuiBadge;
