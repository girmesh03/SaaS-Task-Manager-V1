/**
 * Routes Index
 * Central export for all route modules
 */

import authRoutes from "./authRoutes.js";
import organizationRoutes from "./organizationRoutes.js";

export { authRoutes, organizationRoutes };

export default {
  authRoutes,
  organizationRoutes,
};
