import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    apiRequest,
    ApiError,
    API_BASE_URL,
    clearAuthentication,
    getStoredToken,
    getStoredUser,
    storeAuthentication,
    TOKEN_STORAGE_KEY
} from "./apiClient";

const jsonResponse = (body, { status = 200, ok = status < 400 } = {}) => ({
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body)
});

describe("API base URL", () => {
    it("falls back to a same-origin path rather than undefined", () => {
        // A missing VITE_API_URL used to make `.replace()` throw at module load
        // and render a blank page in production.
        expect(typeof API_BASE_URL).toBe("string");
        expect(API_BASE_URL.length).toBeGreaterThan(0);
    });

    it("never keeps a trailing slash", () => {
        expect(API_BASE_URL.endsWith("/")).toBe(false);
    });
});

describe("authentication storage", () => {
    afterEach(() => clearAuthentication());

    it("round-trips a token and user", () => {
        storeAuthentication({ token: "abc", user: { id: "1", username: "dev" } });

        expect(getStoredToken()).toBe("abc");
        expect(getStoredUser()).toEqual({ id: "1", username: "dev" });
    });

    it("recovers from corrupt stored JSON instead of throwing", () => {
        localStorage.setItem("way2codeUser", "{not json");

        expect(getStoredUser()).toBeNull();
    });

    it("refuses to store an empty token", () => {
        expect(() => storeAuthentication({ token: "", user: {} })).toThrow(ApiError);
    });

    it("survives storage being unavailable", () => {
        const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("SecurityError");
        });

        expect(getStoredToken()).toBe("");

        spy.mockRestore();
    });
});

describe("apiRequest", () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn();
        clearAuthentication();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns the parsed payload on success", async () => {
        globalThis.fetch.mockResolvedValue(jsonResponse({ success: true, data: { id: 1 } }));

        await expect(apiRequest("/contests")).resolves.toEqual({
            success: true,
            data: { id: 1 }
        });
    });

    it("sends credentials so the refresh cookie travels with the request", async () => {
        globalThis.fetch.mockResolvedValue(jsonResponse({ success: true }));

        await apiRequest("/contests");

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/contests"),
            expect.objectContaining({ credentials: "include" })
        );
    });

    it("attaches the bearer token only when authenticated is set", async () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, "token-123");
        globalThis.fetch.mockResolvedValue(jsonResponse({ success: true }));

        await apiRequest("/profile", { authenticated: true });

        const [, init] = globalThis.fetch.mock.calls[0];
        expect(init.headers.Authorization).toBe("Bearer token-123");

        globalThis.fetch.mockClear();
        await apiRequest("/contests");

        const [, publicInit] = globalThis.fetch.mock.calls[0];
        expect(publicInit.headers.Authorization).toBeUndefined();
    });

    it("surfaces a field-level validation message over the generic one", async () => {
        globalThis.fetch.mockResolvedValue(
            jsonResponse(
                {
                    success: false,
                    code: "VALIDATION_FAILED",
                    message: "Invalid request payload.",
                    errors: [{ field: "password", message: "Password must be at least 8 characters" }]
                },
                { status: 400 }
            )
        );

        await expect(apiRequest("/auth/register", { method: "POST", body: {} })).rejects.toThrow(
            "Password must be at least 8 characters"
        );
    });

    it("reports a network failure as a connection error", async () => {
        globalThis.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(apiRequest("/contests")).rejects.toMatchObject({
            name: "ApiError",
            status: 0
        });
    });

    it("propagates an abort rather than masking it", async () => {
        const abortError = new Error("aborted");
        abortError.name = "AbortError";
        globalThis.fetch.mockRejectedValue(abortError);

        await expect(apiRequest("/contests")).rejects.toThrow("aborted");
    });

    it("refreshes once and retries the original request after a 401", async () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, "expired-token");

        globalThis.fetch
            .mockResolvedValueOnce(jsonResponse({ success: false }, { status: 401 }))
            .mockResolvedValueOnce(
                jsonResponse({ success: true, data: { token: "fresh-token" } })
            )
            .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 1 } }));

        await expect(apiRequest("/profile", { authenticated: true })).resolves.toEqual({
            success: true,
            data: { id: 1 }
        });

        expect(getStoredToken()).toBe("fresh-token");
        expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it("gives up after a failed refresh instead of looping", async () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, "expired-token");

        globalThis.fetch
            .mockResolvedValueOnce(jsonResponse({ success: false }, { status: 401 }))
            .mockResolvedValueOnce(jsonResponse({ success: false }, { status: 401 }));

        await expect(apiRequest("/profile", { authenticated: true })).rejects.toMatchObject({
            status: 401
        });

        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        expect(getStoredToken()).toBe("");
    });

    it("does not attempt to refresh the refresh endpoint itself", async () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, "expired-token");
        globalThis.fetch.mockResolvedValue(jsonResponse({ success: false }, { status: 401 }));

        await expect(
            apiRequest("/auth/refresh", { method: "POST", authenticated: true })
        ).rejects.toMatchObject({ status: 401 });

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("clears the session when the account has been blocked", async () => {
        localStorage.setItem(TOKEN_STORAGE_KEY, "valid-token");

        globalThis.fetch.mockResolvedValue(
            jsonResponse(
                { success: false, code: "ACCOUNT_BLOCKED", message: "Your account has been blocked." },
                { status: 403 }
            )
        );

        await expect(apiRequest("/profile", { authenticated: true })).rejects.toMatchObject({
            status: 403,
            code: "ACCOUNT_BLOCKED"
        });

        expect(getStoredToken()).toBe("");
    });
});
