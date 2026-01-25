/**
 * RootLayout Component
 * Root layout component that wraps all pages (public and authenticated)
 * Provides toast notifications and ErrorBoundary for all routes
 * Does NOT manage socket connections (handled by ProtectedRoutes)
 *
 * Flow: RootLayout → ProtectedRoutes → DashboardLayout → Outlet
 *
 * Requirements: 24.6
 */

import { Outlet } from "react-router";
import Box from "@mui/material/Box";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ErrorBoundary } from "../common";

/**
 * RootLayout Component
 * Wraps all routes with ErrorBoundary to catch route component errors
 */
const RootLayout = () => {
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
      {/* Toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Wrap routes with ErrorBoundary to catch route component errors */}
      <ErrorBoundary
        onReset={() => {
          console.log("[RootLayout] ErrorBoundary reset triggered");
        }}
      >
        <Outlet />
      </ErrorBoundary>
    </Box>
  );
};

export default RootLayout;
