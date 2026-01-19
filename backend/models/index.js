/**
 * Central export file for all Mongoose models
 *
 * This file provides a single point of import for all models,
 * making it easier to import multiple models in controllers and services.
 *
 * Usage:
 * import { User, Organization, Department } from './models/index.js';
 */

// Core Models
export { default as Organization } from "./Organization.js";
export { default as Department } from "./Department.js";
export { default as User } from "./User.js";

// Task Models (Base + Discriminators)
export { default as Task } from "./Task.js";
export { default as ProjectTask } from "./ProjectTask.js";
export { default as RoutineTask } from "./RoutineTask.js";
export { default as AssignedTask } from "./AssignedTask.js";

// Task-Related Models
export { default as TaskActivity } from "./TaskActivity.js";
export { default as TaskComment } from "./TaskComment.js";

// Resource Models
export { default as Material } from "./Material.js";
export { default as Vendor } from "./Vendor.js";

// System Models
export { default as Notification } from "./Notification.js";
export { default as Attachment } from "./Attachment.js";

// Plugins
export { default as softDeletePlugin } from "./plugins/softDelete.js";
