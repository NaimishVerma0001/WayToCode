const request = require("supertest");

const app = require("../../src/app");
const Suggestion = require("../../src/models/Suggestion");

const validSuggestion = {
    authorName: "Naimish",
    title: "Add a weekly streak summary",
    description: "A short weekly email recapping solved problems and streaks."
};

const createSuggestion = (overrides = {}) =>
    request(app)
        .post("/api/suggestions")
        .send({ ...validSuggestion, ...overrides });

describe("POST /api/suggestions", () => {
    test("accepts a well-formed suggestion", async () => {
        const response = await createSuggestion();

        expect(response.status).toBe(201);
        expect(response.body.data).toMatchObject({
            authorName: validSuggestion.authorName,
            title: validSuggestion.title,
            category: "feature",
            upvotes: 0,
            status: "under-review"
        });
    });

    test("rejects a submission that is too short", async () => {
        const response = await createSuggestion({ description: "too short" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("VALIDATION_FAILED");
    });

    test("ignores client-supplied upvotes and status", async () => {
        const response = await createSuggestion({ upvotes: 9999, status: "completed" });

        // Both fields are outside the strict schema, so the request is refused
        // rather than silently accepting a forged vote count.
        expect(response.status).toBe(400);
    });

    test("rejects an unknown category", async () => {
        const response = await createSuggestion({ category: "spam" });

        expect(response.status).toBe(400);
    });
});

describe("GET /api/suggestions", () => {
    test("never exposes voter identifiers", async () => {
        await createSuggestion();

        const created = await Suggestion.findOne({}).lean();
        await Suggestion.updateOne(
            { _id: created._id },
            { $push: { upvotedIPs: "some-hashed-voter-key" } }
        );

        const response = await request(app).get("/api/suggestions");

        expect(response.status).toBe(200);
        expect(response.body.data[0]).not.toHaveProperty("upvotedIPs");
    });

    test("paginates and orders by upvotes", async () => {
        await createSuggestion({ title: "First suggestion here" });
        await createSuggestion({ title: "Second suggestion here" });

        const all = await Suggestion.find({}).lean();
        await Suggestion.updateOne({ _id: all[1]._id }, { $set: { upvotes: 5 } });

        const response = await request(app).get("/api/suggestions?limit=1");

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].upvotes).toBe(5);
        expect(response.body.meta.totalItems).toBe(2);
    });
});

describe("PUT /api/suggestions/:id/upvote", () => {
    test("increments the count once per voter", async () => {
        const created = await createSuggestion();
        const { id } = await Suggestion.findOne({}).lean().then((doc) => ({ id: doc._id }));

        expect(created.status).toBe(201);

        const first = await request(app).put(`/api/suggestions/${id}/upvote`);
        expect(first.status).toBe(200);
        expect(first.body.data.upvotes).toBe(1);

        const second = await request(app).put(`/api/suggestions/${id}/upvote`);
        expect(second.status).toBe(409);
        expect(second.body.code).toBe("ALREADY_UPVOTED");

        const stored = await Suggestion.findById(id).lean();
        expect(stored.upvotes).toBe(1);
    });

    test("does not store a raw address as the voter key", async () => {
        await createSuggestion();
        const suggestion = await Suggestion.findOne({}).lean();

        await request(app).put(`/api/suggestions/${suggestion._id}/upvote`);

        const stored = await Suggestion.findById(suggestion._id).lean();

        expect(stored.upvotedIPs).toHaveLength(1);
        // A SHA-256 HMAC, not an IP address.
        expect(stored.upvotedIPs[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    test("returns 404 for a malformed identifier", async () => {
        const response = await request(app).put("/api/suggestions/not-an-id/upvote");

        expect(response.status).toBe(404);
        expect(response.body.code).toBe("SUGGESTION_NOT_FOUND");
    });

    test("returns 404 for an identifier that does not exist", async () => {
        const response = await request(app).put(
            "/api/suggestions/507f1f77bcf86cd799439011/upvote"
        );

        expect(response.status).toBe(404);
    });
});
