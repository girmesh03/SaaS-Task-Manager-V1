import { baseApi } from "./api/baseApi";

/**
 * Department Slice
 * RTK Query endpoints for department management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const departmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all departments with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.organization - Filter by organization ID
     * @param {boolean} params.deleted - Include deleted departments
     * @returns {Object} Paginated departments list
     */
    getDepartments: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.organization)
          queryParams.append("organization", params.organization);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/departments?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "Department",
                id: _id,
              })),
              { type: "Department", id: "LIST" },
            ]
          : [{ type: "Department", id: "LIST" }],
    }),

    /**
     * Get department by ID
     * @param {string} departmentId - Department ID
     * @returns {Object} Department data
     */
    getDepartment: builder.query({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, departmentId) => [
        { type: "Department", id: departmentId },
      ],
    }),

    /**
     * Create new department
     * @param {Object} data - Department data
     * @param {string} data.name - Department name
     * @param {string} data.organization - Organization ID
     * @param {string} data.manager - Manager user ID
     * @param {string} data.description - Department description
     * @returns {Object} Created department
     */
    createDepartment: builder.mutation({
      query: (data) => ({
        url: "/departments",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Department", id: "LIST" }],
    }),

    /**
     * Update department
     * @param {Object} data - Update data
     * @param {string} data.departmentId - Department ID
     * @param {Object} data.updates - Department updates
     * @returns {Object} Updated department
     */
    updateDepartment: builder.mutation({
      query: ({ departmentId, ...updates }) => ({
        url: `/departments/${departmentId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: "Department", id: departmentId },
        { type: "Department", id: "LIST" },
      ],
    }),

    /**
     * Soft delete department with cascade operations
     * @param {string} departmentId - Department ID
     * @returns {Object} Success message
     */
    deleteDepartment: builder.mutation({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, departmentId) => [
        { type: "Department", id: departmentId },
        { type: "Department", id: "LIST" },
        { type: "User", id: "LIST" },
        { type: "Task", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted department with cascade operations
     * @param {string} departmentId - Department ID
     * @returns {Object} Restored department
     */
    restoreDepartment: builder.mutation({
      query: (departmentId) => ({
        url: `/departments/${departmentId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, departmentId) => [
        { type: "Department", id: departmentId },
        { type: "Department", id: "LIST" },
        { type: "User", id: "LIST" },
        { type: "Task", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetDepartmentsQuery,
  useGetDepartmentQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useRestoreDepartmentMutation,
} = departmentApi;
