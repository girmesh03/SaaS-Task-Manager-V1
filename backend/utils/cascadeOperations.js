import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Cascade Delete and Restore Operations
 *
 * Implements recursive soft delete/restore with MongoDB transactions
 * Handles cascade relationships between models
 *
 * Cascade Relationships:
 * - Organization → [Departments, Users, Tasks, Materials, Vendors]
 * - Department → [Users, Tasks]
 * - Task → [TaskComments, TaskActivities, Attachments]
 * - User → [Tasks (created), TaskComments, TaskActivities]
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */

/**
 * Maximum cascade depth to prevent stack overflow
 * @constant {number}
 */
const MAX_CASCADE_DEPTH = 10;

/**
 * Set to track visited documents and prevent circular dependencies
 * @type {Set<string>}
 */
let visitedDocuments = new Set();

/**
 * Model names constants for type safety
 * @constant {Object}
 */
const MODEL_NAMES = {
  ORGANIZATION: "Organization",
  DEPARTMENT: "Department",
  USER: "User",
  TASK: "Task",
  TASK_COMMENT: "TaskComment",
  TASK_ACTIVITY: "TaskActivity",
  MATERIAL: "Material",
  VENDOR: "Vendor",
  ATTACHMENT: "Attachment",
};

/**
 * Parent field mappings for validation
 * Maps document fields to their parent model names
 * @constant {Object}
 */
const PARENT_FIELD_MAPPINGS = {
  organization: MODEL_NAMES.ORGANIZATION,
  department: MODEL_NAMES.DEPARTMENT,
  task: MODEL_NAMES.TASK,
  activity: MODEL_NAMES.TASK_ACTIVITY,
  parentComment: MODEL_NAMES.TASK_COMMENT,
};

/**
 * Cascade relationship definitions
 * Defines parent-child relationships for cascade operations
 * @constant {Object}
 */
const CASCADE_RELATIONSHIPS = {
  [MODEL_NAMES.ORGANIZATION]: [
    { model: MODEL_NAMES.DEPARTMENT, field: "organization" },
    { model: MODEL_NAMES.USER, field: "organization" },
    { model: MODEL_NAMES.TASK, field: "organization" },
    { model: MODEL_NAMES.MATERIAL, field: "organization" },
    { model: MODEL_NAMES.VENDOR, field: "organization" },
  ],
  [MODEL_NAMES.DEPARTMENT]: [
    { model: MODEL_NAMES.USER, field: "department" },
    { model: MODEL_NAMES.TASK, field: "department" },
  ],
  [MODEL_NAMES.TASK]: [
    { model: MODEL_NAMES.TASK_COMMENT, field: "task" },
    { model: MODEL_NAMES.TASK_ACTIVITY, field: "task" },
    { model: MODEL_NAMES.ATTACHMENT, field: "task" },
  ],
  [MODEL_NAMES.USER]: [
    { model: MODEL_NAMES.TASK, field: "createdBy" },
    { model: MODEL_NAMES.TASK_COMMENT, field: "createdBy" },
    { model: MODEL_NAMES.TASK_ACTIVITY, field: "createdBy" },
  ],
};

/**
 * Validate cascade operation parameters
 * @param {string} modelName - Name of the model
 * @param {mongoose.Types.ObjectId} documentId - Document ID
 * @throws {Error} If parameters are invalid
 */
const validateCascadeParams = (modelName, documentId) => {
  if (!modelName || typeof modelName !== "string") {
    throw new Error("Invalid model name provided for cascade operation");
  }

  if (!documentId) {
    throw new Error("Invalid document ID provided for cascade operation");
  }

  // Validate that model exists
  try {
    mongoose.model(modelName);
  } catch (error) {
    throw new Error(`Model '${modelName}' not found: ${error.message}`);
  }
};

