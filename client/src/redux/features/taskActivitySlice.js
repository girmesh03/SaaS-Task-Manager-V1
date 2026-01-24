import { baseApi } from "./api/baseApi";

/**
 * Task Activity Slice
 * RTK Query endpoints for task activity management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const taskActivityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all task activities with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {string} params.taskId - Task ID (required)
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.activityType - Filter by activity type
     * @param {string} params.createdBy - Filter by creator user ID
     * @param {boolean} params.deleted - Include deleted activities
     * @returns {Object} Paginated task activities list
     */
    getTaskActivities: builder.query({
      query: ({ taskId, ...params }) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.activityType)
          queryParams.append("activityType", params.activityType);
        if (params.createdBy) queryParams.append("createdBy", params.createdBy);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/tasks/${taskId}/activities?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result, error, { taskId }) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "TaskActivity",
                id: _id,
              })),
              { type: "TaskActivity", id: `TASK-${taskId}` },
              { type: "TaskActivity", id: "LIST" },
            ]
          : [
              { type: "TaskActivity", id: `TASK-${taskId}` },
              { type: "TaskActivity", id: "LIST" },
            ],
    }),

    /**
     * Get task activity by ID
     * @param {Object} params - Parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.activityId - Activity ID
     * @returns {Object} Task activity data
     */
    getTaskActivity: builder.query({
      query: ({ taskId, activityId }) => ({
        url: `/tasks/${taskId}/activities/${activityId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { activityId }) => [
        { type: "TaskActivity", id: activityId },
      ],
    }),

    /**
     * Create new task activity
     * @param {Object} data - Activity data
     * @param {string} data.taskId - Task ID
     * @param {string} data.activityType - Activity type
     * @param {string} data.activity - Activity description
     * @param {Array} data.materials - Materials array
     * @param {Array} data.attachments - Attachments array
     * @returns {Object} Created task activity
     */
    createTaskActivity: builder.mutation({
      query: ({ taskId, ...data }) => ({
        url: `/tasks/${taskId}/activities`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "TaskActivity", id: `TASK-${taskId}` },
        { type: "TaskActivity", id: "LIST" },
        { type: "Task", id: taskId },
      ],
    }),

    /**
     * Update task activity
     * @param {Object} data - Update data
     * @param {string} data.taskId - Task ID
     * @param {string} data.activityId - Activity ID
     * @param {Object} data.updates - Activity updates
     * @returns {Object} Updated task activity
     */
    updateTaskActivity: builder.mutation({
      query: ({ taskId, activityId, ...updates }) => ({
        url: `/tasks/${taskId}/activities/${activityId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { taskId, activityId }) => [
        { type: "TaskActivity", id: activityId },
        { type: "TaskActivity", id: `TASK-${taskId}` },
        { type: "TaskActivity", id: "LIST" },
        { type: "Task", id: taskId },
      ],
    }),

    /**
     * Soft delete task activity
     * @param {Object} params - Parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.activityId - Activity ID
     * @returns {Object} Success message
     */
    deleteTaskActivity: builder.mutation({
      query: ({ taskId, activityId }) => ({
        url: `/tasks/${taskId}/activities/${activityId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskId, activityId }) => [
        { type: "TaskActivity", id: activityId },
        { type: "TaskActivity", id: `TASK-${taskId}` },
        { type: "TaskActivity", id: "LIST" },
        { type: "Task", id: taskId },
      ],
    }),

    /**
     * Restore soft-deleted task activity
     * @param {Object} params - Parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.activityId - Activity ID
     * @returns {Object} Restored task activity
     */
    restoreTaskActivity: builder.mutation({
      query: ({ taskId, activityId }) => ({
        url: `/tasks/${taskId}/activities/${activityId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, { taskId, activityId }) => [
        { type: "TaskActivity", id: activityId },
        { type: "TaskActivity", id: `TASK-${taskId}` },
        { type: "TaskActivity", id: "LIST" },
        { type: "Task", id: taskId },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTaskActivitiesQuery,
  useGetTaskActivityQuery,
  useCreateTaskActivityMutation,
  useUpdateTaskActivityMutation,
  useDeleteTaskActivityMutation,
  useRestoreTaskActivityMutation,
} = taskActivityApi;
