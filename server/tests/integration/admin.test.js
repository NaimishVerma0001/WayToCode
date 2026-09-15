const request = require("supertest");

const app = require("../../src/app");
const User = require("../../src/models/User");
const AdminAuditLog = require("../../src/models/AdminAuditLog");
const adminService = require("../../src/services/adminService");

const adminCredentials = {
    username: "root_admin",
    email: "admin@example.com",
    password: "AdminPassword123!"
};

const memberCredentials = {
    username: "regular_member",
    email: "member@example.com",
    password: "MemberPassword123!"
};

const signUp = (credentials) =>
    request(app).post("/api/auth/register").send(credentials);

const signIn = (credentials) =>
    request(app)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: credentials.password });

const createAdmin = async () => {
    await signUp(adminCredentials);
    await User.updateOne({ email: adminCredentials.email }, { $set: { role: "admin" } });

    const response = await signIn(adminCredentials);

    return response.body.data.token;
};

const createMember = async () => {
    await signUp(memberCredentials);

    const [response, user] = await Promise.all([
        signIn(memberCredentials),
        User.findOne({ email: memberCredentials.email }).select("_id").lean()
    ]);

    return { token: response.body.data.token, id: String(user._id) };
};

const authorized = (req, token) => req.set("Authorization", `Bearer ${token}`);

afterEach(() => {
    // The overview response is memoised for 30s; clear it between tests.
    adminService.clearOverviewCache();
});

describe("Admin authorisation", () => {
    test("rejects unauthenticated access", async () => {
        const response = await request(app).get("/api/admin/overview");

        expect(response.status).toBe(401);
    });

    test("rejects a signed-in non-administrator", async () => {
        const { token } = await createMember();

        const response = await authorized(request(app).get("/api/admin/overview"), token);

        expect(response.status).toBe(403);
        expect(response.body.code).toBe("ADMIN_REQUIRED");
    });

    test("allows an administrator", async () => {
        const token = await createAdmin();

        const response = await authorized(request(app).get("/api/admin/overview"), token);

        expect(response.status).toBe(200);
        expect(response.body.data.totals).toMatchObject({ users: 1, administrators: 1 });
    });
});

describe("GET /api/admin/users", () => {
    test("paginates results", async () => {
        const token = await createAdmin();
        await createMember();

        const response = await authorized(
            request(app).get("/api/admin/users?page=1&limit=1"),
            token
        );

        expect(response.status).toBe(200);
        expect(response.body.data.users).toHaveLength(1);
        expect(response.body.data.pagination.totalUsers).toBe(2);
    });

    test("never returns password hashes", async () => {
        const token = await createAdmin();

        const response = await authorized(request(app).get("/api/admin/users"), token);

        response.body.data.users.forEach((user) => {
            expect(user).not.toHaveProperty("password");
            expect(user).not.toHaveProperty("resetPasswordToken");
        });
    });

    test("treats regex metacharacters in search as literal text", async () => {
        const token = await createAdmin();
        await createMember();

        // An unescaped ".*" would match every user; escaped, it matches none.
        const response = await authorized(
            request(app).get("/api/admin/users?search=.*"),
            token
        );

        expect(response.status).toBe(200);
        expect(response.body.data.users).toHaveLength(0);
    });

    test("filters by account status", async () => {
        const token = await createAdmin();
        const member = await createMember();

        await authorized(
            request(app).patch(`/api/admin/users/${member.id}/block`),
            token
        ).send({ reason: "Repeated spam reports" });

        const response = await authorized(
            request(app).get("/api/admin/users?status=blocked"),
            token
        );

        expect(response.body.data.users).toHaveLength(1);
        expect(response.body.data.users[0].accountStatus).toBe("blocked");
    });
});

