/*
 * Platform integrations are mocked so the suite never depends on LeetCode,
 * Codeforces or GitHub being reachable. The real HTTP behaviour of those
 * services is not what these tests are asserting.
 */
const mockStats = (platform) =>
    jest.fn(async (username) => ({
        platform,
        connected: true,
        username,
        success: true,
        data: { profile: { handle: username }, problemsSolved: { total: 42 } },
        error: "",
        metadata: { source: "mock" }
    }));

jest.mock("../../src/services/platforms/leetcodeService", () => ({
    getUserStats: jest.fn(),
    getUpcomingContests: jest.fn(async () => [])
}));
jest.mock("../../src/services/platforms/codeforcesService", () => ({
    getUserStats: jest.fn(),
    getUpcomingContests: jest.fn(async () => [])
}));
jest.mock("../../src/services/platforms/codechefService", () => ({ getUserStats: jest.fn() }));
jest.mock("../../src/services/platforms/atcoderService", () => ({ getUserStats: jest.fn() }));
jest.mock("../../src/services/platforms/gfgService", () => ({ getUserStats: jest.fn() }));
jest.mock("../../src/services/platforms/hackerrankService", () => ({ getUserStats: jest.fn() }));
jest.mock("../../src/services/platforms/githubService", () => ({ getUserStats: jest.fn() }));

const request = require("supertest");

const app = require("../../src/app");
const User = require("../../src/models/User");
const ProgressSnapshot = require("../../src/models/ProgressSnapshot");

const leetcodeService = require("../../src/services/platforms/leetcodeService");
const codeforcesService = require("../../src/services/platforms/codeforcesService");
const codechefService = require("../../src/services/platforms/codechefService");
const atcoderService = require("../../src/services/platforms/atcoderService");
const gfgService = require("../../src/services/platforms/gfgService");
const hackerrankService = require("../../src/services/platforms/hackerrankService");
const githubService = require("../../src/services/platforms/githubService");

const credentials = {
    username: "profile_test",
    email: "profile@example.com",
    password: "StrongPassword123!"
};

const createAuthenticatedUser = async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: credentials.password });

    return loginResponse.body.data.token;
};

const authorized = (req, token) => req.set("Authorization", `Bearer ${token}`);

beforeEach(() => {
    leetcodeService.getUserStats.mockImplementation(mockStats("leetcode"));
    codeforcesService.getUserStats.mockImplementation(mockStats("codeforces"));
    codechefService.getUserStats.mockImplementation(mockStats("codechef"));
    atcoderService.getUserStats.mockImplementation(mockStats("atcoder"));
    gfgService.getUserStats.mockImplementation(mockStats("geeksforgeeks"));
    hackerrankService.getUserStats.mockImplementation(mockStats("hackerrank"));
    githubService.getUserStats.mockImplementation(mockStats("github"));
});

describe("PUT /api/profile/coding-profiles", () => {
    test("stores connected platform handles", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(
            request(app).put("/api/profile/coding-profiles"),
            token
        ).send({
            leetcode: "naimish_lc",
            codeforces: "naimish_cf",
            github: "naimish-gh"
        });

        expect(response.status).toBe(200);

        const { codingProfiles } = response.body.data;

        expect(codingProfiles.leetcode).toMatchObject({
            username: "naimish_lc",
            connected: true,
            success: true
        });
        expect(codingProfiles.codeforces.username).toBe("naimish_cf");
        expect(codingProfiles.github.username).toBe("naimish-gh");
    });

    test("verifies every platform, not only LeetCode", async () => {
        const token = await createAuthenticatedUser();

        await authorized(request(app).put("/api/profile/coding-profiles"), token).send({
            leetcode: "lc_user",
            codeforces: "cf_user",
            github: "gh_user"
        });

        expect(leetcodeService.getUserStats).toHaveBeenCalledWith("lc_user");
        expect(codeforcesService.getUserStats).toHaveBeenCalledWith("cf_user");
        expect(githubService.getUserStats).toHaveBeenCalledWith("gh_user");
    });

    test("records a failed verification without discarding the handle", async () => {
        const token = await createAuthenticatedUser();

        codeforcesService.getUserStats.mockResolvedValue({
            platform: "codeforces",
            connected: true,
            username: "ghost_handle",
            success: false,
            data: null,
            error: "Codeforces user was not found."
        });

        const response = await authorized(
            request(app).put("/api/profile/coding-profiles"),
            token
        ).send({ codeforces: "ghost_handle" });

        expect(response.status).toBe(200);
        expect(response.body.data.codingProfiles.codeforces).toMatchObject({
            username: "ghost_handle",
            connected: true,
            success: false,
            error: "Codeforces user was not found."
        });
    });

    test("still saves the handle when a provider throws", async () => {
        const token = await createAuthenticatedUser();

        githubService.getUserStats.mockRejectedValue(new Error("Network down"));

        const response = await authorized(
            request(app).put("/api/profile/coding-profiles"),
            token
        ).send({ github: "offline_user" });

        expect(response.status).toBe(200);
        expect(response.body.data.codingProfiles.github).toMatchObject({
            username: "offline_user",
            success: false
        });
    });

    test("preserves unchanged platforms during a partial update", async () => {
        const token = await createAuthenticatedUser();

        await authorized(request(app).put("/api/profile/coding-profiles"), token).send({
            leetcode: "existing_lc"
        });

        await authorized(request(app).put("/api/profile/coding-profiles"), token).send({
            github: "new_github"
        });

        const response = await authorized(request(app).get("/api/profile"), token);

        expect(response.status).toBe(200);
        expect(response.body.data.codingProfiles.leetcode.username).toBe("existing_lc");
        expect(response.body.data.codingProfiles.github.username).toBe("new_github");
    });

    test("disconnects a platform when an empty username is sent", async () => {
        const token = await createAuthenticatedUser();

        await authorized(request(app).put("/api/profile/coding-profiles"), token).send({
            codechef: "connected_user"
        });

        const response = await authorized(
            request(app).put("/api/profile/coding-profiles"),
            token
        ).send({ codechef: "" });

        expect(response.status).toBe(200);
        expect(response.body.data.codingProfiles.codechef).toMatchObject({
            username: "",
            connected: false
        });
    });

    test("rejects unsupported platforms", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(
            request(app).put("/api/profile/coding-profiles"),
            token
        ).send({ unsupportedSite: "username" });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/unsupported coding platform/i);
    });

    test("rejects usernames containing whitespace", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(
            request(app).put("/api/profile/coding-profiles"),
            token
        ).send({ leetcode: "has spaces" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("INVALID_PLATFORM_USERNAME");
    });

    test("rejects an unauthenticated update", async () => {
        const response = await request(app)
            .put("/api/profile/coding-profiles")
            .send({ leetcode: "unauthorized" });

        expect(response.status).toBe(401);
    });
});

