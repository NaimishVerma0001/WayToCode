import { apiRequest, ApiError } from "./apiClient";

export const getAdminOverview =
  async ({
    signal,
    refresh = false
  } = {}) => {
    const endpoint =
      refresh
        ? "/admin/overview?refresh=true"
        : "/admin/overview";

    const response =
      await apiRequest(
        endpoint,
        {
          authenticated: true,
          signal
        }
      );

    return response.data;
  };

export const getAdminUsers =
  async ({
    page = 1,
    limit = 25,
    search = "",
    status = "all",
    role = "all",
    activity = "all",
    sort = "newest",
    signal
  } = {}) => {
    const query =
      new URLSearchParams();

    query.set(
      "page",
      String(page)
    );

    query.set(
      "limit",
      String(limit)
    );

    if (search.trim()) {
      query.set(
        "search",
        search.trim()
      );
    }

    if (status !== "all") {
      query.set(
        "status",
        status
      );
    }

    if (role !== "all") {
      query.set(
        "role",
        role
      );
    }

    if (activity !== "all") {
      query.set(
        "activity",
        activity
      );
    }

    query.set(
      "sort",
      sort
    );

    const response =
      await apiRequest(
        `/admin/users?${query.toString()}`,
        {
          authenticated: true,
          signal
        }
      );

    return response.data;
  };

export const getAdminUserById =
  async (
    userId,
    {
      signal
    } = {}
  ) => {
    if (!userId) {
      throw new ApiError(
        "A user identifier is required.",
        400
      );
    }

    const response =
      await apiRequest(
        `/admin/users/${encodeURIComponent(
          userId
        )}`,
        {
          authenticated: true,
          signal
        }
      );

    return response.data;
  };

export const blockAdminUser =
  async (
    userId,
    reason
  ) => {
    if (!userId) {
      throw new ApiError(
        "A user identifier is required.",
        400
      );
    }

    const response =
      await apiRequest(
        `/admin/users/${encodeURIComponent(
          userId
        )}/block`,
        {
          method: "PATCH",
          authenticated: true,

          body: {
            reason
          }
        }
      );

    return response.data;
  };

export const unblockAdminUser =
  async (
    userId,
    reason = ""
  ) => {
    if (!userId) {
      throw new ApiError(
        "A user identifier is required.",
        400
      );
    }

    const response =
      await apiRequest(
        `/admin/users/${encodeURIComponent(
          userId
        )}/unblock`,
        {
          method: "PATCH",
          authenticated: true,

          body: {
            reason
          }
        }
      );

    return response.data;
  };

export const getAdminAuditLogs =
  async ({
    page = 1,
    limit = 25,
    action = "all",
    targetUserId = "",
    signal
  } = {}) => {
    const query =
      new URLSearchParams();

    query.set(
      "page",
      String(page)
    );

    query.set(
      "limit",
      String(limit)
    );

    if (action !== "all") {
      query.set(
        "action",
        action
      );
    }

    if (targetUserId) {
      query.set(
        "targetUserId",
        targetUserId
      );
    }

    const response =
      await apiRequest(
        `/admin/audit-logs?${query.toString()}`,
        {
          authenticated: true,
          signal
        }
      );

    return response.data;
  };

