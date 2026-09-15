const axios = require("axios");
const cheerio = require("cheerio");

const GFG_BASE_URL =
    "https://www.geeksforgeeks.org/profile";

const REQUEST_TIMEOUT = 15000;

const normalizeUsername = (username) => {
    if (typeof username !== "string") {
        return "";
    }

    return username.trim();
};

const isValidUsername = (username) => {
    if (!username || username.length > 50) {
        return false;
    }

    return /^[a-zA-Z0-9_.-]+$/.test(username);
};

const normalizeText = (value) => {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
};

const extractNumber = (text, patterns) => {
    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) {
            return Number(
                String(match[1]).replace(/,/g, "")
            ) || 0;
        }
    }

    return 0;
};

const createFailureResponse = (
    username,
    message,
    metadata = {}
) => ({
    platform: "geeksforgeeks",
    connected: Boolean(username),
    username,
    success: false,
    data: null,
    error: message,

    metadata: {
        fetchedAt: new Date().toISOString(),
        ...metadata
    }
});

class GeeksForGeeksService {
    /*
    |--------------------------------------------------------------------------
    | Upcoming Contests
    |--------------------------------------------------------------------------
    */

    async getUpcomingContests() {
        return [];
    }

    /*
    |--------------------------------------------------------------------------
    | User Statistics
    |--------------------------------------------------------------------------
    */

