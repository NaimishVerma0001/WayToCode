import React, { useRef, useState } from "react";
import { normalizeEmail } from "../utils/registrationValidation";

function AuthenticationLoginForm({ isSubmitting, serverError = "", onSubmit, onForgotPassword, onClearError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = () => {
    const errors = {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
      data: { email: normalizedEmail, password }
    };
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
    if (typeof onClearError === "function") {
      onClearError();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validate();
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      if (validation.errors.email) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    try {
      await onSubmit(validation.data);
    } catch {
      // API error presentation is handled by Register.jsx
    }
  };

  return (
    <form className="register-form login-form" onSubmit={handleSubmit} noValidate>
      <div className={`input-group ${fieldErrors.email ? "input-group-error" : ""}`}>
        <label htmlFor="login-email">Email address</label>
        <div className="input-control">
          <span className="input-icon" aria-hidden="true">✉</span>
          <input
            ref={emailRef} id="login-email" name="email" type="email" inputMode="email" autoComplete="email"
            placeholder="Enter your email address" value={email} disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
          />
        </div>
        {fieldErrors.email && (
          <span id="login-email-error" className="field-error" role="alert">{fieldErrors.email}</span>
        )}
      </div>

      <div className={`input-group ${fieldErrors.password ? "input-group-error" : ""}`}>
        <div className="password-label-row">
          <label htmlFor="login-password">Password</label>
          <button type="button" className="forgot-password-button" disabled={isSubmitting} onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>
        <div className="input-control">
          <span className="input-icon" aria-hidden="true">🔒</span>
          <input
            ref={passwordRef} id="login-password" name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password" placeholder="Enter your password"
            value={password} disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
          />
          <button
            type="button" className="password-toggle" disabled={isSubmitting}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors.password && (
          <span id="login-password-error" className="field-error" role="alert">{fieldErrors.password}</span>
        )}
      </div>

      {serverError && (
        <div className="registration-global-error" role="alert">
          <span aria-hidden="true">!</span><p>{serverError}</p>
        </div>
      )}

      <button type="submit" className="submit-btn" disabled={isSubmitting} aria-busy={isSubmitting}>
        <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
        {!isSubmitting && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}

export default AuthenticationLoginForm;