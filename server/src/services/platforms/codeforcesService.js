// server/src/services/platforms/codeforcesService.js

const axios = require("axios");

const CODEFORCES_API_BASE_URL = "https://codeforces.com/api";
const REQUEST_TIMEOUT = 10000;
const API_REQUEST_DELAY = 1500; 

const statsCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; 

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const normalizeUsername = (username) => typeof username === "string" ? username.trim() : "";
const isValidCodeforcesUsername = (username) => {
    if (!username || username.length > 50) return false;
    return /^[a-zA-Z0-9_.-]+$/.test(username);
};

const createProblemKey = (problem) => {
    const contestId = problem?.contestId ?? problem?.problemsetName ?? "unknown";
    const index = problem?.index ?? problem?.name ?? "unknown";
    return `${contestId}-${index}`;
};

// 1. FIX SCRAPER HEADERS TO BYPASS CLOUDFLARE
const requestCodeforces = async (method, params = {}) => {
    const response = await axios.get(`${CODEFORCES_API_BASE_URL}/${method}`, {
        params,
        timeout: REQUEST_TIMEOUT,
        headers: { 
            "Accept": "application/json", 
            // Standard browser User-Agent to bypass Cloudflare 403s
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        }
    });
    if (response.data?.status !== "OK") {
        throw new Error(response.data?.comment || "Codeforces returned an unsuccessful response.");
    }
    return response.data.result;
};

