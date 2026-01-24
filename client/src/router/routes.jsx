import { createBrowserRouter } from "react-router";

import { RootLayout, AuthenticatedLayout } from "../components/layout";
import { MuiLoading } from "../components/reusable";

/**
 * Application Routes
 * Defines all routes with proper nesting and error handling:
 * - RootLayout: Parent for all routes (public + authenticated)
 * - AuthenticatedLayout: Parent for authenticated routes only (manages socket)
 * - Public routes: Login, Register, etc. (direct children of RootLayout)
 * - Protected routes: Dashboard, Tasks, etc. (children of AuthenticatedLayout)
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
      // Public routes (no authentication required)
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

      // Authenticated routes (require authentication)
      {
        path: "app",
        Component: AuthenticatedLayout,
        children: [
          {
            index: true,
            lazy: async () => {
              const { Dashboard } = await import("../pages");
              return { Component: Dashboard };
            },
          },
          {
            path: "dashboard",
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
            path: "users",
            lazy: async () => {
              const { Users } = await import("../pages");
              return { Component: Users };
            },
          },
          {
            path: "tasks",
            lazy: async () => {
              const { Tasks } = await import("../pages");
              return { Component: Tasks };
            },
          },
          {
            path: "materials",
            lazy: async () => {
              const { Materials } = await import("../pages");
              return { Component: Materials };
            },
          },
          {
            path: "vendors",
            lazy: async () => {
              const { Vendors } = await import("../pages");
              return { Component: Vendors };
            },
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
