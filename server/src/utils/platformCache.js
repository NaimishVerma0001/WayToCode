// server/src/utils/platformCache.js

/**
 * In-process cache for third-party coding-platform responses.
 *
 * Responsibilities:
 *   - serve fresh entries without touching the network
 *   - collapse concurrent requests for the same key into one upstream call
 *   - keep serving stale data when the provider is failing (graceful degradation)
 *   - throttle user-triggered "refresh" so a provider cannot be hammered
 *
 * Every value returned to a caller carries `metadata.cache` describing how it
 * was produced, which the dashboard surfaces to the user.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_FAILURE_TTL_MS = 60 * 1000;
const DEFAULT_REFRESH_COOLDOWN_MS = 30 * 1000;

// Hard ceiling so a large user base can never exhaust process memory.
const MAX_ENTRIES = 1000;

const positiveNumber = (value, fallback) =>
    Number.isFinite(value) && value > 0 ? value : fallback;

const decorate = (value, cacheMetadata) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    return {
        ...value,
        metadata: {
            ...(value.metadata || {}),
            cache: cacheMetadata
        }
    };
};

class PlatformCache {
    constructor() {
        this.entries = new Map();
        this.inFlight = new Map();
    }

    /** Drop the least-recently-written entry once the ceiling is reached. */
    #enforceCapacity() {
        while (this.entries.size > MAX_ENTRIES) {
            const oldestKey = this.entries.keys().next().value;

            if (oldestKey === undefined) return;

            this.entries.delete(oldestKey);
        }
    }

    #write(key, value, { ttlMs, staleTtlMs, failed }) {
        const now = Date.now();

        // Re-insert so Map iteration order reflects recency.
        this.entries.delete(key);

        this.entries.set(key, {
            value,
            failed: Boolean(failed),
            storedAt: now,
            expiresAt: now + ttlMs,
            staleUntil: now + ttlMs + staleTtlMs
        });

        this.#enforceCapacity();
    }

    /**
     * Read a fresh entry, or `null` when absent or expired.
     * Expired-but-still-stale entries are deliberately not returned here;
     * use `getOrSet` for the graceful-degradation path.
     */
    get(key) {
        const entry = this.entries.get(key);

        if (!entry) return null;

        if (Date.now() > entry.expiresAt) return null;

        return decorate(entry.value, {
            hit: true,
            stale: false,
            refreshThrottled: false,
            storedAt: new Date(entry.storedAt).toISOString()
        });
    }

    set(key, value, options = {}) {
        this.#write(key, value, {
            ttlMs: positiveNumber(options.ttlMs, DEFAULT_TTL_MS),
            staleTtlMs: positiveNumber(options.staleTtlMs, DEFAULT_STALE_TTL_MS),
            failed: false
        });
    }

    /**
     * @param {string} key
     * @param {() => Promise<any>} fetchValue
     * @param {{
     *   ttlMs?: number,
     *   staleTtlMs?: number,
     *   failureTtlMs?: number,
     *   refreshCooldownMs?: number,
     *   forceRefresh?: boolean
     * }} [options]
     */
    async getOrSet(key, fetchValue, options = {}) {
        const ttlMs = positiveNumber(options.ttlMs, DEFAULT_TTL_MS);
        const staleTtlMs = positiveNumber(options.staleTtlMs, DEFAULT_STALE_TTL_MS);
        const failureTtlMs = positiveNumber(options.failureTtlMs, DEFAULT_FAILURE_TTL_MS);
        const refreshCooldownMs = positiveNumber(
            options.refreshCooldownMs,
            DEFAULT_REFRESH_COOLDOWN_MS
        );

        const forceRefresh = options.forceRefresh === true;
        const entry = this.entries.get(key);
        const now = Date.now();

        // A forced refresh is ignored while the entry is still inside its cooldown.
        const refreshThrottled =
            forceRefresh && Boolean(entry) && now - entry.storedAt < refreshCooldownMs;

        if (entry && !entry.failed && now <= entry.expiresAt && (!forceRefresh || refreshThrottled)) {
            return decorate(entry.value, {
                hit: true,
                stale: false,
                refreshThrottled,
                storedAt: new Date(entry.storedAt).toISOString()
            });
        }

        if (refreshThrottled && entry) {
            return decorate(entry.value, {
                hit: true,
                stale: now > entry.expiresAt,
                refreshThrottled: true,
                storedAt: new Date(entry.storedAt).toISOString()
            });
        }

        const pending = this.inFlight.get(key);

        if (pending) {
            return pending;
        }

        const requestPromise = (async () => {
            try {
                const value = await fetchValue();

                // A provider that answers with `success: false` is cached only
                // briefly so a transient outage does not stick for the full TTL.
                const failed = value && typeof value === "object" && value.success === false;

                this.#write(key, value, {
                    ttlMs: failed ? failureTtlMs : ttlMs,
                    staleTtlMs,
                    failed
                });

                return decorate(value, {
                    hit: false,
                    stale: false,
                    refreshThrottled: false,
                    storedAt: new Date().toISOString()
                });
            } catch (error) {
                // Graceful degradation: keep serving the last good payload.
                if (entry && Date.now() <= entry.staleUntil) {
                    return decorate(entry.value, {
                        hit: true,
                        stale: true,
                        refreshThrottled: false,
                        storedAt: new Date(entry.storedAt).toISOString(),
                        error: error.message
                    });
                }

                throw error;
            } finally {
                this.inFlight.delete(key);
            }
        })();

        this.inFlight.set(key, requestPromise);

        return requestPromise;
    }

    invalidate(key) {
        this.entries.delete(key);
        this.inFlight.delete(key);
    }

    clear() {
        this.entries.clear();
        this.inFlight.clear();
    }

    getStats() {
        return {
            entries: this.entries.size,
            inFlightRequests: this.inFlight.size
        };
    }
}

const instance = new PlatformCache();

module.exports = {
    get: (key) => instance.get(key),
    set: (key, value, options) => instance.set(key, value, options),
    getOrSet: (key, fetchValue, options) => instance.getOrSet(key, fetchValue, options),
    invalidate: (key) => instance.invalidate(key),
    clear: () => instance.clear(),
    getStats: () => instance.getStats(),
    PlatformCache
};
