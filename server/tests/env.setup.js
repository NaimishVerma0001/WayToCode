/**
 * Deterministic environment for every test project.
 *
 * Runs before the test framework is installed (jest `setupFiles`) so that
 * modules reading `process.env` at import time see these values.
 */

process.env.NODE_ENV = "test";

process.env.JWT_SECRET =
    process.env.JWT_SECRET || "way2code_test_secret_that_is_longer_than_32_characters";

process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

process.env.REGISTRATION_OTP_SECRET =
    process.env.REGISTRATION_OTP_SECRET ||
    "way2code_test_otp_secret_that_is_longer_than_32_characters";

// Keep signup fast: the production cost factor would dominate the suite runtime.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || "10";

// SMTP is intentionally left unset so emails fall back to console logging.
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.EMAIL_FROM;
