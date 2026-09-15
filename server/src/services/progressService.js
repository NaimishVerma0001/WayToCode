const ProgressSnapshot = require(
    "../models/ProgressSnapshot"
);

const PLATFORM_KEYS = [
    "leetcode",
    "codeforces",
    "codechef",
    "geeksforgeeks",
    "hackerrank",
    "atcoder",
    "github"
];

const ALLOWED_HISTORY_RANGES = [
    7,
    30,
    90,
    365
];

const safeNumber = (value) => {
    const parsedValue = Number(value);

    if (
        !Number.isFinite(parsedValue) ||
        parsedValue < 0
    ) {
        return 0;
    }

    return parsedValue;
};

const firstValidNumber = (
    values
) => {
    for (const value of values) {
        if (
            value !== null &&
            value !== undefined &&
            value !== ""
        ) {
            const parsedValue =
                Number(value);

            if (
                Number.isFinite(
                    parsedValue
                ) &&
                parsedValue >= 0
            ) {
                return parsedValue;
            }
        }
    }

    return 0;
};

const createDayKey = (
    date = new Date()
) => {
    return date
        .toISOString()
        .slice(0, 10);
};

const getPlatformData = (
    platformEntry
) => {
    return (
        platformEntry?.data?.data ||
        {}
    );
};

const getPlatformUsername = (
    platformEntry,
    platformData
) => {
    const username =
        platformEntry?.username ||
        platformEntry?.data?.username ||
        platformData?.username ||
        platformData?.profile?.handle ||
        "";

    return typeof username === "string"
        ? username.trim()
        : "";
};

const extractPlatformMetrics = (
    key,
    platformEntry
) => {
    const connected = Boolean(
        platformEntry?.connected
    );

    const serviceResponse =
        platformEntry?.data;

    const available = Boolean(
        connected &&
        serviceResponse?.success
    );

    const platformData =
        getPlatformData(
            platformEntry
        );

    const baseMetrics = {
        connected,
        available,

        username:
            getPlatformUsername(
                platformEntry,
                platformData
            ),

        problemsSolved: 0,
        currentRating: 0,
        maximumRating: 0,
        contributions: 0,
        contestsParticipated: 0
    };

    if (!available) {
        return baseMetrics;
    }

    switch (key) {
        case "leetcode":
            return {
                ...baseMetrics,

                problemsSolved:
                    safeNumber(
                        platformData
                            .problemsSolved
                            ?.total
                    ),

                currentRating:
                    firstValidNumber([
                        platformData
                            .contest
                            ?.rating,
                        platformData
                            .rating
                            ?.current
                    ]),

                maximumRating:
                    firstValidNumber([
                        platformData
                            .contest
                            ?.highestRating,
                        platformData
                            .rating
                            ?.maximum
                    ]),

                contestsParticipated:
                    firstValidNumber([
                        platformData
                            .contest
                            ?.attended,
                        platformData
                            .contests
                            ?.participated
                    ])
            };

        case "codeforces":
            return {
                ...baseMetrics,

                problemsSolved:
                    safeNumber(
                        platformData
                            .problems
                            ?.solved
                    ),

                currentRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.current
                    ),

                maximumRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.maximum
                    ),

                contestsParticipated:
                    firstValidNumber([
                        platformData
                            .contests
                            ?.participated,
                        platformData
                            .rating
                            ?.ratedMatches
                    ])
            };

        case "codechef":
            return {
                ...baseMetrics,

                problemsSolved:
                    safeNumber(
                        platformData
                            .problems
                            ?.solved
                    ),

                currentRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.current
                    ),

                maximumRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.highest
                    ),

                contestsParticipated:
                    firstValidNumber([
                        platformData
                            .contests
                            ?.participated,
                        platformData
                            .contests
                            ?.count
                    ])
            };

        case "geeksforgeeks":
            return {
                ...baseMetrics,

                problemsSolved:
                    safeNumber(
                        platformData
                            .problems
                            ?.solved
                    ),

                currentRating:
                    firstValidNumber([
                        platformData
                            .rating
                            ?.current,
                        platformData
                            .score
                            ?.coding
                    ]),

                maximumRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.highest
                    ),

                contestsParticipated:
                    safeNumber(
                        platformData
                            .contests
                            ?.participated
                    )
            };

        case "hackerrank":
            return {
                ...baseMetrics,

                problemsSolved:
                    safeNumber(
                        platformData
                            .statistics
                            ?.solved
                    ),

                currentRating:
                    safeNumber(
                        platformData
                            .statistics
                            ?.practiceScore
                    ),

                contestsParticipated:
                    safeNumber(
                        platformData
                            .contests
                            ?.participated
                    )
            };

        case "atcoder":
            return {
                ...baseMetrics,

                problemsSolved:
                    safeNumber(
                        platformData
                            .problems
                            ?.solved
                    ),

                currentRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.current
                    ),

                maximumRating:
                    safeNumber(
                        platformData
                            .rating
                            ?.highest
                    ),

                contestsParticipated:
                    firstValidNumber([
                        platformData
                            .rating
                            ?.ratedMatches,
                        platformData
                            .contests
                            ?.participated
                    ])
            };

        case "github":
            return {
                ...baseMetrics,

                /*
                 * Repositories are deliberately not counted as
                 * solved problems or contributions.
                 */
                contributions:
                    firstValidNumber([
                        platformData
                            .contributions
                            ?.total,
                        platformData
                            .totalContributions,
                        platformData
                            .contributionCount
                    ])
            };

        default:
            return baseMetrics;
    }
};