/**
 * Cascade soft delete operation
 * Recursively soft deletes all child resources within a MongoDB transaction
 *
 * @param {string} modelName - Name of the parent model
 * @param {mongoose.Types.ObjectId} documentId - ID of the parent document
 * @param {mongoose.ClientSession} session - MongoDB session for transaction
 * @param {mongoose.Types.ObjectId} deletedBy - User ID who initiated the deletion
 * @param {number} depth - Current recursion depth
 * @returns {Promise<void>}
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9, 3.10
 */
export const cascadeDelete = async (
  modelName,
  documentId,
  session,
  deletedBy = null,
  depth = 0
) => {
  try {
    // Validate parameters
    validateCascadeParams(modelName, documentId);

    // Prevent stack overflow (Requirement 3.8)
    if (depth >= MAX_CASCADE_DEPTH) {
      logger.warn("Maximum cascade depth reached", {
        modelName,
        documentId,
        depth,
        maxDepth: MAX_CASCADE_DEPTH,
      });
      return;
    }

    // Handle circular dependencies (Requirement 3.9)
    const documentKey = `${modelName}:${documentId}`;
    if (visitedDocuments.has(documentKey)) {
      logger.debug("Document already visited (circular dependency)", {
        modelName,
        documentId,
        depth,
      });
      return;
    }
    visitedDocuments.add(documentKey);

    // Get the model
    const Model = mongoose.model(modelName);

    // Find the parent document
    const parentDocument = await Model.findById(documentId).session(session);
    if (!parentDocument) {
      logger.warn("Parent document not found for cascade delete", {
        modelName,
        documentId,
        depth,
      });
      return;
    }

    // Soft delete the parent with session support
    await parentDocument.softDelete(deletedBy, session);

    // Log cascade operation (Requirement 3.10)
    logger.info("Cascade delete operation", {
      operation: "delete",
      modelName,
      documentId,
      depth,
      deletedBy,
    });

    // Get cascade relationships for this model
    const relationships = CASCADE_RELATIONSHIPS[modelName] || [];

    // Recursively soft delete child resources
    for (const relationship of relationships) {
      try {
        const ChildModel = mongoose.model(relationship.model);

        // Find all child documents
        const childDocuments = await ChildModel.find({
          [relationship.field]: documentId,
        })
          .session(session)
          .withDeleted();

        // Skip if no children found
        if (childDocuments.length === 0) {
          logger.debug("No child documents found", {
            parentModel: modelName,
            childModel: relationship.model,
            field: relationship.field,
            depth,
          });
          continue;
        }

        // Recursively cascade delete each child
        for (const childDocument of childDocuments) {
          await cascadeDelete(
            relationship.model,
            childDocument._id,
            session,
            deletedBy,
            depth + 1
          );
        }

        logger.info("Cascade deleted child resources", {
          parentModel: modelName,
          childModel: relationship.model,
          field: relationship.field,
          count: childDocuments.length,
          depth,
        });
      } catch (error) {
        logger.error("Error cascade deleting child resources", {
          parentModel: modelName,
          childModel: relationship.model,
          field: relationship.field,
          depth,
          error: error.message,
          stack: error.stack,
        });
        throw error; // Propagate error to trigger transaction rollback (Requirement 3.5)
      }
    }
  } catch (error) {
    logger.error("Error in cascade delete operation", {
      modelName,
      documentId,
      depth,
      error: error.message,
      stack: error.stack,
    });
    throw error; // Propagate error to trigger transaction rollback (Requirement 3.5)
  }
};

/**
 * Cascade restore operation
 * Recursively restores all child resources within a MongoDB transaction
 * Validates parent existence before restore
 *
 * @param {string} modelName - Name of the parent model
 * @param {mongoose.Types.ObjectId} documentId - ID of the parent document
 * @param {mongoose.ClientSession} session - MongoDB session for transaction
 * @param {number} depth - Current recursion depth
 * @returns {Promise<void>}
 *
 * Requirements: 3.6, 3.7, 3.8, 3.9, 3.10
 */
