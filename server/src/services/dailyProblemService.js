const axios = require("axios");

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const LEETCODE_GRAPHQL_URL =
    "https://leetcode.com/graphql";

const GFG_DAILY_PROBLEM_URL =
    "https://practiceapi.geeksforgeeks.org/api/vr/problems-of-day/problem/today/";

const CODEFORCES_PROBLEMSET_URL =
    "https://codeforces.com/api/problemset.problems";

const CACHE_DURATION =
    6 * 60 * 60 * 1000;

let dailyProblemCache = null;
let cacheUpdatedAt = null;

/*
|--------------------------------------------------------------------------
| Shared Helpers
|--------------------------------------------------------------------------
*/

const getTodayDate = () => {
    return new Date()
        .toISOString()
        .slice(0, 10);
};

const createEstimatedMinutes = (
    difficulty
) => {
    const normalizedDifficulty =
        String(difficulty || "")
            .toLowerCase();

    if (
        normalizedDifficulty === "easy"
    ) {
        return 20;
    }

    if (
        normalizedDifficulty === "hard"
    ) {
        return 60;
    }

    return 35;
};

const createPracticeSummary = ({
    difficulty,
    topics
}) => {
    const normalizedDifficulty =
        difficulty || "unrated";

    const normalizedTopics =
        Array.isArray(topics)
            ? topics
                .filter(Boolean)
                .slice(0, 3)
            : [];

    if (
        normalizedTopics.length === 0
    ) {
        return (
            `Practice an ${normalizedDifficulty} ` +
            "problem selected for today's " +
            "problem-solving session."
        );
    }

    return (
        `Practice an ${normalizedDifficulty} ` +
        "problem focused on " +
        normalizedTopics.join(", ") +
        "."
    );
};

const getCachedResult = () => {
    if (
        !dailyProblemCache ||
        !cacheUpdatedAt
    ) {
        return null;
    }

    const cacheAge =
        Date.now() - cacheUpdatedAt;

    if (
        cacheAge >= CACHE_DURATION
    ) {
        dailyProblemCache = null;
        cacheUpdatedAt = null;

        return null;
    }

    return {
        ...dailyProblemCache,
        cached: true
    };
};

const setCachedResult = (
    result
) => {
    dailyProblemCache = {
        ...result,
        cached: false
    };

    cacheUpdatedAt = Date.now();
};

const normalizePercentage = (
    value
) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsedValue =
        Number(
            String(value)
                .replace("%", "")
                .trim()
        );

    if (
        !Number.isFinite(parsedValue)
    ) {
        return null;
    }

    return Number(
        parsedValue.toFixed(1)
    );
};

/*
|--------------------------------------------------------------------------
| LeetCode Daily Challenge
|--------------------------------------------------------------------------
*/

const LEETCODE_DAILY_QUERY = `
    query questionOfToday {
        activeDailyCodingChallengeQuestion {
            date
            link
            question {
                acRate
                difficulty
                frontendQuestionId
                paidOnly
                title
                titleSlug
                topicTags {
                    name
                    slug
                }
            }
        }
    }
`;

const fetchLeetCodeDailyProblem =
    async () => {
       const response =
    await axios.post(
        LEETCODE_GRAPHQL_URL,
        {
            operationName:
                "questionOfToday",

            query:
                LEETCODE_DAILY_QUERY,

            variables: {}
        },
        {
            timeout: 12000,

            headers: {
                Accept:
                    "application/json",

                "Content-Type":
                    "application/json",

                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/150.0.0.0 Safari/537.36",

                Origin:
                    "https://leetcode.com",

                Referer:
                    "https://leetcode.com/problemset/"
            }
        }
    );
        const dailyChallenge =
            response.data?.data
                ?.activeDailyCodingChallengeQuestion;

        const question =
            dailyChallenge?.question;

        if (
            !dailyChallenge ||
            !question
        ) {
            throw new Error(
                "LeetCode daily challenge was unavailable."
            );
        }

        const topics =
            Array.isArray(
                question.topicTags
            )
                ? question.topicTags.map(
                    (topic) => topic.name
                )
                : [];

        const difficulty =
            question.difficulty ||
            "Unknown";

        const relativeLink =
            dailyChallenge.link ||
            (
                question.titleSlug
                    ? (
                        `/problems/` +
                        `${question.titleSlug}/`
                    )
                    : ""
            );

        const url =
            relativeLink.startsWith(
                "http"
            )
                ? relativeLink
                : (
                    `https://leetcode.com` +
                    relativeLink
                );

        return {
            id:
                `leetcode-${question.titleSlug}`,

            platform: "LeetCode",

            type: "Official Daily Challenge",

            title: question.title,

            problemNumber:
                question.frontendQuestionId ||
                null,

            difficulty,

            topics,

            acceptanceRate:
                normalizePercentage(
                    question.acRate
                ),

            solvedCount: null,

            estimatedMinutes:
                createEstimatedMinutes(
                    difficulty
                ),

            summary:
                createPracticeSummary({
                    difficulty,
                    topics
                }),

            url,

            date:
                dailyChallenge.date ||
                getTodayDate(),

            premiumOnly:
                Boolean(
                    question.paidOnly
                ),

            official: true
        };
    };

