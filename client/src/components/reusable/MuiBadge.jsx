/**
 * MuiBadge Component - Reusable Badge with Notification Count Support
 *
 * Enhanced badge component for displaying notification counts and status indicators.
 * Supports theme-based styling and accessibility features.
 *
 * Features:
 * - Notification count display with max value
 * - Dot variant for simple indicators
 * - Theme-based colors
 * - Accessibility with ARIA labels
 * - Customizable positioning
 * - Zero value handling
 *
 * @example
 * // Notification count
 * <MuiBadge badgeContent={5} color="error">
 *   <NotificationsIcon />
 * </MuiBadge>
 *
 * @example
 * // Dot indicator
 * <MuiBadge variant="dot" color="success">
 *   <MailIcon />
 * </MuiBadge>
 *
 * @example
 * // With custom max
 * <MuiBadge badgeContent={150} max={99} color="primary">
 *   <MessageIcon />
 * </MuiBadge>
 */

import { forwardRef, useMemo } from "react";
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
      "aria-label": ariaLabel,
      ...muiProps
    },
    ref
  ) => {
    // Generate accessible label for notification count
    const accessibleLabel = useMemo(() => {
      if (ariaLabel) return ariaLabel;
      if (variant === "dot") return "New notifications available";
      if (typeof badgeContent === "number") {
        if (badgeContent === 0) return "No new notifications";
        if (badgeContent > max) return `More than ${max} new notifications`;
        return `${badgeContent} new notification${
          badgeContent !== 1 ? "s" : ""
        }`;
      }
      return badgeContent;
    }, [ariaLabel, badgeContent, variant, max]);

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
        aria-label={accessibleLabel}
        sx={{
          "& .MuiBadge-badge": {
            fontSize: (theme) => theme.typography.caption.fontSize,
            height: variant === "dot" ? 8 : 20,
            minWidth: variant === "dot" ? 8 : 20,
            padding: variant === "dot" ? 0 : "0 6px",
          },
          ...sx,
        }}
        {...muiProps}
      >
        {children}
      </Badge>
    );
  }
);

MuiBadge.displayName = "MuiBadge";

export default MuiBadge;
