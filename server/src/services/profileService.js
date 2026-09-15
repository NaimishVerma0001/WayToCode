// server/src/services/profileService.js

const User = require("../models/User");
const ApplicationError = require("../utils/ApplicationError");
const platformCache = require("../utils/platformCache");

const leetcodeService = require("./platforms/leetcodeService");
const codeforcesService = require("./platforms/codeforcesService");
const codechefService = require("./platforms/codechefService");
const atcoderService = require("./platforms/atcoderService");
const gfgService = require("./platforms/gfgService");
const hackerrankService = require("./platforms/hackerrankService");
const githubService = require("./platforms/githubService");

const PROFILE_UPDATE_FIELDS = [
    "username",
    "email",
    "favouritePlatforms",
    "reminderEnabled",
    "reminderOffset"
];

/** Every supported platform, mapped to the integration that can verify it. */
const PLATFORM_SERVICES = {
    leetcode: leetcodeService,
    codeforces: codeforcesService,
    codechef: codechefService,
    atcoder: atcoderService,
    geeksforgeeks: gfgService,
    hackerrank: hackerrankService,
    github: githubService
};

const CODING_PLATFORM_FIELDS = Object.keys(PLATFORM_SERVICES);

const ALLOWED_REMINDER_OFFSETS = [10, 60, 1440];

const MAXIMUM_USERNAME_LENGTH = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 };

const badRequest = (message, code, field) =>
    new ApplicationError({ status: 400, code, field, message });

const formatProfile = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    codingProfiles: user.codingProfiles,
    favouritePlatforms: user.favouritePlatforms,
    reminderEnabled: user.reminderEnabled,
    reminderOffset: user.reminderOffset,
    potdStreak: user.potdStreak,
    badges: user.badges,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

const getProfile = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApplicationError({
            status: 404,
            code: "USER_NOT_FOUND",
            message: "User not found."
        });
    }

    return formatProfile(user);
};

const updateProfile = async (userId, data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw badRequest("Profile updates must be provided as an object.", "INVALID_PAYLOAD");
    }

    const unsupportedFields = Object.keys(data).filter(
        (field) => !PROFILE_UPDATE_FIELDS.includes(field)
    );

    if (unsupportedFields.length > 0) {
        throw badRequest(
            `Unsupported profile field: ${unsupportedFields.join(", ")}`,
            "UNSUPPORTED_FIELD",
            unsupportedFields[0]
        );
    }

    const updateData = {};

    if (data.username !== undefined) {
        if (typeof data.username !== "string") {
            throw badRequest("Username must be a string.", "INVALID_USERNAME", "username");
        }

        const normalizedUsername = data.username.trim();

        if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
            throw badRequest(
                "Username must be between 3 and 30 characters.",
                "INVALID_USERNAME",
                "username"
            );
        }

        const existingUsername = await User.findOne({
            username: normalizedUsername,
            _id: { $ne: userId }
        })
            .collation(CASE_INSENSITIVE_COLLATION)
            .select("_id")
            .lean();

        if (existingUsername) {
            throw new ApplicationError({
                status: 409,
                code: "USERNAME_ALREADY_IN_USE",
                field: "username",
                message: "Username already exists."
            });
        }

        updateData.username = normalizedUsername;
    }

    if (data.email !== undefined) {
        if (typeof data.email !== "string") {
            throw badRequest("Email must be a string.", "INVALID_EMAIL", "email");
        }

        const normalizedEmail = data.email.toLowerCase().trim();

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            throw badRequest(
                "Please provide a valid email address.",
                "INVALID_EMAIL",
                "email"
            );
        }

        const existingEmail = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: userId }
        })
            .select("_id")
            .lean();

        if (existingEmail) {
            throw new ApplicationError({
                status: 409,
                code: "EMAIL_ALREADY_IN_USE",
                field: "email",
                message: "Email already exists."
            });
        }

        updateData.email = normalizedEmail;
    }

    if (data.favouritePlatforms !== undefined) {
        if (!Array.isArray(data.favouritePlatforms)) {
            throw badRequest(
                "Favourite platforms must be an array.",
                "INVALID_FAVOURITES",
                "favouritePlatforms"
            );
        }

        const invalidPlatform = data.favouritePlatforms.some(
            (platform) =>
                typeof platform !== "string" ||
                !CODING_PLATFORM_FIELDS.includes(platform.toLowerCase().trim())
        );

        if (invalidPlatform) {
            throw badRequest(
                "Favourite platforms contain an unsupported platform.",
                "INVALID_FAVOURITES",
                "favouritePlatforms"
            );
        }

        updateData.favouritePlatforms = [
            ...new Set(
                data.favouritePlatforms.map((platform) => platform.toLowerCase().trim())
            )
        ];
    }

    if (data.reminderEnabled !== undefined) {
        if (typeof data.reminderEnabled !== "boolean") {
            throw badRequest(
                "Reminder enabled must be true or false.",
                "INVALID_REMINDER_FLAG",
                "reminderEnabled"
            );
        }

        updateData.reminderEnabled = data.reminderEnabled;
    }

    if (data.reminderOffset !== undefined) {
        if (!ALLOWED_REMINDER_OFFSETS.includes(Number(data.reminderOffset))) {
            throw badRequest(
                `Reminder offset must be one of: ${ALLOWED_REMINDER_OFFSETS.join(", ")}.`,
                "INVALID_REMINDER_OFFSET",
                "reminderOffset"
            );
        }

        updateData.reminderOffset = Number(data.reminderOffset);
    }

    if (Object.keys(updateData).length === 0) {
        throw badRequest("No valid profile fields were provided.", "NO_FIELDS_PROVIDED");
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { returnDocument: "after", runValidators: true }
    );

    if (!updatedUser) {
        throw new ApplicationError({
            status: 404,
            code: "USER_NOT_FOUND",
            message: "User not found."
        });
    }

    return formatProfile(updatedUser);
};

