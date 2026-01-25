/**
 * AuthLayout Component
 * Layout for public/authentication pages
 * Includes public header with logo, theme toggle, and main content area
 *
 * Flow: RootLayout → AuthLayout → Outlet
 *
 * Features:
 * - Public header with logo and theme toggle
 * - Main content area for page content
 * - Responsive design (mobile, tablet, desktop)
 * - Proper spacing and overflow handling
 * - No re-renders on header state changes
 *
 * Requirements: Public pages layout
 */

import { memo, useCallback } from "react";
import { Outlet, useNavigate } from "react-router";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { MuiThemeDropDown } from "../reusable";
import { useResponsive } from "../../hooks";

// Toolbar height constants
const TOOLBAR_HEIGHT = {
  xs: 56,
  sm: 64,
};

// Toolbar offset for content positioning (height / 8px spacing unit)
const TOOLBAR_OFFSET = {
  xs: 7, // 56px / 8 = 7
  sm: 8, // 64px / 8 = 8
};

/**
 * LogoButton Component - Reusable logo button with navigation
 * @component
 */
const LogoButton = memo(({ onClick, onKeyDown }) => {
  const { isMobile } = useResponsive();

  return (
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

/**
 * PublicHeader Component - Header for public pages
 * @component
 */
const PublicHeader = memo(() => {
  const navigate = useNavigate();

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
          minHeight: TOOLBAR_HEIGHT,
          px: { xs: 2, sm: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Logo and Brand */}
        <LogoButton
          onClick={handleLogoNavigation}
          onKeyDown={handleLogoKeyDown}
        />

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Theme Toggle */}
        <MuiThemeDropDown />
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
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Public Header */}
      <PublicHeader />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minHeight: "100vh",
          overflow: "auto",
          bgcolor: "background.default",
          pt: { xs: 7, sm: 8 }, // Toolbar height offset
        }}
      >
        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: "100%",
            overflow: "auto",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
