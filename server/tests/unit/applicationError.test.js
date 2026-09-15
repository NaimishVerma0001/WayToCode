const ApplicationError = require("../../src/utils/ApplicationError");

describe("ApplicationError", () => {
    test("supports the positional (message, statusCode) signature", () => {
        const error = new ApplicationError("Dashboard data not found.", 404);

        expect(error.message).toBe("Dashboard data not found.");
        expect(error.status).toBe(404);
        expect(error.statusCode).toBe(404);
        expect(error.isOperational).toBe(true);
    });

    test("supports the options-object signature used by the registration flow", () => {
        const error = new ApplicationError({
            status: 409,
            code: "EMAIL_ALREADY_IN_USE",
            field: "email",
            message: "This email is already registered.",
            details: { attemptsRemaining: 2 }
        });

        expect(error.message).toBe("This email is already registered.");
        expect(error.status).toBe(409);
        expect(error.code).toBe("EMAIL_ALREADY_IN_USE");
        expect(error.field).toBe("email");
        expect(error.details).toEqual({ attemptsRemaining: 2 });
    });

    test("always exposes a numeric status so res.status() cannot receive a string", () => {
        const cases = [
            new ApplicationError({ status: 400, message: "a" }),
            new ApplicationError({ status: "not-a-number", message: "b" }),
            new ApplicationError({ message: "c" }),
            new ApplicationError("d")
        ];

        cases.forEach((error) => {
            expect(typeof error.status).toBe("number");
            expect(Number.isInteger(error.status)).toBe(true);
            expect(error.status).toBeGreaterThanOrEqual(400);
            expect(error.status).toBeLessThanOrEqual(599);
        });
    });

    test("clamps a status outside the HTTP error range to 500", () => {
        expect(new ApplicationError({ status: 200, message: "x" }).status).toBe(500);
        expect(new ApplicationError({ status: 999, message: "x" }).status).toBe(500);
    });

    test("never renders an options object as the message", () => {
        const error = new ApplicationError({ status: 400, message: "Invalid start time." });

        expect(error.message).not.toContain("[object Object]");
    });

    test("falls back to a safe message when none is provided", () => {
        expect(new ApplicationError({ status: 500 }).message).toBe("Internal Server Error");
    });

    test("is catchable as an Error and reports a stack", () => {
        const error = new ApplicationError({ status: 400, message: "boom" });

        expect(error).toBeInstanceOf(Error);
        expect(error.stack).toEqual(expect.any(String));
        expect(error.isClientError).toBe(true);
    });
});
