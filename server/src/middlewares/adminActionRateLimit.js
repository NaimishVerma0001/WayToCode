/*
|--------------------------------------------------------------------------
| Sensitive Administration Action Limiter
|--------------------------------------------------------------------------
|
| Allows a maximum of 20 sensitive account actions per administrator
| during a rolling ten-minute window.
|
| This implementation is suitable for the current single backend instance.
| When Way2Code uses multiple instances, the storage can move to Redis
| without changing the route contract.
|
*/

const WINDOW_DURATION =
    10 * 60 * 1000;

const MAXIMUM_ACTIONS = 20;

const actionWindows =
    new Map();

const removeExpiredWindows = () => {
    const currentTime =
        Date.now();

    actionWindows.forEach(
        (record, key) => {
            if (
                currentTime -
                record.windowStartedAt >=
                WINDOW_DURATION
            ) {
                actionWindows.delete(
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

/*
 * The timer must not keep the Node.js process alive.
 */
cleanupTimer.unref?.();

const adminActionRateLimit = (
    req,
    res,
    next
) => {
    const administratorId =
        req.user?._id
            ?.toString();

    if (!administratorId) {
        return res
            .status(401)
            .json({
                success: false,
                message:
                    "Authentication is required."
            });
    }

    const currentTime =
        Date.now();

    const currentRecord =
        actionWindows.get(
            administratorId
        );

    if (
        !currentRecord ||
        currentTime -
            currentRecord
                .windowStartedAt >=
            WINDOW_DURATION
    ) {
        actionWindows.set(
            administratorId,
            {
                count: 1,
                windowStartedAt:
                    currentTime
            }
        );

        return next();
    }

    if (
        currentRecord.count >=
        MAXIMUM_ACTIONS
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

        return res
            .status(429)
            .json({
                success: false,

                code:
                    "ADMIN_RATE_LIMITED",

                message:
                    "Too many administrative actions. Please wait before trying again.",

                retryAfterSeconds
            });
    }

    currentRecord.count += 1;

    actionWindows.set(
        administratorId,
        currentRecord
    );

    return next();
};

module.exports =
    adminActionRateLimit;