describe("PUT /api/profile", () => {
    test("updates the display name", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(request(app).put("/api/profile"), token).send({
            username: "renamed_user"
        });

        expect(response.status).toBe(200);
        expect(response.body.data.username).toBe("renamed_user");
    });

    test("rejects fields that are not user-editable", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(request(app).put("/api/profile"), token).send({
            role: "admin"
        });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("UNSUPPORTED_FIELD");

        const user = await User.findOne({ email: credentials.email });
        expect(user.role).toBe("user");
    });

    test("rejects a username already taken by another account", async () => {
        const token = await createAuthenticatedUser();

        await User.create({
            username: "taken_name",
            email: "taken@example.com",
            password: "$2b$10$abcdefghijklmnopqrstuv"
        });

        const response = await authorized(request(app).put("/api/profile"), token).send({
            username: "TAKEN_NAME"
        });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe("USERNAME_ALREADY_IN_USE");
    });
});

describe("GET /api/dashboard", () => {
    test("rejects an unauthenticated request", async () => {
        const response = await request(app).get("/api/dashboard");

        expect(response.status).toBe(401);
    });

    test("returns disconnected platforms for a new user", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(request(app).get("/api/dashboard"), token);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.platforms.leetcode.connected).toBe(false);
        expect(response.body.data.platforms.github.connected).toBe(false);
        expect(response.body.data.metadata.connectedPlatforms).toBe(0);
    });

    test("returns live platform data for connected handles", async () => {
        const token = await createAuthenticatedUser();

        await authorized(request(app).put("/api/profile/coding-profiles"), token).send({
            leetcode: "dashboard_lc"
        });

        const response = await authorized(request(app).get("/api/dashboard"), token);

        expect(response.status).toBe(200);
        expect(response.body.data.platforms.leetcode).toMatchObject({
            connected: true,
            success: true,
            username: "dashboard_lc"
        });
        expect(response.body.data.platforms.leetcode.data.data.problemsSolved.total).toBe(42);
    });

    test("records a progress snapshot with real totals rather than zeroes", async () => {
        const token = await createAuthenticatedUser();

        await authorized(request(app).put("/api/profile/coding-profiles"), token).send({
            leetcode: "snapshot_lc"
        });

        await authorized(request(app).get("/api/dashboard"), token);

        // Snapshot recording is fire-and-forget, so poll briefly for the write.
        let snapshot = null;

        for (let attempt = 0; attempt < 40 && !snapshot; attempt += 1) {
            snapshot = await ProgressSnapshot.findOne({}).lean();

            if (!snapshot) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }

        expect(snapshot).not.toBeNull();
        expect(snapshot.totals.problemsSolved).toBe(42);
        expect(snapshot.totals.connectedPlatforms).toBe(1);
    });

    test("rejects an unsupported progress range", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(
            request(app).get("/api/dashboard/progress?days=13"),
            token
        );

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("INVALID_PROGRESS_RANGE");
    });

    test("returns progress history for an allowed range", async () => {
        const token = await createAuthenticatedUser();

        const response = await authorized(
            request(app).get("/api/dashboard/progress?days=7"),
            token
        );

        expect(response.status).toBe(200);
        expect(response.body.data.range).toBe(7);
        expect(Array.isArray(response.body.data.snapshots)).toBe(true);
    });
});
