const { buildSnapshotData, PLATFORM_KEYS } = require("../../src/services/progressService");

/** A dashboard entry in the shape dashboardService produces. */
const connected = (platform, data) => ({
    key: platform,
    connected: true,
    success: true,
    username: `${platform}_user`,
    error: "",
    data: { platform, connected: true, success: true, data }
});

describe("buildSnapshotData", () => {
    test("returns an entry for every supported platform", () => {
        const snapshot = buildSnapshotData({ platforms: {} });

        expect(Object.keys(snapshot.platforms).sort()).toEqual([...PLATFORM_KEYS].sort());
    });

    test("reads LeetCode totals from the nested payload", () => {
        const snapshot = buildSnapshotData({
            platforms: {
                leetcode: connected("leetcode", {
                    problemsSolved: { total: 250 },
                    contest: { rating: 1800, highestRating: 1900, attended: 12 }
                })
            }
        });

        expect(snapshot.platforms.leetcode).toMatchObject({
            connected: true,
            available: true,
            problemsSolved: 250,
            currentRating: 1800,
            maximumRating: 1900,
            contestsParticipated: 12
        });
    });

    test("sums problems solved across platforms", () => {
        const snapshot = buildSnapshotData({
            platforms: {
                leetcode: connected("leetcode", { problemsSolved: { total: 100 } }),
                codeforces: connected("codeforces", { problems: { solved: 50 } }),
                codechef: connected("codechef", { problems: { solved: 25 } })
            }
        });

        expect(snapshot.totals.problemsSolved).toBe(175);
        expect(snapshot.totals.connectedPlatforms).toBe(3);
        expect(snapshot.totals.availablePlatforms).toBe(3);
    });

    test("counts GitHub contributions separately from solved problems", () => {
        const snapshot = buildSnapshotData({
            platforms: {
                github: connected("github", { contributions: { total: 900 } })
            }
        });

        expect(snapshot.totals.contributions).toBe(900);
        expect(snapshot.totals.problemsSolved).toBe(0);
    });

    test("treats a failed fetch as connected but unavailable", () => {
        const snapshot = buildSnapshotData({
            platforms: {
                codeforces: {
                    key: "codeforces",
                    connected: true,
                    success: false,
                    username: "ghost",
                    data: { success: false, data: null }
                }
            }
        });

        expect(snapshot.platforms.codeforces.connected).toBe(true);
        expect(snapshot.platforms.codeforces.available).toBe(false);
        expect(snapshot.totals.availablePlatforms).toBe(0);
    });

    test("never records a negative or non-numeric metric", () => {
        const snapshot = buildSnapshotData({
            platforms: {
                leetcode: connected("leetcode", { problemsSolved: { total: -5 } }),
                codeforces: connected("codeforces", { problems: { solved: "many" } })
            }
        });

        expect(snapshot.platforms.leetcode.problemsSolved).toBe(0);
        expect(snapshot.platforms.codeforces.problemsSolved).toBe(0);
        expect(snapshot.totals.problemsSolved).toBe(0);
    });

    test("produces zeroes when given a document without a platforms map", () => {
        // The dashboard controller used to pass the raw user document here,
        // which silently recorded an all-zero snapshot every single day.
        const snapshot = buildSnapshotData({ codingProfiles: { leetcode: { username: "x" } } });

        expect(snapshot.totals.problemsSolved).toBe(0);
        expect(snapshot.totals.connectedPlatforms).toBe(0);
    });
});
