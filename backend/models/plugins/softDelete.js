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
    schema.methods.remove = function () {
      throwDeleteError("remove", "softDelete()");
    };

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

  // Static method: softDeleteById() (Requirement 2.6)
  schema.statics.softDeleteById = async function (
    id,
    deletedBy = null,
    session = null
  ) {
    try {
      let query = this.findById(id);
      if (session) query = query.session(session);

      const document = await query;

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

  // Static method: softDeleteMany() (Requirement 2.10)
  schema.statics.softDeleteMany = async function (
    filter,
    deletedBy = null,
    session = null
  ) {
    try {
      // Check if documents exist
      let countQuery = this.countDocuments(filter);
      if (session) countQuery = countQuery.session(session);

      const count = await countQuery;

      if (count === 0) {
        logger.warn("No documents found for soft delete", {
          model: this.modelName,
          filter,
        });
        return { matchedCount: 0, modifiedCount: 0 };
      }

      const updateData = {
        isDeleted: true,
        deletedAt: new Date(),
      };
      if (deletedBy) {
        updateData.deletedBy = deletedBy;
      }

      let updateQuery = this.updateMany(filter, updateData);
      if (session) updateQuery = updateQuery.session(session);

      const result = await updateQuery;

      logger.info("Documents soft deleted", {
        model: this.modelName,
        filter,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        deletedBy,
        inTransaction: !!session,
      });

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

  // Static method: restoreById() (Requirement 2.7)
  schema.statics.restoreById = async function (id, session = null) {
    try {
      let query = this.findById(id).withDeleted();
      if (session) query = query.session(session);

      const document = await query;

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

  // Static method: restoreMany() (Requirement 2.11)
  schema.statics.restoreMany = async function (filter, session = null) {
    try {
      // Check if documents exist
      let countQuery = this.countDocuments(filter).withDeleted();
      if (session) countQuery = countQuery.session(session);

      const count = await countQuery;

      if (count === 0) {
        logger.warn("No documents found for restore", {
          model: this.modelName,
          filter,
        });
        return { matchedCount: 0, modifiedCount: 0 };
      }

      let updateQuery = this.updateMany(filter, {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      if (session) updateQuery = updateQuery.session(session);

      const result = await updateQuery;

      logger.info("Documents restored", {
        model: this.modelName,
        filter,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        inTransaction: !!session,
      });

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
  // This middleware runs before find, findOne, findOneAndUpdate, count, countDocuments
  const excludeDeletedMiddleware = function (next) {
    // Only apply filter if withDeleted() or onlyDeleted() was not called
    if (!this.getOptions().withDeleted && !this.getOptions().onlyDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
    next();
  };

  schema.pre("find", excludeDeletedMiddleware);
  schema.pre("findOne", excludeDeletedMiddleware);
  schema.pre("findOneAndUpdate", excludeDeletedMiddleware);
  schema.pre("count", excludeDeletedMiddleware);
  schema.pre("countDocuments", excludeDeletedMiddleware);

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
