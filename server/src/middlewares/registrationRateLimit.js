// server/src/middlewares/registrationRateLimit.js
const rateLimit = require("express-rate-limit");

const registrationRequestRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: "Too many registration attempts. Please try again in 15 minutes." }
});

const otpVerificationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many OTP verification attempts. Please try again later." }
});

const otpResendRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: "Too many OTP resend requests. Please try again in an hour." }
});

module.exports = {
    registrationRequestRateLimit,
    otpVerificationRateLimit,
    otpResendRateLimit
};