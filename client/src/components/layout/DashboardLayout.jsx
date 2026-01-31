/**
 * DashboardLayout Component
 * Layout for authenticated dashboard pages
 * Includes Header, Sidebar, BottomNavigation (mobile), and main content area
 *
 * Flow: RootLayout → ProtectedRoutes → DashboardLayout → Outlet
 *
 * Features:
 * - Header with navigation and user menu
 * - Sidebar with navigation menu (permanent on desktop, temporary on mobile)
 * - Bottom navigation bar with SpeedDial (mobile only, < 960px)
 * - Main content area for page content (scrollable)
 * - Responsive design (mobile, tablet, desktop)
 * - Proper spacing and overflow handling
 * - Extra padding bottom on mobile for bottom navigation
 *
 * Requirements: 1.1, 1.6, 1.7, 2.1-2.10, 45.1, 45.2, 45.3, 45.4, 45.5
 */

import { useState, useCallback } from "react";
import { Outlet } from "react-router";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle mobile drawer toggle
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  // Handle mobile drawer close
  const handleDrawerClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

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
      {/* Header */}
      <Header onMenuClick={handleDrawerToggle} />

      {/* Sidebar */}
      <Sidebar open={mobileOpen} onClose={handleDrawerClose} />

      {/* Main Content Area - Scrollable Outlet Container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: "calc(100% - 240px)" },
          ml: { xs: 0, md: "240px" },
          overflow: "auto",
          bgcolor: "background.default",
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />

        {/* Outlet with padding */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            pb: { xs: 9, md: 3 }, // Extra padding bottom on mobile for bottom navigation
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Bottom Navigation (Mobile only) */}
      <BottomNavigation />
    </Box>
  );
};

export default DashboardLayout;
