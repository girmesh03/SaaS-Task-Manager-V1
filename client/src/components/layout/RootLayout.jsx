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
import { useTheme } from "@mui/material/styles";
import { ErrorBoundary } from "../common";

/**
 * RootLayout Component
 * Wraps all routes with ErrorBoundary to catch route component errors
 */
const RootLayout = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        [theme.breakpoints.up("xl")]: {
          maxWidth: theme.breakpoints.values.xl,
          margin: "0 auto",
        },
        ...theme.applyStyles("dark", {
          backgroundImage:
            "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
        }),
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
        theme={theme.palette.mode === "dark" ? "dark" : "light"}
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
