const {
    createPlatformSuccess,
    createPlatformFailure,
    createDisconnectedPlatformResponse
} = require("../../src/utils/platformResponse");

describe("platformResponse", () => {
    test("a success carries the canonical envelope", () => {
        const response = createPlatformSuccess("github", "octocat", { followers: 10 });

        expect(response).toMatchObject({
            platform: "github",
            connected: true,
            username: "octocat",
            success: true,
            data: { followers: 10 },
            error: ""
        });
        expect(response.metadata.fetchedAt).toEqual(expect.any(String));
    });

    test("a failure never carries data", () => {
        const response = createPlatformFailure("github", "octocat", "Rate limited.");

        expect(response.success).toBe(false);
        expect(response.data).toBeNull();
        expect(response.error).toBe("Rate limited.");
        // A failed fetch for a handle the user did supply is still "connected".
        expect(response.connected).toBe(true);
    });

    test("a failure supplies a generic message when none is given", () => {
        expect(createPlatformFailure("github", "octocat", "").error).toBe(
            "This platform is temporarily unavailable."
        );
    });

    test("metadata flags do not leak into the envelope body", () => {
        const response = createPlatformSuccess("github", "octocat", {}, {
            connected: false,
            source: "REST"
        });

        expect(response.connected).toBe(false);
        expect(response.metadata.source).toBe("REST");
        expect(response.metadata).not.toHaveProperty("connected");
    });

    test("a disconnected platform reports no username", () => {
        const response = createDisconnectedPlatformResponse("github");

        expect(response).toMatchObject({
            platform: "github",
            connected: false,
            username: "",
            success: false,
            data: null
        });
    });

    test("every shape exposes the same keys, so consumers never branch", () => {
        const keys = (value) => Object.keys(value).sort();

        const success = createPlatformSuccess("a", "u", {});
        const failure = createPlatformFailure("a", "u", "x");
        const disconnected = createDisconnectedPlatformResponse("a");

        expect(keys(failure)).toEqual(keys(success));
        expect(keys(disconnected)).toEqual(keys(success));
    });
});
