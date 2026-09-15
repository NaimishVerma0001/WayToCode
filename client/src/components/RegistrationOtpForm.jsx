import React, { useEffect, useMemo, useRef, useState } from "react";

const OTP_LENGTH = 6;

const createEmptyDigits = () => Array.from({ length: OTP_LENGTH }, () => "");

const sanitizeOtp = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, OTP_LENGTH);
};

const formatCountdown = (totalSeconds) => {
  const safeSeconds = Math.max(Number(totalSeconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

function RegistrationOtpForm({
  maskedEmail,
  otpSecondsRemaining,
  resendSecondsRemaining,
  otpHasExpired,
  canResend,
  attemptsRemaining,
  developmentMode,
  isSubmitting,
  error,
  globalError,
  onVerify,
  onResend,
  onChangeEmail,
  onClearError
}) {
  const [digits, setDigits] = useState(createEmptyDigits);
  const [localError, setLocalError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otp = useMemo(() => digits.join(""), [digits]);
  const otpIsComplete = otp.length === OTP_LENGTH;

  const clearOtpError = () => {
    setLocalError("");
    if (typeof onClearError === "function") {
      onClearError("otp");
    }
  };

  const distributeDigits = (rawValue, startIndex = 0) => {
    const numericValue = sanitizeOtp(rawValue);
    if (!numericValue) return;

    setDigits((currentDigits) => {
      const nextDigits = [...currentDigits];
      numericValue.split("").forEach((digit, offset) => {
        const targetIndex = startIndex + offset;
        if (targetIndex < OTP_LENGTH) {
          nextDigits[targetIndex] = digit;
        }
      });
      return nextDigits;
    });

    const finalIndex = Math.min(
      startIndex + numericValue.length,
      OTP_LENGTH - 1
    );

    window.requestAnimationFrame(() => {
      inputRefs.current[finalIndex]?.focus();
      inputRefs.current[finalIndex]?.select();
    });

    clearOtpError();
  };

  const handleDigitChange = (index, event) => {
    const rawValue = event.target.value;
    const numericValue = sanitizeOtp(rawValue);

    if (numericValue.length > 1) {
      distributeDigits(numericValue, index);
      return;
    }

    setDigits((currentDigits) => {
      const nextDigits = [...currentDigits];
      nextDigits[index] = numericValue;
      return nextDigits;
    });

    clearOtpError();

    if (numericValue && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((currentDigits) => {
        const nextDigits = [...currentDigits];
        nextDigits[index - 1] = "";
        return nextDigits;
      });
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      inputRefs.current[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedValue = event.clipboardData.getData("text");
    const numericValue = sanitizeOtp(pastedValue);

    if (!numericValue) {
      setLocalError("The pasted value does not contain a valid code.");
      return;
    }

    const nextDigits = createEmptyDigits();
    numericValue.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });

    setDigits(nextDigits);
    clearOtpError();

    const focusIndex = Math.min(numericValue.length, OTP_LENGTH) - 1;
    window.requestAnimationFrame(() => {
      inputRefs.current[Math.max(focusIndex, 0)]?.focus();
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (otpHasExpired) {
      setLocalError("This verification code has expired. Request a new code.");
      return;
    }

    if (!otpIsComplete) {
      setLocalError(`Enter the complete ${OTP_LENGTH}-digit code.`);
      const emptyIndex = digits.findIndex((digit) => !digit);
      inputRefs.current[emptyIndex >= 0 ? emptyIndex : 0]?.focus();
      return;
    }

    clearOtpError();

    try {
      await onVerify(otp);
    } catch {
      setDigits(createEmptyDigits());
      window.requestAnimationFrame(() => {
        inputRefs.current[0]?.focus();
      });
    }
  };

  const handleResend = async () => {
    if (!canResend || isSubmitting) return;
    clearOtpError();

    try {
      const result = await onResend();
      if (result) {
        setDigits(createEmptyDigits());
        window.requestAnimationFrame(() => {
          inputRefs.current[0]?.focus();
        });
      }
    } catch {
      // API Error handled by parent hook
    }
  };

  const visibleError = localError || error || globalError || "";

  return (
    <div className="registration-otp">
      <div className="otp-security-icon" aria-hidden="true">✓</div>
      <div className="otp-heading">
        <span className="register-eyebrow">Email verification</span>
        <h2 id="authentication-title">Check your inbox</h2>
        <p>We sent a six-digit verification code to</p>
        <strong className="otp-email">{maskedEmail}</strong>
      </div>

      {developmentMode && (
        <div className="otp-development-notice" role="status">
          Development mode: find the verification code in the backend terminal.
        </div>
      )}

      <form className="otp-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="otp-fieldset" disabled={isSubmitting}>
          <legend>Verification code</legend>
          <div className={`otp-inputs ${visibleError ? "otp-inputs-error" : ""}`} onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                value={digit}
                aria-label={`Verification code digit ${index + 1}`}
                aria-invalid={Boolean(visibleError)}
                onChange={(event) => handleDigitChange(index, event)}
                onKeyDown={(event) => handleKeyDown(index, event)}
              />
            ))}
          </div>
        </fieldset>

        <div className="otp-status-row" aria-live="polite">
          <span>
            {otpHasExpired
              ? "Code expired"
              : "Code expires in " + formatCountdown(otpSecondsRemaining)}
          </span>
          {Number.isFinite(attemptsRemaining) && (
            <span>
              {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining
            </span>
          )}
        </div>

        {visibleError && (
          <p className="otp-error-message" role="alert">
            {visibleError}
          </p>
        )}

        <button
          type="submit"
          className="submit-btn otp-verify-button"
          disabled={isSubmitting || !otpIsComplete || otpHasExpired}
          aria-busy={isSubmitting}
        >
          <span>{isSubmitting ? "Verifying..." : "Verify & Create Account"}</span>
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <div className="otp-secondary-actions">
        <p>Didn&apos;t receive the code?</p>
        <button
          type="button"
          className="otp-resend-button"
          disabled={!canResend || isSubmitting}
          onClick={handleResend}
        >
          {resendSecondsRemaining > 0
            ? "Resend in " + formatCountdown(resendSecondsRemaining)
            : "Resend code"}
        </button>
      </div>

      <button
        type="button"
        className="otp-change-email-button"
        disabled={isSubmitting}
        onClick={onChangeEmail}
      >
        ← Change email or account details
      </button>
    </div>
  );
}

export default RegistrationOtpForm;