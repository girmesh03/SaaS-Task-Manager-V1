/**
 * Header Component - Application Header
 *
 * Top navigation bar with logo, organization switcher (Platform SuperAdmin only),
 * notification bell, user avatar, and theme dropdown.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onMenuClick - Callback for mobile menu button click
 * @returns {JSX.Element} Header component
 *
 * @example
 * <Header onMenuClick={handleDrawerToggle} />
 *
 * Features:
 * - Logo and brand name
 * - Organization switcher (Platform SuperAdmin only)
 * - Notification bell with real-time updates
 * - User avatar with dropdown menu (Profile, Settings, Logout)
 * - Theme toggle dropdown
 * - Responsive design (hamburger menu on mobile)
 *
 * Requirements: 26.6, 46.1, 45.2
 */

import { useState, useCallback, useMemo, memo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  MuiNotificationBell,
  MuiThemeDropDown,
  MuiSelectAutocomplete,
  MuiTooltip,
} from "../reusable";
import { useAuth, useAuthorization, useResponsive } from "../../hooks";
import { useGetOrganizationsQuery } from "../../redux/features/organizationSlice";
import logger from "../../utils/logger";

/**
 * Get user initials from user object
 * @param {Object} user - User object
 * @returns {string} User initials (e.g., "JD" for John Doe)
 */
const getUserInitials = (user) => {
  if (!user) return "U";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
};

/**
 * UserMenuItems Component - User menu dropdown items
 * @component
 */
const UserMenuItems = memo(({ user, onProfile, onSettings, onLogout }) => (
  <>
    {/* User Info */}
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="subtitle2" fontWeight="medium">
        {user?.firstName} {user?.lastName}
      </Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {user?.email}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        {user?.role}
      </Typography>
    </Box>

    <Divider />

    {/* Menu Items */}
    <MenuItem onClick={onProfile}>
      <ListItemIcon>
        <PersonIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Profile</ListItemText>
    </MenuItem>

    <MenuItem onClick={onSettings}>
      <ListItemIcon>
        <SettingsIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Settings</ListItemText>
    </MenuItem>

    <Divider />

    <MenuItem onClick={onLogout}>
      <ListItemIcon>
        <LogoutIcon fontSize="small" color="error" />
      </ListItemIcon>
      <ListItemText>
        <Typography color="error">Logout</Typography>
      </ListItemText>
    </MenuItem>
  </>
));

UserMenuItems.displayName = "UserMenuItems";

UserMenuItems.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
  }),
  onProfile: PropTypes.func.isRequired,
  onSettings: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

const Header = memo(({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isPlatformSuperAdmin } = useAuthorization("organizations");
  const { isMobile } = useResponsive();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Fetch organizations for Platform SuperAdmin
  const { data: organizationsData } = useGetOrganizationsQuery(
    { page: 1, limit: 100 },
    { skip: !isPlatformSuperAdmin }
  );

  // Memoize organizations to prevent unnecessary recalculations
  // Query is already skipped when !isPlatformSuperAdmin, so no need for conditional
  const organizations = useMemo(
    () => organizationsData?.docs || [],
    [organizationsData?.docs]
  );

  // Current organization - simple property access, no memoization needed
  const currentOrganization = user?.organization;

  // Handle user menu open
  const handleMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  // Handle user menu close
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle profile navigation
  const handleProfile = useCallback(() => {
    navigate("/dashboard/profile");
    handleMenuClose();
  }, [navigate, handleMenuClose]);

  // Handle settings navigation
  const handleSettings = useCallback(() => {
    navigate("/dashboard/settings");
    handleMenuClose();
  }, [navigate, handleMenuClose]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      logger.error("[Header] Logout failed", error);
      toast.error("Failed to logout. Please try again.");
    } finally {
      handleMenuClose();
    }
  }, [logout, navigate, handleMenuClose]);

  // Handle organization change (Platform SuperAdmin only)
  const handleOrganizationChange = useCallback((_event, newValue) => {
    if (newValue) {
      logger.info("[Header] Organization switch requested", {
        organizationId: newValue._id,
        organizationName: newValue.name,
      });
      toast.info(
        "Organization switching will be available in a future update."
      );
    }
  }, []);

  // Handle logo/brand click
  const handleLogoClick = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // Handle logo keyboard navigation
  const handleLogoKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate("/dashboard");
      }
    },
    [navigate]
  );

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 1, sm: 2 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo and Brand */}
        <Box
          component="button"
          role="button"
          type="button"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
            border: "none",
            background: "transparent",
            p: 0,
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
              borderRadius: 1,
            },
          }}
          onClick={handleLogoClick}
          onKeyDown={handleLogoKeyDown}
          tabIndex={0}
          aria-label="Go to dashboard"
        >
          <TaskAltIcon
            sx={{
              fontSize: { xs: 32, sm: 40 },
              color: "primary.main",
            }}
          />
          {!isMobile && (
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                color: "primary.main",
                display: { xs: "none", sm: "block" },
              }}
            >
              TaskManager
            </Typography>
          )}
        </Box>

        {/* Organization Switcher (Platform SuperAdmin only) */}
        {isPlatformSuperAdmin && !isMobile && organizations.length > 0 && (
          <Box sx={{ minWidth: 200, ml: 2 }}>
            <MuiSelectAutocomplete
              options={organizations}
              value={currentOrganization}
              onChange={handleOrganizationChange}
              getOptionLabel={(option) => option?.name || ""}
              isOptionEqualToValue={(option, value) =>
                option?._id === value?._id
              }
              placeholder="Select Organization"
              size="small"
              disableClearable
            />
          </Box>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          {/* Notification Bell */}
          <MuiNotificationBell />

          {/* Theme Toggle */}
          <MuiThemeDropDown />

          {/* User Avatar and Menu */}
          <MuiTooltip title="Account">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-label="account menu"
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              <Avatar
                sx={{
                  width: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  bgcolor: "primary.main",
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
                src={user?.profilePicture?.url}
                alt={user?.firstName || "User"}
              >
                {getUserInitials(user)}
              </Avatar>
            </IconButton>
          </MuiTooltip>
        </Box>

        {/* User Menu */}
        <Menu
          id="account-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          slots={{
            paper: Box,
          }}
          slotProps={{
            paper: {
              elevation: 8,
              sx: {
                minWidth: 200,
                mt: 1.5,
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.1))",
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <UserMenuItems
            user={user}
            onProfile={handleProfile}
            onSettings={handleSettings}
            onLogout={handleLogout}
          />
        </Menu>
      </Toolbar>
    </AppBar>
  );
});

Header.displayName = "Header";

Header.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
};

export default Header;
