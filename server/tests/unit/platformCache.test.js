const platformCache = require(
    "../../src/utils/platformCache"
);

describe(
    "Platform cache",
    () => {
        beforeEach(() => {
            platformCache.clear();

            jest.useRealTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test(
            "fetches and caches a platform response",
            async () => {
                const fetchValue =
                    jest.fn()
                        .mockResolvedValue({
                            success: true,
                            data: {
                                solved: 100
                            }
                        });

                const firstResult =
                    await platformCache
                        .getOrSet(
                            "leetcode:user",
                            fetchValue,
                            {
                                ttlMs: 10000
                            }
                        );

                const secondResult =
                    await platformCache
                        .getOrSet(
                            "leetcode:user",
                            fetchValue,
                            {
                                ttlMs: 10000
                            }
                        );

                expect(
                    fetchValue
                ).toHaveBeenCalledTimes(1);

                expect(
                    firstResult
                        .metadata
                        .cache
                        .hit
                ).toBe(false);

                expect(
                    secondResult
                        .metadata
                        .cache
                        .hit
                ).toBe(true);

                expect(
                    secondResult.data
                        .solved
                ).toBe(100);
            }
        );

        test(
            "deduplicates simultaneous requests",
            async () => {
                let resolveRequest;

                const fetchValue =
                    jest.fn(
                        () =>
                            new Promise(
                                (resolve) => {
                                    resolveRequest =
                                        resolve;
                                }
                            )
                    );

                const firstRequest =
                    platformCache.getOrSet(
                        "github:user",
                        fetchValue
                    );

                const secondRequest =
                    platformCache.getOrSet(
                        "github:user",
                        fetchValue
                    );

                resolveRequest({
                    success: true,
                    data: {
                        repositories: 10
                    }
                });

                const [
                    firstResult,
                    secondResult
                ] = await Promise.all([
                    firstRequest,
                    secondRequest
                ]);

                expect(
                    fetchValue
                ).toHaveBeenCalledTimes(1);

                expect(
                    firstResult.success
                ).toBe(true);

                expect(
                    secondResult.success
                ).toBe(true);
            }
        );

        test(
            "throttles forced refreshes during cooldown",
            async () => {
                const fetchValue =
                    jest.fn()
                        .mockResolvedValue({
                            success: true,
                            data: {
                                solved: 50
                            }
                        });

                await platformCache
                    .getOrSet(
                        "codeforces:user",
                        fetchValue,
                        {
                            refreshCooldownMs:
                                60000
                        }
                    );

                const result =
                    await platformCache
                        .getOrSet(
                            "codeforces:user",
                            fetchValue,
                            {
                                forceRefresh:
                                    true,
                                refreshCooldownMs:
                                    60000
                            }
                        );

                expect(
                    fetchValue
                ).toHaveBeenCalledTimes(1);

                expect(
                    result.metadata
                        .cache
                        .refreshThrottled
                ).toBe(true);
            }
        );

        test(
            "returns stale data when a refresh throws",
            async () => {
                jest.useFakeTimers();

                jest.setSystemTime(
                    new Date(
                        "2026-08-01T10:00:00.000Z"
                    )
                );

                await platformCache
                    .getOrSet(
                        "atcoder:user",
                        () =>
                            Promise.resolve({
                                success: true,
                                data: {
                                    solved: 25
                                }
                            }),
                        {
                            ttlMs: 1000,
                            staleTtlMs:
                                10000
                        }
                    );

                jest.setSystemTime(
                    new Date(
                        "2026-08-01T10:00:02.000Z"
                    )
                );

                const staleResult =
                    await platformCache
                        .getOrSet(
                            "atcoder:user",
                            () =>
                                Promise.reject(
                                    new Error(
                                        "Upstream failed"
                                    )
                                ),
                            {
                                ttlMs: 1000,
                                staleTtlMs:
                                    10000
                            }
                        );

                expect(
                    staleResult.data
                        .solved
                ).toBe(25);

                expect(
                    staleResult.metadata
                        .cache
                        .stale
                ).toBe(true);
            }
        );

        test(
            "invalidates a specific cache entry",
            async () => {
                const fetchValue =
                    jest.fn()
                        .mockResolvedValue({
                            success: true
                        });

                await platformCache
                    .getOrSet(
                        "github:user",
                        fetchValue
                    );

                platformCache.invalidate(
                    "github:user"
                );

                await platformCache
                    .getOrSet(
                        "github:user",
                        fetchValue
                    );

                expect(
                    fetchValue
                ).toHaveBeenCalledTimes(2);
            }
        );

        test(
            "reports cache statistics",
            async () => {
                await platformCache
                    .getOrSet(
                        "github:user",
                        () =>
                            Promise.resolve({
                                success: true
                            })
                    );

                expect(
                    platformCache.getStats()
                ).toEqual({
                    entries: 1,
                    inFlightRequests: 0
                });
            }
        );
    }
);