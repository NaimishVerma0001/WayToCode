let cachedContests = [];

let lastUpdated = null;

const CACHE_DURATION =
    5 * 60 * 1000;

const getCache = () => {
    if (!lastUpdated) {
        return null;
    }

    const cacheAge =
        Date.now() - lastUpdated;

    if (
        cacheAge >
        CACHE_DURATION
    ) {
        cachedContests = [];
        lastUpdated = null;

        return null;
    }

    /*
     * Return a copy so consumers cannot mutate
     * the cached array accidentally.
     */
    return [...cachedContests];
};

const setCache = (contests) => {
    if (!Array.isArray(contests)) {
        throw new TypeError(
            "Contest cache value must be an array."
        );
    }

    cachedContests = [
        ...contests
    ];

    lastUpdated = Date.now();
};

const clearCache = () => {
    cachedContests = [];
    lastUpdated = null;
};

const getLastUpdated = () => {
    if (!lastUpdated) {
        return null;
    }

    return new Date(
        lastUpdated
    ).toISOString();
};

module.exports = {
    getCache,
    setCache,
    clearCache,
    getLastUpdated
};