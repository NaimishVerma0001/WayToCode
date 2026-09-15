// server/src/middlewares/validateMiddleware.js

const { formatZodIssues } = require("./errorMiddlewares");

/**
 * Validate and replace a request segment with the parsed, sanitised value.
 *
 * Schemas are `.strict()` where appropriate, so unknown keys are rejected
 * rather than silently forwarded to Mongoose.
 *
 * @param {import("zod").ZodTypeAny} schema
 * @param {"body"|"query"|"params"} [source]
 */
const validate = (schema, source = "body") => {
    if (!schema || typeof schema.safeParse !== "function") {
        throw new TypeError("validate() requires a Zod schema.");
    }

    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_FAILED",
                message: "Invalid request payload.",
                errors: formatZodIssues(result.error.issues)
            });
        }

        // `req.query` is a getter-only accessor in Express 5, so assigning to it
        // throws. Parsed query values are exposed on `req.validatedQuery`.
        if (source === "query") {
            req.validatedQuery = result.data;
        } else {
            req[source] = result.data;
        }

        return next();
    };
};

module.exports = validate;
module.exports.validate = validate;
