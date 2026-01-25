/**
 * MuiChip Component - Reusable Chip with Status/Priority Display
 *
 * Enhanced chip component for displaying task status, priority, and other categorical data.
 * Automatically maps status/priority values to appropriate colors using theme tokens.
 *
 * Features:
 * - Status/priority color mapping
 * - Theme-based styling (no hardcoded colors)
 * - Accessibility support with ARIA labels
 * - Icon support
 * - Delete functionality
 * - Clickable variants
 *
 * @example
 * // Status chip
 * <MuiChip label="TODO" status="TODO" />
 * <MuiChip label="IN_PROGRESS" status="IN_PROGRESS" />
 * <MuiChip label="COMPLETED" status="COMPLETED" />
 *
 * @example
 * // Priority chip
 * <MuiChip label="HIGH" priority="HIGH" />
 * <MuiChip label="URGENT" priority="URGENT" />
 *
 * @example
 * // Custom chip with icon
 * <MuiChip label="Active" icon={<CheckIcon />} color="success" />
 */

import { forwardRef, useMemo } from "react";
import Chip from "@mui/material/Chip";
import {
  TASK_STATUS,
  TASK_PRIORITY,
  VENDOR_STATUS,
} from "../../utils/constants";

/**
 * Color mappings for different entity types
 * Centralized configuration for maintainability
 */
const COLOR_MAPPINGS = {
  status: {
    [TASK_STATUS.TODO]: "default",
    [TASK_STATUS.IN_PROGRESS]: "info",
    [TASK_STATUS.COMPLETED]: "success",
    [TASK_STATUS.PENDING]: "warning",
    [TASK_STATUS.CANCELLED]: "error",
  },
  priority: {
    [TASK_PRIORITY.LOW]: "default",
    [TASK_PRIORITY.MEDIUM]: "info",
    [TASK_PRIORITY.HIGH]: "warning",
    [TASK_PRIORITY.URGENT]: "error",
  },
  vendorStatus: {
    [VENDOR_STATUS.ACTIVE]: "success",
    [VENDOR_STATUS.INACTIVE]: "default",
    [VENDOR_STATUS.BLOCKED]: "error",
  },
};

/**
 * Get color for entity type and value
 * @param {string} type - Entity type (status, priority, vendorStatus)
 * @param {string} value - Entity value
 * @returns {string} MUI color name
 */
const getColorForType = (type, value) => {
  return COLOR_MAPPINGS[type]?.[value] || "default";
};

const MuiChip = forwardRef(
  (
    {
      label,
      avatar,
      icon,
      variant = "filled",
      size = "small",
      color,
      status, // Auto-map status to color
      priority, // Auto-map priority to color
      vendorStatus, // Auto-map vendor status to color
      clickable = false,
      onDelete,
      onClick,
      sx,
      "aria-label": ariaLabel,
      ...muiProps
    },
    ref
  ) => {
    // Development warning for conflicting props
    if (process.env.NODE_ENV !== "production") {
      const typeProps = [color, status, priority, vendorStatus].filter(Boolean);
      if (typeProps.length > 1) {
        console.warn(
          "MuiChip: Multiple type props provided (color, status, priority, vendorStatus). " +
            "Only one should be used. Using first available in order: color > status > priority > vendorStatus"
        );
      }
    }

    // Determine color based on status, priority, or vendorStatus
    const computedColor = useMemo(() => {
      if (color) return color;
      if (status) return getColorForType("status", status);
      if (priority) return getColorForType("priority", priority);
      if (vendorStatus) return getColorForType("vendorStatus", vendorStatus);
      return "default";
    }, [color, status, priority, vendorStatus]);

    // Generate accessible label
    const accessibleLabel = useMemo(() => {
      if (ariaLabel) return ariaLabel;
      if (status) return `Status: ${label}`;
      if (priority) return `Priority: ${label}`;
      if (vendorStatus) return `Vendor status: ${label}`;
      return label;
    }, [ariaLabel, status, priority, vendorStatus, label]);

    return (
      <Chip
        ref={ref}
        label={label}
        avatar={avatar}
        icon={icon}
        variant={variant}
        size={size}
        color={computedColor}
        clickable={clickable || !!onClick}
        onDelete={onDelete}
        onClick={onClick}
        aria-label={accessibleLabel}
        sx={sx}
        {...muiProps}
      />
    );
  }
);

MuiChip.displayName = "MuiChip";

export default MuiChip;