/*
|--------------------------------------------------------------------------
| GeeksforGeeks Problem of the Day
|--------------------------------------------------------------------------
*/

const getGfgProblemObject = (
    responseData
) => {
    const candidates = [
        responseData?.problem_of_the_day,
        responseData?.problemOfTheDay,
        responseData?.problem,
        responseData?.data,
        responseData
    ];

    for (
        const candidate of candidates
    ) {
        if (
            Array.isArray(candidate) &&
            candidate.length > 0
        ) {
            return candidate[0];
        }

        if (
            candidate &&
            typeof candidate === "object"
        ) {
            const hasProblemTitle =
                candidate.problem_name ||
                candidate.problemName ||
                candidate.title ||
                candidate.name;

            if (hasProblemTitle) {
                return candidate;
            }
        }
    }

    return null;
};

const fetchGfgDailyProblem =
    async () => {
        const response =
            await axios.get(
                GFG_DAILY_PROBLEM_URL,
                {
                    timeout: 12000,
                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "Way2Code/1.0"
                    }
                }
            );

        const problem =
            getGfgProblemObject(
                response.data
            );

        if (!problem) {
            throw new Error(
                "GeeksforGeeks daily problem was unavailable."
            );
        }

        const title =
            problem.problem_name ||
            problem.problemName ||
            problem.title ||
            problem.name;

        const difficulty =
            problem.difficulty ||
            problem.problem_level ||
            problem.level ||
            "Unknown";

        const rawTopics =
            problem.tags ||
            problem.topic_tags ||
            problem.topics ||
            [];

        const topics =
            Array.isArray(rawTopics)
                ? rawTopics.map(
                    (topic) => {
                        if (
                            typeof topic ===
                            "string"
                        ) {
                            return topic;
                        }

                        return (
                            topic.name ||
                            topic.tag ||
                            ""
                        );
                    }
                ).filter(Boolean)
                : [];

        const problemUrl =
            problem.problem_url ||
            problem.problemUrl ||
            problem.url ||
            "https://www.geeksforgeeks.org/problem-of-the-day";

        const url =
            problemUrl.startsWith(
                "http"
            )
                ? problemUrl
                : (
                    "https://www.geeksforgeeks.org" +
                    (
                        problemUrl.startsWith("/")
                            ? problemUrl
                            : `/${problemUrl}`
                    )
                );

        return {
            id:
                `geeksforgeeks-${
                    problem.slug ||
                    problem.problem_slug ||
                    title
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]+/g,
                            "-"
                        )
                }`,

            platform:
                "GeeksforGeeks",

            type:
                "Official Problem of the Day",

            title,

            problemNumber: null,

            difficulty,

            topics,

            acceptanceRate:
                normalizePercentage(
                    problem.accuracy ||
                    problem.acceptance_rate ||
                    problem.acceptanceRate
                ),

            solvedCount:
                Number(
                    problem.total_submissions ||
                    problem.submissions
                ) || null,

            estimatedMinutes:
                createEstimatedMinutes(
                    difficulty
                ),

            summary:
                createPracticeSummary({
                    difficulty,
                    topics
                }),

            url,

            date:
                problem.date ||
                getTodayDate(),

            premiumOnly: false,

            official: true
        };
    };

/*
|--------------------------------------------------------------------------
| Codeforces Daily Pick
|--------------------------------------------------------------------------
|
| Codeforces does not currently provide an official Problem of the Day.
| Way2Code selects one deterministic problem per UTC date from the public
| Codeforces problem set.
|
*/

const getCodeforcesDifficulty = (
    rating
) => {
    if (!rating) {
        return "Unrated";
    }

    if (rating <= 1200) {
        return "Easy";
    }

    if (rating <= 1800) {
        return "Medium";
    }

    return "Hard";
};

const getDailySelectionIndex = (
    totalProblems
) => {
    const today = getTodayDate();

    const numericDate =
        Number(
            today.replace(/-/g, "")
        );

    return numericDate % totalProblems;
};

