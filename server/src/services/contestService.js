// server/src/services/contestService.js

const codeforcesService = require("./platforms/codeforcesService");
const leetcodeService = require("./platforms/leetcodeService");
const { getCache, setCache } = require("../cache/contestCache");

const PLATFORM_SERVICES = [
    { name: "Codeforces", service: codeforcesService },
    { name: "LeetCode", service: leetcodeService }
];

const getUpcomingContests = async () => {
    const cachedContests = getCache();

    if (cachedContests) {
        return {
            contests: cachedContests,
            cached: true,
            partialFailure: false
        };
    }

    const settledResults = await Promise.allSettled(
        PLATFORM_SERVICES.map(({ service }) => service.getUpcomingContests())
    );

    const contests = [];
    const failedPlatforms = [];

    settledResults.forEach((result, index) => {
        const platform = PLATFORM_SERVICES[index];

        if (result.status === "fulfilled" && Array.isArray(result.value)) {
            contests.push(...result.value);
            return;
        }

        failedPlatforms.push(platform.name);
    });

    if (failedPlatforms.length === PLATFORM_SERVICES.length) {
        throw new Error("Contest data is temporarily unavailable.");
    }

    contests.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    setCache(contests);

    return {
        contests,
        cached: false,
        partialFailure: failedPlatforms.length > 0,
        failedPlatforms
    };
};

module.exports = {
    getUpcomingContests
};