// server/src/middlewares/errorMiddlewares.js

/**
 * Centralised error handling.
 *
 * Every route funnels failures here so that clients receive one consistent
 * error envelope and internal details never leak in production:
 *
 *   { success: false, code, message, field?, errors?, details? }
 */

const ApplicationError = require("../utils/ApplicationError");

const isProduction = () => process.env.NODE_ENV === "production";

const notFoundHandler = (req, res) => {
    return res.status(404).json({
        success: false,
        code: "ROUTE_NOT_FOUND",
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
};

/** Zod v4 reports failures on `issues`; the `errors` alias was removed. */
const formatZodIssues = (issues) => {
    return issues.map((issue) => ({
        field:
            Array.isArray(issue.path) && issue.path.length
                ? issue.path.join(".")
                : "body",
        code: issue.code || "invalid_value",
        message: issue.message || "Invalid value."
    }));
};

const normalizeError = (error) => {
    if (error instanceof ApplicationError) {
        return {
            status: error.status,
            code: error.code,
            message: error.message,
            field: error.field,
            details: error.details
        };
    }

    // Zod validation failure that escaped the validate middleware.
    if (error?.name === "ZodError" && Array.isArray(error.issues)) {
        return {
            status: 400,
            code: "VALIDATION_FAILED",
            message: "Invalid request payload.",
            errors: formatZodIssues(error.issues)
        };
    }

    // Mongoose: bad ObjectId or uncastable value.
    if (error?.name === "CastError") {
        return {
            status: 400,
            code: "INVALID_IDENTIFIER",
            message: `The value provided for "${error.path}" is not valid.`,
            field: error.path
        };
    }

    // Mongoose: schema validation.
    if (error?.name === "ValidationError" && error.errors) {
        const fields = Object.values(error.errors).map((fieldError) => ({
            field: fieldError.path,
            code: fieldError.kind || "invalid_value",
            message: fieldError.message
        }));

        return {
            status: 400,
            code: "VALIDATION_FAILED",
            message: "Some of the submitted values are invalid.",
            errors: fields
        };
    }

    // MongoDB: unique index violation.
    if (error?.code === 11000) {
        const duplicateField =
            Object.keys(error.keyPattern || {})[0] ||
            Object.keys(error.keyValue || {})[0] ||
            "value";

        return {
            status: 409,
            code: "DUPLICATE_VALUE",
            message: `That ${duplicateField} is already in use.`,
            field: duplicateField
        };
    }

    if (error?.name === "TokenExpiredError") {
        return {
            status: 401,
            code: "TOKEN_EXPIRED",
            message: "Your session has expired. Please sign in again."
        };
    }

    if (error?.name === "JsonWebTokenError" || error?.name === "NotBeforeError") {
        return {
            status: 401,
            code: "INVALID_TOKEN",
            message: "Invalid authentication token."
        };
    }

    // body-parser failures.
    if (error?.type === "entity.parse.failed") {
        return {
            status: 400,
            code: "INVALID_JSON",
            message: "Request body contains invalid JSON."
        };
    }

    if (error?.type === "entity.too.large") {
        return {
            status: 413,
            code: "PAYLOAD_TOO_LARGE",
            message: "Request body is too large."
        };
    }

    // Errors that already carry an HTTP status (CORS rejection, services, ...).
    const declaredStatus = Number(error?.status ?? error?.statusCode);

    if (
        Number.isInteger(declaredStatus) &&
        declaredStatus >= 400 &&
        declaredStatus <= 599
    ) {
        return {
            status: declaredStatus,
            code:
                error.code ||
                (declaredStatus < 500 ? "REQUEST_FAILED" : "INTERNAL_ERROR"),
            message: error.message,
            field: error.field,
            details: error.details
        };
    }

    return {
        status: 500,
        code: "INTERNAL_ERROR",
        message: error?.message || "Internal Server Error"
    };
};

const errorHandler = (error, req, res, next) => {
    const normalized = normalizeError(error);

    if (normalized.status >= 500) {
        console.error("Unhandled API error:", {
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            code: normalized.code,
            message: error?.message,
            stack: isProduction() ? undefined : error?.stack
        });
    }

    // Never disclose internal failure details to clients in production.
    const message =
        normalized.status >= 500 && isProduction()
            ? "Internal Server Error"
            : normalized.message || "Request failed.";

    const body = {
        success: false,
        code: normalized.code,
        message
    };

    if (normalized.field) body.field = normalized.field;
    if (normalized.errors) body.errors = normalized.errors;
    if (normalized.details !== undefined) body.details = normalized.details;
    if (req.id) body.requestId = req.id;

    // If headers already went out, hand back to Express to destroy the socket.
    if (res.headersSent) {
        return next(error);
    }

    return res.status(normalized.status).json(body);
};

module.exports = {
    notFoundHandler,
    errorHandler,
    normalizeError,
    formatZodIssues
};
