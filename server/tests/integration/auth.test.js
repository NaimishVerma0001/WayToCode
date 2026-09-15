const request = require("supertest");

const app = require("../../src/app");
const User = require("../../src/models/User");
const BlacklistedToken = require("../../src/models/BlacklistedToken");

const validUser = {
    username: "naimish_test",
    email: "naimish@example.com",
    password: "StrongPassword123!"
};

const registerUser = (overrides = {}) =>
    request(app)
        .post("/api/auth/register")
        .send({ ...validUser, ...overrides });

const loginUser = (credentials = {}) =>
    request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: validUser.password, ...credentials });

/** Register, sign in, and return both the access token and the refresh cookie. */
const createSession = async () => {
    await registerUser();

    const response = await loginUser();

    return {
        token: response.body.data.token,
        user: response.body.data.user,
        cookies: response.headers["set-cookie"] || []
    };
};

describe("POST /api/auth/register", () => {
    test("registers a valid user and stores only a bcrypt hash", async () => {
        const response = await registerUser();

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            success: true,
            message: "User registered successfully.",
            data: {
                username: validUser.username,
                email: validUser.email,
                role: "user",
                accountStatus: "active"
            }
        });
        expect(response.body.data).not.toHaveProperty("password");

        const storedUser = await User.findOne({ email: validUser.email }).select("+password");

        expect(storedUser).not.toBeNull();
        expect(storedUser.password).not.toBe(validUser.password);
        expect(storedUser.password).toMatch(/^\$2[aby]\$/);
    });

    test("rejects a short password with a field-level error", async () => {
        const response = await request(app).post("/api/auth/register").send({
            username: "short_password",
            email: "short@example.com",
            password: "1234567"
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe("VALIDATION_FAILED");
        expect(response.body.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: "password" })])
        );
    });

    test("rejects unknown fields instead of forwarding them to the database", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({ ...validUser, role: "admin" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("VALIDATION_FAILED");

        expect(await User.exists({ email: validUser.email })).toBeNull();
    });

    test("rejects a duplicate email with 409", async () => {
        await registerUser();

        const response = await registerUser({ username: "different_name" });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe("EMAIL_ALREADY_IN_USE");
        expect(response.body.message).toBe("Email already exists.");
    });

    test("rejects a duplicate username regardless of casing", async () => {
        await registerUser();

        const response = await registerUser({
            username: validUser.username.toUpperCase(),
            email: "another@example.com"
        });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe("USERNAME_ALREADY_IN_USE");
    });

    test("rejects malformed JSON with 400 rather than 500", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .set("Content-Type", "application/json")
            .send('{"username": "broken"');

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("INVALID_JSON");
    });
});

describe("POST /api/auth/login", () => {
    test("returns an access token and a user payload", async () => {
        await registerUser();

        const response = await loginUser();

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toEqual(expect.any(String));
        expect(response.body.data.user).toMatchObject({
            username: validUser.username,
            email: validUser.email,
            role: "user"
        });
    });

    test("sets an HttpOnly refresh cookie", async () => {
        await registerUser();

        const response = await loginUser();
        const cookies = response.headers["set-cookie"] || [];

        const refreshCookie = cookies.find((cookie) => cookie.startsWith("refreshToken="));

        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toMatch(/HttpOnly/i);
    });

    test("accepts a username in any casing", async () => {
        await registerUser();

        const response = await loginUser({
            email: undefined,
            username: validUser.username.toUpperCase()
        });

        expect(response.status).toBe(200);
        expect(response.body.data.user.username).toBe(validUser.username);
    });

    test("rejects invalid credentials with 401 without revealing the account state", async () => {
        await registerUser();

        const response = await loginUser({ password: "IncorrectPassword123!" });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
            success: false,
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password."
        });
    });

    test("returns the same response for an account that does not exist", async () => {
        const response = await loginUser({
            email: "nobody@example.com",
            password: "WhateverPassword1!"
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid email or password.");
    });

    test("rejects a blocked account with 403", async () => {
        await registerUser();

        await User.updateOne(
            { email: validUser.email },
            { $set: { accountStatus: "blocked", blockedReason: "Spam" } }
        );

        const response = await loginUser();

        expect(response.status).toBe(403);
        expect(response.body.code).toBe("ACCOUNT_BLOCKED");
    });
});

