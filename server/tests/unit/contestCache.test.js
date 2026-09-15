const {
    getCache,
    setCache,
    clearCache,
    getLastUpdated
} = require(
    "../../src/cache/contestCache"
);

describe(
    "Contest cache",
    () => {
        beforeEach(() => {
            clearCache();
        });

        test(
            "returns null before data is cached",
            () => {
                expect(
                    getCache()
                ).toBeNull();

                expect(
                    getLastUpdated()
                ).toBeNull();
            }
        );

        test(
            "stores and returns contests",
            () => {
                const contests = [
                    {
                        id: "contest-1",
                        platform:
                            "Codeforces"
                    }
                ];

                setCache(contests);

                expect(
                    getCache()
                ).toEqual(contests);

                expect(
                    getLastUpdated()
                ).toEqual(
                    expect.any(String)
                );
            }
        );

        test(
            "returns a defensive array copy",
            () => {
                setCache([
                    {
                        id: "contest-1"
                    }
                ]);

                const firstResult =
                    getCache();

                firstResult.push({
                    id: "mutated"
                });

                expect(
                    getCache()
                ).toHaveLength(1);
            }
        );

        test(
            "rejects non-array values",
            () => {
                expect(() =>
                    setCache({
                        id: "invalid"
                    })
                ).toThrow(
                    "Contest cache value must be an array."
                );
            }
        );

        test(
            "clears cached contests",
            () => {
                setCache([]);

                clearCache();

                expect(
                    getCache()
                ).toBeNull();
            }
        );

        test(
            "expires cached contests after five minutes",
            () => {
                jest.useFakeTimers();

                jest.setSystemTime(
                    new Date(
                        "2026-08-01T10:00:00.000Z"
                    )
                );

                setCache([
                    {
                        id: "contest-1"
                    }
                ]);

                jest.setSystemTime(
                    new Date(
                        "2026-08-01T10:06:00.000Z"
                    )
                );

                expect(
                    getCache()
                ).toBeNull();

                expect(
                    getLastUpdated()
                ).toBeNull();

                jest.useRealTimers();
            }
        );
    }
);