import { baseApi } from "./api/baseApi";

/**
 * Material Slice
 * RTK Query endpoints for material management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const materialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all materials with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.organization - Filter by organization ID
     * @param {string} params.department - Filter by department ID
     * @param {string} params.category - Filter by material category
     * @param {boolean} params.deleted - Include deleted materials
     * @returns {Object} Paginated materials list
     */
    getMaterials: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.organization)
          queryParams.append("organization", params.organization);
        if (params.department)
          queryParams.append("department", params.department);
        if (params.category) queryParams.append("category", params.category);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/materials?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "Material",
                id: _id,
              })),
              { type: "Material", id: "LIST" },
            ]
          : [{ type: "Material", id: "LIST" }],
    }),

    /**
     * Get material by ID
     * @param {string} materialId - Material ID
     * @returns {Object} Material data
     */
    getMaterial: builder.query({
      query: (materialId) => ({
        url: `/materials/${materialId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, materialId) => [
        { type: "Material", id: materialId },
      ],
    }),

    /**
     * Create new material
     * @param {Object} data - Material data
     * @param {string} data.name - Material name
     * @param {string} data.unit - Unit of measurement
     * @param {string} data.category - Material category
     * @param {number} data.price - Material price
     * @param {string} data.organization - Organization ID
     * @param {string} data.department - Department ID
     * @returns {Object} Created material
     */
    createMaterial: builder.mutation({
      query: (data) => ({
        url: "/materials",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Material", id: "LIST" }],
    }),

    /**
     * Update material
     * @param {Object} data - Update data
     * @param {string} data.materialId - Material ID
     * @param {Object} data.updates - Material updates
     * @returns {Object} Updated material
     */
    updateMaterial: builder.mutation({
      query: ({ materialId, ...updates }) => ({
        url: `/materials/${materialId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { materialId }) => [
        { type: "Material", id: materialId },
        { type: "Material", id: "LIST" },
      ],
    }),

    /**
     * Soft delete material with cascade operations
     * @param {string} materialId - Material ID
     * @returns {Object} Success message
     */
    deleteMaterial: builder.mutation({
      query: (materialId) => ({
        url: `/materials/${materialId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, materialId) => [
        { type: "Material", id: materialId },
        { type: "Material", id: "LIST" },
        { type: "Task", id: "LIST" },
        { type: "TaskActivity", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted material with cascade operations
     * @param {string} materialId - Material ID
     * @returns {Object} Restored material
     */
    restoreMaterial: builder.mutation({
      query: (materialId) => ({
        url: `/materials/${materialId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, materialId) => [
        { type: "Material", id: materialId },
        { type: "Material", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetMaterialsQuery,
  useGetMaterialQuery,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
  useRestoreMaterialMutation,
} = materialApi;
