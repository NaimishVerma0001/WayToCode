const mongoose = require(
    "mongoose"
);

const User = require(
    "../models/User"
);

const AdminAuditLog = require(
    "../models/AdminAuditLog"
);

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const DEFAULT_PAGE_SIZE = 25;
const MAXIMUM_PAGE_SIZE = 100;

const ACTIVE_USER_WINDOW =
    5 * 60 * 1000;

const OVERVIEW_CACHE_DURATION =
    30 * 1000;

let overviewCache = null;
let overviewCacheUpdatedAt = 0;

/*
|--------------------------------------------------------------------------
| Error Helper
|--------------------------------------------------------------------------
*/

const createAdminError = (
    message,
    status = 400,
    code = "ADMIN_REQUEST_FAILED"
) => {
    const error =
        new Error(message);

    error.status = status;
    error.code = code;

    return error;
};

/*
|--------------------------------------------------------------------------
| Shared Helpers
|--------------------------------------------------------------------------
*/

const escapeRegularExpression = (
    value
) => {
    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
};

const normalizePositiveInteger = (
    value,
    fallback,
    maximum = null
) => {
    const parsedValue =
        Number.parseInt(
            value,
            10
        );

    if (
        !Number.isInteger(
            parsedValue
        ) ||
        parsedValue < 1
    ) {
        return fallback;
    }

    if (
        maximum !== null
    ) {
        return Math.min(
            parsedValue,
            maximum
        );
    }

    return parsedValue;
};

const validateObjectId = (
    value,
    fieldName = "User"
) => {
    if (
        !mongoose.Types.ObjectId
            .isValid(value)
    ) {
        throw createAdminError(
            `${fieldName} identifier is invalid.`,
            400,
            "INVALID_IDENTIFIER"
        );
    }
};

const getActiveSince = () => {
    return new Date(
        Date.now() -
        ACTIVE_USER_WINDOW
    );
};

const getStartOfToday = () => {
    const date = new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
};

const getStartOfRecentDays = (
    days
) => {
    const date =
        getStartOfToday();

    date.setDate(
        date.getDate() -
        (days - 1)
    );

    return date;
};

const clearOverviewCache = () => {
    overviewCache = null;
    overviewCacheUpdatedAt = 0;
};

const normalizeAccountStatus = (
    user
) => {
    return {
        ...user,

        accountStatus:
            user.accountStatus ||
            "active",

        loginCount:
            Number(
                user.loginCount
            ) || 0
    };
};

const getConnectedPlatforms = (
    codingProfiles
) => {
    if (
        !codingProfiles ||
        typeof codingProfiles !==
            "object"
    ) {
        return [];
    }

    return Object.entries(
        codingProfiles
    )
        .filter(
            ([, username]) =>
                typeof username ===
                    "string" &&
                username.trim()
        )
        .map(
            ([platform]) =>
                platform
        );
};

const createRequestMetadata = (
    requestMetadata = {}
) => {
    return {
        requestId:
            typeof requestMetadata
                .requestId === "string"
                ? requestMetadata
                    .requestId
                    .slice(0, 150)
                : "",

        userAgent:
            typeof requestMetadata
                .userAgent === "string"
                ? requestMetadata
                    .userAgent
                    .slice(0, 500)
                : ""
    };
};

/*
|--------------------------------------------------------------------------
| Registration Trend
|--------------------------------------------------------------------------
*/

const getRegistrationTrend =
    async () => {
        const startDate =
            getStartOfRecentDays(7);

        const registrations =
            await User.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte:
                                startDate
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format:
                                    "%Y-%m-%d",

                                date:
                                    "$createdAt",

                                timezone:
                                    "UTC"
                            }
                        },

                        users: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ]);

        const countByDate =
            new Map(
                registrations.map(
                    (entry) => [
                        entry._id,
                        entry.users
                    ]
                )
            );

        return Array.from(
            {
                length: 7
            },
            (_, index) => {
                const date =
                    new Date(
                        startDate
                    );

                date.setDate(
                    startDate.getDate() +
                    index
                );

                const dateKey =
                    date
                        .toISOString()
                        .slice(0, 10);

                return {
                    date: dateKey,

                    users:
                        countByDate.get(
                            dateKey
                        ) || 0
                };
            }
        );
    };

