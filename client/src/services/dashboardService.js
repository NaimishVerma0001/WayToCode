import { apiRequest } from "./apiClient";

export const getDashboard =
  async ({
    signal,
    refresh = false
  } = {}) => {
    const endpoint =
      refresh
        ? "/dashboard?refresh=true"
        : "/dashboard";

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

/*
|--------------------------------------------------------------------------
| Dashboard Progress API
|--------------------------------------------------------------------------
*/

export const getProgressHistory =
  async ({
    days = 30,
    signal
  } = {}) => {
    const allowedDays = [
      7,
      30,
      90,
      365
    ];

    const normalizedDays =
      allowedDays.includes(
        Number(days)
      )
        ? Number(days)
        : 30;

    const response =
      await apiRequest(
        `/dashboard/progress?days=${normalizedDays}`,
        {
          authenticated: true,
          signal
        }
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Contest API
|--------------------------------------------------------------------------
*/

