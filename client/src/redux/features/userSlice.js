import { baseApi } from "./api/baseApi";

/**
 * User Slice
 * RTK Query endpoints for user management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all users with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.organization - Filter by organization ID
     * @param {string} params.department - Filter by department ID
     * @param {string} params.role - Filter by user role
     * @param {boolean} params.deleted - Include deleted users
     * @returns {Object} Paginated users list
     */
    getUsers: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.organization)
          queryParams.append("organization", params.organization);
        if (params.department)
          queryParams.append("department", params.department);
        if (params.role) queryParams.append("role", params.role);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/users?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({ type: "User", id: _id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Object} User data
     */
    getUser: builder.query({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, userId) => [{ type: "User", id: userId }],
    }),

    /**
     * Create new user
     * @param {Object} data - User data
     * @param {string} data.firstName - User first name
     * @param {string} data.lastName - User last name
     * @param {string} data.email - User email
     * @param {string} data.password - User password
     * @param {string} data.role - User role
     * @param {string} data.organization - Organization ID
     * @param {string} data.department - Department ID
     * @param {boolean} data.isHod - Is head of department
     * @returns {Object} Created user
     */
    createUser: builder.mutation({
      query: (data) => ({
        url: "/users",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    /**
     * Update user
     * @param {Object} data - Update data
     * @param {string} data.userId - User ID
     * @param {Object} data.updates - User updates
     * @returns {Object} Updated user
     */
    updateUser: builder.mutation({
      query: ({ userId, ...updates }) => ({
        url: `/users/${userId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    /**
     * Soft delete user with cascade operations
     * @param {string} userId - User ID
     * @returns {Object} Success message
     */
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, userId) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
        { type: "Task", id: "LIST" },
        { type: "TaskActivity", id: "LIST" },
        { type: "TaskComment", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted user with cascade operations
     * @param {string} userId - User ID
     * @returns {Object} Restored user
     */
    restoreUser: builder.mutation({
      query: (userId) => ({
        url: `/users/${userId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, userId) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
        { type: "Task", id: "LIST" },
        { type: "TaskActivity", id: "LIST" },
        { type: "TaskComment", id: "LIST" },
      ],
    }),

    /**
     * Change user password
     * @param {Object} data - Password data
     * @param {string} data.userId - User ID
     * @param {string} data.currentPassword - Current password
     * @param {string} data.newPassword - New password
     * @returns {Object} Success message
     */
    changePassword: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/users/${userId}/password`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
      ],
    }),

    /**
     * Change user email
     * @param {Object} data - Email data
     * @param {string} data.userId - User ID
     * @param {string} data.email - New email
     * @returns {Object} Success message
     */
    changeEmail: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/users/${userId}/email`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    /**
     * Upload user avatar
     * @param {Object} data - Avatar data
     * @param {string} data.userId - User ID
     * @param {string} data.url - Cloudinary URL
     * @param {string} data.publicId - Cloudinary public ID
     * @returns {Object} Updated user
     */
    uploadAvatar: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/users/${userId}/avatar`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useRestoreUserMutation,
  useChangePasswordMutation,
  useChangeEmailMutation,
  useUploadAvatarMutation,
} = userApi;
