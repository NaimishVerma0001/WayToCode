#!/usr/bin/env node

/**
 * End-to-end smoke test.
 *
 * Unlike the Jest suites, this boots the real server process via
 * `startServer()` and drives it over HTTP exactly as the browser does. That
 * distinction matters: the Jest integration suites mount the Express app
 * directly and connect Mongoose themselves, so a bug in the startup path or in
 * the global Mongoose configuration can pass a fully green test run.
 *
 * Run with: npm run test:e2e --workspace server
 */

const os = require("os");
const path = require("path");

process.env.MONGOMS_MD5_CHECK = process.env.MONGOMS_MD5_CHECK || "0";
process.env.MONGOMS_DOWNLOAD_DIR =
    process.env.MONGOMS_DOWNLOAD_DIR ||
    path.join(os.homedir(), ".cache", "mongodb-binaries");

const { MongoMemoryServer } = require("mongodb-memory-server");

const PORT = Number(process.env.SMOKE_PORT) || 5199;
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

const check = (name, condition, detail = "") => {
    if (condition) {
        passed += 1;
        console.log(`  PASS  ${name}`);
        return;
    }

    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ""}`);
};

const call = async (routePath, options = {}) => {
    const response = await fetch(`${BASE}${routePath}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    let body = null;

    try {
        body = await response.json();
    } catch {
        body = null;
    }

    return { status: response.status, body, headers: response.headers };
};

