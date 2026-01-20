import logger from "../../utils/logger.js";

/**
 * Universal Soft Delete Plugin for Mongoose Models
 *
 * This plugin adds soft delete functionality to all models:
 * - Adds isDeleted, deletedAt, deletedBy fields
 * - Overrides native delete methods to throw errors
 * - Implements instance methods: softDelete(), restore()
 * - Implements static methods: softDeleteById(), softDeleteMany(), restoreById(), restoreMany()
 * - Implements query helpers: withDeleted(), onlyDeleted()
 * - Automatically filters soft-deleted documents in queries
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12
 */

/**
 * Helper function to throw consistent delete errors
 * @param {string} methodName - Name of the method that was called
 * @param {string} suggestedMethod - Suggested alternative method
 */
const throwDeleteError = (methodName, suggestedMethod) => {
  throw new Error(
    `Direct deletion is not allowed. Use ${suggestedMethod} method instead. (Called: ${methodName})`
  );
};

/**
 * Helper to build query with optional session support
 * @param {Query} query - Mongoose query
 * @param {ClientSession|null} session - Optional MongoDB session
 * @returns {Query} Query with session if provided
 */
const withSession = (query, session) => {
  return session ? query.session(session) : query;
};

/**
 * Soft Delete Plugin
 * @param {mongoose.Schema} schema - Mongoose schema to apply plugin to
 * @param {Object} options - Plugin options
 * @param {boolean} options.indexDeleted - Whether to index isDeleted field (default: true)
 * @param {boolean} options.overrideNativeMethods - Whether to override native delete methods (default: true)
 * @param {Array<Object>} options.compoundIndexes - Additional compound indexes with isDeleted
 */
