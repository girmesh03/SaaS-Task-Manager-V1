/**
 * Sidebar Component - Navigation Sidebar
 *
 * Side navigation menu with department selector, navigation items,
 * and theme toggle. Responsive design with drawer on mobile.
 *
 * Features:
 * - Department selector dropdown (HOD only)
 * - Navigation menu items with icons and subheaders
 * - Active route highlighting
 * - Role-based menu item visibility
 * - Collapsible on mobile
 * - Version display
 *
 * Requirements: 45.5
 */

import { useMemo, memo, useCallback } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Toolbar from "@mui/material/Toolbar";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TaskIcon from "@mui/icons-material/Task";
import InventoryIcon from "@mui/icons-material/Inventory";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import ApartmentIcon from "@mui/icons-material/Apartment";
import { MuiSelectAutocomplete, MuiLoading } from "../reusable";
import { useAuth, useResponsive } from "../../hooks";
import { useGetDepartmentsQuery } from "../../redux/features/departmentSlice";
import { APP_VERSION } from "../../utils/constants";
import { layoutConfig } from "../../theme/themePrimitives";
import logger from "../../utils/logger";

// Navigation icons map - defined once to prevent recreation on each render
const NAVIGATION_ICONS = {
  dashboard: DashboardIcon,
  users: PeopleIcon,
  tasks: TaskIcon,
  departments: ApartmentIcon,
  materials: InventoryIcon,
  vendors: BusinessIcon,
};

// Static navigation structure - defined once outside component
const NAVIGATION_STRUCTURE = [
  {
    section: "Workspace",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        iconKey: "dashboard",
        roles: ["all"],
      },
      {
        label: "Users",
        path: "/dashboard/users",
        iconKey: "users",
        roles: ["all"],
      },
      {
        label: "Tasks",
        path: "/dashboard/tasks",
        iconKey: "tasks",
        roles: ["all"],
      },
    ],
  },
  {
    section: "Manage",
    items: [
      {
        label: "Departments",
        path: "/dashboard/departments",
        iconKey: "departments",
        roles: ["hod"],
      },
      {
        label: "Materials",
        path: "/dashboard/materials",
        iconKey: "materials",
        roles: ["hod"],
      },
      {
        label: "Vendors",
        path: "/dashboard/vendors",
        iconKey: "vendors",
        roles: ["hod"],
      },
    ],
  },
];

/**
 * DrawerContent Component - Extracted for reusability
 * Renders the sidebar content for both mobile and desktop
 */
