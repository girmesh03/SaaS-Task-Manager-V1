import { createBrowserRouter } from "react-router";

import {
  RootLayout,
  AuthLayout,
  PublicRoutes,
  ProtectedRoutes,
  DashboardLayout,
} from "../components/layout";
import { MuiLoading } from "../components/reusable";

/**
 * Lazy load helper - reduces boilerplate for route lazy loading
 * @param {Function} importFn - Dynamic import function
 * @param {string} componentName - Name of the component to extract
 * @returns {Promise<{Component: React.ComponentType}>}
 */
const lazyLoad = (importFn, componentName) => async () => {
  const module = await importFn();
  return { Component: module[componentName] };
};

/**
 * Application Routes
 * Defines all routes with proper nesting and error handling:
 * - RootLayout: Parent for all routes (public + authenticated)
 * - PublicRoutes: Redirects authenticated users from auth pages (except landing page)
 * - AuthLayout: Layout for public pages (header with logo, theme toggle, and auth actions)
 * - ProtectedRoutes: Protects authenticated routes, manages socket connections
 * - DashboardLayout: Layout for dashboard pages (header, sidebar, content)
 * - Public routes: Home, Login, Register, etc. (children of PublicRoutes → AuthLayout)
 * - Protected routes: Dashboard, Tasks, etc. (children of ProtectedRoutes → DashboardLayout)
 *
 * Flow:
 * - Public: RootLayout → PublicRoutes → AuthLayout → Outlet
 * - Protected: RootLayout → ProtectedRoutes → DashboardLayout → Outlet
 *
 * Error Handling Strategy:
 * - All frontend errors (render, lifecycle, loading, navigation) → ErrorBoundary component
 * - API errors (401, 403) → baseQuery in RTK Query (automatic handling)
 * - API error display → Will be handled by dedicated API error components (to be developed)
 *
 * Note: ErrorBoundary is implemented at the layout level to catch all errors
 * including route loading failures, component render errors, and lifecycle errors.
 *
 * Lazy Loading Strategy:
 * - All pages are lazy loaded for optimal bundle size
 * - All detail components are lazy loaded for optimal bundle size
 * - Layout components are eagerly loaded for immediate rendering
 */

const routes = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    HydrateFallback: MuiLoading,
    children: [
      // Public routes (no authentication required) - wrapped in PublicRoutes → AuthLayout
      {
        Component: PublicRoutes,
        children: [
          {
            Component: AuthLayout,
            children: [
              {
                index: true,
                lazy: lazyLoad(() => import("../pages"), "Home"),
              },
              {
                path: "login",
                lazy: lazyLoad(() => import("../pages"), "Login"),
              },
              {
                path: "register",
                lazy: lazyLoad(() => import("../pages"), "Register"),
              },
              {
                path: "forgot-password",
                lazy: lazyLoad(() => import("../pages"), "ForgotPassword"),
              },
              {
                path: "reset-password",
                lazy: lazyLoad(() => import("../pages"), "ResetPassword"),
              },
              {
                path: "verify-email",
                lazy: lazyLoad(() => import("../pages"), "EmailVerification"),
              },
            ],
          },
        ],
      },

      // Protected routes (require authentication)
      {
        path: "dashboard",
        Component: ProtectedRoutes,
        children: [
          {
            Component: DashboardLayout,
            children: [
              {
                index: true,
                lazy: lazyLoad(() => import("../pages"), "Dashboard"),
              },
              {
                path: "departments",
                lazy: lazyLoad(() => import("../pages"), "Departments"),
              },
              {
                path: "departments/:departmentId",
                lazy: lazyLoad(
                  () => import("../components/department"),
                  "DepartmentDetails"
                ),
              },
              {
                path: "users",
                lazy: lazyLoad(() => import("../pages"), "Users"),
              },
              {
                path: "users/:userId",
                lazy: lazyLoad(
                  () => import("../components/user"),
                  "UserDetails"
                ),
              },
              {
                path: "tasks",
                lazy: lazyLoad(() => import("../pages"), "Tasks"),
              },
              {
                path: "tasks/:taskId",
                lazy: lazyLoad(
                  () => import("../components/task"),
                  "TaskDetails"
                ),
              },
              {
                path: "materials",
                lazy: lazyLoad(() => import("../pages"), "Materials"),
              },
              {
                path: "materials/:materialId",
                lazy: lazyLoad(
                  () => import("../components/material"),
                  "MaterialDetails"
                ),
              },
              {
                path: "vendors",
                lazy: lazyLoad(() => import("../pages"), "Vendors"),
              },
              {
                path: "vendors/:vendorId",
                lazy: lazyLoad(
                  () => import("../components/vendor"),
                  "VendorDetails"
                ),
              },
            ],
          },
        ],
      },

      // 404 Not Found
      {
        path: "*",
        lazy: lazyLoad(() => import("../pages"), "NotFound"),
      },
    ],
  },
]);

export default routes;
