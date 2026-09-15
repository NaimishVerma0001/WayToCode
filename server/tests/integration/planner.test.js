const request = require("supertest");

const app = require("../../src/app");
const PlannerItem = require("../../src/models/PlannerItem");

const userA = {
    username: "planner_owner",
    email: "owner@example.com",
    password: "OwnerPassword123!"
};

const userB = {
    username: "planner_other",
    email: "other@example.com",
    password: "OtherPassword123!"
};

const createSession = async (credentials) => {
    await request(app).post("/api/auth/register").send(credentials);

    const response = await request(app)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: credentials.password });

    return response.body.data.token;
};

const authorized = (req, token) => req.set("Authorization", `Bearer ${token}`);

const createItem = (token, overrides = {}) =>
    authorized(request(app).post("/api/planner"), token).send({
        category: "task",
        title: "Solve two graph problems",
        ...overrides
    });

describe("Planner authentication", () => {
    test("rejects every unauthenticated request", async () => {
        const [list, create, update, remove] = await Promise.all([
            request(app).get("/api/planner"),
            request(app).post("/api/planner").send({ category: "task", title: "x" }),
            request(app).put("/api/planner/507f1f77bcf86cd799439011").send({ title: "x" }),
            request(app).delete("/api/planner/507f1f77bcf86cd799439011")
        ]);

        expect(list.status).toBe(401);
        expect(create.status).toBe(401);
        expect(update.status).toBe(401);
        expect(remove.status).toBe(401);
    });
});

describe("POST /api/planner", () => {
    test("creates an item owned by the caller", async () => {
        const token = await createSession(userA);

        const response = await createItem(token);

        expect(response.status).toBe(201);
        expect(response.body.data).toMatchObject({
            category: "task",
            title: "Solve two graph problems",
            status: "pending",
            priority: "medium"
        });
    });

    test("rejects an invalid category with 400 rather than 500", async () => {
        const token = await createSession(userA);

        const response = await createItem(token, { category: "not-a-category" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("VALIDATION_FAILED");
    });

    test("rejects a missing title", async () => {
        const token = await createSession(userA);

        const response = await authorized(request(app).post("/api/planner"), token).send({
            category: "task"
        });

        expect(response.status).toBe(400);
    });

    test("rejects a javascript: URL", async () => {
        const token = await createSession(userA);

        const response = await createItem(token, {
            category: "link",
            url: "javascript:alert(1)"
        });

        expect(response.status).toBe(400);
    });

    test("ignores an attempt to assign the item to another user", async () => {
        const token = await createSession(userA);

        const response = await createItem(token, { user: "507f1f77bcf86cd799439011" });

        // `user` is not an accepted field, so the payload is rejected outright.
        expect(response.status).toBe(400);
    });
});

describe("Planner ownership", () => {
    test("does not list another user's items", async () => {
        const tokenA = await createSession(userA);
        const tokenB = await createSession(userB);

        await createItem(tokenA);

        const response = await authorized(request(app).get("/api/planner"), tokenB);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
    });

    test("refuses to update another user's item", async () => {
        const tokenA = await createSession(userA);
        const tokenB = await createSession(userB);

        const created = await createItem(tokenA);

        const response = await authorized(
            request(app).put(`/api/planner/${created.body.data._id}`),
            tokenB
        ).send({ title: "Hijacked" });

        expect(response.status).toBe(404);

        const untouched = await PlannerItem.findById(created.body.data._id).lean();
        expect(untouched.title).toBe("Solve two graph problems");
    });

    test("refuses to delete another user's item", async () => {
        const tokenA = await createSession(userA);
        const tokenB = await createSession(userB);

        const created = await createItem(tokenA);

        const response = await authorized(
            request(app).delete(`/api/planner/${created.body.data._id}`),
            tokenB
        );

        expect(response.status).toBe(404);
        expect(await PlannerItem.exists({ _id: created.body.data._id })).not.toBeNull();
    });
});

describe("Planner lifecycle", () => {
    test("updates and then deletes an item", async () => {
        const token = await createSession(userA);
        const created = await createItem(token);

        const updated = await authorized(
            request(app).put(`/api/planner/${created.body.data._id}`),
            token
        ).send({ status: "completed" });

        expect(updated.status).toBe(200);
        expect(updated.body.data.status).toBe("completed");

        const removed = await authorized(
            request(app).delete(`/api/planner/${created.body.data._id}`),
            token
        );

        expect(removed.status).toBe(200);
        expect(await PlannerItem.exists({ _id: created.body.data._id })).toBeNull();
    });

    test("returns 404 for a malformed identifier instead of a cast error", async () => {
        const token = await createSession(userA);

        const response = await authorized(
            request(app).put("/api/planner/not-an-id"),
            token
        ).send({ title: "Anything" });

        expect(response.status).toBe(404);
    });

    test("filters and paginates", async () => {
        const token = await createSession(userA);

        await createItem(token, { category: "task", title: "Task one" });
        await createItem(token, { category: "blocker", title: "Blocked on DP" });

        const response = await authorized(
            request(app).get("/api/planner?category=blocker"),
            token
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].category).toBe("blocker");
        expect(response.body.meta.totalItems).toBe(1);
    });
});
