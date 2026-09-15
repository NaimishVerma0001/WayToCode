import React, {
  useMemo,
  useState
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt
} from "react-icons/fa";

import {
  useNavigate,
  useSearchParams
} from "react-router-dom";

import { toast } from
  "react-toastify";

import {
  resetPassword
} from "../services";

import "../styles/PasswordRecovery.css";

/*
|--------------------------------------------------------------------------
| Password Strength
|--------------------------------------------------------------------------
*/

const getPasswordStrength = (
  password
) => {
  if (!password) {
    return {
      score: 0,
      label: "",
      className: ""
    };
  }

  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password)
  ) {
    score += 1;
  }

  if (
    /\d/.test(password)
  ) {
    score += 1;
  }

  if (
    /[^a-zA-Z0-9]/.test(
      password
    )
  ) {
    score += 1;
  }

  if (score <= 2) {
    return {
      score,
      label: "Weak",
      className: "weak"
    };
  }

  if (score <= 4) {
    return {
      score,
      label: "Good",
      className: "good"
    };
  }

  return {
    score,
    label: "Strong",
    className: "strong"
  };
};

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

function ResetPassword({
  onBackToLogin
}) {
  const navigate =
    useNavigate();

  const [searchParameters] =
    useSearchParams();

  const token =
    searchParameters.get(
      "token"
    ) || "";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState("");

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation
  ] = useState(false);

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isComplete, setIsComplete] =
    useState(false);

  const passwordStrength =
    useMemo(
      () =>
        getPasswordStrength(
          password
        ),
      [password]
    );

  const hasValidToken =
    Boolean(token && token.trim().length > 0);

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  const returnToSignIn = () => {
    if (onBackToLogin) {
      onBackToLogin();
      return;
    }

    navigate("/");
  };

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    const errors = {};

    if (!password) {
      errors.password =
        "A new password is required.";
    } else if (
      password.length < 8
    ) {
      errors.password =
        "Password must contain at least 8 characters.";
    } else if (
      password.length > 128
    ) {
      errors.password =
        "Password cannot exceed 128 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword =
        "Confirm your new password.";
    } else if (
      password !==
      confirmPassword
    ) {
      errors.confirmPassword =
        "Passwords do not match.";
    }

    setFieldErrors(errors);

    return (
      Object.keys(errors).length ===
      0
    );
  };

  const clearFieldError = (
    field
  ) => {
    setFieldErrors(
      (currentErrors) => {
        if (!currentErrors || !currentErrors[field]) {
          return currentErrors || {};
        }

        const updatedErrors = {
          ...currentErrors
        };

        delete updatedErrors[
          field
        ];

        return updatedErrors;
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      isSubmitting ||
      !hasValidToken ||
      !validateForm()
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await resetPassword({
          token,
          password,
          confirmPassword
        });

      setIsComplete(true);

      const successMessage = 
        typeof result === "string" 
          ? result 
          : result?.message || "Password reset successfully.";

      toast.success(
        successMessage,
        {
          position: "top-center",
          autoClose: 3000,
          toastId:
            "password-reset-success"
        }
      );
    } catch (requestError) {
      toast.error(
        requestError?.message ||
        (
          "Your password could " +
          "not be reset."
        ),
        {
          position: "top-center",
          autoClose: 4000,
          toastId:
            "password-reset-error"
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Invalid Link
  |--------------------------------------------------------------------------
  */

  if (!hasValidToken) {
    return (
      <main className=
        "password-recovery-page"
      >
        <section
          className=
            "password-recovery-card password-recovery-invalid"
          role="alert"
        >
          <div className=
            "password-recovery-brand"
          >
            <span>
              &lt;/&gt;
            </span>

            <strong>
              Way<span>2Code</span>
            </strong>
          </div>

          <div className=
            "password-invalid-icon"
          >
            <FaShieldAlt />
          </div>

          <span className=
            "password-recovery-eyebrow"
          >
            Invalid recovery link
          </span>

          <h1>
            This link cannot be used
          </h1>

          <p>
            The password-reset link is
            missing, malformed or no
            longer available. Request a
            new link to continue.
          </p>

          <button
            type="button"
            className=
              "password-recovery-primary"
            onClick={() =>
              navigate("/")
            }
          >
            <FaArrowLeft />
            Return to Way2Code
          </button>
        </section>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Success
  |--------------------------------------------------------------------------
  */

  if (isComplete) {
    return (
      <main className=
        "password-recovery-page"
      >
        <section
          className=
            "password-recovery-card password-recovery-success"
          aria-labelledby=
            "reset-complete-title"
        >
          <div className=
            "password-recovery-brand"
          >
            <span>
              &lt;/&gt;
            </span>

            <strong>
              Way<span>2Code</span>
            </strong>
          </div>

          <div className=
            "password-success-icon"
          >
            <FaCheckCircle />
          </div>

          <span className=
            "password-recovery-eyebrow"
          >
            Account secured
          </span>

          <h1 id=
            "reset-complete-title"
          >
            Password updated
          </h1>

          <p>
            Your password was reset
            successfully. Previous
            authenticated sessions are
            no longer valid.
          </p>

          <div className=
            "password-recovery-notice"
          >
            <FaShieldAlt />

            <div>
              <strong>
                Security update complete
              </strong>

              <span>
                Sign in using your new
                password to continue.
              </span>
            </div>
          </div>

          <button
            type="button"
            className=
              "password-recovery-primary"
            onClick={
              returnToSignIn
            }
          >
            <FaKey />
            Continue to sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className=
      "password-recovery-page"
    >
      <section
        className=
          "password-recovery-card"
        aria-labelledby=
          "reset-password-title"
      >
        <div className=
          "password-recovery-brand"
        >
          <span>
            &lt;/&gt;
          </span>

          <strong>
            Way<span>2Code</span>
          </strong>
        </div>

        <div className=
          "password-recovery-heading"
        >
          <span className=
            "password-recovery-eyebrow"
          >
            Secure password reset
          </span>

          <h1 id=
            "reset-password-title"
          >
            Choose a new password
          </h1>

          <p>
            Create a strong password
            that you haven’t previously
            used for this account.
          </p>
        </div>

        <form
          className=
            "password-recovery-form"
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          <label htmlFor=
            "new-password"
          >
            New password
          </label>

          <div
            className={
              fieldErrors?.password
                ? (
                  "password-recovery-input " +
                  "has-error"
                )
                : (
                  "password-recovery-input"
                )
            }
          >
            <FaLock />

            <input
              id="new-password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete=
                "new-password"
              placeholder=
                "Enter a new password"
              value={password}
              disabled={
                isSubmitting
              }
              aria-invalid={
                Boolean(
                  fieldErrors?.password
                )
              }
              onChange={(event) => {
                setPassword(
                  event.target.value
                );

                clearFieldError(
                  "password"
                );
              }}
            />

            <button
              type="button"
              className=
                "password-visibility-button"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }
              disabled={
                isSubmitting
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword
                ? <FaEyeSlash />
                : <FaEye />
              }
            </button>
          </div>

          {fieldErrors?.password && (
            <span
              className=
                "password-field-error"
              role="alert"
            >
              {
                fieldErrors.password
              }
            </span>
          )}

          {password && (
            <div className=
              "password-strength"
            >
              <div>
                {[0, 1, 2, 3, 4].map((index) => {
                  const score = passwordStrength?.score || 0;
                  const activeClass = passwordStrength?.className || "";
                  const isActive = index < score;
                  return (
                    <span
                      key={index}
                      className={isActive ? activeClass : ""}
                    />
                  );
                })}
              </div>

              <small>
                Password strength:
                <strong>
                  {" "}
                  {
                    passwordStrength
                      ?.label || ""
                  }
                </strong>
              </small>
            </div>
          )}

          <label htmlFor=
            "confirm-new-password"
          >
            Confirm password
          </label>

          <div
            className={
              fieldErrors?.confirmPassword
                ? (
                  "password-recovery-input " +
                  "has-error"
                )
                : (
                  "password-recovery-input"
                )
            }
          >
            <FaLock />

            <input
              id=
                "confirm-new-password"
              name=
                "confirmPassword"
              type={
                showConfirmation
                  ? "text"
                  : "password"
              }
              autoComplete=
                "new-password"
              placeholder=
                "Confirm your new password"
              value={
                confirmPassword
              }
              disabled={
                isSubmitting
              }
              aria-invalid={
                Boolean(
                  fieldErrors
                    ?.confirmPassword
                )
              }
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value
                );

                clearFieldError(
                  "confirmPassword"
                );
              }}
            />

            <button
              type="button"
              className=
                "password-visibility-button"
              onClick={() =>
                setShowConfirmation(
                  (current) =>
                    !current
                )
              }
              disabled={
                isSubmitting
              }
              aria-label={
                showConfirmation
                  ? (
                    "Hide password " +
                    "confirmation"
                  )
                  : (
                    "Show password " +
                    "confirmation"
                  )
              }
            >
              {showConfirmation
                ? <FaEyeSlash />
                : <FaEye />
              }
            </button>
          </div>

          {fieldErrors?.confirmPassword && (
            <span
              className=
                "password-field-error"
              role="alert"
            >
              {
                fieldErrors
                  .confirmPassword
              }
            </span>
          )}

          <div className=
            "password-requirements"
          >
            <FaShieldAlt />

            <span>
              Use at least 8
              characters. A longer
              password with mixed
              characters is safer.
            </span>
          </div>

          <button
            type="submit"
            className=
              "password-recovery-primary"
            disabled={
              isSubmitting
            }
            aria-busy={
              isSubmitting
            }
          >
            <FaKey />

            {isSubmitting
              ? "Securing account..."
              : "Reset password"}
          </button>
        </form>

        <button
          type="button"
          className=
            "password-recovery-back"
          onClick={
            returnToSignIn
          }
          disabled={
            isSubmitting
          }
        >
          <FaArrowLeft />
          Back to sign in
        </button>
      </section>
    </main>
  );
}

export default ResetPassword;