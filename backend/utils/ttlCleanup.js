import mongoose from "mongoose";
import logger from "./logger.js";
import { TTL_EXPIRY } from "./constants.js";

/**
 * TTL Cleanup Scheduler
 * Permanently deletes soft-deleted resources after TTL expiry period
 * Deletes Cloudinary files for attachments
 * Never auto-deletes organizations
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

// Cleanup interval: Run every 24 hours (86400000 ms)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

// Store interval ID for cleanup
let cleanupIntervalId = null;

/**
 * Delete Cloudinary file
 * Note: This is a placeholder. In production, you would use Cloudinary SDK
 * @param {string} fileUrl - Cloudinary file URL
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} True if deletion successful
 */
const deleteCloudinaryFile = async (fileUrl, publicId) => {
  try {
    // TODO: Implement actual Cloudinary deletion using cloudinary SDK
    // const cloudinary = require('cloudinary').v2;
    // await cloudinary.uploader.destroy(publicId);

    logger.info("Cloudinary file deletion placeholder", {
      fileUrl,
      publicId,
      note: "Implement actual Cloudinary SDK deletion in production",
    });

    return true;
  } catch (error) {
    logger.error("Failed to delete Cloudinary file", {
      error: error.message,
      stack: error.stack,
      fileUrl,
      publicId,
    });
    return false;
  }
};

/**
 * Cleanup expired materials (90 days)
 * Requirement 4.1
 */