export const cascadeRestore = async (
  modelName,
  documentId,
  session,
  depth = 0
) => {
  try {
    // Validate parameters
    validateCascadeParams(modelName, documentId);

    // Prevent stack overflow (Requirement 3.8)
    if (depth >= MAX_CASCADE_DEPTH) {
      logger.warn("Maximum cascade depth reached", {
        modelName,
        documentId,
        depth,
        maxDepth: MAX_CASCADE_DEPTH,
      });
      return;
    }

    // Handle circular dependencies (Requirement 3.9)
    const documentKey = `${modelName}:${documentId}`;
    if (visitedDocuments.has(documentKey)) {
      logger.debug("Document already visited (circular dependency)", {
        modelName,
        documentId,
        depth,
      });
      return;
    }
    visitedDocuments.add(documentKey);

    // Get the model
    const Model = mongoose.model(modelName);

    // Find the document (including soft-deleted)
    const parentDocument = await Model.findById(documentId)
      .session(session)
      .withDeleted();

    if (!parentDocument) {
      logger.warn("Parent document not found for cascade restore", {
        modelName,
        documentId,
        depth,
      });
      return;
    }

    // Validate parent resource existence before restore (Requirement 3.6, 3.7)
    const deletedParentInfo = await hasDeletedParent(
      modelName,
      parentDocument,
      session
    );
    if (deletedParentInfo.hasDeletedParent) {
      const error = new Error(
        `Cannot restore ${modelName} because parent resource '${deletedParentInfo.parentType}' is soft-deleted`
      );
      logger.error("Cascade restore validation failed", {
        modelName,
        documentId,
        parentType: deletedParentInfo.parentType,
        parentId: deletedParentInfo.parentId,
        reason: "Parent resource is soft-deleted",
        depth,
      });
      throw error; // Fail restoration if parent is soft-deleted (Requirement 3.7)
    }

    // Restore the parent document with session support
    await parentDocument.restore(session);

    // Log cascade operation (Requirement 3.10)
    logger.info("Cascade restore operation", {
      operation: "restore",
      modelName,
      documentId,
      depth,
    });

    // Get cascade relationships for this model
    const relationships = CASCADE_RELATIONSHIPS[modelName] || [];

    // Recursively restore child resources
    for (const relationship of relationships) {
      try {
        const ChildModel = mongoose.model(relationship.model);

        // Find all child documents (including soft-deleted)
        const childDocuments = await ChildModel.find({
          [relationship.field]: documentId,
        })
          .session(session)
          .withDeleted();

        // Skip if no children found
        if (childDocuments.length === 0) {
          logger.debug("No child documents found", {
            parentModel: modelName,
            childModel: relationship.model,
            field: relationship.field,
            depth,
          });
          continue;
        }

        // Recursively cascade restore each child
        for (const childDocument of childDocuments) {
          await cascadeRestore(
            relationship.model,
            childDocument._id,
            session,
            depth + 1
          );
        }

        logger.info("Cascade restored child resources", {
          parentModel: modelName,
          childModel: relationship.model,
          field: relationship.field,
          count: childDocuments.length,
          depth,
        });
      } catch (error) {
        logger.error("Error cascade restoring child resources", {
          parentModel: modelName,
          childModel: relationship.model,
          field: relationship.field,
          depth,
          error: error.message,
          stack: error.stack,
        });
        throw error; // Propagate error to trigger transaction rollback
      }
    }
  } catch (error) {
    logger.error("Error in cascade restore operation", {
      modelName,
      documentId,
      depth,
      error: error.message,
      stack: error.stack,
    });
    throw error; // Propagate error to trigger transaction rollback
  }
};

/**
 * Check if a document has a soft-deleted parent
 * Used to validate restore operations
 *
 * @param {string} modelName - Name of the model
 * @param {mongoose.Document} document - Document to check
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<{hasDeletedParent: boolean, parentType: string|null, parentId: string|null}>}
 *
 * Requirements: 3.6, 3.7
 */
