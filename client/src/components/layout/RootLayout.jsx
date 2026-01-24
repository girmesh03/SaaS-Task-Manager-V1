/**
 * RootLayout Component
 * Root layout component that wraps all pages (public and authenticated)
 * Provides toast notifications and ErrorBoundary for all routes
 * Does NOT manage socket connections (handled by AuthenticatedLayout)
 *
 * Requirements: 24.6
 */

import { Outlet } from "react-router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ErrorBoundary } from "../common";

/**
 * RootLayout Component
 * Wraps all routes with ErrorBoundary to catch route component errors
 */
const RootLayout = () => {
  return (
    <>
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
    </>
  );
};

export default RootLayout;
