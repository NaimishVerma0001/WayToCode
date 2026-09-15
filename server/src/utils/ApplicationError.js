// server/src/utils/ApplicationError.js

/**
 * Operational application error.
 *
 * Two call styles are supported because both are used across the codebase:
 *
 *   new ApplicationError("Dashboard data not found.", 404)
 *   new ApplicationError({ status: 409, code: "EMAIL_IN_USE", field: "email", message: "..." })
 *
 * `status` and `statusCode` are always exposed as numbers so that
 * `res.status(error.status)` can never receive a non-numeric value.
 */
class ApplicationError extends Error {
    constructor(messageOrOptions, statusCode = 500) {
        const options =
            messageOrOptions && typeof messageOrOptions === "object"
                ? messageOrOptions
                : { message: messageOrOptions, status: statusCode };

        const resolvedStatus = Number(
            options.status ?? options.statusCode ?? statusCode ?? 500
        );

        const normalizedStatus =
            Number.isInteger(resolvedStatus) &&
            resolvedStatus >= 400 &&
            resolvedStatus <= 599
                ? resolvedStatus
                : 500;

        super(
            typeof options.message === "string" && options.message.trim()
                ? options.message
                : "Internal Server Error"
        );

        this.name = "ApplicationError";
        this.status = normalizedStatus;
        this.statusCode = normalizedStatus;
        this.code = options.code || (normalizedStatus < 500 ? "REQUEST_FAILED" : "INTERNAL_ERROR");
        this.isOperational = true;

        if (options.field) this.field = options.field;
        if (options.details !== undefined) this.details = options.details;
        if (options.cause !== undefined) this.cause = options.cause;

        Error.captureStackTrace(this, this.constructor);
    }

    /** Convenience flag used by the global error handler. */
    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }
}

module.exports = ApplicationError;
