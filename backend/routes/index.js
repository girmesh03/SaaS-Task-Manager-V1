/**
 * Routes Index
 * Central export for all route modules
 */

import authRoutes from "./authRoutes.js";
import organizationRoutes from "./organizationRoutes.js";
import departmentRoutes from "./departmentRoutes.js";

export { authRoutes, organizationRoutes, departmentRoutes };

export default {
  authRoutes,
  organizationRoutes,
  departmentRoutes,
};
