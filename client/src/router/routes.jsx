import { createBrowserRouter } from "react-router";

import {
  RootLayout,
  AuthLayout,
  ProtectedRoutes,
  DashboardLayout,
} from "../components/layout";
import { MuiLoading } from "../components/reusable";
import { DepartmentDetails } from "../components/department";
import { UserDetails } from "../components/user";
import { TaskDetails } from "../components/task";
import { MaterialDetails } from "../components/material";
import { VendorDetails } from "../components/vendor";

/**
 * Application Routes
 * Defines all routes with proper nesting and error handling:
 * - RootLayout: Parent for all routes (public + authenticated)
 * - AuthLayout: Layout for public pages (header with logo and theme toggle)
 * - ProtectedRoutes: Protects authenticated routes, manages socket connections
 * - DashboardLayout: Layout for dashboard pages (header, sidebar, content)
 * - Public routes: Home, Login, Register, etc. (children of AuthLayout)
 * - Protected routes: Dashboard, Tasks, etc. (children of ProtectedRoutes → DashboardLayout)
 *
 * Flow:
 * - Public: RootLayout → AuthLayout → Outlet
 * - Protected: RootLayout → ProtectedRoutes → DashboardLayout → Outlet
 *
 * Error Handling Strategy:
 * - All frontend errors (render, lifecycle, loading, navigation) → ErrorBoundary component
 * - API errors (401, 403) → baseQuery in RTK Query (automatic handling)
 * - API error display → Will be handled by dedicated API error components (to be developed)
 *
 * Note: ErrorBoundary is implemented at the layout level to catch all errors
 * including route loading failures, component render errors, and lifecycle errors.
 */

const routes = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    HydrateFallback: MuiLoading,
    children: [
      // Public routes (no authentication required) - wrapped in AuthLayout
      {
        Component: AuthLayout,
        children: [
          {
            index: true,
            lazy: async () => {
              const { Home } = await import("../pages");
              return { Component: Home };
            },
          },
          {
            path: "login",
            lazy: async () => {
              const { Login } = await import("../pages");
              return { Component: Login };
            },
          },
          {
            path: "register",
            lazy: async () => {
              const { Register } = await import("../pages");
              return { Component: Register };
            },
          },
          {
            path: "forgot-password",
            lazy: async () => {
              const { ForgotPassword } = await import("../pages");
              return { Component: ForgotPassword };
            },
          },
          {
            path: "reset-password",
            lazy: async () => {
              const { ResetPassword } = await import("../pages");
              return { Component: ResetPassword };
            },
          },
          {
            path: "verify-email",
            lazy: async () => {
              const { EmailVerification } = await import("../pages");
              return { Component: EmailVerification };
            },
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
                lazy: async () => {
                  const { Dashboard } = await import("../pages");
                  return { Component: Dashboard };
                },
              },
              {
                path: "departments",
                lazy: async () => {
                  const { Departments } = await import("../pages");
                  return { Component: Departments };
                },
              },
              {
                path: "departments/:departmentId",
                Component: DepartmentDetails,
              },
              {
                path: "users",
                lazy: async () => {
                  const { Users } = await import("../pages");
                  return { Component: Users };
                },
              },
              {
                path: "users/:userId",
                Component: UserDetails,
              },
              {
                path: "tasks",
                lazy: async () => {
                  const { Tasks } = await import("../pages");
                  return { Component: Tasks };
                },
              },
              {
                path: "tasks/:taskId",
                Component: TaskDetails,
              },
              {
                path: "materials",
                lazy: async () => {
                  const { Materials } = await import("../pages");
                  return { Component: Materials };
                },
              },
              {
                path: "materials/:materialId",
                Component: MaterialDetails,
              },
              {
                path: "vendors",
                lazy: async () => {
                  const { Vendors } = await import("../pages");
                  return { Component: Vendors };
                },
              },
              {
                path: "vendors/:vendorId",
                Component: VendorDetails,
              },
            ],
          },
        ],
      },

      // 404 Not Found
      {
        path: "*",
        lazy: async () => {
          const { NotFound } = await import("../pages");
          return { Component: NotFound };
        },
      },
    ],
  },
]);

export default routes;
