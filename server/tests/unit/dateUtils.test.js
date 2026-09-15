const {
    getContestStatus,
    getContestCountdown,
    resolveEndTime
} = require("../../src/utils/dateUtils");

const NOW = new Date("2026-01-01T12:00:00.000Z");

describe("getContestStatus", () => {
    test("treats a numeric second argument as a duration in minutes", () => {
        // The Contest model stores duration in minutes, so a 90 here means the
        // contest ends at 13:00, not at the epoch + 90ms.
        expect(getContestStatus("2026-01-01T11:30:00.000Z", 90, NOW)).toBe("ongoing");
        expect(getContestStatus("2026-01-01T10:00:00.000Z", 90, NOW)).toBe("completed");
        expect(getContestStatus("2026-01-01T13:00:00.000Z", 90, NOW)).toBe("upcoming");
    });

    test("still accepts an explicit end timestamp", () => {
        expect(
            getContestStatus("2026-01-01T11:00:00.000Z", "2026-01-01T13:00:00.000Z", NOW)
        ).toBe("ongoing");
    });

    test("is inclusive at both boundaries", () => {
        expect(getContestStatus("2026-01-01T12:00:00.000Z", 60, NOW)).toBe("ongoing");
        expect(getContestStatus("2026-01-01T11:00:00.000Z", 60, NOW)).toBe("ongoing");
    });

    test("returns unknown for invalid input", () => {
        expect(getContestStatus("not-a-date", 60, NOW)).toBe("unknown");
        expect(getContestStatus("2026-01-01T12:00:00.000Z", "not-a-date", NOW)).toBe("unknown");
    });
});

describe("getContestCountdown", () => {
    test("formats days and hours", () => {
        expect(getContestCountdown("2026-01-03T14:00:00.000Z", NOW)).toBe("2d 2h remaining");
    });

    test("formats hours and minutes", () => {
        expect(getContestCountdown("2026-01-01T15:30:00.000Z", NOW)).toBe("3h 30m remaining");
    });

    test("formats minutes only", () => {
        expect(getContestCountdown("2026-01-01T12:45:00.000Z", NOW)).toBe("45m remaining");
    });

    test("never reports zero minutes for a contest that has not started", () => {
        expect(getContestCountdown("2026-01-01T12:00:30.000Z", NOW)).toBe("1m remaining");
    });

    test("reports Started once the start time has passed", () => {
        expect(getContestCountdown("2026-01-01T11:59:00.000Z", NOW)).toBe("Started");
    });

    test("reports Unknown for an invalid date", () => {
        expect(getContestCountdown("nonsense", NOW)).toBe("Unknown");
    });
});

describe("resolveEndTime", () => {
    test("adds a minute duration to the start time", () => {
        expect(resolveEndTime("2026-01-01T12:00:00.000Z", 30).toISOString()).toBe(
            "2026-01-01T12:30:00.000Z"
        );
    });

    test("returns null when the start time is invalid", () => {
        expect(resolveEndTime("nope", 30)).toBeNull();
    });
});
