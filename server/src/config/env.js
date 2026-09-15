// server/src/config/env.js

const DEFAULT_PORT = 5001;
const DEFAULT_CLIENT_URL = "http://localhost:3000";
const MINIMUM_SECRET_LENGTH = 32;

const readVariable = (name, fallbackName) => {
    const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");

    return typeof value === "string" ? value.trim() : "";
};

const requireVariable = (name, fallbackName) => {
    const value = readVariable(name, fallbackName);

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

/**
 * Parse CLIENT_URL into a normalised origin allow-list.
 *
 * Exported on its own so the HTTP CORS layer and the WebSocket server consume
 * exactly the same list; duplicating this parsing previously allowed the two
 * to drift apart.
 *
 * @returns {string[]}
 */
const getAllowedOrigins = () => {
    const rawClientUrl = process.env.CLIENT_URL || DEFAULT_CLIENT_URL;

    const origins = rawClientUrl
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean);

    return [...new Set(origins)];
};

/** True when every SMTP variable required for real delivery is present. */
const hasEmailConfiguration = () =>
    Boolean(
        readVariable("SMTP_HOST") &&
            readVariable("SMTP_USER") &&
            readVariable("SMTP_PASS") &&
            readVariable("EMAIL_FROM")
    );

/**
 * Validate the process environment and return the normalised configuration.
 * Throws on the first problem so a misconfigured deployment fails at boot
 * rather than at the first request that needs the missing value.
 */
const validateEnvironment = () => {
    const nodeEnvironment = process.env.NODE_ENV || "development";
    const isProduction = nodeEnvironment === "production";

    const mongoUri = requireVariable("MONGO_URI", "MONGODB_URI");
    const jwtSecret = requireVariable("JWT_SECRET");

    if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
        throw new Error("MONGO_URI must begin with mongodb:// or mongodb+srv://.");
    }

    if (jwtSecret.length < MINIMUM_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters.`);
    }

    const port = Number(process.env.PORT || DEFAULT_PORT);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be a valid number between 1 and 65535.");
    }

    if (isProduction && !process.env.CLIENT_URL) {
        throw new Error("CLIENT_URL is required in production.");
    }

    const allowedOrigins = getAllowedOrigins();

    if (isProduction && allowedOrigins.some((origin) => origin.startsWith("http://"))) {
        throw new Error("CLIENT_URL must use https:// in production.");
    }

    const otpSecret = readVariable("REGISTRATION_OTP_SECRET");

    /*
     * The OTP secret and SMTP credentials are optional locally (registration
     * codes are printed to the console) but a production deployment without
     * them silently breaks signup, so it is rejected at boot instead.
     */
    if (isProduction) {
        if (otpSecret.length < MINIMUM_SECRET_LENGTH) {
            throw new Error(
                `REGISTRATION_OTP_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters in production.`
            );
        }

        if (!hasEmailConfiguration()) {
            throw new Error(
                "SMTP_HOST, SMTP_USER, SMTP_PASS and EMAIL_FROM are required in production."
            );
        }
    }

    return {
        nodeEnvironment,
        isProduction,
        port,
        mongoUri,
        jwtSecret,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
        clientUrl: process.env.CLIENT_URL || DEFAULT_CLIENT_URL,
        allowedOrigins,
        emailConfigured: hasEmailConfiguration(),
        otpConfigured: otpSecret.length >= MINIMUM_SECRET_LENGTH
    };
};

module.exports = {
    validateEnvironment,
    getAllowedOrigins,
    hasEmailConfiguration,
    DEFAULT_PORT,
    DEFAULT_CLIENT_URL,
    MINIMUM_SECRET_LENGTH
};
