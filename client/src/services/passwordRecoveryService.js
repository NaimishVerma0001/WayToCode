import { apiRequest, ApiError } from "./apiClient";

export const forgotPassword =
  async (
    email,
    {
      signal
    } = {}
  ) => {
    const normalizedEmail =
      typeof email === "string"
        ? email
            .toLowerCase()
            .trim()
        : "";

    if (!normalizedEmail) {
      throw new ApiError(
        "Email address is required.",
        400
      );
    }

    const response =
      await apiRequest(
        "/auth/forgot-password",
        {
          method: "POST",

          body: {
            email:
              normalizedEmail
          },

          signal
        }
      );

    return {
      success:
        Boolean(
          response.success
        ),

      message:
        response.message ||
        (
          "If an account exists " +
          "for that email address, " +
          "reset instructions have " +
          "been sent."
        )
    };
  };

export const resetPassword =
  async ({
    token,
    password,
    confirmPassword
  }) => {
    const normalizedToken =
      typeof token === "string"
        ? token.trim()
        : "";

    if (!normalizedToken) {
      throw new ApiError(
        "The password reset link is invalid.",
        400
      );
    }

    const response =
      await apiRequest(
        "/auth/reset-password",
        {
          method: "POST",

          body: {
            token:
              normalizedToken,

            password,

            confirmPassword
          }
        }
      );

    return {
      success:
        Boolean(
          response.success
        ),

      message:
        response.message ||
        (
          "Password reset " +
          "successfully."
        ),

      data:
        response.data || null
    };
  };

