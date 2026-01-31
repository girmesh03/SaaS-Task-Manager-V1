/**
 * MuiBottomNavigation Component - Reusable Bottom Navigation with Accessibility
 *
 * Enhanced bottom navigation component for mobile interfaces with proper
 * accessibility support including ARIA labels and keyboard navigation.
 *
 * Features:
 * - Keyboard navigation support
 * - ARIA labels for screen readers
 * - Fixed or static positioning
 * - Theme-based styling
 * - Active state indication
 * - Label visibility control
 * - Responsive design
 *
 * @example
 * // Basic bottom navigation
 * <MuiBottomNavigation
 *   value={activeTab}
 *   onChange={(event, newValue) => setActiveTab(newValue)}
 *   actions={[
 *     { label: "Home", icon: <HomeIcon />, value: "home" },
 *     { label: "Tasks", icon: <TaskIcon />, value: "tasks" },
 *     { label: "Profile", icon: <PersonIcon />, value: "profile" },
 *   ]}
 * />
 *
 * @example
 * // Static positioning
 * <MuiBottomNavigation
 *   value={activeTab}
 *   onChange={handleChange}
 *   actions={navigationActions}
 *   position="static"
 *   showLabels={false}
 * />
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";

const MuiBottomNavigation = forwardRef(
  (
    {
      value,
      onChange,
      actions = [], // Array of { label, icon, value, disabled, "aria-label" }
      showLabels = true,
      sx,
      position = "fixed", // fixed | static
      elevation = 3,
      ...muiProps
    },
    ref
  ) => {
    const nav = (
      <BottomNavigation
        ref={ref}
        value={value}
        onChange={onChange}
        showLabels={showLabels}
        role="navigation"
        aria-label="Bottom navigation"
        sx={{
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          ...sx,
        }}
        {...muiProps}
      >
        {actions.map((action) => (
          <BottomNavigationAction
            key={action.value}
            label={action.label}
            icon={action.icon}
            value={action.value}
            disabled={action.disabled}
            aria-label={action["aria-label"] || action.label}
            sx={{
              minWidth: 80,
              maxWidth: 168,
              color: "text.secondary",
              "&.Mui-selected": {
                color: "primary.main",
                fontWeight: (theme) => theme.typography.fontWeightMedium,
              },
              "& .MuiBottomNavigationAction-label": {
                fontSize: (theme) => theme.typography.caption.fontSize,
                "&.Mui-selected": {
                  fontSize: (theme) => theme.typography.caption.fontSize,
                },
              },
            }}
          />
        ))}
      </BottomNavigation>
    );

    if (position === "fixed") {
      return (
        <Paper
          elevation={elevation}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          {nav}
        </Paper>
      );
    }

    return nav;
  }
);

MuiBottomNavigation.displayName = "MuiBottomNavigation";

MuiBottomNavigation.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
      value: PropTypes.any.isRequired,
      disabled: PropTypes.bool,
      "aria-label": PropTypes.string,
    })
  ),
  showLabels: PropTypes.bool,
  sx: PropTypes.object,
  position: PropTypes.oneOf(["fixed", "static"]),
  elevation: PropTypes.number,
};

export default MuiBottomNavigation;
