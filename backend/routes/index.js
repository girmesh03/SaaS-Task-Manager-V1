/**
 * Routes Index
 * Central router that mounts all API routes
 */

import express from "express";
import authRoutes from "./authRoutes.js";
import organizationRoutes from "./organizationRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import userRoutes from "./userRoutes.js";
import taskRoutes from "./taskRoutes.js";
import taskActivityRoutes from "./taskActivityRoutes.js";
import taskCommentRoutes from "./taskCommentRoutes.js";
import materialRoutes from "./materialRoutes.js";
import vendorRoutes from "./vendorRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

const router = express.Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);
router.use("/departments", departmentRoutes);
router.use("/users", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/tasks/activities", taskActivityRoutes);
router.use("/tasks/comments", taskCommentRoutes);
router.use("/materials", materialRoutes);
router.use("/vendors", vendorRoutes);
router.use("/notifications", notificationRoutes);

export default router;
