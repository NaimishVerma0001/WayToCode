import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { loginUser } from "../services";
import AuthenticationLoginForm from "../components/AuthenticationLoginForm";
import RegistrationDetailsForm from "../components/RegistrationDetailsForm";
import RegistrationOtpForm from "../components/RegistrationOtpForm";
import useRegistrationFlow, { REGISTRATION_PHASES } from "../hooks/useRegistrationFlow";

import "../styles/Register.css";

const AUTHENTICATION_MODES = {
  REGISTER: "register",
  LOGIN: "login"
};

function Register({ handleLoginSuccess, onForgotPassword }) {
  const [mode, setMode] = useState(AUTHENTICATION_MODES.REGISTER);
  const [loginIsSubmitting, setLoginIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const registration = useRegistrationFlow();

  const isRegisterMode = mode === AUTHENTICATION_MODES.REGISTER;
  const isOtpPhase = isRegisterMode && registration.phase === REGISTRATION_PHASES.OTP;
  const pageIsBusy = loginIsSubmitting || registration.isSubmitting;

  const headingContent = useMemo(() => {
    if (!isRegisterMode) {
      return {
        eyebrow: "Member login",
        title: "Welcome back",
        description: "Sign in to continue to your coding dashboard."
      };
    }
    return {
      eyebrow: "Join Way2Code",
      title: "Create your account",
      description: "Track your coding progress across multiple platforms from one place."
    };
  }, [isRegisterMode]);

  const handleRegistrationStart = async (registrationDetails) => {
    try {
      const result = await registration.requestOtp(registrationDetails);
      if (result) {
        toast.success(result.message || "Verification code sent successfully.", {
          position: "top-center", autoClose: 3000, toastId: "registration-otp-sent"
        });
      }
      return result;
    } catch (error) {
      toast.error(error.message || "Registration could not be started.", {
        position: "top-center", autoClose: 4000, toastId: "registration-start-error"
      });
      throw error;
    }
  };

  const handleOtpVerification = async (otp) => {
    try {
      const result = await registration.verifyOtp(otp);
      if (!result) return null;

      toast.success(result.message || "Account created successfully.", {
        position: "top-center", autoClose: 3500, toastId: "registration-complete"
      });

      setMode(AUTHENTICATION_MODES.LOGIN);
      setLoginError("");
      registration.restartRegistration();
      return result;
    } catch (error) {
      toast.error(error.message || "The verification code could not be confirmed.", {
        position: "top-center", autoClose: 4000, toastId: "registration-otp-error"
      });
      throw error;
    }
  };

  const handleOtpResend = async () => {
    try {
      const result = await registration.resendOtp();
      if (result) {
        toast.success(result.message || "A new verification code has been sent.", {
          position: "top-center", autoClose: 3000, toastId: "registration-otp-resent"
        });
      }
      return result;
    } catch (error) {
      toast.error(error.message || "A new verification code could not be sent.", {
        position: "top-center", autoClose: 4000, toastId: "registration-resend-error"
      });
      throw error;
    }
  };

  const handleLogin = async (credentials) => {
    if (loginIsSubmitting) return null;

    setLoginIsSubmitting(true);
    setLoginError("");

    try {
      const authentication = await loginUser(credentials);

      // CRITICAL FIX: Synchronously inject user into React Query cache
      queryClient.setQueryData(["currentUser"], authentication.user);

      if (typeof handleLoginSuccess === "function") {
        handleLoginSuccess(authentication.user);
      }

      toast.success(`Welcome back, ${authentication.user.username}!`, {
        position: "top-center", autoClose: 2500, toastId: "login-success"
      });

      // CRITICAL FIX: Route the user to the dashboard
      navigate("/profile", { replace: true });

      return authentication;
    } catch (error) {
      const message = error.message || "Unable to sign in. Check your credentials.";
      setLoginError(message);
      toast.error(message, {
        position: "top-center", autoClose: 4000, toastId: "login-error"
      });
      throw error;
    } finally {
      setLoginIsSubmitting(false);
    }
  };

  const changeMode = () => {
    if (pageIsBusy) return;
    setMode((currentMode) =>
      currentMode === AUTHENTICATION_MODES.REGISTER
        ? AUTHENTICATION_MODES.LOGIN
        : AUTHENTICATION_MODES.REGISTER
    );
    setLoginError("");
    registration.restartRegistration();
    toast.dismiss();
  };

  const openPasswordRecovery = () => {
    if (pageIsBusy) return;
    toast.dismiss();
    if (typeof onForgotPassword === "function") {
      onForgotPassword();
    }
  };

  return (
    <main className="main-viewport register-page">
      <div className="authentication-shell">
        <aside className="authentication-story" aria-label="Way2Code benefits">
          <div className="authentication-story-content">
            <span className="authentication-story-badge">Your developer command center</span>
            <h2>One profile. Every coding milestone.</h2>
            <p>Bring your competitive programming journey together and turn daily practice into visible, measurable progress.</p>
            <ul className="authentication-benefits">
              <li>Every platform&apos;s numbers in one place</li>
              <li>Contest reminders before the round starts</li>
              <li>A daily record of how your solving is moving</li>
            </ul>
          </div>
          <div className="authentication-story-proof">
            <span aria-hidden="true">✓</span>
            <p><strong>Built for focused developers</strong> Private by design. Your progress remains yours.</p>
          </div>
        </aside>

        <section className="register-box" aria-labelledby="authentication-title" aria-busy={pageIsBusy}>
          <div className="register-brand">
            <span className="register-brand-icon mono" aria-hidden="true">W2</span>
            <h1 className="register-logo">WAY2CODE</h1>
          </div>

          {!isOtpPhase && (
            <div className="register-heading">
              <span className="register-eyebrow">{headingContent.eyebrow}</span>
              <h2 id="authentication-title">{headingContent.title}</h2>
              <p>{headingContent.description}</p>
            </div>
          )}

          {isRegisterMode ? (
            <>
              {registration.phase === REGISTRATION_PHASES.DETAILS && (
                <RegistrationDetailsForm
                  isSubmitting={registration.isSubmitting}
                  serverFieldErrors={registration.fieldErrors}
                  globalError={registration.globalError}
                  onSubmit={handleRegistrationStart}
                  onClearFieldError={() => registration.clearErrors()}
                />
              )}
              {registration.phase === REGISTRATION_PHASES.OTP && (
                <RegistrationOtpForm
                  maskedEmail={registration.maskedEmail}
                  otpSecondsRemaining={registration.otpSecondsRemaining}
                  resendSecondsRemaining={registration.resendSecondsRemaining}
                  otpHasExpired={registration.otpHasExpired}
                  canResend={registration.canResend}
                  attemptsRemaining={registration.attemptsRemaining}
                  developmentMode={registration.developmentMode}
                  isSubmitting={registration.isSubmitting}
                  error={registration.fieldErrors.otp || ""}
                  globalError={registration.globalError}
                  onVerify={handleOtpVerification}
                  onResend={handleOtpResend}
                  onChangeEmail={registration.restartRegistration}
                  onClearError={registration.clearFieldError}
                />
              )}
            </>
          ) : (
            <AuthenticationLoginForm
              isSubmitting={loginIsSubmitting}
              serverError={loginError}
              onSubmit={handleLogin}
              onForgotPassword={openPasswordRecovery}
              onClearError={() => setLoginError("")}
            />
          )}

          <div className="register-divider" aria-hidden="true">
            <span /><p>or</p><span />
          </div>

          <div className="authentication-switch">
            <p>{isRegisterMode ? "Already have an account?" : "New to Way2Code?"}</p>
            <button type="button" className="modern-login-btn" onClick={changeMode} disabled={pageIsBusy}>
              {isRegisterMode ? "Sign In" : "Create Account"}
            </button>
          </div>

          <p className="register-terms">
            By continuing, you agree to the Way2Code Terms of Service and Privacy Policy.
          </p>
        </section>
      </div>
    </main>
  );
}

export default Register;