describe("GET /api/auth/me", () => {
    test("rejects a request without a token", async () => {
        const response = await request(app).get("/api/auth/me");

        expect(response.status).toBe(401);
        expect(response.body.code).toBe("NO_TOKEN");
    });

    test("rejects a malformed token", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", "Bearer not-a-real-token");

        expect(response.status).toBe(401);
        expect(response.body.code).toBe("INVALID_TOKEN");
    });

    test("returns the authenticated user", async () => {
        const { token } = await createSession();

        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            username: validUser.username,
            email: validUser.email,
            role: "user"
        });
    });

    test("rejects a user blocked after the token was issued", async () => {
        const { token } = await createSession();

        await User.updateOne(
            { email: validUser.email },
            { $set: { accountStatus: "blocked", blockedReason: "Abuse" } }
        );

        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.code).toBe("ACCOUNT_BLOCKED");
    });

    test("rejects a token issued before the password was changed", async () => {
        const { token } = await createSession();

        // A reset always moves passwordChangedAt forward past the token's iat.
        await User.updateOne(
            { email: validUser.email },
            { $set: { passwordChangedAt: new Date(Date.now() + 5000) } }
        );

        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.code).toBe("PASSWORD_CHANGED");
    });
});

describe("POST /api/auth/refresh", () => {
    test("issues a new access token from the refresh cookie", async () => {
        const { cookies } = await createSession();

        const response = await request(app).post("/api/auth/refresh").set("Cookie", cookies);

        expect(response.status).toBe(200);
        expect(response.body.data.token).toEqual(expect.any(String));
    });

    test("rejects a request with no refresh cookie", async () => {
        const response = await request(app).post("/api/auth/refresh");

        expect(response.status).toBe(401);
        expect(response.body.code).toBe("NO_REFRESH_TOKEN");
    });

    test("refuses an access token presented as a refresh token", async () => {
        const { token } = await createSession();

        const response = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", [`refreshToken=${token}`]);

        expect(response.status).toBe(401);
        expect(response.body.code).toBe("INVALID_REFRESH_TOKEN");
    });
});

describe("POST /api/auth/logout", () => {
    test("revokes the access token so it cannot be reused", async () => {
        const { token, cookies } = await createSession();

        const logoutResponse = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", cookies);

        expect(logoutResponse.status).toBe(200);
        expect(await BlacklistedToken.exists({ token })).not.toBeNull();

        const replay = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(replay.status).toBe(401);
        expect(replay.body.code).toBe("TOKEN_REVOKED");
    });

    test("revokes the refresh token as well", async () => {
        const { token, cookies } = await createSession();

        await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", cookies);

        const response = await request(app).post("/api/auth/refresh").set("Cookie", cookies);

        expect(response.status).toBe(401);
        expect(response.body.code).toBe("TOKEN_REVOKED");
    });
});

describe("Password recovery", () => {
    test("returns the same generic response for unknown and known emails", async () => {
        await registerUser();

        const [known, unknown] = await Promise.all([
            request(app).post("/api/auth/forgot-password").send({ email: validUser.email }),
            request(app).post("/api/auth/forgot-password").send({ email: "ghost@example.com" })
        ]);

        expect(known.status).toBe(202);
        expect(unknown.status).toBe(202);
        expect(known.body.message).toBe(unknown.body.message);
    });

    test("rejects a reset token that is not a 64-character hex string", async () => {
        const response = await request(app).post("/api/auth/reset-password").send({
            token: "not-a-valid-token",
            password: "BrandNewPassword1!",
            confirmPassword: "BrandNewPassword1!"
        });

        expect(response.status).toBe(400);
    });

    test("rejects mismatched password confirmation", async () => {
        const response = await request(app)
            .post("/api/auth/reset-password")
            .send({
                token: "a".repeat(64),
                password: "BrandNewPassword1!",
                confirmPassword: "DifferentPassword1!"
            });

        expect(response.status).toBe(400);
    });
});

describe("Application-level behaviour", () => {
    test("reports health and database connectivity", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ success: true, database: "connected" });
    });

    test("returns a structured 404 for an unknown route", async () => {
        const response = await request(app).get("/api/does-not-exist");

        expect(response.status).toBe(404);
        expect(response.body.code).toBe("ROUTE_NOT_FOUND");
    });

    test("attaches a request id to every response", async () => {
        const response = await request(app).get("/health");

        expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    });

    test("does not advertise the server technology", async () => {
        const response = await request(app).get("/health");

        expect(response.headers["x-powered-by"]).toBeUndefined();
    });

    test("rejects a payload larger than the configured limit", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({ username: "a".repeat(200000), email: validUser.email, password: "x" });

        expect(response.status).toBe(413);
        expect(response.body.code).toBe("PAYLOAD_TOO_LARGE");
    });
});