const cleanupMaterials = async (session) => {
  try {
    const Material = mongoose.model("Material");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.MATERIALS * 1000);

    // Find expired soft-deleted materials
    const expiredMaterials = await Material.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id name deletedAt")
      .session(session);

    if (expiredMaterials.length === 0) {
      logger.info("No expired materials to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired materials for cleanup", {
      count: expiredMaterials.length,
      cutoffDate,
    });

    // Permanently delete materials
    const result = await Material.deleteMany(
      {
        _id: { $in: expiredMaterials.map((m) => m._id) },
      },
      { session }
    );

    logger.info("Materials cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup materials", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired vendors (90 days)
 * Requirement 4.2
 */
const cleanupVendors = async (session) => {
  try {
    const Vendor = mongoose.model("Vendor");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.VENDORS * 1000);

    // Find expired soft-deleted vendors
    const expiredVendors = await Vendor.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id name deletedAt")
      .session(session);

    if (expiredVendors.length === 0) {
      logger.info("No expired vendors to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired vendors for cleanup", {
      count: expiredVendors.length,
      cutoffDate,
    });

    // Permanently delete vendors
    const result = await Vendor.deleteMany(
      {
        _id: { $in: expiredVendors.map((v) => v._id) },
      },
      { session }
    );

    logger.info("Vendors cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup vendors", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired tasks (180 days)
 * Requirement 4.3
 */
const cleanupTasks = async (session) => {
  try {
    const Task = mongoose.model("Task");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.TASKS * 1000);

    // Find expired soft-deleted tasks
    const expiredTasks = await Task.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id title deletedAt")
      .session(session);

    if (expiredTasks.length === 0) {
      logger.info("No expired tasks to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired tasks for cleanup", {
      count: expiredTasks.length,
      cutoffDate,
    });

    // Permanently delete tasks
    const result = await Task.deleteMany(
      {
        _id: { $in: expiredTasks.map((t) => t._id) },
      },
      { session }
    );

    logger.info("Tasks cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup tasks", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired users (365 days)
 * Requirement 4.4
 */
const cleanupUsers = async (session) => {
  try {
    const User = mongoose.model("User");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.USERS * 1000);

    // Find expired soft-deleted users
    const expiredUsers = await User.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id firstName lastName deletedAt")
      .session(session);

    if (expiredUsers.length === 0) {
      logger.info("No expired users to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired users for cleanup", {
      count: expiredUsers.length,
      cutoffDate,
    });

    // Permanently delete users
    const result = await User.deleteMany(
      {
        _id: { $in: expiredUsers.map((u) => u._id) },
      },
      { session }
    );

    logger.info("Users cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup users", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired departments (365 days)
 * Requirement 4.5
 */
const cleanupDepartments = async (session) => {
  try {
    const Department = mongoose.model("Department");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.DEPARTMENTS * 1000);

    // Find expired soft-deleted departments
    const expiredDepartments = await Department.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id name deletedAt")
      .session(session);

    if (expiredDepartments.length === 0) {
      logger.info("No expired departments to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired departments for cleanup", {
      count: expiredDepartments.length,
      cutoffDate,
    });

    // Permanently delete departments
    const result = await Department.deleteMany(
      {
        _id: { $in: expiredDepartments.map((d) => d._id) },
      },
      { session }
    );

    logger.info("Departments cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup departments", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Organizations are NEVER auto-deleted
 * Requirement 4.6
 */
const cleanupOrganizations = async () => {
  logger.info("Organizations are never auto-deleted (TTL exemption)");
  return { deleted: 0, failed: 0 };
};

/**
 * Cleanup expired task comments (180 days)
 * Requirement 4.7
 */
const cleanupComments = async (session) => {
  try {
    const TaskComment = mongoose.model("TaskComment");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.COMMENTS * 1000);

    // Find expired soft-deleted comments
    const expiredComments = await TaskComment.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id comment deletedAt")
      .session(session);

    if (expiredComments.length === 0) {
      logger.info("No expired comments to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired comments for cleanup", {
      count: expiredComments.length,
      cutoffDate,
    });

    // Permanently delete comments
    const result = await TaskComment.deleteMany(
      {
        _id: { $in: expiredComments.map((c) => c._id) },
      },
      { session }
    );

    logger.info("Comments cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup comments", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired task activities (90 days)
 * Requirement 4.8
 */
const cleanupActivities = async (session) => {
  try {
    const TaskActivity = mongoose.model("TaskActivity");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.ACTIVITIES * 1000);

    // Find expired soft-deleted activities
    const expiredActivities = await TaskActivity.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id activity deletedAt")
      .session(session);

    if (expiredActivities.length === 0) {
      logger.info("No expired activities to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired activities for cleanup", {
      count: expiredActivities.length,
      cutoffDate,
    });

    // Permanently delete activities
    const result = await TaskActivity.deleteMany(
      {
        _id: { $in: expiredActivities.map((a) => a._id) },
      },
      { session }
    );

    logger.info("Activities cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup activities", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired notifications (30 days)
 * Requirement 4.9
 */
const cleanupNotifications = async (session) => {
  try {
    const Notification = mongoose.model("Notification");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.NOTIFICATIONS * 1000);

    // Find expired soft-deleted notifications
    const expiredNotifications = await Notification.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id title deletedAt")
      .session(session);

    if (expiredNotifications.length === 0) {
      logger.info("No expired notifications to cleanup");
      return { deleted: 0, failed: 0 };
    }

    logger.info("Found expired notifications for cleanup", {
      count: expiredNotifications.length,
      cutoffDate,
    });

    // Permanently delete notifications
    const result = await Notification.deleteMany(
      {
        _id: { $in: expiredNotifications.map((n) => n._id) },
      },
      { session }
    );

    logger.info("Notifications cleanup completed", {
      deleted: result.deletedCount,
      cutoffDate,
    });

    return { deleted: result.deletedCount, failed: 0 };
  } catch (error) {
    logger.error("Failed to cleanup notifications", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1 };
  }
};

/**
 * Cleanup expired attachments (30 days) and delete Cloudinary files
 * Requirement 4.10
 */
const cleanupAttachments = async (session) => {
  try {
    const Attachment = mongoose.model("Attachment");
    const cutoffDate = new Date(Date.now() - TTL_EXPIRY.ATTACHMENTS * 1000);

    // Find expired soft-deleted attachments
    const expiredAttachments = await Attachment.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate },
    })
      .select("_id filename fileUrl deletedAt")
      .session(session);

    if (expiredAttachments.length === 0) {
      logger.info("No expired attachments to cleanup");
      return { deleted: 0, failed: 0, cloudinaryDeleted: 0 };
    }

    logger.info("Found expired attachments for cleanup", {
      count: expiredAttachments.length,
      cutoffDate,
    });

    // Delete Cloudinary files first
    let cloudinaryDeletedCount = 0;
    for (const attachment of expiredAttachments) {
      // Extract public ID from Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const urlParts = attachment.fileUrl.split("/");
      const publicIdWithExt = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExt.split(".")[0];

      const deleted = await deleteCloudinaryFile(attachment.fileUrl, publicId);
      if (deleted) {
        cloudinaryDeletedCount++;
      }
    }

    // Permanently delete attachments from database
    const result = await Attachment.deleteMany(
      {
        _id: { $in: expiredAttachments.map((a) => a._id) },
      },
      { session }
    );

    logger.info("Attachments cleanup completed", {
      deleted: result.deletedCount,
      cloudinaryDeleted: cloudinaryDeletedCount,
      cutoffDate,
    });

    return {
      deleted: result.deletedCount,
      failed: 0,
      cloudinaryDeleted: cloudinaryDeletedCount,
    };
  } catch (error) {
    logger.error("Failed to cleanup attachments", {
      error: error.message,
      stack: error.stack,
    });
    return { deleted: 0, failed: 1, cloudinaryDeleted: 0 };
  }
};

/**
 * Run TTL cleanup for all resources
 * Executes cleanup in a MongoDB transaction for atomicity
 */
export const runTTLCleanup = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    logger.info("Starting TTL cleanup job", {
      timestamp: new Date().toISOString(),
    });

    const results = {
      materials: { deleted: 0, failed: 0 },
      vendors: { deleted: 0, failed: 0 },
      tasks: { deleted: 0, failed: 0 },
      users: { deleted: 0, failed: 0 },
      departments: { deleted: 0, failed: 0 },
      organizations: { deleted: 0, failed: 0 },
      comments: { deleted: 0, failed: 0 },
      activities: { deleted: 0, failed: 0 },
      notifications: { deleted: 0, failed: 0 },
      attachments: { deleted: 0, failed: 0, cloudinaryDeleted: 0 },
    };

    // Run cleanup for each resource type
    results.materials = await cleanupMaterials(session);
    results.vendors = await cleanupVendors(session);
    results.tasks = await cleanupTasks(session);
    results.users = await cleanupUsers(session);
    results.departments = await cleanupDepartments(session);
    results.organizations = await cleanupOrganizations(); // Never deletes
    results.comments = await cleanupComments(session);
    results.activities = await cleanupActivities(session);
    results.notifications = await cleanupNotifications(session);
    results.attachments = await cleanupAttachments(session);

    // Commit transaction
    await session.commitTransaction();

    // Calculate totals
    const totalDeleted = Object.values(results).reduce(
      (sum, result) => sum + (result.deleted || 0),
      0
    );
    const totalFailed = Object.values(results).reduce(
      (sum, result) => sum + (result.failed || 0),
      0
    );

    logger.info("TTL cleanup job completed successfully", {
      timestamp: new Date().toISOString(),
      totalDeleted,
      totalFailed,
      results,
    });

    return {
      success: true,
      totalDeleted,
      totalFailed,
      results,
    };
  } catch (error) {
    await session.abortTransaction();

    logger.error("TTL cleanup job failed", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: error.message,
    };
  } finally {
    session.endSession();
  }
};

/**
 * Start TTL cleanup scheduler
 * Runs cleanup job every 24 hours
 */
export const startTTLCleanupScheduler = () => {
  if (cleanupIntervalId) {
    logger.warn("TTL cleanup scheduler already running");
    return;
  }

  logger.info("Starting TTL cleanup scheduler", {
    interval: `${CLEANUP_INTERVAL / 1000 / 60 / 60} hours`,
  });

  // Run immediately on start
  runTTLCleanup();

  // Schedule recurring cleanup
  cleanupIntervalId = setInterval(() => {
    runTTLCleanup();
  }, CLEANUP_INTERVAL);

  logger.info("TTL cleanup scheduler started successfully");
};

/**
 * Stop TTL cleanup scheduler
 */
export const stopTTLCleanupScheduler = () => {
  if (!cleanupIntervalId) {
    logger.warn("TTL cleanup scheduler not running");
    return;
  }

  clearInterval(cleanupIntervalId);
  cleanupIntervalId = null;

  logger.info("TTL cleanup scheduler stopped");
};

/**
 * Check if TTL cleanup scheduler is running
 * @returns {boolean} True if scheduler is running
 */
export const isTTLCleanupSchedulerRunning = () => {
  return cleanupIntervalId !== null;
};

export default {
  runTTLCleanup,
  startTTLCleanupScheduler,
  stopTTLCleanupScheduler,
  isTTLCleanupSchedulerRunning,
};