const buildSnapshotData = (
    dashboard
) => {
    const dashboardPlatforms =
        dashboard?.platforms || {};

    const platforms = {};

    PLATFORM_KEYS.forEach(
        (key) => {
            platforms[key] =
                extractPlatformMetrics(
                    key,
                    dashboardPlatforms[key]
                );
        }
    );

    const platformValues =
        Object.values(platforms);

    const totals = {
        problemsSolved:
            platformValues.reduce(
                (total, platform) =>
                    total +
                    safeNumber(
                        platform
                            .problemsSolved
                    ),
                0
            ),

        contributions:
            platformValues.reduce(
                (total, platform) =>
                    total +
                    safeNumber(
                        platform
                            .contributions
                    ),
                0
            ),

        connectedPlatforms:
            platformValues.filter(
                (platform) =>
                    platform.connected
            ).length,

        availablePlatforms:
            platformValues.filter(
                (platform) =>
                    platform.available
            ).length
    };

    return {
        platforms,
        totals
    };
};

const recordSnapshot = async ({
    userId,
    dashboard,
    source = "dashboard",
    recordedAt = new Date()
}) => {
    if (!userId) {
        throw new Error(
            "A user is required to record progress."
        );
    }

    if (
        !dashboard ||
        typeof dashboard !== "object"
    ) {
        throw new Error(
            "Dashboard data is required to record progress."
        );
    }

    const normalizedDate =
        recordedAt instanceof Date
            ? recordedAt
            : new Date(recordedAt);

    if (
        Number.isNaN(
            normalizedDate.getTime()
        )
    ) {
        throw new Error(
            "The progress date is invalid."
        );
    }

    const {
        platforms,
        totals
    } = buildSnapshotData(
        dashboard
    );

    const dayKey =
        createDayKey(normalizedDate);

    return ProgressSnapshot
        .findOneAndUpdate(
            {
                user: userId,
                dayKey
            },
            {
                $set: {
                    recordedAt:
                        normalizedDate,
                    platforms,
                    totals,
                    source
                },

                $setOnInsert: {
                    user: userId,
                    dayKey
                }
            },
            {
                upsert: true,
                returnDocument: "after",
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )
        .lean();
};

const normalizeHistoryRange = (
    days
) => {
    const parsedDays =
        Number(days);

    if (
        !ALLOWED_HISTORY_RANGES
            .includes(parsedDays)
    ) {
        return 30;
    }

    return parsedDays;
};

const getProgressHistory = async ({
    userId,
    days = 30
}) => {
    if (!userId) {
        throw new Error(
            "A user is required to fetch progress."
        );
    }

    const normalizedDays =
        normalizeHistoryRange(days);

    const startDate = new Date();

    startDate.setUTCHours(
        0,
        0,
        0,
        0
    );

    startDate.setUTCDate(
        startDate.getUTCDate() -
        (normalizedDays - 1)
    );

    const snapshots =
        await ProgressSnapshot
            .find({
                user: userId,

                recordedAt: {
                    $gte: startDate
                }
            })
            .sort({
                recordedAt: 1
            })
            .lean();

    return {
        range: normalizedDays,
        startDate:
            startDate.toISOString(),
        endDate:
            new Date().toISOString(),
        totalSnapshots:
            snapshots.length,
        snapshots
    };
};

const getLatestSnapshot = async (
    userId
) => {
    if (!userId) {
        return null;
    }

    return ProgressSnapshot
        .findOne({
            user: userId
        })
        .sort({
            recordedAt: -1
        })
        .lean();
};

module.exports = {
    PLATFORM_KEYS,
    ALLOWED_HISTORY_RANGES,
    buildSnapshotData,
    recordSnapshot,
    getProgressHistory,
    getLatestSnapshot
};