/*
|--------------------------------------------------------------------------
| Administration Overview
|--------------------------------------------------------------------------
*/

const getOverview = async ({
    forceRefresh = false
} = {}) => {
    const cacheIsValid =
        overviewCache &&
        (
            Date.now() -
            overviewCacheUpdatedAt
        ) <
        OVERVIEW_CACHE_DURATION;

    if (
        !forceRefresh &&
        cacheIsValid
    ) {
        return {
            ...overviewCache,
            cached: true
        };
    }

    const activeSince =
        getActiveSince();

    const startOfToday =
        getStartOfToday();

    const sevenDaysAgo =
        getStartOfRecentDays(7);

    const [
        totalUsers,
        activeUsers,
        blockedUsers,
        administratorCount,
        newUsersToday,
        newUsersThisWeek,
        connectedProfileUsers,
        registrationTrend
    ] = await Promise.all([
        User.countDocuments({}),

        User.countDocuments({
            lastSeenAt: {
                $gte: activeSince
            },

            accountStatus: {
                $ne: "blocked"
            }
        }),

        User.countDocuments({
            accountStatus:
                "blocked"
        }),

        User.countDocuments({
            role: "admin",

            accountStatus: {
                $ne: "blocked"
            }
        }),

        User.countDocuments({
            createdAt: {
                $gte: startOfToday
            }
        }),

        User.countDocuments({
            createdAt: {
                $gte: sevenDaysAgo
            }
        }),

        User.countDocuments({
            $or: [
                {
                    "codingProfiles.leetcode":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                },
                {
                    "codingProfiles.codeforces":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                },
                {
                    "codingProfiles.codechef":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                },
                {
                    "codingProfiles.atcoder":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                },
                {
                    "codingProfiles.geeksforgeeks":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                },
                {
                    "codingProfiles.hackerrank":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                },
                {
                    "codingProfiles.github":
                        {
                            $nin: [
                                "",
                                null
                            ]
                        }
                }
            ]
        }),

        getRegistrationTrend()
    ]);

    const activePercentage =
        totalUsers > 0
            ? Number(
                (
                    activeUsers /
                    totalUsers *
                    100
                ).toFixed(1)
            )
            : 0;

    const connectionPercentage =
        totalUsers > 0
            ? Number(
                (
                    connectedProfileUsers /
                    totalUsers *
                    100
                ).toFixed(1)
            )
            : 0;

    const overview = {
        totals: {
            users: totalUsers,
            activeUsers,
            blockedUsers,
            administrators:
                administratorCount,

            newUsersToday,
            newUsersThisWeek,

            connectedProfileUsers
        },

        percentages: {
            active:
                activePercentage,

            connectedProfiles:
                connectionPercentage
        },

        registrationTrend,

        activeWindowMinutes:
            ACTIVE_USER_WINDOW /
            60000,

        generatedAt:
            new Date()
                .toISOString(),

        cached: false
    };

    overviewCache = overview;

    overviewCacheUpdatedAt =
        Date.now();

    return overview;
};

/*
|--------------------------------------------------------------------------
| User Directory
|--------------------------------------------------------------------------
*/