const softDeletePlugin = (schema, options = {}) => {
  const {
    indexDeleted = true,
    overrideNativeMethods = true,
    compoundIndexes = [],
  } = options;

  // Add soft delete fields to schema (Requirement 2.1)
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: indexDeleted, // Create index for performance (Requirement 2.2)
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: schema.constructor.Types.ObjectId,
      ref: "User",
      default: null,
    },
  });

  // Add compound indexes if specified
  compoundIndexes.forEach((fields) => {
    schema.index({ isDeleted: 1, ...fields });
  });

  // Override native Mongoose delete methods to throw errors (Requirement 2.3)
  if (overrideNativeMethods) {
    // Use schema.method() with suppressWarning option for 'remove' to avoid Mongoose internal warning
    schema.method(
      "remove",
      function () {
        throwDeleteError("remove", "softDelete()");
      },
      { suppressWarning: true }
    );

    schema.methods.deleteOne = function () {
      throwDeleteError("deleteOne", "softDelete()");
    };

    schema.statics.deleteOne = function () {
      throwDeleteError("deleteOne", "softDeleteById() or softDeleteMany()");
    };

    schema.statics.deleteMany = function () {
      throwDeleteError("deleteMany", "softDeleteMany()");
    };

    schema.statics.findByIdAndDelete = function () {
      throwDeleteError("findByIdAndDelete", "softDeleteById()");
    };

    schema.statics.findOneAndDelete = function () {
      throwDeleteError("findOneAndDelete", "softDeleteById()");
    };

    schema.statics.findByIdAndRemove = function () {
      throwDeleteError("findByIdAndRemove", "softDeleteById()");
    };

    schema.statics.findOneAndRemove = function () {
      throwDeleteError("findOneAndRemove", "softDeleteById()");
    };
  }

  // Instance method: softDelete() (Requirement 2.5, 2.6)
  schema.methods.softDelete = async function (
    deletedBy = null,
    session = null
  ) {
    try {
      this.isDeleted = true;
      this.deletedAt = new Date();
      if (deletedBy) {
        this.deletedBy = deletedBy;
      }

      // Support transactions - only pass session if provided
      const saveOptions = session ? { session } : {};
      await this.save(saveOptions);

      logger.info("Document soft deleted", {
        model: this.constructor.modelName,
        id: this._id,
        deletedBy,
        inTransaction: !!session,
      });

      return this;
    } catch (error) {
      logger.error("Error soft deleting document", {
        model: this.constructor.modelName,
        id: this._id,
        error: error.message,
      });
      throw error;
    }
  };

  // Instance method: restore() (Requirement 2.7)
  schema.methods.restore = async function (session = null) {
    try {
      this.isDeleted = false;
      this.deletedAt = null;
      this.deletedBy = null;

      // Support transactions - only pass session if provided
      const saveOptions = session ? { session } : {};
      await this.save(saveOptions);

      logger.info("Document restored", {
        model: this.constructor.modelName,
        id: this._id,
        inTransaction: !!session,
      });

      return this;
    } catch (error) {
      logger.error("Error restoring document", {
        model: this.constructor.modelName,
        id: this._id,
        error: error.message,
      });
      throw error;
    }
  };

  /**
   * Soft delete a document by ID
   * @param {string|ObjectId} id - Document ID
   * @param {string|ObjectId|null} deletedBy - User ID who deleted the document
   * @param {ClientSession|null} session - MongoDB session for transactions
   * @returns {Promise<Document>} The soft-deleted document
   * @throws {Error} If document not found
   */
  schema.statics.softDeleteById = async function (
    id,
    deletedBy = null,
    session = null
  ) {
    try {
      const document = await withSession(this.findById(id), session);

      if (!document) {
        throw new Error(`Document with id ${id} not found`);
      }

      return await document.softDelete(deletedBy, session);
    } catch (error) {
      logger.error("Error soft deleting document by ID", {
        model: this.modelName,
        id,
        error: error.message,
      });
      throw error;
    }
  };

  /**
   * Soft delete multiple documents matching filter
   * @param {Object} filter - MongoDB filter query
   * @param {string|ObjectId|null} deletedBy - User ID who deleted the documents
   * @param {ClientSession|null} session - MongoDB session for transactions
   * @returns {Promise<{matchedCount: number, modifiedCount: number}>} Update result
   */
  schema.statics.softDeleteMany = async function (
    filter,
    deletedBy = null,
    session = null
  ) {
    try {
      const updateData = {
        isDeleted: true,
        deletedAt: new Date(),
      };
      if (deletedBy) {
        updateData.deletedBy = deletedBy;
      }

      const result = await withSession(
        this.updateMany(filter, updateData),
        session
      );

      // Log based on result instead of pre-checking
      if (result.matchedCount === 0) {
        logger.warn("No documents found for soft delete", {
          model: this.modelName,
          filter,
        });
      } else {
        logger.info("Documents soft deleted", {
          model: this.modelName,
          filter,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          deletedBy,
          inTransaction: !!session,
        });
      }

      return result;
    } catch (error) {
      logger.error("Error soft deleting multiple documents", {
        model: this.modelName,
        filter,
        error: error.message,
      });
      throw error;
    }
  };

  /**
   * Restore a soft-deleted document by ID
   * @param {string|ObjectId} id - Document ID
   * @param {ClientSession|null} session - MongoDB session for transactions
   * @returns {Promise<Document>} The restored document
   * @throws {Error} If document not found
   */
  schema.statics.restoreById = async function (id, session = null) {
    try {
      const document = await withSession(
        this.findById(id).withDeleted(),
        session
      );

      if (!document) {
        throw new Error(`Document with id ${id} not found`);
      }

      return await document.restore(session);
    } catch (error) {
      logger.error("Error restoring document by ID", {
        model: this.modelName,
        id,
        error: error.message,
      });
      throw error;
    }
  };

  /**
   * Restore multiple soft-deleted documents matching filter
   * @param {Object} filter - MongoDB filter query
   * @param {ClientSession|null} session - MongoDB session for transactions
   * @returns {Promise<{matchedCount: number, modifiedCount: number}>} Update result
   */
  schema.statics.restoreMany = async function (filter, session = null) {
    try {
      const result = await withSession(
        this.updateMany(filter, {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        }).setOptions({ withDeleted: true }),
        session
      );

      // Log based on result instead of pre-checking
      if (result.matchedCount === 0) {
        logger.warn("No documents found for restore", {
          model: this.modelName,
          filter,
        });
      } else {
        logger.info("Documents restored", {
          model: this.modelName,
          filter,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          inTransaction: !!session,
        });
      }

      return result;
    } catch (error) {
      logger.error("Error restoring multiple documents", {
        model: this.modelName,
        filter,
        error: error.message,
      });
      throw error;
    }
  };

  // Query helper: withDeleted() (Requirement 2.8)
  schema.query.withDeleted = function () {
    // Set option flag to include soft-deleted documents
    return this.setOptions({ withDeleted: true });
  };

  // Query helper: onlyDeleted() (Requirement 2.9)
  schema.query.onlyDeleted = function () {
    // Set option flag and filter for only soft-deleted documents
    return this.setOptions({ onlyDeleted: true }).where({ isDeleted: true });
  };

  // Automatically filter soft-deleted documents in queries (Requirement 2.4)
  // This middleware runs before find, findOne, findOneAndUpdate, updateOne, updateMany, replaceOne, count, countDocuments
  // Note: findById uses findOne internally, so it's covered by the findOne hook
  const excludeDeletedMiddleware = function (next) {
    // Only apply filter if withDeleted() or onlyDeleted() was not called
    if (!this.getOptions().withDeleted && !this.getOptions().onlyDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
    next();
  };

  // Query hooks to apply soft delete filtering
  const QUERY_HOOKS = [
    "find",
    "findOne",
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
    "replaceOne",
    "count",
    "countDocuments",
  ];

  QUERY_HOOKS.forEach((hook) => {
    schema.pre(hook, excludeDeletedMiddleware);
  });

  // Handle aggregate pipeline to filter isDeleted documents (Requirement 2.12)
  schema.pre("aggregate", function (next) {
    // Check if options specify to include deleted documents
    const options = this.options || {};

    // Only add filter if withDeleted is not explicitly set
    if (!options.withDeleted) {
      // Always add isDeleted filter at the beginning
      // MongoDB will optimize multiple $match stages automatically
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
    next();
  });
};

export default softDeletePlugin;
