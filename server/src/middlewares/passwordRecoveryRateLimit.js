const crypto = require(
    "crypto"
);

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const WINDOW_DURATION =
    15 * 60 * 1000;

const FORGOT_PASSWORD_LIMIT = 5;
const RESET_PASSWORD_LIMIT = 10;

const requestWindows =
    new Map();

/*
|--------------------------------------------------------------------------
| Privacy-Safe Key
|--------------------------------------------------------------------------
|
| Raw IP addresses and email addresses are not stored in memory. They are
| combined and hashed before being used as rate-limit identifiers.
|
*/

const createHashedKey = (
    value
) => {
    return crypto
        .createHash("sha256")
        .update(String(value))
        .digest("hex");
};

const getClientIdentifier = (
    req
) => {
    return (
        req.ip ||
        req.socket
            ?.remoteAddress ||
        "unknown-client"
    );
};

/*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
*/

const removeExpiredWindows = () => {
    const currentTime =
        Date.now();

    requestWindows.forEach(
        (record, key) => {
            if (
                currentTime -
                    record
                        .windowStartedAt >=
                WINDOW_DURATION
            ) {
                requestWindows.delete(
                    key
                );
            }
        }
    );
};

const cleanupTimer =
    setInterval(
        removeExpiredWindows,
        WINDOW_DURATION
    );

cleanupTimer.unref?.();

/*
|--------------------------------------------------------------------------
| Rate-Limit Factory
|--------------------------------------------------------------------------
*/

const createRecoveryRateLimit = ({
    action,
    maximumRequests,
    includeEmail = false
}) => {
    return (
        req,
        res,
        next
    ) => {
        const clientIdentifier =
            getClientIdentifier(req);

        const email =
            includeEmail &&
            typeof req.body?.email ===
                "string"
                ? req.body.email
                    .toLowerCase()
                    .trim()
                : "";

        const rateLimitKey =
            createHashedKey(
                [
                    action,
                    clientIdentifier,
                    email
                ].join(":")
            );

        const currentTime =
            Date.now();

        const currentRecord =
            requestWindows.get(
                rateLimitKey
            );

        if (
            !currentRecord ||
            currentTime -
                currentRecord
                    .windowStartedAt >=
                WINDOW_DURATION
        ) {
            requestWindows.set(
                rateLimitKey,
                {
                    count: 1,

                    windowStartedAt:
                        currentTime
                }
            );

            res.setHeader(
                "X-RateLimit-Limit",
                maximumRequests
            );

            res.setHeader(
                "X-RateLimit-Remaining",
                maximumRequests - 1
            );

            return next();
        }

        if (
            currentRecord.count >=
            maximumRequests
        ) {
            const retryAfterSeconds =
                Math.ceil(
                    (
                        WINDOW_DURATION -
                        (
                            currentTime -
                            currentRecord
                                .windowStartedAt
                        )
                    ) /
                    1000
                );

            res.setHeader(
                "Retry-After",
                retryAfterSeconds
            );

            res.setHeader(
                "X-RateLimit-Limit",
                maximumRequests
            );

            res.setHeader(
                "X-RateLimit-Remaining",
                0
            );

            return res
                .status(429)
                .json({
                    success: false,

                    code:
                        "PASSWORD_RECOVERY_RATE_LIMITED",

                    message:
                        "Too many password recovery attempts. Please wait before trying again.",

                    retryAfterSeconds
                });
        }

        currentRecord.count += 1;

        requestWindows.set(
            rateLimitKey,
            currentRecord
        );

        res.setHeader(
            "X-RateLimit-Limit",
            maximumRequests
        );

        res.setHeader(
            "X-RateLimit-Remaining",
            Math.max(
                0,
                maximumRequests -
                    currentRecord.count
            )
        );

        return next();
    };
};

/*
|--------------------------------------------------------------------------
| Exported Limiters
|--------------------------------------------------------------------------
*/

const forgotPasswordRateLimit =
    createRecoveryRateLimit({
        action:
            "forgot-password",

        maximumRequests:
            FORGOT_PASSWORD_LIMIT,

        includeEmail: true
    });

const resetPasswordRateLimit =
    createRecoveryRateLimit({
        action:
            "reset-password",

        maximumRequests:
            RESET_PASSWORD_LIMIT,

        includeEmail: false
    });

module.exports = {
    forgotPasswordRateLimit,
    resetPasswordRateLimit
};