    async getUserStats(username) {
        const normalizedUsername =
            normalizeUsername(username);

        if (!normalizedUsername) {
            return createFailureResponse(
                "",
                "GeeksforGeeks username is not connected."
            );
        }

        if (!isValidUsername(normalizedUsername)) {
            return createFailureResponse(
                normalizedUsername,
                "The GeeksforGeeks username format is invalid."
            );
        }

        const profileUrl =
            `${GFG_BASE_URL}/` +
            encodeURIComponent(normalizedUsername);

        try {
            const response = await axios.get(
                profileUrl,
                {
                    timeout: REQUEST_TIMEOUT,

                    headers: {
                        Accept:
                            "text/html,application/xhtml+xml",

                        "Accept-Language":
                            "en-US,en;q=0.9",

                        "User-Agent":
                            "Mozilla/5.0 " +
                            "(compatible; Way2Code/1.0)"
                    },

                    maxRedirects: 5,

                    validateStatus: (status) => {
                        return status >= 200 &&
                            status < 500;
                    }
                }
            );

            if (response.status === 404) {
                return createFailureResponse(
                    normalizedUsername,
                    "GeeksforGeeks user was not found.",
                    {
                        statusCode: 404
                    }
                );
            }

            if (response.status !== 200) {
                return createFailureResponse(
                    normalizedUsername,
                    "GeeksforGeeks profile data is temporarily unavailable.",
                    {
                        statusCode: response.status
                    }
                );
            }

            const $ = cheerio.load(response.data);

            const pageTitle = normalizeText(
                $("title").first().text()
            );

            const pageText = normalizeText(
                $("body").text()
            );

            if (
                /page not found|profile not found|404/i.test(
                    `${pageTitle} ${pageText}`
                )
            ) {
                return createFailureResponse(
                    normalizedUsername,
                    "GeeksforGeeks user was not found.",
                    {
                        statusCode: 404
                    }
                );
            }

            const displayName =
                normalizeText(
                    $("h1").first().text()
                ) ||
                normalizeText(
                    $('meta[property="og:title"]')
                        .attr("content")
                ) ||
                normalizedUsername;

            const avatarUrl =
                $('meta[property="og:image"]')
                    .attr("content") || "";

            const codingScore = extractNumber(
                pageText,
                [
                    /Coding Score\s*[:-]?\s*(\d[\d,]*)/i,
                    /(\d[\d,]*)\s*Coding Score/i
                ]
            );

            const problemsSolved = extractNumber(
                pageText,
                [
                    /Problems Solved\s*[:-]?\s*(\d[\d,]*)/i,
                    /Total Problems Solved\s*[:-]?\s*(\d[\d,]*)/i
                ]
            );

            const articlesPublished = extractNumber(
                pageText,
                [
                    /Articles Published\s*[:-]?\s*(\d[\d,]*)/i
                ]
            );

            const currentStreak = extractNumber(
                pageText,
                [
                    /(\d[\d,]*)\s*Day POTD Streak/i,
                    /Current Streak\s*[:-]?\s*(\d[\d,]*)/i
                ]
            );

            const maximumStreak = extractNumber(
                pageText,
                [
                    /Max(?:imum)? Streak\s*[:-]?\s*(\d[\d,]*)/i,
                    /Longest Streak\s*[:-]?\s*(\d[\d,]*)/i
                ]
            );

            const instituteRank = extractNumber(
                pageText,
                [
                    /Institute Rank\s*[:#-]?\s*(\d[\d,]*)/i
                ]
            );

            const monthlyScore = extractNumber(
                pageText,
                [
                    /Monthly Score\s*[:-]?\s*(\d[\d,]*)/i
                ]
            );

            const difficulty = {
                school: extractNumber(
                    pageText,
                    [
                        /School\s*\(\s*(\d[\d,]*)\s*\)/i,
                        /School\s*[:-]?\s*(\d[\d,]*)/i
                    ]
                ),

                basic: extractNumber(
                    pageText,
                    [
                        /Basic\s*\(\s*(\d[\d,]*)\s*\)/i,
                        /Basic\s*[:-]?\s*(\d[\d,]*)/i
                    ]
                ),

                easy: extractNumber(
                    pageText,
                    [
                        /Easy\s*\(\s*(\d[\d,]*)\s*\)/i,
                        /Easy\s*[:-]?\s*(\d[\d,]*)/i
                    ]
                ),

                medium: extractNumber(
                    pageText,
                    [
                        /Medium\s*\(\s*(\d[\d,]*)\s*\)/i,
                        /Medium\s*[:-]?\s*(\d[\d,]*)/i
                    ]
                ),

                hard: extractNumber(
                    pageText,
                    [
                        /Hard\s*\(\s*(\d[\d,]*)\s*\)/i,
                        /Hard\s*[:-]?\s*(\d[\d,]*)/i
                    ]
                )
            };

            const difficultyTotal =
                difficulty.school +
                difficulty.basic +
                difficulty.easy +
                difficulty.medium +
                difficulty.hard;

            const resolvedProblemsSolved =
                problemsSolved || difficultyTotal;

            const hasProfileData =
                codingScore > 0 ||
                resolvedProblemsSolved > 0 ||
                articlesPublished > 0 ||
                /Coding Score|Problems Solved/i.test(
                    pageText
                );

            if (!hasProfileData) {
                return createFailureResponse(
                    normalizedUsername,
                    "GeeksforGeeks profile could not be parsed."
                );
            }

            return {
                platform: "geeksforgeeks",
                connected: true,
                username: normalizedUsername,
                success: true,

                data: {
                    profile: {
                        displayName,
                        avatarUrl,
                        profileUrl
                    },

                    score: {
                        coding: codingScore,
                        monthly: monthlyScore,
                        instituteRank
                    },

                    problems: {
                        solved:
                            resolvedProblemsSolved,

                        difficulty
                    },

                    activity: {
                        currentStreak,
                        maximumStreak,
                        articlesPublished
                    }
                },

                metadata: {
                    source:
                        "GeeksforGeeks public profile page",

                    fetchedAt:
                        new Date().toISOString()
                }
            };
        } catch (error) {
            let message =
                "GeeksforGeeks profile data is temporarily unavailable.";

            if (error.code === "ECONNABORTED") {
                message =
                    "GeeksforGeeks took too long to respond. " +
                    "Please try again.";
            }

            return createFailureResponse(
                normalizedUsername,
                message,
                {
                    statusCode:
                        error.response?.status || null
                }
            );
        }
    }
}

module.exports = new GeeksForGeeksService();