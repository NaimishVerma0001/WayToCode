jest.mock("../../src/services/platforms/leetcodeService", () => ({
    getUserStats: jest.fn(async () => ({ success: false, data: null, error: "mocked" })),
    getUpcomingContests: jest.fn(async () => [])
}));
jest.mock("../../src/services/platforms/codeforcesService", () => ({
    getUserStats: jest.fn(async () => ({ success: false, data: null, error: "mocked" })),
    getUpcomingContests: jest.fn(async () => [])
}));

const request = require("supertest");

const app = require("../../src/app");
const Reminder = require("../../src/models/Reminder");
const Contest = require("../../src/models/contestModel");

const credentials = {
    username: "reminder_user",
    email: "reminders@example.com",
    password: "ReminderPassword123!"
};

const createSession = async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const response = await request(app)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: credentials.password });

    return response.body.data.token;
};

const authorized = (req, token) => req.set("Authorization", `Bearer ${token}`);

const futureIso = (hoursFromNow) =>
    new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();

describe("POST /api/reminders", () => {
    test("rejects an unauthenticated request", async () => {
        const response = await request(app)
            .post("/api/reminders")
            .send({ contestId: "abc", contestStartTime: futureIso(5) });

        expect(response.status).toBe(401);
    });

    test("schedules a reminder", async () => {
        const token = await createSession();

        const response = await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "weekly-contest-400",
            contestStartTime: futureIso(5),
            offsetMinutes: 30
        });

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            contestId: "weekly-contest-400",
            offsetMinutes: 30,
            status: "pending"
        });
    });

    test("rejects a non-ISO start time", async () => {
        const token = await createSession();

        const response = await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "bad-time",
            contestStartTime: "next tuesday"
        });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("VALIDATION_FAILED");
    });

    test("rejects an injected query operator", async () => {
        const token = await createSession();

        const response = await authorized(request(app).post("/api/reminders"), token).send({
            contestId: { $ne: null },
            contestStartTime: futureIso(5)
        });

        expect(response.status).toBe(400);
    });

    test("rejects an out-of-range offset", async () => {
        const token = await createSession();

        const response = await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "range-check",
            contestStartTime: futureIso(5),
            offsetMinutes: 99999
        });

        expect(response.status).toBe(400);
    });

    test("refuses a reminder that would already be due", async () => {
        const token = await createSession();

        const response = await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "starting-now",
            contestStartTime: new Date(Date.now() + 60 * 1000).toISOString(),
            offsetMinutes: 30
        });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("REMINDER_TOO_LATE");
    });

    test("reschedules rather than duplicating an existing reminder", async () => {
        const token = await createSession();

        await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "repeat-contest",
            contestStartTime: futureIso(6),
            offsetMinutes: 10
        });

        const second = await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "repeat-contest",
            contestStartTime: futureIso(6),
            offsetMinutes: 60
        });

        expect(second.status).toBe(200);
        expect(second.body.data.offsetMinutes).toBe(60);
        expect(await Reminder.countDocuments({ contestId: "repeat-contest" })).toBe(1);
    });
});

describe("GET and DELETE /api/reminders", () => {
    test("lists the caller's reminders", async () => {
        const token = await createSession();

        await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "listed-contest",
            contestStartTime: futureIso(8)
        });

        const response = await authorized(request(app).get("/api/reminders"), token);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
    });

    test("cancels a reminder", async () => {
        const token = await createSession();

        await authorized(request(app).post("/api/reminders"), token).send({
            contestId: "cancel-me",
            contestStartTime: futureIso(8)
        });

        const response = await authorized(
            request(app).delete("/api/reminders/cancel-me"),
            token
        );

        expect(response.status).toBe(200);
        expect(response.body.data.removed).toBe(true);
        expect(await Reminder.countDocuments({})).toBe(0);
    });

    test("reports when nothing was scheduled", async () => {
        const token = await createSession();

        const response = await authorized(
            request(app).delete("/api/reminders/never-scheduled"),
            token
        );

        expect(response.status).toBe(200);
        expect(response.body.data.removed).toBe(false);
    });
});

describe("GET /api/contests", () => {
    test("returns only upcoming contests, newest start first", async () => {
        await Contest.create([
            {
                contestId: "past-contest",
                platform: "Codeforces",
                contestName: "Finished round",
                startTime: new Date(Date.now() - 60 * 60 * 1000),
                duration: 120,
                url: "https://codeforces.com/contest/1"
            },
            {
                contestId: "later-contest",
                platform: "Codeforces",
                contestName: "Later round",
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                duration: 120,
                url: "https://codeforces.com/contest/3"
            },
            {
                contestId: "soon-contest",
                platform: "LeetCode",
                contestName: "Soon round",
                startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
                duration: 90,
                url: "https://leetcode.com/contest/2"
            }
        ]);

        const response = await request(app).get("/api/contests");

        expect(response.status).toBe(200);
        expect(response.body.data.map((contest) => contest.contestId)).toEqual([
            "soon-contest",
            "later-contest"
        ]);
        expect(response.body.platforms).toEqual({ Codeforces: 1, LeetCode: 1 });
    });

    test("caps the page size to protect memory", async () => {
        const response = await request(app).get("/api/contests?limit=5000");

        expect(response.status).toBe(200);
        expect(response.body.meta.limit).toBeLessThanOrEqual(50);
    });

    test("includes status and countdown in the API payload", async () => {
        await Contest.create({
            contestId: "payload-contest",
            platform: "LeetCode",
            contestName: "Payload check",
            startTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
            duration: 90,
            url: "https://leetcode.com/contest/payload"
        });

        const response = await request(app).get("/api/contests");

        // `.lean()` skips Mongoose virtuals, so the controller must compute
        // these itself; relying on the virtuals left both fields undefined.
        expect(response.body.data[0].status).toBe("upcoming");
        expect(response.body.data[0].countdown).toMatch(/remaining$/);
    });

    test("computes a live status from the stored duration", async () => {
        await Contest.create({
            contestId: "status-contest",
            platform: "LeetCode",
            contestName: "Status check",
            startTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
            duration: 90,
            url: "https://leetcode.com/contest/status"
        });

        const stored = await Contest.findOne({ contestId: "status-contest" });

        expect(stored.status).toBe("upcoming");
        expect(stored.countdown).toMatch(/remaining$/);
    });
});
