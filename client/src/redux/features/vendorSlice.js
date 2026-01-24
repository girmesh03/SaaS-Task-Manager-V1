import { baseApi } from "./api/baseApi";

/**
 * Vendor Slice
 * RTK Query endpoints for vendor management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const vendorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all vendors with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.organization - Filter by organization ID
     * @param {string} params.status - Filter by vendor status
     * @param {number} params.minRating - Filter by minimum rating
     * @param {number} params.maxRating - Filter by maximum rating
     * @param {boolean} params.deleted - Include deleted vendors
     * @returns {Object} Paginated vendors list
     */
    getVendors: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.organization)
          queryParams.append("organization", params.organization);
        if (params.status) queryParams.append("status", params.status);
        if (params.minRating) queryParams.append("minRating", params.minRating);
        if (params.maxRating) queryParams.append("maxRating", params.maxRating);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/vendors?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "Vendor",
                id: _id,
              })),
              { type: "Vendor", id: "LIST" },
            ]
          : [{ type: "Vendor", id: "LIST" }],
    }),

    /**
     * Get vendor by ID
     * @param {string} vendorId - Vendor ID
     * @returns {Object} Vendor data
     */
    getVendor: builder.query({
      query: (vendorId) => ({
        url: `/vendors/${vendorId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, vendorId) => [
        { type: "Vendor", id: vendorId },
      ],
    }),

    /**
     * Create new vendor
     * @param {Object} data - Vendor data
     * @param {string} data.name - Vendor name
     * @param {string} data.email - Vendor email
     * @param {string} data.phone - Vendor phone
     * @param {string} data.organization - Organization ID
     * @param {number} data.rating - Vendor rating (1-5)
     * @param {string} data.status - Vendor status
     * @param {string} data.address - Vendor address
     * @returns {Object} Created vendor
     */
    createVendor: builder.mutation({
      query: (data) => ({
        url: "/vendors",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Vendor", id: "LIST" }],
    }),

    /**
     * Update vendor
     * @param {Object} data - Update data
     * @param {string} data.vendorId - Vendor ID
     * @param {Object} data.updates - Vendor updates
     * @returns {Object} Updated vendor
     */
    updateVendor: builder.mutation({
      query: ({ vendorId, ...updates }) => ({
        url: `/vendors/${vendorId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { vendorId }) => [
        { type: "Vendor", id: vendorId },
        { type: "Vendor", id: "LIST" },
      ],
    }),

    /**
     * Soft delete vendor with cascade operations
     * @param {string} vendorId - Vendor ID
     * @returns {Object} Success message
     */
    deleteVendor: builder.mutation({
      query: (vendorId) => ({
        url: `/vendors/${vendorId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, vendorId) => [
        { type: "Vendor", id: vendorId },
        { type: "Vendor", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted vendor with cascade operations
     * @param {string} vendorId - Vendor ID
     * @returns {Object} Restored vendor
     */
    restoreVendor: builder.mutation({
      query: (vendorId) => ({
        url: `/vendors/${vendorId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, vendorId) => [
        { type: "Vendor", id: vendorId },
        { type: "Vendor", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetVendorsQuery,
  useGetVendorQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useRestoreVendorMutation,
} = vendorApi;
