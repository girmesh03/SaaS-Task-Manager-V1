import { baseApi } from "./api/baseApi";

/**
 * Notification Slice
 * RTK Query endpoints for notification management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all notifications with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.type - Filter by notification type
     * @param {boolean} params.isRead - Filter by read status
     * @param {string} params.recipient - Filter by recipient user ID
     * @param {string} params.organization - Filter by organization ID
     * @param {string} params.department - Filter by department ID
     * @param {string} params.entityModel - Filter by entity model type
     * @param {boolean} params.deleted - Include deleted notifications
     * @returns {Object} Paginated notifications list
     */
    getNotifications: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.type) queryParams.append("type", params.type);
        if (params.isRead !== undefined)
          queryParams.append("isRead", params.isRead);
        if (params.recipient) queryParams.append("recipient", params.recipient);
        if (params.organization)
          queryParams.append("organization", params.organization);
        if (params.department)
          queryParams.append("department", params.department);
        if (params.entityModel)
          queryParams.append("entityModel", params.entityModel);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/notifications?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "Notification",
                id: _id,
              })),
              { type: "Notification", id: "LIST" },
            ]
          : [{ type: "Notification", id: "LIST" }],
    }),

    /**
     * Get notification by ID
     * @param {string} notificationId - Notification ID
     * @returns {Object} Notification data
     */
    getNotification: builder.query({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, notificationId) => [
        { type: "Notification", id: notificationId },
      ],
    }),

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     * @returns {Object} Updated notification
     */
    markAsRead: builder.mutation({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        { type: "Notification", id: notificationId },
        { type: "Notification", id: "LIST" },
      ],
    }),

    /**
     * Batch mark notifications as read
     * @param {Array<string>} notificationIds - Array of notification IDs
     * @returns {Object} Success message
     */
    batchMarkAsRead: builder.mutation({
      query: (notificationIds) => ({
        url: "/notifications/batch-read",
        method: "PUT",
        body: { notificationIds },
      }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),

    /**
     * Soft delete notification
     * @param {string} notificationId - Notification ID
     * @returns {Object} Success message
     */
    deleteNotification: builder.mutation({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        { type: "Notification", id: notificationId },
        { type: "Notification", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetNotificationsQuery,
  useGetNotificationQuery,
  useMarkAsReadMutation,
  useBatchMarkAsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;