const DrawerContent = memo(
  ({
    isHOD,
    isDepartmentsLoading,
    isDepartmentsError,
    departmentsError,
    departments,
    currentDepartment,
    handleDepartmentChange,
    navigationItems,
    isActiveRoute,
    handleNavigation,
    isMobile,
    onClose,
  }) => (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {/* Toolbar spacer */}
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {isMobile && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Menu
            </Typography>
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Close navigation menu"
            >
              <CloseIcon />
            </IconButton>
          </>
        )}
      </Toolbar>

      {/* Department Selector (HOD only) */}
      {isHOD && (
        <Box sx={{ p: 2 }}>
          {isDepartmentsLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 56,
              }}
            >
              <MuiLoading size={24} />
            </Box>
          ) : isDepartmentsError ? (
            <Alert severity="error" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                {departmentsError?.data?.error?.message ||
                  "Failed to load departments"}
              </Typography>
            </Alert>
          ) : (
            <MuiSelectAutocomplete
              options={departments}
              value={currentDepartment}
              onChange={handleDepartmentChange}
              getOptionLabel={(option) => option?.name || ""}
              isOptionEqualToValue={(option, value) =>
                option?._id === value?._id
              }
              label="Department"
              placeholder="Select Department"
              size="small"
              disabled={departments.length <= 1}
              disableClearable
              fullWidth
              slotProps={{
                popper: {
                  placement: "bottom-start",
                },
              }}
            />
          )}
        </Box>
      )}

      {isHOD && <Divider />}

      {/* Navigation Menu */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        {navigationItems.map((section) => (
          <List
            key={section.section}
            subheader={
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: "transparent",
                  lineHeight: "32px",
                  px: 2,
                  py: 1,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "text.secondary",
                }}
              >
                {section.section}
              </ListSubheader>
            }
            sx={{ px: 1, py: 0 }}
          >
            {section.items.map((item) => {
              const active = isActiveRoute(item.path);
              const IconComponent = NAVIGATION_ICONS[item.iconKey];

              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={active}
                    aria-label={`Navigate to ${item.label}`}
                    aria-current={active ? "page" : undefined}
                    sx={{
                      borderRadius: 1,
                      px: 2,
                      "&.Mui-selected": {
                        bgcolor: "primary.light",
                        color: "primary.main",
                        "&:hover": {
                          bgcolor: "primary.light",
                        },
                        "& .MuiListItemIcon-root": {
                          color: "primary.main",
                        },
                      },
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: active ? "primary.main" : "text.secondary",
                      }}
                    >
                      <IconComponent />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: {
                          variant: "body2",
                          fontWeight: active ? 600 : 400,
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ))}
      </Box>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Version {APP_VERSION}
        </Typography>
      </Box>
    </Box>
  )
);

DrawerContent.displayName = "DrawerContent";

DrawerContent.propTypes = {
  isHOD: PropTypes.bool.isRequired,
  isDepartmentsLoading: PropTypes.bool.isRequired,
  isDepartmentsError: PropTypes.bool.isRequired,
  departmentsError: PropTypes.object,
  departments: PropTypes.array.isRequired,
  currentDepartment: PropTypes.object,
  handleDepartmentChange: PropTypes.func.isRequired,
  navigationItems: PropTypes.array.isRequired,
  isActiveRoute: PropTypes.func.isRequired,
  handleNavigation: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Sidebar Component
 */
const Sidebar = memo(({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  // Check if user is HOD - use direct user property instead of authorization hook
  const isHOD = useMemo(() => user?.isHod || false, [user?.isHod]);

  // Fetch departments for department selector (HOD only)
  const {
    data: departmentsData,
    isLoading: isDepartmentsLoading,
    isError: isDepartmentsError,
    error: departmentsError,
  } = useGetDepartmentsQuery(
    {
      page: 1,
      limit: 100,
      organization: user?.organization?._id,
    },
    {
      skip: !isHOD || !user?.organization?._id,
    }
  );

  const departments = useMemo(
    () => departmentsData?.docs || [],
    [departmentsData?.docs]
  );

  // Current department - default to user's department
  const currentDepartment = useMemo(() => {
    // If departments are loaded and user has a department, find it in the list
    if (departments.length > 0 && user?.department?._id) {
      return (
        departments.find((dept) => dept._id === user.department._id) ||
        user.department
      );
    }
    return user?.department || null;
  }, [departments, user]);

  // Filter navigation items based on user role - memoized for performance
  const navigationItems = useMemo(() => {
    return NAVIGATION_STRUCTURE.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.roles.includes("all") || (item.roles.includes("hod") && isHOD)
      ),
    })).filter((section) => section.items.length > 0);
  }, [isHOD]);

  // Handle navigation - memoized to prevent re-renders
  const handleNavigation = useCallback(
    (path) => {
      navigate(path);
      if (isMobile) {
        onClose();
      }
    },
    [navigate, isMobile, onClose]
  );

  // Handle department change - memoized to prevent re-renders
  const handleDepartmentChange = useCallback(
    (_event, newValue) => {
      if (newValue && newValue._id !== currentDepartment?._id) {
        logger.info("[Sidebar] Department switch requested", {
          fromDepartmentId: currentDepartment?._id,
          fromDepartmentName: currentDepartment?.name,
          toDepartmentId: newValue._id,
          toDepartmentName: newValue.name,
        });

        // TODO: Implement department switching logic
        // This will require:
        // 1. Update user context/state with new department
        // 2. Invalidate relevant queries (tasks, materials, etc.)
        // 3. Redirect to dashboard or refresh current page
        // 4. Show success notification

        // For now, just log the request
        logger.warn(
          "[Sidebar] Department switching not yet implemented - feature coming soon"
        );
      }
    },
    [currentDepartment]
  );

  // Check if route is active - memoized to prevent re-renders
  const isActiveRoute = useCallback(
    (path) => {
      // Exact match for dashboard
      if (path === "/dashboard") {
        return location.pathname === path;
      }
      // Prefix match for other routes
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  // Common drawer content props
  const drawerContentProps = {
    isHOD,
    isDepartmentsLoading,
    isDepartmentsError,
    departmentsError,
    departments,
    currentDepartment,
    handleDepartmentChange,
    navigationItems,
    isActiveRoute,
    handleNavigation,
    isMobile,
    onClose,
  };

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        slots={{
          backdrop: Box,
        }}
        slotProps={{
          backdrop: {
            keepMounted: true, // Better open performance on mobile
          },
        }}
        sx={{
          "& .MuiDrawer-paper": {
            width: layoutConfig.drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <DrawerContent {...drawerContentProps} />
      </Drawer>
    );
  }

  // Desktop drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: layoutConfig.drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: layoutConfig.drawerWidth,
          boxSizing: "border-box",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <DrawerContent {...drawerContentProps} />
    </Drawer>
  );
});

Sidebar.displayName = "Sidebar";

Sidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Sidebar;
