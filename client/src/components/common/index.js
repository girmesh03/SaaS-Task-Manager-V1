/**
 * Common Components Index
 * Export all common components for easy imports
 *
 * Error Handling Strategy:
 * - ErrorBoundary: Catches all frontend errors (render, lifecycle, route loading)
 * - ErrorDisplay: UI component for displaying frontend error information
 * - ApiErrorDisplay: UI component for displaying API error information (4xx, 5xx)
 * - API errors: Handled by baseQuery in RTK Query (401 → logout, 403 → toast)
 *
 * Note: All reusable MUI wrapper components are now in client/src/components/reusable/
 * Common components here are application-level components, not reusable UI wrappers.
 */

export { default as ErrorBoundary } from "./ErrorBoundary";
export { default as ErrorDisplay } from "./ErrorDisplay";
export { default as ApiErrorDisplay } from "./ApiErrorDisplay";
export { default as UserMenuItems } from "./UserMenuItems";