describe("Blocking and unblocking", () => {
    test("blocks a user, writes an audit log and revokes API access", async () => {
        const adminToken = await createAdmin();
        const member = await createMember();

        const response = await authorized(
            request(app).patch(`/api/admin/users/${member.id}/block`),
            adminToken
        ).send({ reason: "Automated abuse detected" });

        expect(response.status).toBe(200);

        const blocked = await User.findById(member.id).lean();
        expect(blocked.accountStatus).toBe("blocked");
        expect(blocked.blockedReason).toBe("Automated abuse detected");

        const auditLog = await AdminAuditLog.findOne({ action: "USER_BLOCKED" }).lean();
        expect(auditLog).not.toBeNull();
        expect(String(auditLog.targetUser)).toBe(member.id);

        // The member's existing token must stop working immediately.
        const blockedRequest = await authorized(
            request(app).get("/api/auth/me"),
            member.token
        );

        expect(blockedRequest.status).toBe(403);
        expect(blockedRequest.body.code).toBe("ACCOUNT_BLOCKED");
    });

    test("requires a meaningful blocking reason", async () => {
        const adminToken = await createAdmin();
        const member = await createMember();

        const response = await authorized(
            request(app).patch(`/api/admin/users/${member.id}/block`),
            adminToken
        ).send({ reason: "no" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("BLOCK_REASON_REQUIRED");
    });

    test("refuses to block another administrator", async () => {
        const adminToken = await createAdmin();

        await signUp({
            username: "second_admin",
            email: "second@example.com",
            password: "SecondAdmin123!"
        });
        await User.updateOne({ email: "second@example.com" }, { $set: { role: "admin" } });

        const target = await User.findOne({ email: "second@example.com" }).select("_id").lean();

        const response = await authorized(
            request(app).patch(`/api/admin/users/${target._id}/block`),
            adminToken
        ).send({ reason: "Testing administrator protection" });

        expect(response.status).toBe(403);
        expect(response.body.code).toBe("ADMIN_BLOCK_NOT_ALLOWED");
    });

    test("refuses to let an administrator block their own account", async () => {
        const adminToken = await createAdmin();
        const admin = await User.findOne({ email: adminCredentials.email }).select("_id").lean();

        const response = await authorized(
            request(app).patch(`/api/admin/users/${admin._id}/block`),
            adminToken
        ).send({ reason: "Locking myself out by mistake" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("SELF_BLOCK_NOT_ALLOWED");
    });

    test("restores access when unblocked", async () => {
        const adminToken = await createAdmin();
        const member = await createMember();

        await authorized(
            request(app).patch(`/api/admin/users/${member.id}/block`),
            adminToken
        ).send({ reason: "Temporary suspension for review" });

        const response = await authorized(
            request(app).patch(`/api/admin/users/${member.id}/unblock`),
            adminToken
        ).send({ reason: "Review completed" });

        expect(response.status).toBe(200);

        const restored = await User.findById(member.id).lean();
        expect(restored.accountStatus).toBe("active");

        expect(await AdminAuditLog.exists({ action: "USER_UNBLOCKED" })).not.toBeNull();
    });

    test("rejects a malformed user identifier", async () => {
        const adminToken = await createAdmin();

        const response = await authorized(
            request(app).patch("/api/admin/users/not-an-object-id/block"),
            adminToken
        ).send({ reason: "Testing identifier validation" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("INVALID_IDENTIFIER");
    });
});

describe("GET /api/admin/audit-logs", () => {
    test("returns recorded administrative actions", async () => {
        const adminToken = await createAdmin();
        const member = await createMember();

        await authorized(
            request(app).patch(`/api/admin/users/${member.id}/block`),
            adminToken
        ).send({ reason: "Creating an audit entry" });

        const response = await authorized(request(app).get("/api/admin/audit-logs"), adminToken);

        expect(response.status).toBe(200);
        expect(response.body.data.logs).toHaveLength(1);
        expect(response.body.data.logs[0].action).toBe("USER_BLOCKED");
    });
});
