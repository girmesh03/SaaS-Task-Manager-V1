import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import CssBaseline from "@mui/material/CssBaseline";
import AppTheme from "./theme/AppTheme";

import routes from "./router/routes";
import { store, persistor } from "./redux/app/store";
import { MuiLoading } from "./components/reusable";
import { ErrorBoundary } from "./components/common";

/**
 * Application Entry Point
 *
 * Error Handling Strategy (Dual ErrorBoundary Approach):
 *
 * 1. Root ErrorBoundary (main.jsx): Catches errors in Redux, Router, Theme setup
 *    - Provider errors
 *    - PersistGate errors
 *    - RouterProvider errors
 *    - Theme errors
 *
 * 2. Route ErrorBoundary (RootLayout): Catches errors in route components
 *    - Component render errors
 *    - Lifecycle errors
 *    - Event handler errors
 *    - Lazy loading errors
 *
 * This dual approach ensures ALL errors are caught:
 * - Infrastructure errors → Root ErrorBoundary (main.jsx)
 * - Route/component errors → Route ErrorBoundary (RootLayout)
 * - Global JavaScript errors → Both ErrorBoundaries (via window.addEventListener)
 * - Promise rejections → Both ErrorBoundaries (via window.addEventListener)
 *
 * API Errors: Handled separately by RTK Query baseQuery
 * - 401 errors → Token refresh → Logout if refresh fails
 * - 403 errors → Show toast notification (no logout)
 * - 4xx/5xx errors → API error components (to be developed)
 *
 * CRITICAL: ErrorBoundary does NOT handle API errors (4xx, 5xx)
 * Those are handled by baseQuery and dedicated API error components
 */

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary
      onReset={() => {
        // Optional: Reset any global state on error reset
        console.log("[App] Error boundary reset triggered");
      }}
    >
      <Provider store={store}>
        <PersistGate
          loading={<MuiLoading message="Loading state..." />}
          persistor={persistor}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <AppTheme>
              <CssBaseline enableColorScheme />
              <RouterProvider router={routes} />
            </AppTheme>
          </LocalizationProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </StrictMode>
);
