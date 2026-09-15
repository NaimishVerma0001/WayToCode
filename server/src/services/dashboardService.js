// server/src/services/dashboardService.js

const githubService = require("./platforms/githubService");
const leetcodeService = require("./platforms/leetcodeService");
const codeforcesService = require("./platforms/codeforcesService");
const codechefService = require("./platforms/codechefService");
const gfgService = require("./platforms/gfgService");
const hackerrankService = require("./platforms/hackerrankService");
const atcoderService = require("./platforms/atcoderService");

const platformCache = require("../utils/platformCache");

const MINUTE = 60 * 1000;

/*
 * Scraped platforms get a longer TTL than API-backed ones: they are slower,
 * more fragile and rate-limit more aggressively.
 */
const PLATFORM_CONFIG = [
    { key: "github", service: githubService, ttlMs: 5 * MINUTE },
    { key: "leetcode", service: leetcodeService, ttlMs: 5 * MINUTE },
    {
        key: "codeforces",
        service: codeforcesService,
        ttlMs: 5 * MINUTE,
        refreshCooldownMs: 2 * MINUTE
    },
    { key: "codechef", service: codechefService, ttlMs: 10 * MINUTE },
    { key: "geeksforgeeks", service: gfgService, ttlMs: 10 * MINUTE },
    { key: "hackerrank", service: hackerrankService, ttlMs: 10 * MINUTE },
    { key: "atcoder", service: atcoderService, ttlMs: 10 * MINUTE }
];

const PLATFORM_KEYS = PLATFORM_CONFIG.map((platform) => platform.key);

/**
 * `codingProfiles.<platform>` is a sub-document, so the username has to be read
 * out of it. Older documents stored a bare string, which is still accepted.
 */
const readConnectedUsername = (profileEntry) => {
    if (typeof profileEntry === "string") return profileEntry.trim();

    if (profileEntry && typeof profileEntry === "object") {
        return typeof profileEntry.username === "string" ? profileEntry.username.trim() : "";
    }

    return "";
};

const createDisconnectedPlatform = (key) => ({
    key,
    connected: false,
    success: false,
    username: "",
    error: "",
    data: null
});

const createCacheKey = (platform, username) => `${platform}:${username.toLowerCase()}`;

class DashboardService {
    /**
     * Fetch one platform through the shared cache.
     * Never throws: an unreachable provider degrades to `success: false`.
     */
    async loadPlatform({ key, service, username, ttlMs, refreshCooldownMs, forceRefresh }) {
        const normalizedUsername = readConnectedUsername(username);

        if (!normalizedUsername) {
            return createDisconnectedPlatform(key);
        }

        try {
            const result = await platformCache.getOrSet(
                createCacheKey(key, normalizedUsername),
                () => service.getUserStats(normalizedUsername),
                {
                    ttlMs,
                    // A failed lookup is retried soon rather than pinned for the full TTL.
                    failureTtlMs: 60 * 1000,
                    // Last known-good data keeps the dashboard useful during an outage.
                    staleTtlMs: 30 * MINUTE,
                    refreshCooldownMs: refreshCooldownMs || 30 * 1000,
                    forceRefresh
                }
            );

            return {
                key,
                connected: true,
                success: result?.success === true,
                username: normalizedUsername,
                error: result?.error || "",
                data: result ?? null
            };
        } catch (error) {
            return {
                key,
                connected: true,
                success: false,
                username: normalizedUsername,
                error: error.message || "Unable to fetch profile.",
                data: null
            };
        }
    }

    /**
     * @param {object} user A user document with `codingProfiles`.
     * @param {{ forceRefresh?: boolean }} [options]
     */
    async getDashboard(user, options = {}) {
        const profiles = user?.codingProfiles || {};
        const forceRefresh = options.forceRefresh === true;

        const tasks = PLATFORM_CONFIG.map((platform) => ({
            ...platform,
            username: profiles[platform.key],
            forceRefresh
        }));

        // allSettled so one rejected provider cannot abort the whole dashboard.
        const settledResults = await Promise.allSettled(
            tasks.map((task) => this.loadPlatform(task))
        );

        const platforms = {};

        settledResults.forEach((item, index) => {
            const task = tasks[index];

            platforms[task.key] =
                item.status === "fulfilled"
                    ? item.value
                    : {
                          key: task.key,
                          connected: Boolean(readConnectedUsername(task.username)),
                          success: false,
                          username: readConnectedUsername(task.username),
                          error: "Unable to fetch profile.",
                          data: null
                      };
        });

        const platformValues = Object.values(platforms);

        return {
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            platforms,
            metadata: {
                forceRefresh,
                connectedPlatforms: platformValues.filter((p) => p.connected).length,
                successfulPlatforms: platformValues.filter((p) => p.success).length,
                generatedAt: new Date().toISOString(),
                cache: platformCache.getStats()
            }
        };
    }

    /** Drop every cached entry for a user's connected handles. */
    invalidateUser(user) {
        const profiles = user?.codingProfiles || {};

        PLATFORM_KEYS.forEach((key) => {
            const username = readConnectedUsername(profiles[key]);

            if (username) {
                platformCache.invalidate(createCacheKey(key, username));
            }
        });
    }
}

module.exports = new DashboardService();
module.exports.PLATFORM_KEYS = PLATFORM_KEYS;
module.exports.readConnectedUsername = readConnectedUsername;
