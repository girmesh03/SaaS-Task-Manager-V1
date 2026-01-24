/**
 * Common Components Index
 * Export all common components for easy imports
 *
 * Error Handling Strategy:
 * - ErrorBoundary: Catches all frontend errors (render, lifecycle, route loading)
 * - ErrorDisplay: UI component for displaying frontend error information
 * - ApiErrorDisplay: UI component for displaying API error information (4xx, 5xx)
 * - API errors: Handled by baseQuery in RTK Query (401 → logout, 403 → toast)
 */

export { default as ErrorBoundary } from "./ErrorBoundary";
export { default as ErrorDisplay } from "./ErrorDisplay";
export { default as ApiErrorDisplay } from "./ApiErrorDisplay";
