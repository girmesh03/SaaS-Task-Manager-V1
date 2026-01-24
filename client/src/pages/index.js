/**
 * Page Exports
 * Central export point for all page components
 */

// Public pages
export { default as Home } from "./Home";
export { default as Login } from "./Login";
export { default as Register } from "./Register";
export { default as ForgotPassword } from "./ForgotPassword";
export { default as ResetPassword } from "./ResetPassword";
export { default as EmailVerification } from "./EmailVerification";

// Protected pages for both platform and customer org
export { default as Dashboard } from "./Dashboard";
export { default as Departments } from "./Departments";
export { default as Users } from "./Users";
export { default as Tasks } from "./Tasks";
export { default as Vendors } from "./Vendors";
export { default as Materials } from "./Materials";

// 404 page
export { default as NotFound } from "./NotFound";
