// server/src/routes/authRoutes.js

const express = require("express");

const authController = require("../controllers/authController");
const registrationController = require("../controllers/registrationController");
const passwordRecoveryController = require("../controllers/passwordRecoveryController");

const authMiddleware = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validateMiddleware");

const {
    forgotPasswordRateLimit,
    resetPasswordRateLimit
} = require("../middlewares/passwordRecoveryRateLimit");

const {
    registrationRequestRateLimit,
    otpVerificationRateLimit,
    otpResendRateLimit
} = require("../middlewares/registrationRateLimit");

const {
    registerSchema,
    requestOtpSchema,
    verifyOtpSchema,
    resendOtpSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} = require("../validations/authValidations");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Registration & OTP
|--------------------------------------------------------------------------
*/
router.post("/register", validate(registerSchema), authController.register);

router.post(
    "/register/request-otp",
    registrationRequestRateLimit,
    validate(requestOtpSchema),
    registrationController.requestOtp
);

router.post(
    "/register/verify-otp",
    otpVerificationRateLimit,
    validate(verifyOtpSchema),
    registrationController.verifyOtp
);

router.post(
    "/register/resend-otp",
    otpResendRateLimit,
    validate(resendOtpSchema),
    registrationController.resendOtp
);

/*
|--------------------------------------------------------------------------
| Authentication Lifecycle
|--------------------------------------------------------------------------
*/
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.getCurrentUser);

/*
|--------------------------------------------------------------------------
| Password Recovery
|--------------------------------------------------------------------------
*/
router.post(
    "/forgot-password",
    forgotPasswordRateLimit,
    validate(forgotPasswordSchema),
    passwordRecoveryController.forgotPassword
);

router.post(
    "/reset-password",
    resetPasswordRateLimit,
    validate(resetPasswordSchema),
    passwordRecoveryController.resetPassword
);

module.exports = router;
