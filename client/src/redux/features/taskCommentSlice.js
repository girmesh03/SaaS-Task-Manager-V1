import { baseApi } from "./api/baseApi";

/**
 * Task Comment Slice
 * RTK Query endpoints for task comment management operations
 * Provides cache tags for automatic invalidation
 *
 * Requirements: 24.3, 24.4
 */

export const taskCommentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all task comments with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.parent - Filter by parent ID (task/activity/comment)
     * @param {string} params.parentModel - Filter by parent model type
     * @param {string} params.createdBy - Filter by creator user ID
     * @param {boolean} params.deleted - Include deleted comments
     * @returns {Object} Paginated task comments list
     */
    getTaskComments: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.parent) queryParams.append("parent", params.parent);
        if (params.parentModel)
          queryParams.append("parentModel", params.parentModel);
        if (params.createdBy) queryParams.append("createdBy", params.createdBy);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/tasks/comments?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({
                type: "TaskComment",
                id: _id,
              })),
              { type: "TaskComment", id: "LIST" },
            ]
          : [{ type: "TaskComment", id: "LIST" }],
    }),

    /**
     * Get task comment by ID
     * @param {Object} params - Parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.taskCommentId - Comment ID
     * @returns {Object} Task comment data
     */
    getTaskComment: builder.query({
      query: ({ taskId, taskCommentId }) => ({
        url: `/tasks/${taskId}/comments/${taskCommentId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { taskCommentId }) => [
        { type: "TaskComment", id: taskCommentId },
      ],
    }),

    /**
     * Create new task comment
     * @param {Object} data - Comment data
     * @param {string} data.comment - Comment text
     * @param {string} data.parent - Parent ID (task/activity/comment)
     * @param {string} data.parentModel - Parent model type
     * @param {Array} data.mentions - Mentioned user IDs
     * @returns {Object} Created task comment
     */
    createTaskComment: builder.mutation({
      query: (data) => ({
        url: "/tasks/comments",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { parent }) => [
        { type: "TaskComment", id: "LIST" },
        { type: "TaskComment", id: `PARENT-${parent}` },
      ],
    }),

    /**
     * Update task comment
     * @param {Object} data - Update data
     * @param {string} data.taskId - Task ID
     * @param {string} data.taskCommentId - Comment ID
     * @param {Object} data.updates - Comment updates
     * @returns {Object} Updated task comment
     */
    updateTaskComment: builder.mutation({
      query: ({ taskId, taskCommentId, ...updates }) => ({
        url: `/tasks/${taskId}/comments/${taskCommentId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { taskCommentId }) => [
        { type: "TaskComment", id: taskCommentId },
        { type: "TaskComment", id: "LIST" },
      ],
    }),

    /**
     * Soft delete task comment with cascade operations
     * @param {Object} params - Parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.taskCommentId - Comment ID
     * @returns {Object} Success message
     */
    deleteTaskComment: builder.mutation({
      query: ({ taskId, taskCommentId }) => ({
        url: `/tasks/${taskId}/comments/${taskCommentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskCommentId }) => [
        { type: "TaskComment", id: taskCommentId },
        { type: "TaskComment", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted task comment with cascade operations
     * @param {Object} params - Parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.taskCommentId - Comment ID
     * @returns {Object} Restored task comment
     */
    restoreTaskComment: builder.mutation({
      query: ({ taskId, taskCommentId }) => ({
        url: `/tasks/${taskId}/comments/${taskCommentId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, { taskCommentId }) => [
        { type: "TaskComment", id: taskCommentId },
        { type: "TaskComment", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTaskCommentsQuery,
  useGetTaskCommentQuery,
  useCreateTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
  useRestoreTaskCommentMutation,
} = taskCommentApi;
