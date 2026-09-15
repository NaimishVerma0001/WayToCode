const axios = require("axios");
const cheerio = require("cheerio");

const HACKERRANK_BASE_URL =
    "https://www.hackerrank.com";

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

const parseNumber = (value) => {
    const match = String(value || "")
        .replace(/,/g, "")
        .match(/-?\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : 0;
};

const createHeaders = (accept) => ({
    Accept: accept,
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
        "Mozilla/5.0 (compatible; Way2Code/1.0)"
});

const createFailureResponse = (
    username,
    message,
    metadata = {}
) => ({
    platform: "hackerrank",
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

const requestJson = async (path) => {
    const response = await axios.get(
        `${HACKERRANK_BASE_URL}${path}`,
        {
            timeout: REQUEST_TIMEOUT,

            headers: createHeaders(
                "application/json"
            ),

            validateStatus: (status) => {
                return status >= 200 && status < 500;
            }
        }
    );

    if (response.status !== 200) {
        const error = new Error(
            `HackerRank returned status ${response.status}.`
        );

        error.statusCode = response.status;

        throw error;
    }

    return response.data;
};

const fetchProfileData = async (username) => {
    const encodedUsername =
        encodeURIComponent(username);

    const paths = [
        `/rest/hackers/${encodedUsername}/profile`,

        `/rest/contests/master/hackers/` +
        `${encodedUsername}/profile`
    ];

    let lastError = null;

    for (const path of paths) {
        try {
            const response = await requestJson(path);

            const profile =
                response?.model ||
                response?.data ||
                response;

            if (
                profile &&
                typeof profile === "object"
            ) {
                return profile;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw (
        lastError ||
        new Error("HackerRank profile was not found.")
    );
};

const fetchBadges = async (username) => {
    const encodedUsername =
        encodeURIComponent(username);

    const paths = [
        `/rest/hackers/${encodedUsername}/badges`,

        `/rest/contests/master/hackers/` +
        `${encodedUsername}/badges`
    ];

    for (const path of paths) {
        try {
            const response = await requestJson(path);

            const badges =
                response?.models ||
                response?.data ||
                response?.badges ||
                [];

            if (Array.isArray(badges)) {
                return badges;
            }
        } catch (error) {
            // Try the next public resource.
        }
    }

    return [];
};

const fetchCertificates = async (username) => {
    const encodedUsername =
        encodeURIComponent(username);

    const paths = [
        `/rest/hackers/${encodedUsername}/certificates`,

        `/rest/contests/master/hackers/` +
        `${encodedUsername}/certificates`
    ];

    for (const path of paths) {
        try {
            const response = await requestJson(path);

            const certificates =
                response?.models ||
                response?.data ||
                response?.certificates ||
                [];

            if (Array.isArray(certificates)) {
                return certificates;
            }
        } catch (error) {
            // Certificates are optional.
        }
    }

    return [];
};

const fetchProfilePageFallback = async (
    username
) => {
    const profileUrl =
        `${HACKERRANK_BASE_URL}/profile/` +
        encodeURIComponent(username);

    const response = await axios.get(
        profileUrl,
        {
            timeout: REQUEST_TIMEOUT,

            headers: createHeaders(
                "text/html,application/xhtml+xml"
            ),

            maxRedirects: 5,

            validateStatus: (status) => {
                return status >= 200 && status < 500;
            }
        }
    );

    if (response.status === 404) {
        const error = new Error(
            "HackerRank user was not found."
        );

        error.statusCode = 404;

        throw error;
    }

    if (response.status !== 200) {
        const error = new Error(
            "HackerRank profile is unavailable."
        );

        error.statusCode = response.status;

        throw error;
    }

    const $ = cheerio.load(response.data);

    const title = normalizeText(
        $("title").first().text()
    );

    const description = normalizeText(
        $('meta[name="description"]')
            .attr("content")
    );

    const pageText = normalizeText(
        $("body").text()
    );

    if (
        /page not found|user not found|404/i.test(
            `${title} ${pageText}`
        )
    ) {
        const error = new Error(
            "HackerRank user was not found."
        );

        error.statusCode = 404;

        throw error;
    }

    return {
        username,
        name:
            normalizeText(
                $('meta[property="og:title"]')
                    .attr("content")
            ) ||
            title.replace(/\s*\|\s*HackerRank.*$/i, ""),

        avatar:
            $('meta[property="og:image"]')
                .attr("content") || "",

        bio: description,

        profileUrl,

        htmlFallback: true
    };
};

const formatBadges = (badges) => {
    return badges.map((badge) => ({
        name:
            badge.badge_name ||
            badge.name ||
            badge.track_name ||
            "",

        stars:
            parseNumber(
                badge.stars ||
                badge.star_count ||
                badge.level
            ),

        level:
            badge.level ||
            badge.badge_type ||
            "",

        score:
            parseNumber(
                badge.score ||
                badge.points
            )
    }));
};

const formatCertificates = (certificates) => {
    return certificates.map(
        (certificate) => ({
            name:
                certificate.certification_name ||
                certificate.name ||
                certificate.skill ||
                "",

            status:
                certificate.status || "verified",

            certificateUrl:
                certificate.certificate_url ||
                certificate.url ||
                ""
        })
    );
};

class HackerRankService {
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
                "HackerRank username is not connected."
            );
        }

        if (!isValidUsername(normalizedUsername)) {
            return createFailureResponse(
                normalizedUsername,
                "The HackerRank username format is invalid."
            );
        }

        try {
            let profile;
            let source =
                "HackerRank public profile resources";

            try {
                profile = await fetchProfileData(
                    normalizedUsername
                );
            } catch (profileError) {
                profile =
                    await fetchProfilePageFallback(
                        normalizedUsername
                    );

                source =
                    "HackerRank public profile page";
            }

            const [
                badges,
                certificates
            ] = await Promise.all([
                fetchBadges(normalizedUsername),
                fetchCertificates(
                    normalizedUsername
                )
            ]);

            const resolvedUsername =
                profile.username ||
                profile.hacker_username ||
                profile.handle ||
                normalizedUsername;

            return {
                platform: "hackerrank",
                connected: true,
                username: resolvedUsername,
                success: true,

                data: {
                    profile: {
                        displayName:
                            profile.name ||
                            profile.full_name ||
                            profile.real_name ||
                            resolvedUsername,

                        avatarUrl:
                            profile.avatar ||
                            profile.avatar_url ||
                            profile.photo ||
                            "",

                        profileUrl:
                            profile.profileUrl ||
                            `${HACKERRANK_BASE_URL}/profile/` +
                            encodeURIComponent(
                                resolvedUsername
                            ),

                        bio:
                            profile.bio ||
                            profile.headline ||
                            "",

                        country:
                            profile.country ||
                            profile.country_name ||
                            "",

                        school:
                            profile.school ||
                            profile.education ||
                            "",

                        company:
                            profile.company ||
                            profile.employment ||
                            ""
                    },

                    statistics: {
                        solved:
                            parseNumber(
                                profile.solved_challenges ||
                                profile.challenges_solved ||
                                profile.total_solved
                            ),

                        practiceScore:
                            parseNumber(
                                profile.score ||
                                profile.practice_score
                            ),

                        ranking:
                            parseNumber(
                                profile.rank ||
                                profile.ranking
                            ),

                        reputation:
                            parseNumber(
                                profile.reputation
                            ),

                        contributionPoints:
                            parseNumber(
                                profile.contribution_points
                            )
                    },

                    badges: formatBadges(badges),

                    certificates:
                        formatCertificates(
                            certificates
                        )
                },

                metadata: {
                    source,
                    fetchedAt:
                        new Date().toISOString()
                }
            };
        } catch (error) {
            let message =
                "HackerRank profile data is temporarily unavailable.";

            const statusCode =
                error.statusCode ||
                error.response?.status ||
                null;

            if (
                statusCode === 404 ||
                /not found/i.test(error.message)
            ) {
                message =
                    "HackerRank user was not found.";
            } else if (
                error.code === "ECONNABORTED"
            ) {
                message =
                    "HackerRank took too long to respond. " +
                    "Please try again.";
            }

            return createFailureResponse(
                normalizedUsername,
                message,
                {
                    statusCode
                }
            );
        }
    }
}

module.exports = new HackerRankService();