import React, {
  useState
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaKey,
  FaPaperPlane
} from "react-icons/fa";

import { toast } from
  "react-toastify";

import {
  forgotPassword
} from "../services";

import "../styles/PasswordRecovery.css";

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/

function ForgotPassword({
  onBackToLogin
}) {
  const [email, setEmail] =
    useState("");

  const [fieldError, setFieldError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSubmitted, setIsSubmitted] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validateEmail = () => {
    const normalizedEmail =
      email
        .toLowerCase()
        .trim();

    if (!normalizedEmail) {
      setFieldError(
        "Email address is required."
      );

      return null;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        normalizedEmail
      )
    ) {
      setFieldError(
        "Enter a valid email address."
      );

      return null;
    }

    setFieldError("");

    return normalizedEmail;
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

    if (isSubmitting) {
      return;
    }

    const normalizedEmail =
      validateEmail();

    if (!normalizedEmail) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await forgotPassword(
          normalizedEmail
        );

      setIsSubmitted(true);

      toast.success(
        result.message,
        {
          position: "top-center",
          autoClose: 3500,
          toastId:
            "forgot-password-success"
        }
      );
    } catch (requestError) {
      toast.error(
        requestError.message ||
        (
          "Password recovery is " +
          "temporarily unavailable."
        ),
        {
          position: "top-center",
          autoClose: 3500,
          toastId:
            "forgot-password-error"
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Request Another Email
  |--------------------------------------------------------------------------
  */

  const requestAgain = () => {
    setIsSubmitted(false);
    setFieldError("");
  };

  if (isSubmitted) {
    return (
      <main className=
        "password-recovery-page"
      >
        <section
          className=
            "password-recovery-card password-recovery-success"
          aria-labelledby=
            "recovery-success-title"
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
            Request received
          </span>

          <h1 id=
            "recovery-success-title"
          >
            Check your email
          </h1>

          <p>
            If an account exists for
            <strong>
              {" "}
              {email
                .toLowerCase()
                .trim()}
            </strong>
            , we sent a secure
            password-reset link.
          </p>

          <div className=
            "password-recovery-notice"
          >
            <FaKey />

            <div>
              <strong>
                The link expires in
                15 minutes
              </strong>

              <span>
                It can only be used
                once. Also check your
                spam folder.
              </span>
            </div>
          </div>

          <button
            type="button"
            className=
              "password-recovery-primary"
            onClick={
              onBackToLogin
            }
          >
            <FaArrowLeft />
            Return to sign in
          </button>

          <button
            type="button"
            className=
              "password-recovery-link"
            onClick={
              requestAgain
            }
          >
            Send another email
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
          "forgot-password-title"
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
            Secure account recovery
          </span>

          <h1 id=
            "forgot-password-title"
          >
            Forgot your password?
          </h1>

          <p>
            Enter the email address
            connected to your Way2Code
            account. We’ll send you a
            secure reset link.
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
            "recovery-email"
          >
            Email address
          </label>

          <div
            className={
              fieldError
                ? (
                  "password-recovery-input " +
                  "has-error"
                )
                : (
                  "password-recovery-input"
                )
            }
          >
            <FaEnvelope />

            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder=
                "Enter your email address"
              value={email}
              disabled={
                isSubmitting
              }
              aria-invalid={
                Boolean(fieldError)
              }
              aria-describedby={
                fieldError
                  ? "recovery-email-error"
                  : undefined
              }
              onChange={(event) => {
                setEmail(
                  event.target.value
                );

                if (fieldError) {
                  setFieldError("");
                }
              }}
            />
          </div>

          {fieldError && (
            <span
              id=
                "recovery-email-error"
              className=
                "password-field-error"
              role="alert"
            >
              {fieldError}
            </span>
          )}

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
            <FaPaperPlane />

            {isSubmitting
              ? "Sending secure link..."
              : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          className=
            "password-recovery-back"
          onClick={
            onBackToLogin
          }
          disabled={
            isSubmitting
          }
        >
          <FaArrowLeft />
          Back to sign in
        </button>

        <p className=
          "password-recovery-security"
        >
          For your security, Way2Code
          never reveals whether an
          email address is registered.
        </p>
      </section>
    </main>
  );
}

export default ForgotPassword;