const hasDeletedParent = async (modelName, document, session) => {
  try {
    // Iterate through all possible parent fields
    for (const [fieldName, parentModelName] of Object.entries(
      PARENT_FIELD_MAPPINGS
    )) {
      // Check if document has this parent field
      if (document[fieldName]) {
        const ParentModel = mongoose.model(parentModelName);
        const parentDocument = await ParentModel.findById(document[fieldName])
          .session(session)
          .withDeleted();

        // If parent exists and is deleted, return true with details
        if (parentDocument && parentDocument.isDeleted) {
          logger.debug("Found deleted parent", {
            modelName,
            documentId: document._id,
            parentType: parentModelName,
            parentId: parentDocument._id,
            parentField: fieldName,
          });

          return {
            hasDeletedParent: true,
            parentType: parentModelName,
            parentId: parentDocument._id.toString(),
          };
        }
      }
    }

    // No deleted parent found
    return {
      hasDeletedParent: false,
      parentType: null,
      parentId: null,
    };
  } catch (error) {
    logger.error("Error checking for deleted parent", {
      modelName,
      documentId: document._id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Execute cascade delete with transaction
 * Wrapper function that manages MongoDB transaction
 *
 * @param {string} modelName - Name of the parent model
 * @param {mongoose.Types.ObjectId} documentId - ID of the parent document
 * @param {mongoose.Types.ObjectId} deletedBy - User ID who initiated the deletion
 * @returns {Promise<void>}
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export const executeCascadeDelete = async (
  modelName,
  documentId,
  deletedBy = null
) => {
  // Validate parameters before starting transaction
  validateCascadeParams(modelName, documentId);

  const session = await mongoose.startSession();
  session.startTransaction();

  const startTime = Date.now();

  try {
    // Clear visited documents set for this operation
    visitedDocuments.clear();

    logger.info("Starting cascade delete transaction", {
      modelName,
      documentId,
      deletedBy,
    });

    // Execute cascade delete
    await cascadeDelete(modelName, documentId, session, deletedBy, 0);

    // Commit transaction (Requirement 3.5)
    await session.commitTransaction();

    const duration = Date.now() - startTime;

    logger.info("Cascade delete transaction committed", {
      modelName,
      documentId,
      deletedBy,
      duration: `${duration}ms`,
      visitedCount: visitedDocuments.size,
    });
  } catch (error) {
    // Rollback transaction on error (Requirement 3.5)
    await session.abortTransaction();

    const duration = Date.now() - startTime;

    logger.error("Cascade delete transaction aborted", {
      modelName,
      documentId,
      deletedBy,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    await session.endSession();
    visitedDocuments.clear();
  }
};

/**
 * Execute cascade restore with transaction
 * Wrapper function that manages MongoDB transaction
 *
 * @param {string} modelName - Name of the parent model
 * @param {mongoose.Types.ObjectId} documentId - ID of the parent document
 * @returns {Promise<void>}
 *
 * Requirements: 3.6, 3.7
 */
export const executeCascadeRestore = async (modelName, documentId) => {
  // Validate parameters before starting transaction
  validateCascadeParams(modelName, documentId);

  const session = await mongoose.startSession();
  session.startTransaction();

  const startTime = Date.now();

  try {
    // Clear visited documents set for this operation
    visitedDocuments.clear();

    logger.info("Starting cascade restore transaction", {
      modelName,
      documentId,
    });

    // Execute cascade restore
    await cascadeRestore(modelName, documentId, session, 0);

    // Commit transaction
    await session.commitTransaction();

    const duration = Date.now() - startTime;

    logger.info("Cascade restore transaction committed", {
      modelName,
      documentId,
      duration: `${duration}ms`,
      visitedCount: visitedDocuments.size,
    });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();

    const duration = Date.now() - startTime;

    logger.error("Cascade restore transaction aborted", {
      modelName,
      documentId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    await session.endSession();
    visitedDocuments.clear();
  }
};

export default {
  cascadeDelete,
  cascadeRestore,
  executeCascadeDelete,
  executeCascadeRestore,
  MODEL_NAMES, // Export for use in controllers
};
