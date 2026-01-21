import { ProjectTask, RoutineTask, AssignedTask } from "../models/index.js";
import { TASK_TYPES } from "./constants.js";
import CustomError from "../errorHandler/CustomError.js";
import { HTTP_STATUS, ERROR_CODES } from "./constants.js";

/**
 * Task Type Registry
 * Maps task types to their corresponding Mongoose models
 * Uses strategy pattern for extensibility
 */

/**
 * Registry mapping task types to models
 * @constant
 */
const TASK_MODEL_REGISTRY = {
  [TASK_TYPES.PROJECT]: ProjectTask,
  [TASK_TYPES.ROUTINE]: RoutineTask,
  [TASK_TYPES.ASSIGNED]: AssignedTask,
};

/**
 * Get task model based on task type
 * @param {string} taskType - Task type from TASK_TYPES
 * @returns {import('mongoose').Model} Task model
 * @throws {CustomError} If invalid task type
 */
export const getTaskModel = (taskType) => {
  const Model = TASK_MODEL_REGISTRY[taskType];

  if (!Model) {
    throw new CustomError(
      `Invalid task type: ${taskType}`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  return Model;
};

/**
 * Check if task type is valid
 * @param {string} taskType - Task type to validate
 * @returns {boolean} True if valid task type
 */
export const isValidTaskType = (taskType) => {
  return taskType in TASK_MODEL_REGISTRY;
};

/**
 * Get all registered task types
 * @returns {Array<string>} Array of task type keys
 */
export const getRegisteredTaskTypes = () => {
  return Object.keys(TASK_MODEL_REGISTRY);
};

export default {
  getTaskModel,
  isValidTaskType,
  getRegisteredTaskTypes,
};
