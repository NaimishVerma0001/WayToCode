// client/src/services/authService.js

import {
  apiRequest,
  ApiError,
  storeAuthentication,
  storeUser,
  clearAuthentication
} from "./apiClient";

export const registerUser = async ({ username, email, password }) => {
  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: { username, email, password }
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| OTP Registration
|--------------------------------------------------------------------------
*/
export const requestRegistrationOtp = async ({
  username,
  email,
  password,
  confirmPassword,
  signal
}) => {
  const response = await apiRequest("/auth/register/request-otp", {
    method: "POST",
    body: { username, email, password, confirmPassword },
    signal
  });

  const registration = response.data;

  if (!registration?.registrationId) {
    throw new ApiError("The server returned an invalid registration response.", 500, response);
  }

  return { ...registration, success: true };
};

export const verifyRegistrationOtp = async ({ registrationId, otp, signal }) => {
  const response = await apiRequest("/auth/register/verify-otp", {
    method: "POST",
    body: { registrationId, otp },
    signal
  });

  return response.data;
};

export const resendRegistrationOtp = async ({ registrationId, signal }) => {
  const response = await apiRequest("/auth/register/resend-otp", {
    method: "POST",
    body: { registrationId },
    signal
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Session Lifecycle
|--------------------------------------------------------------------------
*/
export const loginUser = async ({ username, email, password }) => {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: { username, email, password }
  });

  const authentication = response.data;

  if (!authentication?.token || !authentication?.user) {
    throw new ApiError("The server returned an invalid login response.", 500, response);
  }

  storeAuthentication(authentication);

  return authentication;
};

export const getCurrentUser = async ({ signal } = {}) => {
  try {
    const response = await apiRequest("/auth/me", { authenticated: true, signal });
    const user = response.data;

    if (user) {
      storeUser(user);
      return user;
    }

    return null;
  } catch (error) {
    // Let an aborted request stay an abort so React Query does not treat a
    // cancelled navigation as a logout.
    if (error.name === "AbortError") throw error;

    /*
     * Any other failure means there is no usable session. Returning null
     * rather than throwing keeps React Query from retrying in a loop.
     */
    clearAuthentication();

    return null;
  }
};

/**
 * Sign out.
 *
 * The server call is what actually ends the session: it blacklists the access
 * token and clears the HttpOnly refresh cookie. Clearing local storage alone
 * left both credentials valid until they expired on their own.
 */
export const logoutUser = async () => {
  try {
    await apiRequest("/auth/logout", { method: "POST", authenticated: true });
  } catch {
    // Already-expired or already-revoked sessions are a successful logout.
  } finally {
    clearAuthentication();
  }
};
