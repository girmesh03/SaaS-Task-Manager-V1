/**
 * Model Helper Utilities
 * Reusable validation and helper functions for Mongoose models
 */

import mongoose from "mongoose";

/**
 * Validate that all materials belong to the same organization and department
 * @param {Array} materials - Array of material objects with material reference
 * @param {ObjectId} organizationId - Organization ID to validate against
 * @param {ObjectId} departmentId - Department ID to validate against
 * @param {ClientSession} session - MongoDB session for transaction support
 * @throws {Error} If materials don't belong to the same org/dept
 */
export async function validateMaterialsScope(
  materials,
  organizationId,
  departmentId,
  session = null
) {
  if (!materials || materials.length === 0) {
    return;
  }

  const Material = mongoose.model("Material");
  const materialIds = materials.map((m) => m.material);

  const foundMaterials = await Material.find({
    _id: { $in: materialIds },
  }).session(session);

  // Check if all materials were found
  if (foundMaterials.length !== materialIds.length) {
    throw new Error("One or more materials not found");
  }

  // Validate all materials belong to same organization and department
  const invalidMaterials = foundMaterials.filter(
    (material) =>
      material.organization.toString() !== organizationId.toString() ||
      material.department.toString() !== departmentId.toString()
  );

  if (invalidMaterials.length > 0) {
    throw new Error(
      "All materials must belong to the same organization and department"
    );
  }
}

/**
 * Validate that all users belong to the same organization
 * @param {Array} userIds - Array of user IDs
 * @param {ObjectId} organizationId - Organization ID to validate against
 * @param {ClientSession} session - MongoDB session for transaction support
 * @throws {Error} If users don't belong to the same organization
 */
export async function validateUsersScope(
  userIds,
  organizationId,
  session = null
) {
  if (!userIds || userIds.length === 0) {
    return;
  }

  const User = mongoose.model("User");
  const users = await User.find({
    _id: { $in: userIds },
  }).session(session);

  // Check if all users were found
  if (users.length !== userIds.length) {
    throw new Error("One or more users not found");
  }

  // Validate all users belong to same organization
  const invalidUsers = users.filter(
    (user) => user.organization.toString() !== organizationId.toString()
  );

  if (invalidUsers.length > 0) {
    throw new Error("All users must belong to the same organization");
  }
}

export default {
  validateMaterialsScope,
  validateUsersScope,
};
