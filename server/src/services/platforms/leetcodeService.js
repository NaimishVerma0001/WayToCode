const axios = require("axios");

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const REQUEST_TIMEOUT = 8000; // Tightened timeout for fail-fast behavior

// Simple in-memory cache to prevent external API hammering under traffic
const statsCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const CONTEST_QUERY = `
query getUpcomingContests {
    allContests {
        title
        titleSlug
        startTime
        duration
    }
}
`;

const USER_STATS_QUERY = `
query getUserProfile($username: String!) {
    matchedUser(username: $username) {
        username
        profile { realName userAvatar ranking reputation }
        submitStatsGlobal { acSubmissionNum { difficulty count submissions } }
    }
    userContestRanking(username: $username) {
        attendedContestsCount rating globalRanking topPercentage
    }
}
`;

const normalizeUsername = (username) => {
    if (typeof username !== "string") return "";
    return username.trim().toLowerCase().replace(/^https?:\/\/leetcode\.com\/(u\/)?/, "").replace(/\/$/, "");
};

const isValidLeetCodeUsername = (username) => {
    if (!username || username.length > 50) return false;
    return /^[a-zA-Z0-9_-]+$/.test(username);
};

const createHeaders = () => ({
    "Content-Type": "application/json",
    Accept: "application/json",
    Referer: "https://leetcode.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
});

/*
|--------------------------------------------------------------------------
| Production-Grade GraphQL Request with Caching & Fallback
|--------------------------------------------------------------------------
*/
const makeGraphQLRequest = async (query, variables = {}) => {
    const username = variables.username ? normalizeUsername(variables.username) : null;
    
    // Check cache first for user stats to protect external limits under load
    if (username && statsCache.has(username)) {
        const cached = statsCache.get(username);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        statsCache.delete(username);
    }

    try {
        const response = await axios.post(
            LEETCODE_GRAPHQL,
            { query, variables },
            { headers: createHeaders(), timeout: REQUEST_TIMEOUT }
        );

        if (response.data?.errors?.length) {
            throw new Error("LeetCode GraphQL query rejected.");
        }

        const data = response.data?.data || {};
        
        // Cache successful response
        if (username) {
            statsCache.set(username, { timestamp: Date.now(), data });
        }

        return data;
    } catch (primaryError) {
        // Fallback to public mirror if direct GraphQL fails
        if (username) {
            try {
                const mirrorRes = await axios.get(`https://alfa-leetcode-api.vercel.app/userProfile?username=${username}`, { timeout: REQUEST_TIMEOUT });
                const profileData = mirrorRes.data || {};

                const fallbackData = {
                    matchedUser: {
                        username: username,
                        profile: {
                            realName: profileData.name || "",
                            userAvatar: profileData.avatar || "",
                            ranking: profileData.ranking || null,
                            reputation: 0
                        },
                        submitStatsGlobal: {
                            acSubmissionNum: [
                                { difficulty: "All", count: profileData.totalSolved || 0, submissions: 0 },
                                { difficulty: "Easy", count: profileData.easySolved || 0, submissions: 0 },
                                { difficulty: "Medium", count: profileData.mediumSolved || 0, submissions: 0 },
                                { difficulty: "Hard", count: profileData.hardSolved || 0, submissions: 0 }
                            ]
                        }
                    },
                    userContestRanking: {
                        attendedContestsCount: profileData.contestsCount || 0,
                        rating: profileData.contestRating ? Math.round(profileData.contestRating) : null,
                        globalRanking: profileData.contestGlobalRanking || null,
                        topPercentage: profileData.contestTopPercentage || null
                    }
                };

                return fallbackData;
            } catch (mirrorError) {
                throw new Error("Unable to fetch LeetCode profile from primary or fallback providers.");
            }
        }
        throw primaryError;
    }
};

const findDifficultyStats = (statistics, difficulty) => {
    const item = statistics.find((entry) => entry.difficulty.toLowerCase() === difficulty.toLowerCase());
    return { solved: Number(item?.count) || 0, submissions: Number(item?.submissions) || 0 };
};

const getUpcomingContests = async () => {
    try {
        const data = await makeGraphQLRequest(CONTEST_QUERY);
        const contests = data.allContests || [];

        return contests
            .filter((contest) => contest.startTime * 1000 > Date.now())
            .map((contest) => ({
                contestId: contest.titleSlug,
                platform: "LeetCode",
                contestName: contest.title,
                startTime: new Date(contest.startTime * 1000),
                duration: contest.duration / 60,
                url: `https://leetcode.com/contest/${contest.titleSlug}`,
                type: "LC"
            }));
    } catch (error) {
        console.error("❌ LeetCode contest API error:", error.message);
        return [];
    }
};

const getUserStats = async (username) => {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
        return { platform: "leetcode", connected: false, username: "", success: false, data: null, error: "LeetCode username is required." };
    }
    if (!isValidLeetCodeUsername(normalizedUsername)) {
        return { platform: "leetcode", connected: true, username: normalizedUsername, success: false, data: null, error: "Invalid username format." };
    }

    try {
        const result = await makeGraphQLRequest(USER_STATS_QUERY, { username: normalizedUsername });
        const matchedUser = result.matchedUser;
        
        if (!matchedUser || !matchedUser.username) {
            return { platform: "leetcode", connected: true, username: normalizedUsername, success: false, data: null, error: "LeetCode user not found." };
        }

        const acceptedStatistics = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
        const allStats = findDifficultyStats(acceptedStatistics, "All");
        const easyStats = findDifficultyStats(acceptedStatistics, "Easy");
        const mediumStats = findDifficultyStats(acceptedStatistics, "Medium");
        const hardStats = findDifficultyStats(acceptedStatistics, "Hard");
        const contestRanking = result.userContestRanking || null;

        return {
            platform: "leetcode",
            connected: true,
            username: matchedUser.username,
            success: true,
            data: {
                profile: {
                    realName: matchedUser.profile?.realName || "",
                    avatarUrl: matchedUser.profile?.userAvatar || "",
                    profileUrl: `https://leetcode.com/u/${encodeURIComponent(matchedUser.username)}/`,
                    ranking: Number(matchedUser.profile?.ranking) || null,
                    reputation: Number(matchedUser.profile?.reputation) || 0
                },
                problemsSolved: { total: allStats.solved, easy: easyStats.solved, medium: mediumStats.solved, hard: hardStats.solved },
                submissions: { total: allStats.submissions, easy: easyStats.submissions, medium: mediumStats.submissions, hard: hardStats.submissions },
                contest: {
                    attended: Number(contestRanking?.attendedContestsCount) || 0,
                    rating: Number(contestRanking?.rating) || null,
                    globalRanking: Number(contestRanking?.globalRanking) || null,
                    topPercentage: Number(contestRanking?.topPercentage) || null
                }
            },
            metadata: { source: "LeetCode Production Service", fetchedAt: new Date().toISOString() }
        };
    } catch (error) {
        return {
            platform: "leetcode",
            connected: true,
            username: normalizedUsername,
            success: false,
            data: null,
            error: error.message || "Failed to retrieve LeetCode profile stats.",
            metadata: { fetchedAt: new Date().toISOString() }
        };
    }
};

module.exports = { getUpcomingContests, getUserStats };