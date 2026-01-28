/**
 * PublicRoutes Component
 * Protects public routes from authenticated users
 * Redirects authenticated users to dashboard (except landing page)
 * Allows unauthenticated users to access public pages
 *
 * Flow: RootLayout → PublicRoutes → AuthLayout → Outlet
 *
 * Requirements: Prevent authenticated users from accessing auth pages
 */

import { useLocation, Navigate, Outlet } from "react-router";
import useAuth from "../../hooks/useAuth";
import logger from "../../utils/logger";

const PublicRoutes = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Allow access to landing page (/) for everyone
  if (location.pathname === "/") {
    return <Outlet />;
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated && user) {
    logger.info(
      "[PublicRoutes] Authenticated user accessing public route, redirecting to dashboard",
      {
        userId: user._id,
        attemptedPath: location.pathname,
      }
    );

    // Get the previous location from state, or default to dashboard
    const from = location.state?.from?.pathname || "/dashboard";

    return <Navigate to={from} replace />;
  }

  // Allow unauthenticated users to access public pages
  return <Outlet />;
};

export default PublicRoutes;
