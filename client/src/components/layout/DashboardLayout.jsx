/**
 * DashboardLayout Component
 * Layout for authenticated dashboard pages
 * Includes Header, Sidebar, and main content area
 *
 * Flow: RootLayout → ProtectedRoutes → DashboardLayout → Outlet
 *
 * Features:
 * - Header with navigation and user menu
 * - Sidebar with navigation menu
 * - Main content area for page content
 * - Responsive design (mobile, tablet, desktop)
 * - Proper spacing and overflow handling
 *
 * Requirements: 45.1, 45.2, 45.3, 45.4, 45.5
 */

import { useState, useCallback } from "react";
import { Outlet } from "react-router";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Header from "./Header";
import Sidebar from "./Sidebar";

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
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Header onMenuClick={handleDrawerToggle} />

      {/* Sidebar */}
      <Sidebar open={mobileOpen} onClose={handleDrawerClose} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          width: { xs: "100%", lg: "calc(100% - 240px)" },
          minHeight: "100vh",
          overflow: "auto",
          bgcolor: "background.default",
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            p: { xs: 2, sm: 3 },
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

export default DashboardLayout;
