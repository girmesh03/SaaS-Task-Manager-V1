/**
 * Routes Index
 * Central export for all route modules
 */

import authRoutes from "./authRoutes.js";
import organizationRoutes from "./organizationRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import userRoutes from "./userRoutes.js";

export { authRoutes, organizationRoutes, departmentRoutes, userRoutes };

export default {
  authRoutes,
  organizationRoutes,
  departmentRoutes,
  userRoutes,
};
