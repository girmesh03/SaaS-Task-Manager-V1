/**
 * AuthLayout Component
 * Layout for public/authentication pages
 * Includes public header with logo, theme toggle, and auth actions
 *
 * Flow: RootLayout → PublicRoutes → AuthLayout → Outlet
 *
 * Features:
 * - Public header with logo and theme toggle
 * - Login button for unauthenticated users
 * - Logout button for authenticated users
 * - Main content area for page content
 * - Responsive design (mobile, tablet, desktop)
 * - Proper spacing and overflow handling
 * - No re-renders on header state changes
 * - XL breakpoint centering for large screens
 *
 * Requirements: Public pages layout
 */

import { memo, useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Outlet, useNavigate } from "react-router";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import LoginIcon from "@mui/icons-material/Login";
import { MuiThemeDropDown, MuiTooltip } from "../reusable";
import { UserMenuItems } from "../common";
import { useAuth, useResponsive } from "../../hooks";
import { getUserInitials } from "../../utils/userHelpers";
import { getMenuSlotProps } from "../../utils/menuStyles";
import logger from "../../utils/logger";

/**
 * Logo button styles - extracted for reusability and maintainability
 */
const logoButtonStyles = {
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
};

/**
 * LogoButton Component - Reusable logo button with navigation
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onKeyDown - Keyboard handler
 * @param {boolean} props.isMobile - Mobile viewport flag
 */
const LogoButton = memo(({ onClick, onKeyDown, isMobile }) => {
  return (
    <Box
      component="button"
      role="button"
      type="button"
      sx={logoButtonStyles}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="TaskManager - Go to home page"
      aria-describedby="logo-description"
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
      <span id="logo-description" style={{ display: "none" }}>
        Navigate to TaskManager home page
      </span>
    </Box>
  );
});

LogoButton.displayName = "LogoButton";

LogoButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

/**
 * PublicHeader Component - Header for public pages
 * @component
 */
const PublicHeader = memo(() => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isMobile } = useResponsive();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Handle logo navigation - memoized for stable reference
  const handleLogoNavigation = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Handle logo keyboard navigation - memoized for stable reference
  const handleLogoKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleLogoNavigation();
      }
    },
    [handleLogoNavigation]
  );

  // Handle login navigation
  const handleLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  // Handle user menu open
  const handleMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  // Handle user menu close
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle dashboard navigation
  const handleDashboard = useCallback(() => {
    navigate("/dashboard");
    handleMenuClose();
  }, [navigate, handleMenuClose]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      logger.error("[PublicHeader] Logout failed", error);
      toast.error("Failed to logout. Please try again.");
    } finally {
      handleMenuClose();
    }
  }, [logout, navigate, handleMenuClose]);

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={(theme) => ({
        zIndex: theme.zIndex.drawer + 1,
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        [theme.breakpoints.up("xl")]: {
          maxWidth: theme.breakpoints.values.xl,
          left: "50%",
          transform: "translateX(-50%)",
        },
      })}
    >
      <Toolbar
        sx={{
          px: { xs: 2, sm: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Logo and Brand */}
        <LogoButton
          onClick={handleLogoNavigation}
          onKeyDown={handleLogoKeyDown}
          isMobile={isMobile}
        />

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Theme Toggle */}
        <MuiThemeDropDown />

        {/* Auth Actions */}
        {isAuthenticated && user ? (
          // Authenticated: Show user avatar with menu
          <>
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

            {/* User Menu */}
            <Menu
              id="account-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              slotProps={{
                ...getMenuSlotProps(),
                list: {
                  "aria-labelledby": "account-button",
                  role: "menu",
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <UserMenuItems
                user={user}
                onDashboard={handleDashboard}
                onLogout={handleLogout}
                showDashboard
              />
            </Menu>
          </>
        ) : (
          // Unauthenticated: Show login button
          <Button
            size="small"
            startIcon={<LoginIcon />}
            onClick={handleLogin}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "primary.main",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            {isMobile ? "Login" : "Sign In"}
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
});

PublicHeader.displayName = "PublicHeader";

/**
 * AuthLayout Component - Layout wrapper for public pages
 * @component
 */
const AuthLayout = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Public Header */}
      <PublicHeader />

      {/* Main Content Area - Scrollable Outlet Container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          pt: { xs: 7, sm: 8 }, // Toolbar height offset
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AuthLayout;
