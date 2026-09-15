// client/src/services/apiClient.js

/**
 * Resolve the API base URL.
 *
 * In development, Vite proxies `/api` to the backend, so a relative base needs
 * no configuration at all. In production `VITE_API_URL` must point at the
 * deployed API; if it is missing we fall back to a same-origin `/api` rather
 * than letting `undefined` reach `.replace()` and blank the whole app.
 */
const resolveApiBaseUrl = () => {
  const configured = import.meta.env?.VITE_API_URL;

  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }

  if (import.meta.env?.PROD) {
    console.error(
      "VITE_API_URL is not set. Falling back to a same-origin /api base URL."
    );
  }

  return "/api";
};

export const API_BASE_URL = resolveApiBaseUrl().replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "way2codeToken";
export const USER_STORAGE_KEY = "way2codeUser";

/*
|--------------------------------------------------------------------------
| API Error
|--------------------------------------------------------------------------
*/
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = data?.code || null;
    this.fieldErrors = Array.isArray(data?.errors) ? data.errors : [];
  }
}

/*
|--------------------------------------------------------------------------
| Authentication Storage
|--------------------------------------------------------------------------
| Every accessor is guarded: storage throws in private browsing modes and in
| embedded webviews, and a thrown accessor must never take the app down.
*/
const safeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to clean up */
    }
  }
};

export const getStoredToken = () => safeStorage.get(TOKEN_STORAGE_KEY) || "";

export const getStoredUser = () => {
  const storedValue = safeStorage.get(USER_STORAGE_KEY);

  if (!storedValue) return null;

  try {
    return JSON.parse(storedValue);
  } catch {
    safeStorage.remove(USER_STORAGE_KEY);
    return null;
  }
};

export const storeAuthentication = ({ token, user }) => {
  if (!token) throw new ApiError("Authentication token was not provided.", 500);

  safeStorage.set(TOKEN_STORAGE_KEY, token);
  safeStorage.set(USER_STORAGE_KEY, JSON.stringify(user));
};

export const updateStoredToken = (token) => {
  if (token) safeStorage.set(TOKEN_STORAGE_KEY, token);
};

export const storeUser = (user) => {
  if (user) safeStorage.set(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthentication = () => {
  safeStorage.remove(TOKEN_STORAGE_KEY);
  safeStorage.remove(USER_STORAGE_KEY);
};

/*
|--------------------------------------------------------------------------
| Response Parsing
|--------------------------------------------------------------------------
*/
const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  try {
    const text = await response.text();
    return text ? { message: text } : {};
  } catch {
    return {};
  }
};

/**
 * Prefer a field-level validation message over the generic envelope message,
 * so a form can show "Password must be at least 8 characters" rather than
 * "Invalid request payload."
 */
const resolveErrorMessage = (payload, fallback) => {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const [firstIssue] = payload.errors;

    if (firstIssue?.message) return firstIssue.message;
  }

  return payload?.message || fallback;
};

/*
|--------------------------------------------------------------------------
| Token Refresh Coordination
|--------------------------------------------------------------------------
| Concurrent 401s must trigger exactly one refresh; the rest wait on it.
*/
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include"
      });

      const payload = await parseResponse(response);

      if (!response.ok || !payload.success || !payload.data?.token) {
        throw new ApiError("Token refresh failed.", response.status, payload);
      }

      updateStoredToken(payload.data.token);

      return payload.data.token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/*
|--------------------------------------------------------------------------
| Shared API Request
|--------------------------------------------------------------------------
*/
export const apiRequest = async (endpoint, options = {}) => {
  const {
    method = "GET",
    body,
    authenticated = false,
    signal,
    isRetry = false,
    headers: extraHeaders
  } = options;

  const headers = { Accept: "application/json", ...extraHeaders };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (authenticated) {
    const token = getStoredToken();

    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      // Required so the HttpOnly refresh cookie travels with the request.
      credentials: "include"
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;

    throw new ApiError("Unable to connect to the Way2Code server.", 0);
  }

  /*
   * A single 401 on an authenticated call triggers one refresh and one retry.
   * `isRetry` is the circuit breaker: a second 401 ends the session instead of
   * looping. The auth endpoints themselves are excluded to avoid recursion.
   */
  const canAttemptRefresh =
    response.status === 401 &&
    authenticated &&
    !isRetry &&
    endpoint !== "/auth/refresh" &&
    endpoint !== "/auth/logout";

  if (canAttemptRefresh) {
    try {
      await refreshAccessToken();

      return await apiRequest(endpoint, { ...options, isRetry: true });
    } catch {
      clearAuthentication();

      throw new ApiError("Your session has expired. Please log in again.", 401);
    }
  }

  const responseData = await parseResponse(response);

  if (!response.ok) {
    // A terminal 401 or a blocked account means the stored session is dead.
    if (response.status === 401 || responseData?.code === "ACCOUNT_BLOCKED") {
      clearAuthentication();
    }

    throw new ApiError(
      resolveErrorMessage(responseData, "The request could not be completed."),
      response.status,
      responseData
    );
  }

  return responseData;
};
