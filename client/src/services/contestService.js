// client/src/services/contestService.js

import { apiRequest } from "./apiClient";

/*
|--------------------------------------------------------------------------
| Fetch Upcoming Contests
|--------------------------------------------------------------------------
*/
export const getUpcomingContests = async ({ signal } = {}) => {
  const response = await apiRequest("/contests", { 
    signal,
    // Note: If /contests requires authentication to view, add authenticated: true here as well.
    // If it is a public route, leave it as is.
  });

  return {
    contests: Array.isArray(response.data) ? response.data : [],
    total: Number(response.total) || 0,
    cached: Boolean(response.cached),
    partialFailure: Boolean(response.partialFailure),
    failedPlatforms: Array.isArray(response.failedPlatforms) ? response.failedPlatforms : [],
    lastUpdated: response.lastUpdated || null,
    platforms: response.platforms || {}
  };
};

/*
|--------------------------------------------------------------------------
| Set Contest Reminder
|--------------------------------------------------------------------------
*/
export const setContestReminder = async (contestId, contestStartTime, offsetMinutes) => {
  const response = await apiRequest("/reminders", {
    method: "POST",
    authenticated: true, // REQUIRED: Instructs apiClient to attach the JWT token
    body: {
      contestId,
      contestStartTime,
      offsetMinutes
    }
  });
  
  return response.data;
};

/*
|--------------------------------------------------------------------------
| Remove Contest Reminder
|--------------------------------------------------------------------------
*/
export const removeContestReminder = async (contestId) => {
  const response = await apiRequest(`/reminders/${contestId}`, {
    method: "DELETE",
    authenticated: true // REQUIRED: Instructs apiClient to attach the JWT token
  });
  
  return response.data;
};

export default {
  getUpcomingContests,
  setContestReminder,
  removeContestReminder
};