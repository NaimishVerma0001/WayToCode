jest.mock(
    "../../src/services/platforms/codeforcesService",
    () => ({
        getUpcomingContests:
            jest.fn()
    })
);

jest.mock(
    "../../src/services/platforms/leetcodeService",
    () => ({
        getUpcomingContests:
            jest.fn()
    })
);

const codeforcesService = require(
    "../../src/services/platforms/codeforcesService"
);

const leetcodeService = require(
    "../../src/services/platforms/leetcodeService"
);

const contestService = require(
    "../../src/services/contestService"
);

const {
    clearCache
} = require(
    "../../src/cache/contestCache"
);

describe(
    "Contest service",
    () => {
        beforeEach(() => {
            clearCache();
            jest.clearAllMocks();
        });

        test(
            "combines and sorts platform contests",
            async () => {
                codeforcesService
                    .getUpcomingContests
                    .mockResolvedValue([
                        {
                            id: "cf-1",
                            platform:
                                "Codeforces",
                            startTime:
                                "2026-08-05T10:00:00.000Z"
                        }
                    ]);

                leetcodeService
                    .getUpcomingContests
                    .mockResolvedValue([
                        {
                            id: "lc-1",
                            platform:
                                "LeetCode",
                            startTime:
                                "2026-08-03T10:00:00.000Z"
                        }
                    ]);

                const result =
                    await contestService
                        .getUpcomingContests();

                expect(
                    result.cached
                ).toBe(false);

                expect(
                    result.partialFailure
                ).toBe(false);

                expect(
                    result.contests.map(
                        (contest) =>
                            contest.id
                    )
                ).toEqual([
                    "lc-1",
                    "cf-1"
                ]);
            }
        );

        test(
            "returns the consistent object shape from cache",
            async () => {
                codeforcesService
                    .getUpcomingContests
                    .mockResolvedValue([]);

                leetcodeService
                    .getUpcomingContests
                    .mockResolvedValue([]);

                await contestService
                    .getUpcomingContests();

                const cachedResult =
                    await contestService
                        .getUpcomingContests();

                expect(
                    cachedResult
                ).toEqual({
                    contests: [],
                    cached: true,
                    partialFailure: false
                });

                expect(
                    codeforcesService
                        .getUpcomingContests
                ).toHaveBeenCalledTimes(1);

                expect(
                    leetcodeService
                        .getUpcomingContests
                ).toHaveBeenCalledTimes(1);
            }
        );

        test(
            "returns available contests when one platform fails",
            async () => {
                codeforcesService
                    .getUpcomingContests
                    .mockRejectedValue(
                        new Error(
                            "Codeforces failed"
                        )
                    );

                leetcodeService
                    .getUpcomingContests
                    .mockResolvedValue([
                        {
                            id: "lc-1",
                            platform:
                                "LeetCode",
                            startTime:
                                "2026-08-03T10:00:00.000Z"
                        }
                    ]);

                const result =
                    await contestService
                        .getUpcomingContests();

                expect(
                    result.partialFailure
                ).toBe(true);

                expect(
                    result.failedPlatforms
                ).toEqual([
                    "Codeforces"
                ]);

                expect(
                    result.contests
                ).toHaveLength(1);
            }
        );

        test(
            "throws when every platform fails",
            async () => {
                codeforcesService
                    .getUpcomingContests
                    .mockRejectedValue(
                        new Error(
                            "Codeforces failed"
                        )
                    );

                leetcodeService
                    .getUpcomingContests
                    .mockRejectedValue(
                        new Error(
                            "LeetCode failed"
                        )
                    );

                await expect(
                    contestService
                        .getUpcomingContests()
                ).rejects.toThrow(
                    "Contest data is temporarily unavailable."
                );
            }
        );
    }
);