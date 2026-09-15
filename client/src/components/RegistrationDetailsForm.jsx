import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  getPasswordRequirements,
  validateRegistrationDetails
} from "../utils/registrationValidation";

/*
|--------------------------------------------------------------------------
| Password Requirement Configuration
|--------------------------------------------------------------------------
*/

const PASSWORD_REQUIREMENTS = [
  {
    key: "minimumLength",
    label: "At least 8 characters"
  },
  {
    key: "uppercase",
    label: "One uppercase letter"
  },
  {
    key: "lowercase",
    label: "One lowercase letter"
  },
  {
    key: "number",
    label: "One number"
  },
  {
    key: "specialCharacter",
    label: "One special character"
  },
  {
    key: "noWhitespace",
    label: "No spaces"
  }
];

const FIELD_ORDER = [
  "username",
  "email",
  "password",
  "confirmPassword"
];

/*
|--------------------------------------------------------------------------
| Registration Details Form
|--------------------------------------------------------------------------
*/

function RegistrationDetailsForm({
  isSubmitting,
  serverFieldErrors = {},
  globalError = "",
  onSubmit,
  onClearFieldError
}) {
  const [
    values,
    setValues
  ] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [
    clientErrors,
    setClientErrors
  ] = useState({});

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword
  ] = useState(false);

  const fieldRefs =
    useRef({});

  /*
  |--------------------------------------------------------------------------
  | Derived Validation State
  |--------------------------------------------------------------------------
  */

  const visibleErrors =
    useMemo(
      () => ({
        ...clientErrors,
        ...serverFieldErrors
      }),
      [
        clientErrors,
        serverFieldErrors
      ]
    );

  const passwordRequirements =
    useMemo(
      () =>
        getPasswordRequirements(
          values.password
        ),
      [values.password]
    );

  const completedRequirementCount =
    useMemo(
      () =>
        PASSWORD_REQUIREMENTS
          .filter(
            (requirement) =>
              passwordRequirements[
                requirement.key
              ]
          )
          .length,
      [passwordRequirements]
    );

  const passwordStrength =
    values.password
      ? Math.round(
        (
          completedRequirementCount /
          PASSWORD_REQUIREMENTS.length
        ) *
        100
      )
      : 0;

  const passwordStrengthLabel =
    passwordStrength === 100
      ? "Strong"
      : passwordStrength >= 67
        ? "Good"
        : passwordStrength >= 34
          ? "Developing"
          : "Weak";

  /*
  |--------------------------------------------------------------------------
  | Focus Server Errors
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const firstErrorField =
      FIELD_ORDER.find(
        (fieldName) =>
          serverFieldErrors[
            fieldName
          ]
      );

    if (firstErrorField) {
      fieldRefs.current[
        firstErrorField
      ]?.focus();
    }
  }, [serverFieldErrors]);

  /*
  |--------------------------------------------------------------------------
  | Input Changes
  |--------------------------------------------------------------------------
  */

  const handleChange = (
    fieldName,
    value
  ) => {
    setValues(
      (currentValues) => ({
        ...currentValues,
        [fieldName]: value
      })
    );

    setClientErrors(
      (currentErrors) => {
        if (
          !currentErrors[
            fieldName
          ]
        ) {
          return currentErrors;
        }

        const nextErrors = {
          ...currentErrors
        };

        delete nextErrors[
          fieldName
        ];

        return nextErrors;
      }
    );

    if (
      typeof onClearFieldError ===
      "function"
    ) {
      onClearFieldError(
        fieldName
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      const validation =
        validateRegistrationDetails(
          values
        );

      if (!validation.isValid) {
        setClientErrors(
          validation.errors
        );

        const firstErrorField =
          FIELD_ORDER.find(
            (fieldName) =>
              validation.errors[
                fieldName
              ]
          );

        window.requestAnimationFrame(
          () => {
            fieldRefs.current[
              firstErrorField
            ]?.focus();
          }
        );

        return;
      }

      setClientErrors({});

      try {
        await onSubmit(
          validation.data
        );
      } catch {
        /*
         * The registration-flow hook owns API errors and exposes them
         * through serverFieldErrors and globalError.
         */
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <form
      className=
        "register-form registration-details-form"
      onSubmit={
        handleSubmit
      }
      noValidate
    >
      <div
        className={
          `input-group ${
            visibleErrors.username
              ? "input-group-error"
              : ""
          }`
        }
      >
        <label htmlFor=
          "registration-username"
        >
          Username
        </label>

        <div className=
          "input-control"
        >
          <span
            className=
              "input-icon"
            aria-hidden="true"
          >
            @
          </span>

          <input
            ref={(element) => {
              fieldRefs.current
                .username =
                element;
            }}
            id=
              "registration-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder=
              "e.g. Naimish Verma"
            value={
              values.username
            }
            disabled={
              isSubmitting
            }
            maxLength={30}
            aria-invalid={
              Boolean(
                visibleErrors
                  .username
              )
            }
            aria-describedby={
              visibleErrors.username
                ? (
                  "registration-" +
                  "username-error"
                )
                : (
                  "registration-" +
                  "username-hint"
                )
            }
            onChange={(
              event
            ) =>
              handleChange(
                "username",
                event.target.value
              )
            }
          />
        </div>

        {visibleErrors.username ? (
          <span
            id=
              "registration-username-error"
            className=
              "field-error"
            role="alert"
          >
            {
              visibleErrors
                .username
            }
          </span>
        ) : (
          <span
            id=
              "registration-username-hint"
            className=
              "field-hint"
          >
            One optional space is
            allowed between two
            username parts.
          </span>
        )}
      </div>

      <div
        className={
          `input-group ${
            visibleErrors.email
              ? "input-group-error"
              : ""
          }`
        }
      >
        <label htmlFor=
          "registration-email"
        >
          Email address
        </label>

        <div className=
          "input-control"
        >
          <span
            className=
              "input-icon"
            aria-hidden="true"
          >
            ✉
          </span>

          <input
            ref={(element) => {
              fieldRefs.current
                .email =
                element;
            }}
            id=
              "registration-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder=
              "you@example.com"
            value={
              values.email
            }
            disabled={
              isSubmitting
            }
            maxLength={254}
            aria-invalid={
              Boolean(
                visibleErrors.email
              )
            }
            aria-describedby={
              visibleErrors.email
                ? (
                  "registration-" +
                  "email-error"
                )
                : (
                  "registration-" +
                  "email-hint"
                )
            }
            onChange={(
              event
            ) =>
              handleChange(
                "email",
                event.target.value
              )
            }
          />
        </div>

        {visibleErrors.email ? (
          <span
            id=
              "registration-email-error"
            className=
              "field-error"
            role="alert"
          >
            {
              visibleErrors.email
            }
          </span>
        ) : (
          <span
            id=
              "registration-email-hint"
            className=
              "field-hint"
          >
            We will send your
            verification code here.
          </span>
        )}
      </div>

      <div
        className={
          `input-group ${
            visibleErrors.password
              ? "input-group-error"
              : ""
          }`
        }
      >
        <label htmlFor=
          "registration-password"
        >
          Password
        </label>

        <div className=
          "input-control"
        >
          <span
            className=
              "input-icon"
            aria-hidden="true"
          >
            🔒
          </span>

          <input
            ref={(element) => {
              fieldRefs.current
                .password =
                element;
            }}
            id=
              "registration-password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete=
              "new-password"
            placeholder=
              "Create a strong password"
            value={
              values.password
            }
            disabled={
              isSubmitting
            }
            aria-invalid={
              Boolean(
                visibleErrors
                  .password
              )
            }
            aria-describedby={
              visibleErrors.password
                ? (
                  "registration-" +
                  "password-error " +
                  "password-requirements"
                )
                : (
                  "password-" +
                  "requirements"
                )
            }
            onChange={(
              event
            ) =>
              handleChange(
                "password",
                event.target.value
              )
            }
          />

          <button
            type="button"
            className=
              "password-toggle"
            disabled={
              isSubmitting
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            aria-pressed={
              showPassword
            }
            onClick={() =>
              setShowPassword(
                (
                  currentValue
                ) =>
                  !currentValue
              )
            }
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>
        </div>

        {visibleErrors.password && (
          <span
            id=
              "registration-password-error"
            className=
              "field-error"
            role="alert"
          >
            {
              visibleErrors
                .password
            }
          </span>
        )}

        <div
          id=
            "password-requirements"
          className=
            "password-requirements"
        >
          <div className=
            "password-strength-header"
          >
            <span>
              Password strength
            </span>

            <strong>
              {values.password
                ? passwordStrengthLabel
                : "Not entered"}
            </strong>
          </div>

          <div
            className=
              "password-strength-track"
            aria-hidden="true"
          >
            <span
              style={{
                width:
                  `${passwordStrength}%`
              }}
              data-strength={
                passwordStrengthLabel
                  .toLowerCase()
              }
            />
          </div>

          <ul>
            {
              PASSWORD_REQUIREMENTS
                .map(
                  (
                    requirement
                  ) => {
                    const complete =
                      Boolean(
                        passwordRequirements[
                          requirement.key
                        ]
                      );

                    return (
                      <li
                        key={
                          requirement.key
                        }
                        className={
                          complete
                            ? (
                              "requirement-" +
                              "complete"
                            )
                            : ""
                        }
                      >
                        <span
                          aria-hidden=
                            "true"
                        >
                          {complete
                            ? "✓"
                            : "○"}
                        </span>

                        {
                          requirement.label
                        }
                      </li>
                    );
                  }
                )
            }
          </ul>
        </div>
      </div>

      <div
        className={
          `input-group ${
            visibleErrors
              .confirmPassword
              ? "input-group-error"
              : ""
          }`
        }
      >
        <label htmlFor=
          "registration-confirm-password"
        >
          Confirm password
        </label>

        <div className=
          "input-control"
        >
          <span
            className=
              "input-icon"
            aria-hidden="true"
          >
            ✓
          </span>

          <input
            ref={(element) => {
              fieldRefs.current
                .confirmPassword =
                element;
            }}
            id=
              "registration-confirm-password"
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            autoComplete=
              "new-password"
            placeholder=
              "Enter your password again"
            value={
              values.confirmPassword
            }
            disabled={
              isSubmitting
            }
            aria-invalid={
              Boolean(
                visibleErrors
                  .confirmPassword
              )
            }
            aria-describedby={
              visibleErrors
                .confirmPassword
                ? (
                  "registration-" +
                  "confirm-password-error"
                )
                : undefined
            }
            onChange={(
              event
            ) =>
              handleChange(
                "confirmPassword",
                event.target.value
              )
            }
          />

          <button
            type="button"
            className=
              "password-toggle"
            disabled={
              isSubmitting
            }
            aria-label={
              showConfirmPassword
                ? (
                  "Hide confirmed " +
                  "password"
                )
                : (
                  "Show confirmed " +
                  "password"
                )
            }
            aria-pressed={
              showConfirmPassword
            }
            onClick={() =>
              setShowConfirmPassword(
                (
                  currentValue
                ) =>
                  !currentValue
              )
            }
          >
            {showConfirmPassword
              ? "Hide"
              : "Show"}
          </button>
        </div>

        {visibleErrors
          .confirmPassword && (
          <span
            id=
              "registration-confirm-password-error"
            className=
              "field-error"
            role="alert"
          >
            {
              visibleErrors
                .confirmPassword
            }
          </span>
        )}
      </div>

      {globalError && (
        <div
          className=
            "registration-global-error"
          role="alert"
        >
          <span
            aria-hidden="true"
          >
            !
          </span>

          <p>
            {globalError}
          </p>
        </div>
      )}

      <button
        type="submit"
        className="submit-btn"
        disabled={
          isSubmitting
        }
        aria-busy={
          isSubmitting
        }
      >
        <span>
          {isSubmitting
            ? (
              "Sending OTP..."
            )
            : "Sign Up"}
        </span>

        {!isSubmitting && (
          <span
            aria-hidden="true"
          >
            →
          </span>
        )}
      </button>
    </form>
  );
}

export default RegistrationDetailsForm;
