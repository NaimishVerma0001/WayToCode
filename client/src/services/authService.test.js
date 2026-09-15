import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    getCurrentUser,
    loginUser,
    logoutUser,
    registerUser
} from "./authService";
import { clearAuthentication, getStoredToken, TOKEN_STORAGE_KEY } from "./apiClient";

const jsonResponse = (body, { status = 200, ok = status < 400 } = {}) => ({
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body)
});

describe("authService", () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn();
        clearAuthentication();
    });

    afterEach(() => clearAuthentication());

    describe("loginUser", () => {
        it("stores the session on success", async () => {
            globalThis.fetch.mockResolvedValue(
                jsonResponse({
                    success: true,
                    data: { token: "token-abc", user: { id: "1", username: "dev" } }
                })
            );

            const session = await loginUser({ email: "a@b.co", password: "secret123" });

            expect(session.token).toBe("token-abc");
            expect(getStoredToken()).toBe("token-abc");
        });

        it("rejects a malformed success payload rather than storing a broken session", async () => {
            globalThis.fetch.mockResolvedValue(jsonResponse({ success: true, data: {} }));

            await expect(loginUser({ email: "a@b.co", password: "secret123" })).rejects.toThrow(
                /invalid login response/i
            );

            expect(getStoredToken()).toBe("");
        });

        it("propagates a credential failure", async () => {
            globalThis.fetch.mockResolvedValue(
                jsonResponse(
                    { success: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
                    { status: 401 }
                )
            );

            await expect(loginUser({ email: "a@b.co", password: "nope" })).rejects.toThrow(
                "Invalid email or password."
            );
        });
    });

    describe("logoutUser", () => {
        it("calls the server so the token is actually revoked", async () => {
            localStorage.setItem(TOKEN_STORAGE_KEY, "token-abc");
            globalThis.fetch.mockResolvedValue(jsonResponse({ success: true }));

            await logoutUser();

            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/auth/logout"),
                expect.objectContaining({ method: "POST" })
            );
            expect(getStoredToken()).toBe("");
        });

        it("still clears local state when the server call fails", async () => {
            localStorage.setItem(TOKEN_STORAGE_KEY, "token-abc");
            globalThis.fetch.mockRejectedValue(new TypeError("offline"));

            await logoutUser();

            expect(getStoredToken()).toBe("");
        });
    });

    describe("getCurrentUser", () => {
        it("returns the user and caches it", async () => {
            localStorage.setItem(TOKEN_STORAGE_KEY, "token-abc");
            globalThis.fetch.mockResolvedValue(
                jsonResponse({ success: true, data: { id: "1", username: "dev" } })
            );

            await expect(getCurrentUser()).resolves.toEqual({ id: "1", username: "dev" });
        });

        it("returns null instead of throwing so React Query does not retry forever", async () => {
            globalThis.fetch.mockResolvedValue(jsonResponse({ success: false }, { status: 401 }));

            await expect(getCurrentUser()).resolves.toBeNull();
            expect(getStoredToken()).toBe("");
        });

        it("still propagates an abort", async () => {
            const abortError = new Error("aborted");
            abortError.name = "AbortError";
            globalThis.fetch.mockRejectedValue(abortError);

            await expect(getCurrentUser()).rejects.toThrow("aborted");
        });
    });

    describe("registerUser", () => {
        it("returns the created account", async () => {
            globalThis.fetch.mockResolvedValue(
                jsonResponse(
                    { success: true, data: { id: "1", username: "dev", email: "a@b.co" } },
                    { status: 201 }
                )
            );

            await expect(
                registerUser({ username: "dev", email: "a@b.co", password: "secret123" })
            ).resolves.toMatchObject({ username: "dev" });
        });
    });
});
