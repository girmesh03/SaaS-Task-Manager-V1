import mongoose from "mongoose";
import Task from "./Task.js";
import {
  RECURRENCE_FREQUENCY,
  RECURRENCE_VALIDATION,
  MATERIAL_VALIDATION,
} from "../utils/constants.js";

/**
 * RoutineTask Model (Discriminator)
 *
 * Repetitive tasks for a given date
 * Materials added DIRECTLY to task (no TaskActivity)
 *
 * Requirements: 10.6
 */

const routineTaskSchema = new mongoose.Schema({
  // Date (Requirement 10.6)
  date: {
    type: Date,
    required: [true, "Date is required for routine tasks"],
  },

  // Recurrence (Requirement 10.6)
  recurrence: {
    frequency: {
      type: String,
      enum: {
        values: Object.values(RECURRENCE_FREQUENCY),
        message: "Invalid recurrence frequency",
      },
      default: null,
    },
    interval: {
      type: Number,
      min: [
        RECURRENCE_VALIDATION.INTERVAL.MIN,
        `Interval must be at least ${RECURRENCE_VALIDATION.INTERVAL.MIN}`,
      ],
      max: [
        RECURRENCE_VALIDATION.INTERVAL.MAX,
        `Interval must not exceed ${RECURRENCE_VALIDATION.INTERVAL.MAX}`,
      ],
      default: 1,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },

  // Materials (array max 20, added DIRECTLY) (Requirement 10.6)
  materials: {
    type: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
          required: [
            true,
            "Material reference is required when adding materials",
          ],
        },
        quantity: {
          type: Number,
          required: [
            true,
            "Material quantity is required when adding materials",
          ],
          min: [
            MATERIAL_VALIDATION.QUANTITY.MIN,
            `Quantity must be at least ${MATERIAL_VALIDATION.QUANTITY.MIN}`,
          ],
        },
        _id: false, // Disable _id for subdocuments
      },
    ],
    validate: [
      {
        validator: function (materials) {
          // Only validate if materials are provided
          if (materials.length === 0) return true;
          return materials.length <= MATERIAL_VALIDATION.QUANTITY.MAX;
        },
        message: `Maximum ${MATERIAL_VALIDATION.QUANTITY.MAX} materials allowed per routine task`,
      },
      {
        validator: function (materials) {
          // Only validate if materials are provided
          if (materials.length === 0) return true;
          // Check for duplicate materials
          const materialIds = materials.map((m) => m.material.toString());
          const uniqueIds = new Set(materialIds);
          return uniqueIds.size === materialIds.length;
        },
        message:
          "Duplicate materials are not allowed. Each material can only be added once.",
      },
      {
        validator: function (materials) {
          // Only validate if materials are provided
          if (materials.length === 0) return true;
          // Validate all quantities are positive
          return materials.every((m) => m.quantity > 0);
        },
        message: "All material quantities must be greater than 0",
      },
    ],
    default: [],
  },
});

// Pre-save middleware to validate recurrence endDate
routineTaskSchema.pre("save", function (next) {
  if (
    this.recurrence &&
    this.recurrence.endDate &&
    this.recurrence.endDate <= this.date
  ) {
    return next(new Error("Recurrence end date must be after task date"));
  }
  next();
});

// Pre-save middleware to validate materials belong to same organization and department
routineTaskSchema.pre("save", async function (next) {
  if (this.isModified("materials") && this.materials.length > 0) {
    try {
      // Import Material model dynamically to avoid circular dependency
      const Material = mongoose.model("Material");

      // Get session from this.$session() if available
      const session = this.$session();

      // Find all materials
      const materialIds = this.materials.map((m) => m.material);
      const materials = await Material.find({
        _id: { $in: materialIds },
      }).session(session);

      // Validate all materials belong to same organization and department
      const invalidMaterials = materials.filter(
        (material) =>
          material.organization.toString() !== this.organization.toString() ||
          material.department.toString() !== this.department.toString()
      );

      if (invalidMaterials.length > 0) {
        return next(
          new Error(
            "All materials must belong to the same organization and department"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Indexes for RoutineTask (within organization and department scope via base Task)
routineTaskSchema.index(
  { date: 1, "recurrence.frequency": 1 },
  {
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

const RoutineTask = Task.discriminator("RoutineTask", routineTaskSchema);

export default RoutineTask;