/**
 * Verify one platform handle.
 * Always resolves: a provider outage must not block saving the handle.
 */
const verifyPlatformUsername = async (platform, username) => {
    const service = PLATFORM_SERVICES[platform];

    if (!service || typeof service.getUserStats !== "function") {
        return { success: true, data: null, error: "" };
    }

    try {
        const result = await service.getUserStats(username);

        return {
            success: result?.success === true,
            data: result?.success ? result.data : null,
            error: result?.error || ""
        };
    } catch (error) {
        return {
            success: false,
            data: null,
            error: error.message || "Verification is temporarily unavailable."
        };
    }
};

const updateCodingProfiles = async (userId, data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw badRequest(
            "Coding profiles must be provided as an object.",
            "INVALID_PAYLOAD"
        );
    }

    const receivedPlatforms = Object.keys(data);

    if (receivedPlatforms.length === 0) {
        throw badRequest("Provide at least one coding profile.", "NO_PLATFORMS_PROVIDED");
    }

    const unsupportedPlatforms = receivedPlatforms.filter(
        (platform) => !CODING_PLATFORM_FIELDS.includes(platform)
    );

    if (unsupportedPlatforms.length > 0) {
        throw badRequest(
            `Unsupported coding platform: ${unsupportedPlatforms.join(", ")}`,
            "UNSUPPORTED_PLATFORM",
            unsupportedPlatforms[0]
        );
    }

    // Validate everything before any network call, so one bad field cannot
    // leave the update half-applied.
    const normalizedEntries = receivedPlatforms.map((platform) => {
        const username = data[platform];

        if (typeof username !== "string") {
            throw badRequest(
                `${platform} username must be a string.`,
                "INVALID_PLATFORM_USERNAME",
                platform
            );
        }

        const normalizedUsername = username.trim();

        if (normalizedUsername.length > MAXIMUM_USERNAME_LENGTH) {
            throw badRequest(
                `${platform} username cannot exceed ${MAXIMUM_USERNAME_LENGTH} characters.`,
                "INVALID_PLATFORM_USERNAME",
                platform
            );
        }

        if (/\s/.test(normalizedUsername)) {
            throw badRequest(
                `${platform} username cannot contain spaces.`,
                "INVALID_PLATFORM_USERNAME",
                platform
            );
        }

        return { platform, username: normalizedUsername };
    });

    /*
     * Every platform is verified, not only LeetCode, and all of them in
     * parallel so connecting several handles costs one round trip, not N.
     */
    const verifications = await Promise.all(
        normalizedEntries.map(async ({ platform, username }) => {
            if (!username) return { platform, username, disconnect: true };

            const verification = await verifyPlatformUsername(platform, username);

            return { platform, username, ...verification };
        })
    );

    const updateData = {};

    verifications.forEach(({ platform, username, disconnect, success, data: payload, error }) => {
        if (disconnect) {
            updateData[`codingProfiles.${platform}`] = {
                username: "",
                connected: false,
                success: false,
                lastFetched: null,
                error: "",
                data: null
            };

            // Drop any cached response for the handle being removed.
            platformCache.invalidate(`${platform}:${username.toLowerCase()}`);
            return;
        }

        updateData[`codingProfiles.${platform}`] = {
            username,
            connected: true,
            success: Boolean(success),
            lastFetched: new Date(),
            error: error || "",
            data: success ? payload : null
        };

        platformCache.invalidate(`${platform}:${username.toLowerCase()}`);
    });

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { returnDocument: "after", runValidators: true }
    );

    if (!updatedUser) {
        throw new ApplicationError({
            status: 404,
            code: "USER_NOT_FOUND",
            message: "User not found."
        });
    }

    return formatProfile(updatedUser);
};

module.exports = {
    getProfile,
    updateProfile,
    updateCodingProfiles,
    CODING_PLATFORM_FIELDS,
    PROFILE_UPDATE_FIELDS
};
