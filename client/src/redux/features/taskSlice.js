import { baseApi } from "./api/baseApi";

/**
 * Task Slice
 * RTK Query endpoints for task management operations (all task types)
 * Provides cache tags for automatic invalidation
 * Manages pagination and filter state
 *
 * Requirements: 24.3, 24.4, 24.9, 24.10
 */

export const taskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all tasks with pagination and filtering
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number (default: 1)
     * @param {number} params.limit - Items per page (default: 10)
     * @param {string} params.search - Search query
     * @param {string} params.organization - Filter by organization ID
     * @param {string} params.department - Filter by department ID
     * @param {string} params.status - Filter by task status
     * @param {string} params.priority - Filter by task priority
     * @param {string} params.taskType - Filter by task type
     * @param {string} params.createdBy - Filter by creator user ID
     * @param {string} params.assignee - Filter by assignee user ID
     * @param {string} params.watcher - Filter by watcher user ID
     * @param {boolean} params.deleted - Include deleted tasks
     * @returns {Object} Paginated tasks list
     */
    getTasks: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.organization)
          queryParams.append("organization", params.organization);
        if (params.department)
          queryParams.append("department", params.department);
        if (params.status) queryParams.append("status", params.status);
        if (params.priority) queryParams.append("priority", params.priority);
        if (params.taskType) queryParams.append("taskType", params.taskType);
        if (params.createdBy) queryParams.append("createdBy", params.createdBy);
        if (params.assignee) queryParams.append("assignee", params.assignee);
        if (params.watcher) queryParams.append("watcher", params.watcher);
        if (params.deleted !== undefined)
          queryParams.append("deleted", params.deleted);

        return {
          url: `/tasks?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data?.docs
          ? [
              ...result.data.docs.map(({ _id }) => ({ type: "Task", id: _id })),
              { type: "Task", id: "LIST" },
            ]
          : [{ type: "Task", id: "LIST" }],
    }),

    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     * @returns {Object} Task data
     */
    getTask: builder.query({
      query: (taskId) => ({
        url: `/tasks/${taskId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, taskId) => [{ type: "Task", id: taskId }],
    }),

    /**
     * Create new task (all task types)
     * @param {Object} data - Task data
     * @param {string} data.title - Task title
     * @param {string} data.description - Task description
     * @param {string} data.status - Task status
     * @param {string} data.priority - Task priority
     * @param {string} data.organization - Organization ID
     * @param {string} data.department - Department ID
     * @param {string} data.taskType - Task type (ProjectTask, RoutineTask, AssignedTask)
     * @param {string} data.vendor - Vendor ID (ProjectTask only)
     * @param {Array} data.assignees - Assignee user IDs (AssignedTask only)
     * @param {Date} data.date - Task date (RoutineTask only)
     * @param {Array} data.materials - Materials array (RoutineTask only)
     * @returns {Object} Created task
     */
    createTask: builder.mutation({
      query: (data) => ({
        url: "/tasks",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    /**
     * Update task (all task types)
     * @param {Object} data - Update data
     * @param {string} data.taskId - Task ID
     * @param {Object} data.updates - Task updates
     * @returns {Object} Updated task
     */
    updateTask: builder.mutation({
      query: ({ taskId, ...updates }) => ({
        url: `/tasks/${taskId}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
        { type: "Task", id: "LIST" },
      ],
    }),

    /**
     * Soft delete task with cascade operations
     * @param {string} taskId - Task ID
     * @returns {Object} Success message
     */
    deleteTask: builder.mutation({
      query: (taskId) => ({
        url: `/tasks/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, taskId) => [
        { type: "Task", id: taskId },
        { type: "Task", id: "LIST" },
        { type: "TaskActivity", id: "LIST" },
        { type: "TaskComment", id: "LIST" },
        { type: "Attachment", id: "LIST" },
      ],
    }),

    /**
     * Restore soft-deleted task with cascade operations
     * @param {string} taskId - Task ID
     * @returns {Object} Restored task
     */
    restoreTask: builder.mutation({
      query: (taskId) => ({
        url: `/tasks/${taskId}/restore`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, taskId) => [
        { type: "Task", id: taskId },
        { type: "Task", id: "LIST" },
        { type: "TaskActivity", id: "LIST" },
        { type: "TaskComment", id: "LIST" },
        { type: "Attachment", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useRestoreTaskMutation,
} = taskApi;