const run = async () => {
    const mongo = await MongoMemoryServer.create({ instance: { dbName: "way2code-smoke" } });

    process.env.NODE_ENV = "development";
    process.env.PORT = String(PORT);
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = "smoke_test_secret_that_is_definitely_longer_than_32_chars";
    process.env.REGISTRATION_OTP_SECRET = "smoke_test_otp_secret_that_is_longer_than_32_chars";
    process.env.CLIENT_URL = "http://localhost:5000";
    process.env.BCRYPT_ROUNDS = "10";

    const { startServer } = require("../../server.js");
    const httpServer = await startServer();

    console.log("\n--- Public surface ---");

    const root = await call("/");
    check("GET / returns a welcome payload", root.status === 200 && root.body.success === true);

    const health = await call("/health");
    check(
        "GET /health reports a connected database",
        health.status === 200 && health.body.database === "connected",
        JSON.stringify(health.body)
    );
    check("every response carries a request id", Boolean(health.headers.get("x-request-id")));
    check("the server does not advertise its technology", !health.headers.get("x-powered-by"));

    const notFound = await call("/api/nope");
    check(
        "an unknown route returns a structured 404",
        notFound.status === 404 && notFound.body.code === "ROUTE_NOT_FOUND"
    );

    // Guards the operator-query regression that a global sanitizeFilter caused.
    const contests = await call("/api/contests");
    check(
        "GET /api/contests runs its range query",
        contests.status === 200 && Array.isArray(contests.body.data),
        JSON.stringify(contests.body).slice(0, 160)
    );

    console.log("\n--- Registration & sign-in ---");

    const weak = await call("/api/auth/register", {
        method: "POST",
        body: { username: "smoke_user", email: "smoke@example.com", password: "short" }
    });
    check(
        "a weak password is rejected with a field error",
        weak.status === 400 && weak.body.code === "VALIDATION_FAILED"
    );

    const register = await call("/api/auth/register", {
        method: "POST",
        body: { username: "Smoke_User", email: "smoke@example.com", password: "StrongPassword123!" }
    });
    check("registration succeeds", register.status === 201, JSON.stringify(register.body));

    const duplicate = await call("/api/auth/register", {
        method: "POST",
        body: { username: "other_name", email: "smoke@example.com", password: "StrongPassword123!" }
    });
    check(
        "a duplicate email returns 409",
        duplicate.status === 409 && duplicate.body.code === "EMAIL_ALREADY_IN_USE"
    );

    const badLogin = await call("/api/auth/login", {
        method: "POST",
        body: { email: "smoke@example.com", password: "WrongPassword1!" }
    });
    check("a wrong password returns 401, not 500", badLogin.status === 401);

    // Registered as "Smoke_User"; signing in with different casing must work.
    const login = await call("/api/auth/login", {
        method: "POST",
        body: { username: "smoke_user", password: "StrongPassword123!" }
    });
    check("case-insensitive username sign-in works", login.status === 200);

    const token = login.body?.data?.token;
    const setCookie = login.headers.getSetCookie?.() || [];
    const refreshCookie = setCookie.find((cookie) => cookie.startsWith("refreshToken="));

    check("an access token is issued", typeof token === "string" && token.length > 20);
    check(
        "an HttpOnly refresh cookie is set",
        Boolean(refreshCookie) && /HttpOnly/i.test(refreshCookie || "")
    );

    const auth = { Authorization: `Bearer ${token}` };

    console.log("\n--- Authenticated surface ---");

    const me = await call("/api/auth/me", { headers: auth });
    check(
        "GET /api/auth/me returns the account",
        me.status === 200 && me.body.data.email === "smoke@example.com"
    );

    check("the dashboard rejects an anonymous request", (await call("/api/dashboard")).status === 401);

    const dashboard = await call("/api/dashboard", { headers: auth });
    check(
        "the dashboard returns all seven platforms",
        dashboard.status === 200 &&
            Object.keys(dashboard.body?.data?.platforms || {}).length === 7,
        JSON.stringify(dashboard.body).slice(0, 160)
    );

    const profile = await call("/api/profile", { headers: auth });
    check("the profile loads", profile.status === 200 && profile.body.data.username === "Smoke_User");

    const badPlatform = await call("/api/profile/coding-profiles", {
        method: "PUT",
        headers: auth,
        body: { notARealSite: "someone" }
    });
    check(
        "an unsupported platform is rejected",
        badPlatform.status === 400 && badPlatform.body.code === "UNSUPPORTED_PLATFORM"
    );

    console.log("\n--- Planner ---");

    const badItem = await call("/api/planner", {
        method: "POST",
        headers: auth,
        body: { category: "not-real", title: "x" }
    });
    check("an invalid planner category returns 400, not 500", badItem.status === 400);

    const item = await call("/api/planner", {
        method: "POST",
        headers: auth,
        body: { category: "task", title: "Smoke test task", priority: "high" }
    });
    check("a planner item is created", item.status === 201);

    const list = await call("/api/planner", { headers: auth });
    check(
        "the planner list returns the item with pagination",
        list.status === 200 && list.body.data.length === 1 && list.body.meta.totalItems === 1
    );

    const removed = await call(`/api/planner/${item.body?.data?._id}`, {
        method: "DELETE",
        headers: auth
    });
    check("a planner item is deleted", removed.status === 200);

    console.log("\n--- Reminders ---");

    const lateReminder = await call("/api/reminders", {
        method: "POST",
        headers: auth,
        body: {
            contestId: "smoke-contest",
            contestStartTime: new Date(Date.now() + 60_000).toISOString(),
            offsetMinutes: 30
        }
    });
    check(
        "a reminder that is already due is refused",
        lateReminder.status === 400 && lateReminder.body.code === "REMINDER_TOO_LATE"
    );

    const reminder = await call("/api/reminders", {
        method: "POST",
        headers: auth,
        body: {
            contestId: "smoke-contest",
            contestStartTime: new Date(Date.now() + 6 * 3_600_000).toISOString(),
            offsetMinutes: 60
        }
    });
    check(
        "a valid reminder is scheduled",
        reminder.status === 200 && reminder.body.data.offsetMinutes === 60
    );

    console.log("\n--- Suggestions ---");

    const suggestion = await call("/api/suggestions", {
        method: "POST",
        body: {
            authorName: "Smoke",
            title: "A useful new feature",
            description: "Something worth at least ten characters of description."
        }
    });
    check("a suggestion is accepted", suggestion.status === 201);

    const suggestions = await call("/api/suggestions");
    check(
        "the suggestion list never exposes voter keys",
        suggestions.status === 200 && !("upvotedIPs" in (suggestions.body.data[0] || {}))
    );

    const suggestionId = suggestions.body?.data?.[0]?._id;
    const firstUpvote = await call(`/api/suggestions/${suggestionId}/upvote`, { method: "PUT" });
    const secondUpvote = await call(`/api/suggestions/${suggestionId}/upvote`, { method: "PUT" });

    check(
        "the first upvote counts",
        firstUpvote.status === 200 && firstUpvote.body.data.upvotes === 1,
        JSON.stringify(firstUpvote.body).slice(0, 160)
    );
    check("a repeat upvote from the same client is blocked", secondUpvote.status === 409);

    console.log("\n--- Admin ---");

    const adminDenied = await call("/api/admin/overview", { headers: auth });
    check(
        "a non-administrator is refused with 403",
        adminDenied.status === 403 && adminDenied.body.code === "ADMIN_REQUIRED"
    );

    console.log("\n--- Session termination ---");

    const logout = await call("/api/auth/logout", {
        method: "POST",
        headers: { ...auth, Cookie: refreshCookie?.split(";")[0] || "" }
    });
    check("logout succeeds", logout.status === 200);

    const replay = await call("/api/auth/me", { headers: auth });
    check(
        "the access token is revoked after logout",
        replay.status === 401 && replay.body.code === "TOKEN_REVOKED"
    );

    console.log(`\n================  ${passed} passed, ${failed} failed  ================\n`);

    httpServer.close();
    await mongo.stop();

    return failed;
};

run()
    .then((failureCount) => process.exit(failureCount === 0 ? 0 : 1))
    .catch((error) => {
        console.error("Smoke test crashed:", error);
        process.exit(1);
    });
