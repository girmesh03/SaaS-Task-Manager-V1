/**
 * MuiBottomNavigation Component - Reusable Bottom Navigation
 *
 */

import { forwardRef } from "react";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";

const MuiBottomNavigation = forwardRef(
  (
    {
      value,
      onChange,
      actions = [], // Array of { label, icon, value }
      showLabels = true,
      sx,
      position = "fixed", // fixed | static
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
        sx={sx}
        {...muiProps}
      >
        {actions.map((action) => (
          <BottomNavigationAction
            key={action.value}
            label={action.label}
            icon={action.icon}
            value={action.value}
          />
        ))}
      </BottomNavigation>
    );

    if (position === "fixed") {
      return (
        <Paper
          sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000 }}
          elevation={3}
        >
          {nav}
        </Paper>
      );
    }

    return nav;
  }
);

MuiBottomNavigation.displayName = "MuiBottomNavigation";

export default MuiBottomNavigation;
