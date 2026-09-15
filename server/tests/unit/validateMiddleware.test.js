const { z } = require("zod");

const validate = require("../../src/middlewares/validateMiddleware");

const createResponse = () => ({
    statusCode: null,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    }
});

const schema = z
    .object({
        email: z.string().email(),
        age: z.coerce.number().int().min(0).optional()
    })
    .strict();

describe("validate", () => {
    test("replaces the body with the parsed value", () => {
        const req = { body: { email: "user@example.com", age: "30" } };
        const res = createResponse();
        const next = jest.fn();

        validate(schema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ email: "user@example.com", age: 30 });
    });

    test("returns readable per-field errors instead of a stringified ZodError", () => {
        const req = { body: { email: "not-an-email" } };
        const res = createResponse();
        const next = jest.fn();

        validate(schema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.errors).toEqual([
            expect.objectContaining({ field: "email", message: expect.any(String) })
        ]);

        // Zod 4 removed `error.errors`; reading it produced the whole issue list
        // as the message, which is what this guards against.
        expect(res.body.message).toBe("Invalid request payload.");
        expect(JSON.stringify(res.body)).not.toContain("ZodError");
    });

    test("rejects unknown keys on a strict schema", () => {
        const req = { body: { email: "user@example.com", role: "admin" } };
        const res = createResponse();
        const next = jest.fn();

        validate(schema)(req, res, next);

        expect(res.statusCode).toBe(400);
        expect(next).not.toHaveBeenCalled();
    });

    test("writes parsed query values to validatedQuery, leaving req.query alone", () => {
        const querySchema = z.object({ page: z.coerce.number().int().default(1) });
        const req = { query: { page: "4" } };
        const res = createResponse();
        const next = jest.fn();

        validate(querySchema, "query")(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.validatedQuery).toEqual({ page: 4 });
        expect(req.query).toEqual({ page: "4" });
    });

    test("fails fast when given something that is not a schema", () => {
        expect(() => validate(null)).toThrow(TypeError);
        expect(() => validate({})).toThrow(TypeError);
    });
});
