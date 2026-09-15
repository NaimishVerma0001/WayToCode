import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  requestRegistrationOtp,
  resendRegistrationOtp,
  verifyRegistrationOtp
} from "../services";

/*
|--------------------------------------------------------------------------
| Registration States
|--------------------------------------------------------------------------
*/

export const REGISTRATION_PHASES = {
  DETAILS: "details",
  OTP: "otp",
  COMPLETE: "complete"
};

const ALLOWED_ERROR_FIELDS =
  new Set([
    "username",
    "email",
    "password",
    "confirmPassword",
    "otp"
  ]);

/*
|--------------------------------------------------------------------------
| Countdown Helper
|--------------------------------------------------------------------------
*/

const getRemainingSeconds = (
  targetTimestamp,
  currentTimestamp
) => {
  if (
    !Number.isFinite(
      targetTimestamp
    ) ||
    !Number.isFinite(
      currentTimestamp
    )
  ) {
    return 0;
  }

  return Math.max(
    Math.ceil(
      (
        targetTimestamp -
        currentTimestamp
      ) /
      1000
    ),
    0
  );
};

/*
|--------------------------------------------------------------------------
| Registration Flow Hook
|--------------------------------------------------------------------------
*/

const useRegistrationFlow = () => {
  const [
    phase,
    setPhase
  ] = useState(
    REGISTRATION_PHASES.DETAILS
  );

  const [
    registrationId,
    setRegistrationId
  ] = useState("");

  const [
    maskedEmail,
    setMaskedEmail
  ] = useState("");

  const [
    otpExpiresAt,
    setOtpExpiresAt
  ] = useState(null);

  const [
    resendAvailableAt,
    setResendAvailableAt
  ] = useState(null);

  const [
    currentTime,
    setCurrentTime
  ] = useState(
    Date.now()
  );

  const [
    isSubmitting,
    setIsSubmitting
  ] = useState(false);

  const [
    fieldErrors,
    setFieldErrors
  ] = useState({});

  const [
    globalError,
    setGlobalError
  ] = useState("");

  const [
    attemptsRemaining,
    setAttemptsRemaining
  ] = useState(null);

  const [
    developmentMode,
    setDevelopmentMode
  ] = useState(false);

  const activeControllerRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  /*
  |--------------------------------------------------------------------------
  | Lifecycle Safety
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      activeControllerRef
        .current
        ?.abort();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Drift-Resistant Countdown
  |--------------------------------------------------------------------------
  |
  | We store absolute timestamps rather than decrementing counters.
  | Background browser throttling therefore cannot corrupt the countdown.
  |
  */

  useEffect(() => {
    if (
      phase !==
      REGISTRATION_PHASES.OTP
    ) {
      return undefined;
    }

    setCurrentTime(
      Date.now()
    );

    const intervalId =
      window.setInterval(
        () => {
          setCurrentTime(
            Date.now()
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [phase]);

  /*
  |--------------------------------------------------------------------------
  | Derived State
  |--------------------------------------------------------------------------
  */

  const otpSecondsRemaining =
    useMemo(
      () =>
        getRemainingSeconds(
          otpExpiresAt,
          currentTime
        ),
      [
        otpExpiresAt,
        currentTime
      ]
    );

  const resendSecondsRemaining =
    useMemo(
      () =>
        getRemainingSeconds(
          resendAvailableAt,
          currentTime
        ),
      [
        resendAvailableAt,
        currentTime
      ]
    );

  const otpHasExpired =
    phase ===
      REGISTRATION_PHASES.OTP &&
    otpSecondsRemaining === 0;

  const canResend =
    phase ===
      REGISTRATION_PHASES.OTP &&
    resendSecondsRemaining === 0 &&
    !isSubmitting;

  /*
  |--------------------------------------------------------------------------
  | Request Controller
  |--------------------------------------------------------------------------
  */

  const createRequestController =
    useCallback(() => {
      activeControllerRef
        .current
        ?.abort();

      const controller =
        new AbortController();

      activeControllerRef.current =
        controller;

      return controller;
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Error Management
  |--------------------------------------------------------------------------
  */

  const clearErrors =
    useCallback(() => {
      setFieldErrors({});
      setGlobalError("");
    }, []);

  const clearFieldError =
    useCallback(
      (
        fieldName
      ) => {
        setFieldErrors(
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
      },
      []
    );

  const applyApiError =
    useCallback(
      (
        error
      ) => {
        const responseData =
          error?.data &&
          typeof error.data ===
            "object"
            ? error.data
            : {};

        const field =
          responseData.field;

        const message =
          responseData.message ||
          error?.message ||
          (
            "The request could " +
            "not be completed."
          );

        if (
          typeof field ===
            "string" &&
          ALLOWED_ERROR_FIELDS.has(
            field
          )
        ) {
          setFieldErrors({
            [field]: message
          });

          setGlobalError("");
        } else {
          setGlobalError(
            message
          );
        }

        const remaining =
          Number(
            responseData
              ?.details
              ?.attemptsRemaining
          );

        setAttemptsRemaining(
          Number.isFinite(
            remaining
          )
            ? remaining
            : null
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | Start Registration
  |--------------------------------------------------------------------------
  */

  const requestOtp =
    useCallback(
      async (
        registrationDetails
      ) => {
        if (isSubmitting) {
          return null;
        }

        const controller =
          createRequestController();

        setIsSubmitting(true);
        clearErrors();

        try {
          const result =
            await requestRegistrationOtp({
              ...registrationDetails,

              signal:
                controller.signal
            });

          if (
            !mountedRef.current ||
            controller.signal.aborted
          ) {
            return null;
          }

          const now =
            Date.now();

          setRegistrationId(
            result.registrationId
          );

          setMaskedEmail(
            result.email
          );

          setOtpExpiresAt(
            now +
            result
              .expiresInSeconds *
            1000
          );

          setResendAvailableAt(
            now +
            result
              .resendAvailableInSeconds *
            1000
          );

          setAttemptsRemaining(
            null
          );

          setDevelopmentMode(
            result.developmentMode
          );

          setCurrentTime(now);

          setPhase(
            REGISTRATION_PHASES.OTP
          );

          return result;
        } catch (error) {
          if (
            error.name ===
            "AbortError"
          ) {
            return null;
          }

          if (
            mountedRef.current
          ) {
            applyApiError(error);
          }

          throw error;
        } finally {
          if (
            mountedRef.current &&
            activeControllerRef
              .current ===
              controller
          ) {
            setIsSubmitting(false);

            activeControllerRef.current =
              null;
          }
        }
      },
      [
        applyApiError,
        clearErrors,
        createRequestController,
        isSubmitting
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Verify OTP
  |--------------------------------------------------------------------------
  */

  const verifyOtp =
    useCallback(
      async (
        otp
      ) => {
        if (
          isSubmitting ||
          !registrationId ||
          phase !==
            REGISTRATION_PHASES.OTP
        ) {
          return null;
        }

        const controller =
          createRequestController();

        setIsSubmitting(true);
        clearErrors();

        try {
          const result =
            await verifyRegistrationOtp({
              registrationId,
              otp,

              signal:
                controller.signal
            });

          if (
            !mountedRef.current ||
            controller.signal.aborted
          ) {
            return null;
          }

          setPhase(
            REGISTRATION_PHASES
              .COMPLETE
          );

          return result;
        } catch (error) {
          if (
            error.name ===
            "AbortError"
          ) {
            return null;
          }

          if (
            mountedRef.current
          ) {
            applyApiError(error);
          }

          throw error;
        } finally {
          if (
            mountedRef.current &&
            activeControllerRef
              .current ===
              controller
          ) {
            setIsSubmitting(false);

            activeControllerRef.current =
              null;
          }
        }
      },
      [
        applyApiError,
        clearErrors,
        createRequestController,
        isSubmitting,
        phase,
        registrationId
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Resend OTP
  |--------------------------------------------------------------------------
  */

  const resendOtp =
    useCallback(
      async () => {
        if (
          !canResend ||
          !registrationId
        ) {
          return null;
        }

        const controller =
          createRequestController();

        setIsSubmitting(true);
        clearErrors();

        try {
          const result =
            await resendRegistrationOtp({
              registrationId,

              signal:
                controller.signal
            });

          if (
            !mountedRef.current ||
            controller.signal.aborted
          ) {
            return null;
          }

          const now =
            Date.now();

          setRegistrationId(
            result.registrationId
          );

          setMaskedEmail(
            result.email
          );

          setOtpExpiresAt(
            now +
            result
              .expiresInSeconds *
            1000
          );

          setResendAvailableAt(
            now +
            result
              .resendAvailableInSeconds *
            1000
          );

          setAttemptsRemaining(
            null
          );

          setDevelopmentMode(
            result.developmentMode
          );

          setCurrentTime(now);

          return result;
        } catch (error) {
          if (
            error.name ===
            "AbortError"
          ) {
            return null;
          }

          if (
            mountedRef.current
          ) {
            applyApiError(error);
          }

          throw error;
        } finally {
          if (
            mountedRef.current &&
            activeControllerRef
              .current ===
              controller
          ) {
            setIsSubmitting(false);

            activeControllerRef.current =
              null;
          }
        }
      },
      [
        applyApiError,
        canResend,
        clearErrors,
        createRequestController,
        registrationId
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Return to Registration Details
  |--------------------------------------------------------------------------
  */

  const restartRegistration =
    useCallback(() => {
      activeControllerRef
        .current
        ?.abort();

      activeControllerRef.current =
        null;

      setPhase(
        REGISTRATION_PHASES.DETAILS
      );

      setRegistrationId("");
      setMaskedEmail("");
      setOtpExpiresAt(null);
      setResendAvailableAt(null);
      setAttemptsRemaining(null);
      setDevelopmentMode(false);
      setIsSubmitting(false);

      clearErrors();
    }, [clearErrors]);

  return {
    phase,
    registrationId,
    maskedEmail,

    isSubmitting,
    fieldErrors,
    globalError,

    attemptsRemaining,
    developmentMode,

    otpSecondsRemaining,
    resendSecondsRemaining,
    otpHasExpired,
    canResend,

    requestOtp,
    verifyOtp,
    resendOtp,
    restartRegistration,

    clearErrors,
    clearFieldError
  };
};

export default useRegistrationFlow;