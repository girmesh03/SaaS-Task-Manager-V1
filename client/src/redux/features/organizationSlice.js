import { baseApi } from "./api/baseApi";

/**
 * Organization Slice
 * RTK Query endpoints for organization management operations
 * Provides cache tags for automatic invalidation
 *
 * NOTE: Organization creation is NOT done via API route - it's done via register endpoint
 * These endpoints are for Platform SuperAdmin managing customer organizations
 *
 * Requirements: 24.3, 24.4
 */

export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all organizations with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {boolean} params.deleted - Include deleted organizations
     * @returns {Object} Paginated organizations list
     */
    getOrganizations: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/organizations?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "Organization",
                id: _id,
              })),
              { type: "Organization", id: "LIST" },
            ]
          : [{ type: "Organization", id: "LIST" }],
    }),

    /**
     * Get organization by ID
     * @param {string} organizationId - Organization ID
     * @returns {Object} Organization data
     */
    getOrganization: builder.query({
      query: (organizationId) => ({
        url: `/organizations/${organizationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, organizationId) => [
        { type: "Organization", id: organizationId },
      ],
    }),

    /**
     * Update organization
     * @param {Object} data - Update data
     * @param {string} data.organizationId - Organization ID
     * @param {Object} data.updates - Organization updates
     * @returns {Object} Updated organization
     */
    updateOrganization: builder.mutation({
      query: ({ organizationId, ...updates }) => ({
        url: `/organizations/${organizationId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "Organization", id: organizationId },
        { type: "Organization", id: "LIST" },
      ],
    }),

    /**
     * Soft delete organization with cascade operations
     * @param {string} organizationId - Organization ID
     * @returns {Object} Success message
     */
    deleteOrganization: builder.mutation({
      query: (organizationId) => ({
        url: `/organizations/${organizationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, organizationId) => [
        { type: "Organization", id: organizationId },
        { type: "Organization", id: "LIST" },
        { type: "Department", id: "LIST" },
        { type: "User", id: "LIST" },
        { type: "Task", id: "LIST" },
        { type: "Material", id: "LIST" },
        { type: "Vendor", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted organization with cascade operations
     * @param {string} organizationId - Organization ID
     * @returns {Object} Restored organization
     */
    restoreOrganization: builder.mutation({
      query: (organizationId) => ({
        url: `/organizations/${organizationId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, organizationId) => [
        { type: "Organization", id: organizationId },
        { type: "Organization", id: "LIST" },
        { type: "Department", id: "LIST" },
        { type: "User", id: "LIST" },
        { type: "Task", id: "LIST" },
        { type: "Material", id: "LIST" },
        { type: "Vendor", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetOrganizationsQuery,
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useRestoreOrganizationMutation,
} = organizationApi;