const createDifficultyBreakdown = (solvedProblems) => {
    const breakdown = { unrated: 0, beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    solvedProblems.forEach((problem) => {
        const rating = Number(problem.rating) || 0;
        if (!rating) breakdown.unrated += 1;
        else if (rating < 1200) breakdown.beginner += 1;
        else if (rating < 1600) breakdown.intermediate += 1;
        else if (rating < 2100) breakdown.advanced += 1;
        else breakdown.expert += 1;
    });
    return breakdown;
};

const createLanguageBreakdown = (submissions) => {
    const languages = {};
    submissions.forEach((submission) => {
        const language = submission.programmingLanguage || "Unknown";
        languages[language] = (languages[language] || 0) + 1;
    });
    return languages;
};

class CodeforcesService {
    async getUpcomingContests() {
        try {
            const contests = await requestCodeforces("contest.list", { gym: false });
            return contests
                .filter((contest) => contest.phase === "BEFORE")
                .map((contest) => ({
                    contestId: contest.id.toString(),
                    platform: "Codeforces",
                    contestName: contest.name,
                    startTime: new Date(contest.startTimeSeconds * 1000),
                    duration: contest.durationSeconds / 60,
                    url: `https://codeforces.com/contest/${contest.id}`,
                    type: contest.type || "CF"
                }));
        } catch (error) {
            console.error("❌ Codeforces contest API error:", error.message);
            return [];
        }
    }

    async getUserStats(username) {
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername) return { platform: "codeforces", connected: false, username: "", success: false, data: null, error: "Codeforces username is not connected." };
        if (!isValidCodeforcesUsername(normalizedUsername)) return { platform: "codeforces", connected: true, username: normalizedUsername, success: false, data: null, error: "The Codeforces username format is invalid." };

        if (statsCache.has(normalizedUsername)) {
            const cached = statsCache.get(normalizedUsername);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                return cached.data;
            }
            statsCache.delete(normalizedUsername);
        }

        try {
            const users = await requestCodeforces("user.info", { handles: normalizedUsername, checkHistoricHandles: true });
            const user = users?.[0];
            if (!user) return { platform: "codeforces", connected: true, username: normalizedUsername, success: false, data: null, error: "Codeforces user was not found." };

            await wait(API_REQUEST_DELAY);
            const submissions = await requestCodeforces("user.status", { handle: user.handle });

            const attemptedProblemKeys = new Set();
            const solvedProblemMap = new Map();
            const contestIds = new Set();
            const verdicts = {};
            let acceptedSubmissions = 0;
            let latestSubmissionAt = null;

            submissions.forEach((submission) => {
                const problemKey = createProblemKey(submission.problem);
                attemptedProblemKeys.add(problemKey);
                const verdict = submission.verdict || "UNKNOWN";
                verdicts[verdict] = (verdicts[verdict] || 0) + 1;

                if (verdict === "OK") {
                    acceptedSubmissions += 1;
                    if (!solvedProblemMap.has(problemKey)) solvedProblemMap.set(problemKey, submission.problem);
                }

                if (submission.author?.participantType === "CONTESTANT") {
                    const contestId = submission.contestId ?? submission.problem?.contestId;
                    if (contestId !== undefined) contestIds.add(contestId);
                }

                const submissionTime = Number(submission.creationTimeSeconds) || 0;
                if (submissionTime && (!latestSubmissionAt || submissionTime > latestSubmissionAt)) latestSubmissionAt = submissionTime;
            });

            const solvedProblems = [...solvedProblemMap.values()];

            const resultPayload = {
                platform: "codeforces", connected: true, username: user.handle || normalizedUsername, success: true,
                data: {
                    profile: {
                        handle: user.handle || normalizedUsername, firstName: user.firstName || "", lastName: user.lastName || "",
                        country: user.country || "", city: user.city || "", organization: user.organization || "",
                        avatarUrl: user.titlePhoto || user.avatar || "", profileUrl: `https://codeforces.com/profile/${encodeURIComponent(user.handle || normalizedUsername)}`,
                        contribution: Number(user.contribution) || 0, friendOfCount: Number(user.friendOfCount) || 0,
                        registeredAt: user.registrationTimeSeconds ? new Date(user.registrationTimeSeconds * 1000).toISOString() : null,
                        lastOnlineAt: user.lastOnlineTimeSeconds ? new Date(user.lastOnlineTimeSeconds * 1000).toISOString() : null
                    },
                    rating: { current: Number(user.rating) || null, maximum: Number(user.maxRating) || null, rank: user.rank || "unrated", maximumRank: user.maxRank || "unrated" },
                    problems: { solved: solvedProblemMap.size, attempted: attemptedProblemKeys.size, unsolved: Math.max(attemptedProblemKeys.size - solvedProblemMap.size, 0), difficulty: createDifficultyBreakdown(solvedProblems) },
                    submissions: { total: submissions.length, accepted: acceptedSubmissions, verdicts, languages: createLanguageBreakdown(submissions), latestSubmissionAt: latestSubmissionAt ? new Date(latestSubmissionAt * 1000).toISOString() : null },
                    contests: { participated: contestIds.size }
                },
                metadata: { source: "Codeforces API", fetchedAt: new Date().toISOString() }
            };

            statsCache.set(normalizedUsername, { timestamp: Date.now(), data: resultPayload });

            return resultPayload;
        } catch (error) {
            const statusCode = error.response?.status || null;
            const apiMessage = error.response?.data?.comment || "";
            let message = "Codeforces profile data is temporarily unavailable.";
            if (statusCode === 400 || /not found/i.test(apiMessage) || /not found/i.test(error.message)) message = "Codeforces user was not found.";
            else if (/limit exceeded/i.test(apiMessage) || /limit exceeded/i.test(error.message) || statusCode === 429) message = "Codeforces request limit was reached. Please wait and try again.";
            else if (error.code === "ECONNABORTED") message = "Codeforces took too long to respond. Please try again.";

            // 2. FIX RETURN STRUCTURE TO PREVENT AGGREGATOR ERRORS
            return {
                platform: "codeforces", 
                connected: true, 
                username: normalizedUsername, 
                success: false, 
                data: {}, // Return empty object instead of null to prevent frontend crashes if aggregator forces success: true
                error: message,
                metadata: { statusCode, fetchedAt: new Date().toISOString() }
            };
        }
    }
}

module.exports = new CodeforcesService();