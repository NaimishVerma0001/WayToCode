const {
    request,
    getErrorMessage
} = require("../../utils/httpClient");

const {
    createPlatformSuccess,
    createPlatformFailure,
    createDisconnectedPlatformResponse
} = require("../../utils/platformResponse");

const PLATFORM_NAME = "github";
const GITHUB_API_BASE_URL = "https://api.github.com";

const normalizeUsername = (username) => {
    if (typeof username !== "string") {
        return "";
    }

    return username.trim();
};

const isValidGitHubUsername = (username) => {
    if (!username || username.length > 39) {
        return false;
    }

    const githubUsernamePattern =
        /^(?!-)(?!.*--)[a-zA-Z0-9-]+(?<!-)$/;

    return githubUsernamePattern.test(username);
};

const createGitHubHeaders = () => {
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Way2Code"
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
};

const fetchGitHubProfile = async (username) => {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
        return createDisconnectedPlatformResponse(PLATFORM_NAME);
    }

    if (!isValidGitHubUsername(normalizedUsername)) {
        return createPlatformFailure(
            PLATFORM_NAME,
            normalizedUsername,
            "The GitHub username format is invalid."
        );
    }

    try {
        const response = await request(
            {
                method: "GET",
                url: `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(
                    normalizedUsername
                )}`,
                headers: createGitHubHeaders()
            },
            {
                retries: 2
            }
        );

        const profile = response.data;

        const profileData = {
            name: profile.name || "",
            username: profile.login || normalizedUsername,
            avatarUrl: profile.avatar_url || "",
            profileUrl: profile.html_url || "",
            bio: profile.bio || "",
            company: profile.company || "",
            location: profile.location || "",
            blog: profile.blog || "",
            publicRepositories: profile.public_repos || 0,
            publicGists: profile.public_gists || 0,
            followers: profile.followers || 0,
            following: profile.following || 0,
            accountCreatedAt: profile.created_at || null,
            accountUpdatedAt: profile.updated_at || null
        };

        return createPlatformSuccess(
            PLATFORM_NAME,
            normalizedUsername,
            profileData,
            {
                connected: true,
                source: "GitHub REST API",
                fetchedAt: new Date().toISOString(),
                rateLimitRemaining:
                    response.headers?.["x-ratelimit-remaining"] ??
                    null,
                rateLimitReset:
                    response.headers?.["x-ratelimit-reset"] ??
                    null
            }
        );
    } catch (error) {
        const statusCode = error.response?.status || null;

        let fallbackMessage =
            "GitHub profile data is temporarily unavailable.";

        if (statusCode === 404) {
            fallbackMessage = "GitHub user was not found.";
        }

        if (statusCode === 403 || statusCode === 429) {
            fallbackMessage =
                "GitHub API rate limit has been reached. Please try again later.";
        }

        const message = getErrorMessage(
            error,
            fallbackMessage
        );

        return createPlatformFailure(
            PLATFORM_NAME,
            normalizedUsername,
            message,
            {
                connected: true,
                statusCode,
                fetchedAt: new Date().toISOString(),
                rateLimitRemaining:
                    error.response?.headers?.[
                        "x-ratelimit-remaining"
                    ] ?? null,
                rateLimitReset:
                    error.response?.headers?.[
                        "x-ratelimit-reset"
                    ] ?? null
            }
        );
    }
};

const getUserStats = async (username) => {
    return fetchGitHubProfile(username);
};

module.exports = {
    fetchGitHubProfile,
    getUserStats
};