const fetchCodeforcesDailyPick =
    async () => {
        const response =
            await axios.get(
                CODEFORCES_PROBLEMSET_URL,
                {
                    timeout: 20000,
                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "Way2Code/1.0"
                    }
                }
            );

        if (
            response.data?.status !==
            "OK"
        ) {
            throw new Error(
                "Codeforces problem set was unavailable."
            );
        }

        const problems =
            response.data?.result
                ?.problems || [];

        const problemStatistics =
            response.data?.result
                ?.problemStatistics || [];

        const statisticsByProblem =
            new Map(
                problemStatistics.map(
                    (statistics) => [
                        `${statistics.contestId}-` +
                        `${statistics.index}`,

                        statistics
                    ]
                )
            );

        const eligibleProblems =
            problems.filter(
                (problem) => {
                    return (
                        problem.contestId &&
                        problem.index &&
                        problem.name &&
                        problem.rating >=
                            800 &&
                        problem.rating <=
                            2000 &&
                        Array.isArray(
                            problem.tags
                        ) &&
                        problem.tags.length >
                            0
                    );
                }
            );

        if (
            eligibleProblems.length === 0
        ) {
            throw new Error(
                "No eligible Codeforces problems were available."
            );
        }

        /*
         * Sort first so the same calendar date produces
         * the same problem across different server instances.
         */
        eligibleProblems.sort(
            (
                firstProblem,
                secondProblem
            ) => {
                if (
                    firstProblem.contestId !==
                    secondProblem.contestId
                ) {
                    return (
                        firstProblem.contestId -
                        secondProblem.contestId
                    );
                }

                return String(
                    firstProblem.index
                ).localeCompare(
                    String(
                        secondProblem.index
                    )
                );
            }
        );

        const selectedProblem =
            eligibleProblems[
                getDailySelectionIndex(
                    eligibleProblems.length
                )
            ];

        const problemKey =
            `${selectedProblem.contestId}-` +
            `${selectedProblem.index}`;

        const statistics =
            statisticsByProblem.get(
                problemKey
            );

        const difficulty =
            getCodeforcesDifficulty(
                selectedProblem.rating
            );

        const topics =
            selectedProblem.tags.slice(
                0,
                5
            );

        return {
            id:
                `codeforces-${problemKey}`,

            platform: "Codeforces",

            type:
                "Way2Code Daily Pick",

            title:
                selectedProblem.name,

            problemNumber:
                `${selectedProblem.contestId}` +
                `${selectedProblem.index}`,

            difficulty,

            rating:
                selectedProblem.rating,

            topics,

            acceptanceRate: null,

            solvedCount:
                statistics?.solvedCount ||
                null,

            estimatedMinutes:
                createEstimatedMinutes(
                    difficulty
                ),

            summary:
                createPracticeSummary({
                    difficulty,
                    topics
                }),

            url:
                "https://codeforces.com/" +
                "problemset/problem/" +
                `${selectedProblem.contestId}/` +
                `${selectedProblem.index}`,

            date: getTodayDate(),

            premiumOnly: false,

            official: false
        };
    };

/*
|--------------------------------------------------------------------------
| Daily Problem Aggregator
|--------------------------------------------------------------------------
*/

const getDailyProblems =
    async ({
        forceRefresh = false
    } = {}) => {
        if (!forceRefresh) {
            const cachedResult =
                getCachedResult();

            if (cachedResult) {
                return cachedResult;
            }
        }

        const providers = [
            {
                key: "leetcode",
                fetch:
                    fetchLeetCodeDailyProblem
            },
            {
                key: "geeksforgeeks",
                fetch:
                    fetchGfgDailyProblem
            },
            {
                key: "codeforces",
                fetch:
                    fetchCodeforcesDailyPick
            }
        ];

        const settledResults =
            await Promise.allSettled(
                providers.map(
                    (provider) =>
                        provider.fetch()
                )
            );

        const problems = [];

        const failedProviders = [];

        settledResults.forEach(
            (result, index) => {
                const provider =
                    providers[index];

                if (
                    result.status ===
                    "fulfilled"
                ) {
                    problems.push(
                        result.value
                    );

                    return;
                }

                failedProviders.push({
                    platform:
                        provider.key,

                    message:
                        result.reason
                            ?.message ||
                        "Provider unavailable."
                });
            }
        );

        if (
            problems.length === 0
        ) {
            throw new Error(
                "Daily problems are temporarily unavailable."
            );
        }

        const result = {
            date: getTodayDate(),

            problems,

            total: problems.length,

            partialFailure:
                failedProviders.length > 0,

            failedProviders,

            cached: false,

            updatedAt:
                new Date().toISOString()
        };

        setCachedResult(result);

        return result;
    };

const clearDailyProblemCache = () => {
    dailyProblemCache = null;
    cacheUpdatedAt = null;
};

module.exports = {
    getDailyProblems,
    clearDailyProblemCache,

    /*
     * Exported for isolated tests.
     */
    fetchLeetCodeDailyProblem,
    fetchGfgDailyProblem,
    fetchCodeforcesDailyPick
};