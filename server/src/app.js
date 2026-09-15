// server/src/app.js

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const mongoose = require("mongoose");

const { getAllowedOrigins } = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middlewares/errorMiddlewares");

const plannerRoutes = require("./routes/plannerRoutes");
const contestRoutes = require("./routes/contestRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const dailyProblemRoutes = require("./routes/dailyProblemRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const suggestionRoutes = require("./routes/suggestionRoutes");

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

app.disable("x-powered-by");

/*
|--------------------------------------------------------------------------
| Proxy Configuration
|--------------------------------------------------------------------------
| RENDER is injected automatically by Render's infrastructure and acts as a
| fallback when NODE_ENV has not been set manually. Trusting exactly one proxy
| hop keeps req.ip accurate for rate limiting without letting a client spoof
| X-Forwarded-For from further upstream.
*/
if (isProduction || process.env.RENDER) {
    app.set("trust proxy", 1);
}

/*
|--------------------------------------------------------------------------
| Request Correlation
|--------------------------------------------------------------------------
| Every request carries an id that is echoed in the response header and in
| any error body, so a user-reported failure can be traced in the logs.
*/
app.use((req, res, next) => {
    req.id = req.headers["x-request-id"] || crypto.randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
});

/*
|--------------------------------------------------------------------------
| Security Headers
|--------------------------------------------------------------------------
| The API serves JSON only, so a restrictive CSP costs nothing here. The
| SPA is hosted separately and carries its own policy.
*/
app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                "default-src": ["'none'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'none'"],
                "form-action": ["'none'"]
            }
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        referrerPolicy: { policy: "no-referrer" },
        hsts: isProduction
            ? { maxAge: 31536000, includeSubDomains: true, preload: true }
            : false
    })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
| The allow-list comes from the same parser the WebSocket server uses, so the
| two can never drift apart.
*/
const allowedOrigins = getAllowedOrigins();

const corsOptions = {
    origin(origin, callback) {
        // Same-origin, curl and server-to-server requests send no Origin.
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) return callback(null, true);

        const error = new Error("This origin is not allowed by CORS.");
        error.status = 403;
        error.code = "ORIGIN_NOT_ALLOWED";

        return callback(error);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token", "token", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 100 }));

/*
|--------------------------------------------------------------------------
| Rate Limiting
|--------------------------------------------------------------------------
| Limits are disabled under test so that suites exercising many requests do
| not trip the limiter and mask real assertions.
*/
const createLimiter = ({ windowMs, limit, message, code, keyGenerator }) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skip: () => isTest,
        keyGenerator,
        handler: (req, res) => {
            res.status(429).json({ success: false, code, message });
        }
    });

const apiLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    code: "RATE_LIMITED",
    message: "Too many API requests. Please try again later."
});

const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    code: "AUTH_RATE_LIMITED",
    message: "Too many authentication attempts. Please wait 15 minutes and try again.",
    // Credential stuffing rotates the account, not the source address, so the
    // identifier is part of the key alongside the IP.
    keyGenerator: (req) => {
        const identifier =
            typeof req.body?.email === "string"
                ? req.body.email.toLowerCase().trim()
                : typeof req.body?.username === "string"
                  ? req.body.username.toLowerCase().trim()
                  : "";

        return `${ipKeyGenerator(req.ip)}:${identifier}`;
    }
});

const writeLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    code: "WRITE_RATE_LIMITED",
    message: "Too many submissions. Please try again later."
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| Utility Routes
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Welcome to Way2Code Backend API 🚀"
    });
});

const MONGOOSE_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

/**
 * Liveness and readiness in one probe. A degraded database reports 503 so
 * Render stops routing traffic to an instance that cannot serve requests.
 */
app.get("/health", (req, res) => {
    const databaseState = MONGOOSE_STATES[mongoose.connection.readyState] || "unknown";
    const isHealthy = mongoose.connection.readyState === 1;

    return res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        status: isHealthy ? "healthy" : "degraded",
        environment: process.env.NODE_ENV || "development",
        database: databaseState,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
    });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/suggestions", writeLimiter, suggestionRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/daily-problems", dailyProblemRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reminders", reminderRoutes);

/*
|--------------------------------------------------------------------------
| Error Handling
|--------------------------------------------------------------------------
*/
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