const getUsers = async ({
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    search = "",
    status = "all",
    role = "all",
    activity = "all",
    sort = "newest"
} = {}) => {
    const normalizedPage =
        normalizePositiveInteger(
            page,
            1
        );

    const normalizedLimit =
        normalizePositiveInteger(
            limit,
            DEFAULT_PAGE_SIZE,
            MAXIMUM_PAGE_SIZE
        );

    const normalizedSearch =
        typeof search === "string"
            ? search.trim()
            : "";

    const query = {};

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    |
    | Prefix-based search performs better than unrestricted wildcard search
    | and can benefit from username/email indexes.
    |
    */

    if (
        normalizedSearch.length >= 2
    ) {
        const searchPattern =
            new RegExp(
                "^" +
                escapeRegularExpression(
                    normalizedSearch
                ),
                "i"
            );

        query.$or = [
            {
                username:
                    searchPattern
            },
            {
                email:
                    searchPattern
            }
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    if (status === "blocked") {
        query.accountStatus =
            "blocked";
    }

    if (status === "active") {
        query.accountStatus = {
            $ne: "blocked"
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Role Filter
    |--------------------------------------------------------------------------
    */

    if (
        role === "user" ||
        role === "admin"
    ) {
        query.role = role;
    }

    /*
    |--------------------------------------------------------------------------
    | Activity Filter
    |--------------------------------------------------------------------------
    */

    const activeSince =
        getActiveSince();

    if (activity === "online") {
        query.lastSeenAt = {
            $gte: activeSince
        };

        query.accountStatus = {
            $ne: "blocked"
        };
    }

    if (activity === "offline") {
        query.$and = [
            ...(query.$and || []),

            {
                $or: [
                    {
                        lastSeenAt: {
                            $lt:
                                activeSince
                        }
                    },
                    {
                        lastSeenAt:
                            null
                    },
                    {
                        lastSeenAt: {
                            $exists:
                                false
                        }
                    }
                ]
            }
        ];
    }

    const sortOptions = {
        newest: {
            createdAt: -1,
            _id: -1
        },

        oldest: {
            createdAt: 1,
            _id: 1
        },

        recentlyActive: {
            lastSeenAt: -1,
            _id: -1
        },

        username: {
            username: 1,
            _id: 1
        }
    };

    const selectedSort =
        sortOptions[sort] ||
        sortOptions.newest;

    const skip =
        (
            normalizedPage - 1
        ) *
        normalizedLimit;

    const [
        users,
        totalUsers
    ] = await Promise.all([
        User.find(query)
            .select({
                username: 1,
                email: 1,
                role: 1,
                accountStatus: 1,
                blockedAt: 1,
                blockedReason: 1,
                codingProfiles: 1,
                lastLoginAt: 1,
                lastSeenAt: 1,
                loginCount: 1,
                createdAt: 1,
                updatedAt: 1
            })
            .sort(selectedSort)
            .skip(skip)
            .limit(
                normalizedLimit
            )
            .lean(),

        User.countDocuments(
            query
        )
    ]);

    const normalizedUsers =
        users.map((user) => {
            const normalizedUser =
                normalizeAccountStatus(
                    user
                );

            const connectedPlatforms =
                getConnectedPlatforms(
                    normalizedUser
                        .codingProfiles
                );

            return {
                ...normalizedUser,

                connectedPlatforms,

                connectedPlatformCount:
                    connectedPlatforms
                        .length,

                isActive:
                    Boolean(
                        normalizedUser
                            .lastSeenAt &&
                        new Date(
                            normalizedUser
                                .lastSeenAt
                        ).getTime() >=
                            activeSince
                                .getTime() &&
                        normalizedUser
                            .accountStatus !==
                            "blocked"
                    )
            };
        });

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalUsers /
                normalizedLimit
            )
        );

    return {
        users:
            normalizedUsers,

        pagination: {
            page:
                normalizedPage,

            limit:
                normalizedLimit,

            totalUsers,

            totalPages,

            hasNextPage:
                normalizedPage <
                totalPages,

            hasPreviousPage:
                normalizedPage >
                1
        },

        filters: {
            search:
                normalizedSearch,

            status,
            role,
            activity,
            sort
        },

        activeWindowMinutes:
            ACTIVE_USER_WINDOW /
            60000
    };
};

/*
|--------------------------------------------------------------------------
| User Details
|--------------------------------------------------------------------------
*/

const getUserById = async (
    userId
) => {
    validateObjectId(
        userId
    );

    const user =
        await User.findById(
            userId
        )
            .select({
                username: 1,
                email: 1,
                role: 1,
                accountStatus: 1,
                blockedAt: 1,
                blockedReason: 1,
                blockedBy: 1,
                codingProfiles: 1,
                favouritePlatforms: 1,
                reminderEnabled: 1,
                lastLoginAt: 1,
                lastSeenAt: 1,
                loginCount: 1,
                createdAt: 1,
                updatedAt: 1
            })
            .populate({
                path: "blockedBy",

                select:
                    "username email"
            })
            .lean();

    if (!user) {
        throw createAdminError(
            "User not found.",
            404,
            "USER_NOT_FOUND"
        );
    }

    const normalizedUser =
        normalizeAccountStatus(
            user
        );

    const connectedPlatforms =
        getConnectedPlatforms(
            normalizedUser
                .codingProfiles
        );

    const activeSince =
        getActiveSince();

    return {
        ...normalizedUser,

        connectedPlatforms,

        connectedPlatformCount:
            connectedPlatforms.length,

        isActive:
            Boolean(
                normalizedUser
                    .lastSeenAt &&
                new Date(
                    normalizedUser
                        .lastSeenAt
                ).getTime() >=
                    activeSince
                        .getTime() &&
                normalizedUser
                    .accountStatus !==
                    "blocked"
            )
    };
};

/*
|--------------------------------------------------------------------------
| Block User
|--------------------------------------------------------------------------
*/

const blockUser = async ({
    administratorId,
    targetUserId,
    reason,
    requestMetadata
}) => {
    validateObjectId(
        administratorId,
        "Administrator"
    );

    validateObjectId(
        targetUserId
    );

    if (
        String(administratorId) ===
        String(targetUserId)
    ) {
        throw createAdminError(
            "Administrators cannot block their own account.",
            400,
            "SELF_BLOCK_NOT_ALLOWED"
        );
    }

    const normalizedReason =
        typeof reason === "string"
            ? reason.trim()
            : "";

    if (
        normalizedReason.length < 5
    ) {
        throw createAdminError(
            "Provide a blocking reason of at least 5 characters.",
            400,
            "BLOCK_REASON_REQUIRED"
        );
    }

    if (
        normalizedReason.length >
        300
    ) {
        throw createAdminError(
            "The blocking reason cannot exceed 300 characters.",
            400,
            "BLOCK_REASON_TOO_LONG"
        );
    }

    const targetUser =
        await User.findById(
            targetUserId
        )
            .select({
                username: 1,
                email: 1,
                role: 1,
                accountStatus: 1
            })
            .lean();

    if (!targetUser) {
        throw createAdminError(
            "User not found.",
            404,
            "USER_NOT_FOUND"
        );
    }

    if (
        targetUser.role ===
        "admin"
    ) {
        throw createAdminError(
            "Administrator accounts cannot be blocked through this action.",
            403,
            "ADMIN_BLOCK_NOT_ALLOWED"
        );
    }

    if (
        targetUser.accountStatus ===
        "blocked"
    ) {
        throw createAdminError(
            "This user is already blocked.",
            409,
            "USER_ALREADY_BLOCKED"
        );
    }

    const blockedAt =
        new Date();

    const updatedUser =
        await User.findOneAndUpdate(
            {
                _id: targetUserId,

                role: {
                    $ne: "admin"
                },

                accountStatus: {
                    $ne: "blocked"
                }
            },
            {
                $set: {
                    accountStatus:
                        "blocked",

                    blockedAt,

                    blockedReason:
                        normalizedReason,

                    blockedBy:
                        administratorId
                }
            },
            {
                returnDocument:
                    "after",

                runValidators: true
            }
        )
            .select({
                username: 1,
                email: 1,
                role: 1,
                accountStatus: 1,
                blockedAt: 1,
                blockedReason: 1
            })
            .lean();

    if (!updatedUser) {
        throw createAdminError(
            "The account changed before it could be blocked. Refresh and try again.",
            409,
            "USER_STATE_CHANGED"
        );
    }

    await AdminAuditLog.create({
        administrator:
            administratorId,

        targetUser:
            targetUserId,

        action:
            "USER_BLOCKED",

        reason:
            normalizedReason,

        previousValue: {
            accountStatus:
                targetUser
                    .accountStatus ||
                "active"
        },

        newValue: {
            accountStatus:
                "blocked",

            blockedAt
        },

        requestMetadata:
            createRequestMetadata(
                requestMetadata
            )
    });

    clearOverviewCache();

    return normalizeAccountStatus(
        updatedUser
    );
};

/*
|--------------------------------------------------------------------------
| Unblock User
|--------------------------------------------------------------------------
*/

const unblockUser = async ({
    administratorId,
    targetUserId,
    reason,
    requestMetadata
}) => {
    validateObjectId(
        administratorId,
        "Administrator"
    );

    validateObjectId(
        targetUserId
    );

    const normalizedReason =
        typeof reason === "string"
            ? reason.trim()
            : "";

    if (
        normalizedReason.length > 300
    ) {
        throw createAdminError(
            "The unblocking note cannot exceed 300 characters.",
            400,
            "UNBLOCK_REASON_TOO_LONG"
        );
    }

    const targetUser =
        await User.findById(
            targetUserId
        )
            .select({
                username: 1,
                email: 1,
                accountStatus: 1,
                blockedAt: 1,
                blockedReason: 1
            })
            .lean();

    if (!targetUser) {
        throw createAdminError(
            "User not found.",
            404,
            "USER_NOT_FOUND"
        );
    }

    if (
        targetUser.accountStatus !==
        "blocked"
    ) {
        throw createAdminError(
            "This user is not blocked.",
            409,
            "USER_NOT_BLOCKED"
        );
    }

    const updatedUser =
        await User.findOneAndUpdate(
            {
                _id: targetUserId,
                accountStatus:
                    "blocked"
            },
            {
                $set: {
                    accountStatus:
                        "active",

                    blockedAt: null,
                    blockedReason: "",
                    blockedBy: null
                }
            },
            {
                returnDocument:
                    "after",

                runValidators: true
            }
        )
            .select({
                username: 1,
                email: 1,
                role: 1,
                accountStatus: 1,
                blockedAt: 1,
                blockedReason: 1
            })
            .lean();

    if (!updatedUser) {
        throw createAdminError(
            "The account changed before it could be unblocked. Refresh and try again.",
            409,
            "USER_STATE_CHANGED"
        );
    }

    await AdminAuditLog.create({
        administrator:
            administratorId,

        targetUser:
            targetUserId,

        action:
            "USER_UNBLOCKED",

        reason:
            normalizedReason,

        previousValue: {
            accountStatus:
                "blocked",

            blockedReason:
                targetUser
                    .blockedReason
        },

        newValue: {
            accountStatus:
                "active"
        },

        requestMetadata:
            createRequestMetadata(
                requestMetadata
            )
    });

    clearOverviewCache();

    return normalizeAccountStatus(
        updatedUser
    );
};

/*
|--------------------------------------------------------------------------
| Audit Logs
|--------------------------------------------------------------------------
*/

const getAuditLogs = async ({
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    action = "all",
    targetUserId = null
} = {}) => {
    const normalizedPage =
        normalizePositiveInteger(
            page,
            1
        );

    const normalizedLimit =
        normalizePositiveInteger(
            limit,
            DEFAULT_PAGE_SIZE,
            MAXIMUM_PAGE_SIZE
        );

    const query = {};

    const allowedActions = [
        "USER_BLOCKED",
        "USER_UNBLOCKED",
        "USER_ROLE_CHANGED"
    ];

    if (
        allowedActions.includes(
            action
        )
    ) {
        query.action = action;
    }

    if (targetUserId) {
        validateObjectId(
            targetUserId
        );

        query.targetUser =
            targetUserId;
    }

    const skip =
        (
            normalizedPage - 1
        ) *
        normalizedLimit;

    const [
        logs,
        totalLogs
    ] = await Promise.all([
        AdminAuditLog.find(
            query
        )
            .select({
                administrator: 1,
                targetUser: 1,
                action: 1,
                reason: 1,
                previousValue: 1,
                newValue: 1,
                requestMetadata: 1,
                createdAt: 1
            })
            .populate({
                path:
                    "administrator",

                select:
                    "username email"
            })
            .populate({
                path:
                    "targetUser",

                select:
                    "username email role accountStatus"
            })
            .sort({
                createdAt: -1,
                _id: -1
            })
            .skip(skip)
            .limit(
                normalizedLimit
            )
            .lean(),

        AdminAuditLog
            .countDocuments(
                query
            )
    ]);

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalLogs /
                normalizedLimit
            )
        );

    return {
        logs,

        pagination: {
            page:
                normalizedPage,

            limit:
                normalizedLimit,

            totalLogs,

            totalPages,

            hasNextPage:
                normalizedPage <
                totalPages,

            hasPreviousPage:
                normalizedPage >
                1
        }
    };
};

module.exports = {
    getOverview,
    getUsers,
    getUserById,
    blockUser,
    unblockUser,
    getAuditLogs,
    clearOverviewCache
};