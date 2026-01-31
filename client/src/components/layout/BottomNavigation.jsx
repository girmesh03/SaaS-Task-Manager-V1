/**
 * BottomNavigation Component - Mobile Bottom Navigation Bar
 *
 * Mobile-only navigation bar at bottom of screen with SpeedDial for primary actions.
 * Displays 4 navigation items (Dashboard, Tasks, Users, More) with active state highlighting.
 *
 * Features:
 * - Fixed positioning at bottom of screen
 * - 4 navigation items with icons and labels
 * - SpeedDial in bottom right corner for create actions
 * - "More" menu for additional navigation options
 * - Active state highlighting
 * - Touch-friendly sizing (44x44px minimum)
 * - Role-based menu item visibility
 * - Responsive display (mobile only, < 960px)
 *
 * Requirements: 1.6, 1.7, 2.1-2.10
 */

import { useState, useCallback, useMemo, memo } from "react";
import { useLocation, useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TaskIcon from "@mui/icons-material/Task";
import PeopleIcon from "@mui/icons-material/People";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import AddIcon from "@mui/icons-material/Add";
import ApartmentIcon from "@mui/icons-material/Apartment";
import InventoryIcon from "@mui/icons-material/Inventory";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import { MuiBottomNavigation, MuiSpeedDial } from "../reusable";
import { useAuth, useAuthorization, useResponsive } from "../../hooks";
import { getMenuSlotProps } from "../../utils/menuStyles";
import logger from "../../utils/logger";

const BottomNavigation = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  // Authorization checks
  const { canCreate: canCreateTask } = useAuthorization("tasks");
  const { canCreate: canCreateUser } = useAuthorization("users");
  const { canCreate: canCreateDepartment } = useAuthorization("departments");
  const { canCreate: canCreateMaterial } = useAuthorization("materials");
  const { canCreate: canCreateVendor } = useAuthorization("vendors");

  // Check if user is HOD
  const isHOD = useMemo(() => user?.isHod || false, [user?.isHod]);

  // Menu state
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const moreMenuOpen = Boolean(moreAnchorEl);

  // SpeedDial state
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Determine current navigation value
  const currentValue = useMemo(() => {
    const path = location.pathname;
    if (path === "/dashboard") return "/dashboard";
    if (path.startsWith("/dashboard/tasks")) return "/dashboard/tasks";
    if (path.startsWith("/dashboard/users")) return "/dashboard/users";
    return "more";
  }, [location.pathname]);

  // Navigation actions
  const navigationActions = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: <DashboardIcon />,
        value: "/dashboard",
        "aria-label": "Navigate to Dashboard",
      },
      {
        label: "Tasks",
        icon: <TaskIcon />,
        value: "/dashboard/tasks",
        "aria-label": "Navigate to Tasks",
      },
      {
        label: "Users",
        icon: <PeopleIcon />,
        value: "/dashboard/users",
        "aria-label": "Navigate to Users",
      },
      {
        label: "More",
        icon: <MoreHorizIcon />,
        value: "more",
        "aria-label": "Open more menu",
      },
    ],
    []
  );

  // Handle navigation change
  const handleNavigationChange = useCallback(
    (event, newValue) => {
      // Close SpeedDial when navigating
      setSpeedDialOpen(false);

      if (newValue === "more") {
        // Open more menu
        setMoreAnchorEl(event.currentTarget);
      } else {
        // Navigate to page
        navigate(newValue);
      }
    },
    [navigate]
  );

  // Handle more menu close
  const handleMoreMenuClose = useCallback(() => {
    setMoreAnchorEl(null);
  }, []);

  // Handle more menu item click
  const handleMoreMenuItemClick = useCallback(
    (path) => {
      navigate(path);
      handleMoreMenuClose();
    },
    [navigate, handleMoreMenuClose]
  );

  // Handle SpeedDial open
  const handleSpeedDialOpen = useCallback((event, reason) => {
    // Open on toggle (FAB click) or focus
    if (reason === "toggle" || reason === "focus") {
      setSpeedDialOpen(true);
    }
  }, []);

  // Handle SpeedDial close
  const handleSpeedDialClose = useCallback((event, reason) => {
    // Don't close on blur or mouse leave - only on escape, toggle, or action
    if (reason === "blur" || reason === "mouseLeave") {
      return;
    }
    setSpeedDialOpen(false);
  }, []);

  // Handle create action click
  const handleCreateAction = useCallback((action) => {
    logger.info("[BottomNavigation] Create action requested", { action });
    // TODO: Open create dialogs when implemented
    // For now, just log the action
  }, []);

  // Speed dial actions - memoized for performance
  const speedDialActions = useMemo(() => {
    const actions = [];

    if (canCreateTask) {
      actions.push({
        icon: <TaskIcon />,
        name: "Create Task",
        onClick: () => handleCreateAction("task"),
      });
    }

    if (canCreateUser) {
      actions.push({
        icon: <PeopleIcon />,
        name: "Create User",
        onClick: () => handleCreateAction("user"),
      });
    }

    if (canCreateDepartment) {
      actions.push({
        icon: <ApartmentIcon />,
        name: "Create Department",
        onClick: () => handleCreateAction("department"),
      });
    }

    if (canCreateMaterial) {
      actions.push({
        icon: <InventoryIcon />,
        name: "Create Material",
        onClick: () => handleCreateAction("material"),
      });
    }

    if (canCreateVendor) {
      actions.push({
        icon: <BusinessIcon />,
        name: "Create Vendor",
        onClick: () => handleCreateAction("vendor"),
      });
    }

    return actions;
  }, [
    canCreateTask,
    canCreateUser,
    canCreateDepartment,
    canCreateMaterial,
    canCreateVendor,
    handleCreateAction,
  ]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <MuiBottomNavigation
          value={currentValue}
          onChange={handleNavigationChange}
          actions={navigationActions}
          showLabels
          position="static"
          elevation={8}
          sx={{
            height: 56,
            "& .MuiBottomNavigationAction-root": {
              minHeight: 56,
              minWidth: 44,
              maxWidth: 168,
              px: 1,
            },
          }}
        />
      </Box>

      {/* Speed Dial for Create Actions */}
      {speedDialActions.length > 0 && (
        <MuiSpeedDial
          ariaLabel="Create actions"
          icon={<AddIcon />}
          direction="up"
          actions={speedDialActions}
          open={speedDialOpen}
          onOpen={handleSpeedDialOpen}
          onClose={handleSpeedDialClose}
          position={{ bottom: 72, right: 16 }}
          sx={{
            position: "fixed",
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        />
      )}

      {/* More Menu */}
      <Menu
        id="more-menu"
        anchorEl={moreAnchorEl}
        open={moreMenuOpen}
        onClose={handleMoreMenuClose}
        slotProps={{
          ...getMenuSlotProps(),
          list: {
            "aria-labelledby": "more-button",
            role: "menu",
          },
        }}
        transformOrigin={{ horizontal: "center", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "center", vertical: "top" }}
      >
        {/* HOD-only menu items */}
        {isHOD && [
          <MenuItem
            key="departments"
            onClick={() => handleMoreMenuItemClick("/dashboard/departments")}
            role="menuitem"
          >
            <ListItemIcon>
              <ApartmentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Departments</ListItemText>
          </MenuItem>,
          <MenuItem
            key="materials"
            onClick={() => handleMoreMenuItemClick("/dashboard/materials")}
            role="menuitem"
          >
            <ListItemIcon>
              <InventoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Materials</ListItemText>
          </MenuItem>,
          <MenuItem
            key="vendors"
            onClick={() => handleMoreMenuItemClick("/dashboard/vendors")}
            role="menuitem"
          >
            <ListItemIcon>
              <BusinessIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Vendors</ListItemText>
          </MenuItem>,
          <Divider key="divider" />,
        ]}

        {/* Common menu items */}
        <MenuItem
          onClick={() => handleMoreMenuItemClick("/dashboard/settings")}
          role="menuitem"
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleMoreMenuItemClick("/dashboard/profile")}
          role="menuitem"
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
});

BottomNavigation.displayName = "BottomNavigation";

export default BottomNavigation;
