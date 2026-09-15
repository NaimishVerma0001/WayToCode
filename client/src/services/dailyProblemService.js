import { apiRequest } from "./apiClient";

export const getDailyProblems =
  async ({
    signal,
    refresh = false
  } = {}) => {
    const endpoint =
      refresh
        ? (
          "/daily-problems" +
          "?refresh=true"
        )
        : "/daily-problems";

    const response =
      await apiRequest(
        endpoint,
        {
          signal
        }
      );

    return {
      problems:
        Array.isArray(
          response.data
        )
          ? response.data
          : [],

      total:
        Number(
          response.total
        ) || 0,

      date:
        response.date ||
        null,

      cached:
        Boolean(
          response.cached
        ),

      partialFailure:
        Boolean(
          response.partialFailure
        ),

      failedProviders:
        Array.isArray(
          response.failedProviders
        )
          ? response.failedProviders
          : [],

      updatedAt:
        response.updatedAt ||
        null
    };
  };

/*
|--------------------------------------------------------------------------
| Public Constants
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Administration API
|--------------------------------------------------------------------------
*/

