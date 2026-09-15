const axios = require("axios");
const cheerio = require("cheerio");

const CODECHEF_BASE_URL = "https://www.codechef.com";
const REQUEST_TIMEOUT = 15000;

const normalizeUsername = (username) => {
    if (typeof username !== "string") {
        return "";
    }

    return username.trim();
};

const isValidCodeChefUsername = (username) => {
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

const parseNumber = (value) => {
    const match = String(value || "")
        .replace(/,/g, "")
        .match(/\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : null;
};

const findLabeledValue = ($, label) => {
    let result = "";

    $("li").each((index, element) => {
        const text = normalizeText($(element).text());

        if (
            text.toLowerCase().startsWith(
                label.toLowerCase()
            )
        ) {
            result = normalizeText(
                text.slice(label.length)
            );
        }
    });

    return result;
};

const extractProblemsSolved = ($) => {
    let solved = null;

    $("body *").each((index, element) => {
        const text = normalizeText($(element).text());

        const match = text.match(
            /Total Problems Solved:\s*(\d+)/i
        );

        if (match && solved === null) {
            solved = Number(match[1]);
        }
    });

    return solved || 0;
};

const extractHighestRating = ($) => {
    const pageText = normalizeText($("body").text());

    const match = pageText.match(
        /Highest Rating\s*(\d+)/i
    );

    return match ? Number(match[1]) : null;
};

const extractStars = ($) => {
    const starText = normalizeText(
        $(".rating-star").first().text()
    );

    const stars = (
        starText.match(/[★*]/g) || []
    ).length;

    return stars || null;
};

const extractRank = ($, label) => {
    let result = null;

    $(".rating-ranks li, .rating-ranks").each(
        (index, element) => {
            const text = normalizeText(
                $(element).text()
            );

            if (
                result === null &&
                text.toLowerCase().includes(
                    label.toLowerCase()
                )
            ) {
                result = parseNumber(text);
            }
        }
    );

    return result;
};

const createFailureResponse = (
    username,
    message,
    metadata = {}
) => {
    return {
        platform: "codechef",
        connected: Boolean(username),
        username,
        success: false,
        data: null,
        error: message,
        metadata: {
            fetchedAt: new Date().toISOString(),
            ...metadata
        }
    };
};

class CodeChefService {
    /*
    |--------------------------------------------------------------------------
    | Upcoming Contests
    |--------------------------------------------------------------------------
    |
    | CodeChef currently has no stable public contest API used by this service.
    | Returning an empty array preserves the contest-service contract.
    |
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
                "CodeChef username is not connected."
            );
        }

        if (!isValidCodeChefUsername(normalizedUsername)) {
            return createFailureResponse(
                normalizedUsername,
                "The CodeChef username format is invalid."
            );
        }

        const profileUrl =
            `${CODECHEF_BASE_URL}/users/` +
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
                        return status >= 200 && status < 500;
                    }
                }
            );

            if (response.status === 404) {
                return createFailureResponse(
                    normalizedUsername,
                    "CodeChef user was not found.",
                    {
                        statusCode: 404
                    }
                );
            }

            if (response.status !== 200) {
                return createFailureResponse(
                    normalizedUsername,
                    "CodeChef profile data is temporarily unavailable.",
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

            const profileNotFound =
                /page not found|user not found|404/i.test(
                    `${pageTitle} ${pageText}`
                );

            if (profileNotFound) {
                return createFailureResponse(
                    normalizedUsername,
                    "CodeChef user was not found.",
                    {
                        statusCode: 404
                    }
                );
            }

            const displayName =
                normalizeText(
                    $(".user-details-container h1")
                        .first()
                        .text()
                ) ||
                normalizeText(
                    $("header h1").first().text()
                );

            const currentRating =
                parseNumber(
                    $(".rating-number")
                        .first()
                        .text()
                );

            const highestRating =
                extractHighestRating($);

            const divisionText =
                normalizeText(
                    $(".rating-number")
                        .first()
                        .next()
                        .text()
                );

            const divisionMatch =
                pageText.match(/\(Div\s*(\d+)\)/i);

            const globalRank =
                extractRank($, "Global Rank");

            const countryRank =
                extractRank($, "Country Rank");

            const problemsSolved =
                extractProblemsSolved($);

            const country =
                findLabeledValue($, "Country:");

            const state =
                findLabeledValue($, "State:");

            const city =
                findLabeledValue($, "City:");

            const institution =
                findLabeledValue($, "Institution:");

            const stars = extractStars($);

            /*
             * A valid public profile should expose at least
             * a display name, rating, or solved count.
             */
            if (
                !displayName &&
                currentRating === null &&
                problemsSolved === 0
            ) {
                return createFailureResponse(
                    normalizedUsername,
                    "CodeChef profile could not be parsed."
                );
            }

            return {
                platform: "codechef",
                connected: true,
                username: normalizedUsername,
                success: true,

                data: {
                    profile: {
                        displayName:
                            displayName ||
                            normalizedUsername,

                        profileUrl,

                        country,
                        state,
                        city,
                        institution
                    },

                    rating: {
                        current: currentRating,
                        highest: highestRating,
                        stars,

                        division:
                            divisionMatch
                                ? Number(
                                    divisionMatch[1]
                                )
                                : (
                                    parseNumber(
                                        divisionText
                                    ) || null
                                ),

                        globalRank,
                        countryRank
                    },

                    problems: {
                        solved: problemsSolved
                    }
                },

                metadata: {
                    source:
                        "CodeChef public profile page",

                    fetchedAt:
                        new Date().toISOString()
                }
            };
        } catch (error) {
            let message =
                "CodeChef profile data is temporarily unavailable.";

            if (
                error.code === "ECONNABORTED"
            ) {
                message =
                    "CodeChef took too long to respond. " +
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

module.exports = new CodeChefService();