const axios = require("axios");
const cheerio = require("cheerio");

const ATCODER_BASE_URL =
    "https://atcoder.jp";

const ATCODER_PROBLEMS_API =
    "https://kenkoooo.com/atcoder/atcoder-api/v3";

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

    return /^[a-zA-Z0-9_]+$/.test(username);
};

const normalizeText = (value) => {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
};

const parseNumber = (value) => {
    const match = String(value || "")
        .replace(/,/g, "")
        .match(/\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : null;
};

const createFailureResponse = (
    username,
    message,
    metadata = {}
) => ({
    platform: "atcoder",
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

const findTableValue = ($, label) => {
    let value = "";

    $("tr").each((index, row) => {
        const cells = $(row).find("th, td");

        if (cells.length < 2) {
            return;
        }

        const currentLabel = normalizeText(
            $(cells[0]).text()
        );

        if (
            currentLabel.toLowerCase() ===
            label.toLowerCase()
        ) {
            value = normalizeText(
                $(cells[1]).text()
            );
        }
    });

    return value;
};

const fetchSolvedProblemStats = async (
    username
) => {
    try {
        const response = await axios.get(
            `${ATCODER_PROBLEMS_API}/user/ac_rank`,
            {
                params: {
                    user: username
                },

                timeout: REQUEST_TIMEOUT,

                headers: {
                    Accept: "application/json",
                    "User-Agent": "Way2Code/1.0"
                }
            }
        );

        return {
            solved:
                Number(response.data?.count) || 0,

            acceptedRank:
                Number(response.data?.rank) || null,

            available: true
        };
    } catch (error) {
        return {
            solved: 0,
            acceptedRank: null,
            available: false
        };
    }
};

class AtCoderService {
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
                "AtCoder username is not connected."
            );
        }

        if (!isValidUsername(normalizedUsername)) {
            return createFailureResponse(
                normalizedUsername,
                "The AtCoder username format is invalid."
            );
        }

        const profileUrl =
            `${ATCODER_BASE_URL}/users/` +
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
                    "AtCoder user was not found.",
                    {
                        statusCode: 404
                    }
                );
            }

            if (response.status !== 200) {
                return createFailureResponse(
                    normalizedUsername,
                    "AtCoder profile data is temporarily unavailable.",
                    {
                        statusCode: response.status
                    }
                );
            }

            const $ = cheerio.load(response.data);

            const title = normalizeText(
                $("title").first().text()
            );

            const pageText = normalizeText(
                $("body").text()
            );

            if (
                /page not found|user not found|404/i.test(
                    `${title} ${pageText}`
                )
            ) {
                return createFailureResponse(
                    normalizedUsername,
                    "AtCoder user was not found.",
                    {
                        statusCode: 404
                    }
                );
            }

            const userHeading =
                normalizeText(
                    $("h3").first().text()
                ) ||
                normalizedUsername;

            const rankText =
                findTableValue($, "Rank");

            const ratingText =
                findTableValue($, "Rating");

            const highestRatingText =
                findTableValue(
                    $,
                    "Highest Rating"
                );

            const ratedMatchesText =
                findTableValue(
                    $,
                    "Rated Matches"
                );

            const lastCompeted =
                findTableValue(
                    $,
                    "Last Competed"
                );

            const country =
                findTableValue(
                    $,
                    "Country/Region"
                ) ||
                findTableValue($, "Country");

            const affiliation =
                findTableValue(
                    $,
                    "Affiliation"
                );

            const birthYear =
                findTableValue(
                    $,
                    "Birth Year"
                );

            const hasProfileData =
                ratingText ||
                highestRatingText ||
                ratedMatchesText ||
                /Contest Status/i.test(pageText);

            if (!hasProfileData) {
                return createFailureResponse(
                    normalizedUsername,
                    "AtCoder profile could not be parsed."
                );
            }

            const solvedStats =
                await fetchSolvedProblemStats(
                    normalizedUsername
                );

            return {
                platform: "atcoder",
                connected: true,
                username: normalizedUsername,
                success: true,

                data: {
                    profile: {
                        displayName:
                            userHeading.replace(
                                /\s*-\s*AtCoder.*$/i,
                                ""
                            ),

                        profileUrl,
                        country,
                        affiliation,

                        birthYear:
                            parseNumber(birthYear)
                    },

                    rating: {
                        current:
                            parseNumber(ratingText),

                        highest:
                            parseNumber(
                                highestRatingText
                            ),

                        rank:
                            parseNumber(rankText),

                        rankLabel: rankText,

                        ratedMatches:
                            parseNumber(
                                ratedMatchesText
                            ),

                        lastCompeted:
                            lastCompeted || null
                    },

                    problems: {
                        solved:
                            solvedStats.solved,

                        acceptedRank:
                            solvedStats.acceptedRank
                    }
                },

                metadata: {
                    source:
                        solvedStats.available
                            ? (
                                "AtCoder public profile and " +
                                "AtCoder Problems"
                            )
                            : "AtCoder public profile",

                    solvedStatsAvailable:
                        solvedStats.available,

                    fetchedAt:
                        new Date().toISOString()
                }
            };
        } catch (error) {
            let message =
                "AtCoder profile data is temporarily unavailable.";

            if (error.code === "ECONNABORTED") {
                message =
                    "AtCoder took too long to respond. " +
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

module.exports = new AtCoderService();