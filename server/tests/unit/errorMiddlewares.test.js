const { z } = require("zod");

const {
    normalizeError,
    errorHandler,
    notFoundHandler,
    formatZodIssues
} = require("../../src/middlewares/errorMiddlewares");

const ApplicationError = require("../../src/utils/ApplicationError");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null,
        headersSent: false,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };

    return res;
};

const createRequest = (overrides = {}) => ({
    id: "req-123",
    method: "GET",
    originalUrl: "/api/test",
    ...overrides
});

describe("normalizeError", () => {
    test("passes an ApplicationError through unchanged", () => {
        const normalized = normalizeError(
            new ApplicationError({ status: 409, code: "DUP", message: "taken", field: "email" })
        );

        expect(normalized).toMatchObject({
            status: 409,
            code: "DUP",
            message: "taken",
            field: "email"
        });
    });

    test("maps a Zod error to 400 with per-field details", () => {
        const result = z.object({ email: z.string() }).safeParse({});
        const normalized = normalizeError(result.error);

        expect(normalized.status).toBe(400);
        expect(normalized.code).toBe("VALIDATION_FAILED");
        expect(normalized.errors[0].field).toBe("email");
    });

    test("maps a Mongoose CastError to 400", () => {
        const normalized = normalizeError({ name: "CastError", path: "userId" });

        expect(normalized.status).toBe(400);
        expect(normalized.code).toBe("INVALID_IDENTIFIER");
        expect(normalized.field).toBe("userId");
    });

    test("maps a Mongoose ValidationError to 400", () => {
        const normalized = normalizeError({
            name: "ValidationError",
            errors: {
                category: { path: "category", kind: "enum", message: "not allowed" }
            }
        });

        expect(normalized.status).toBe(400);
        expect(normalized.errors).toEqual([
            { field: "category", code: "enum", message: "not allowed" }
        ]);
    });

    test("maps a duplicate key error to 409", () => {
        const normalized = normalizeError({ code: 11000, keyPattern: { email: 1 } });

        expect(normalized.status).toBe(409);
        expect(normalized.code).toBe("DUPLICATE_VALUE");
        expect(normalized.field).toBe("email");
    });

    test("maps JWT failures to 401", () => {
        expect(normalizeError({ name: "TokenExpiredError" }).status).toBe(401);
        expect(normalizeError({ name: "JsonWebTokenError" }).status).toBe(401);
    });

    test("maps body-parser failures", () => {
        expect(normalizeError({ type: "entity.parse.failed" }).status).toBe(400);
        expect(normalizeError({ type: "entity.too.large" }).status).toBe(413);
    });

    test("honours a plain error that already declares a status", () => {
        const normalized = normalizeError(
            Object.assign(new Error("Origin blocked"), { status: 403, code: "ORIGIN_NOT_ALLOWED" })
        );

        expect(normalized.status).toBe(403);
        expect(normalized.code).toBe("ORIGIN_NOT_ALLOWED");
    });

    test("falls back to 500 for an unrecognised error", () => {
        expect(normalizeError(new Error("kaboom")).status).toBe(500);
    });
});

describe("errorHandler", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    test("returns a structured envelope including the request id", () => {
        const res = createResponse();

        errorHandler(
            new ApplicationError({ status: 400, code: "BAD", message: "nope", field: "x" }),
            createRequest(),
            res,
            jest.fn()
        );

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            success: false,
            code: "BAD",
            message: "nope",
            field: "x",
            requestId: "req-123"
        });
    });

    test("hides internal failure details in production", () => {
        process.env.NODE_ENV = "production";

        const res = createResponse();
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        errorHandler(new Error("connection string leaked"), createRequest(), res, jest.fn());

        expect(res.statusCode).toBe(500);
        expect(res.body.message).toBe("Internal Server Error");
        expect(res.body.message).not.toContain("connection string");

        consoleSpy.mockRestore();
    });

    test("keeps client-facing messages for 4xx in production", () => {
        process.env.NODE_ENV = "production";

        const res = createResponse();

        errorHandler(
            new ApplicationError({ status: 404, message: "Planner item not found." }),
            createRequest(),
            res,
            jest.fn()
        );

        expect(res.body.message).toBe("Planner item not found.");
    });

    test("delegates to Express when headers are already sent", () => {
        const res = createResponse();
        res.headersSent = true;

        const next = jest.fn();
        const error = new Error("late failure");
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        errorHandler(error, createRequest(), res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.body).toBeNull();

        consoleSpy.mockRestore();
    });
});

describe("notFoundHandler", () => {
    test("describes the missing route", () => {
        const res = createResponse();

        notFoundHandler(createRequest({ method: "POST", originalUrl: "/api/ghost" }), res);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            success: false,
            code: "ROUTE_NOT_FOUND",
            message: "Route not found: POST /api/ghost"
        });
    });
});

describe("formatZodIssues", () => {
    test("labels a top-level issue as body", () => {
        const result = z.string().safeParse(42);

        expect(formatZodIssues(result.error.issues)[0].field).toBe("body");
    });

    test("joins a nested path with dots", () => {
        const result = z
            .object({ profile: z.object({ handle: z.string() }) })
            .safeParse({ profile: {} });

        expect(formatZodIssues(result.error.issues)[0].field).toBe("profile.handle");
    });
});
