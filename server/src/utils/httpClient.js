// server/src/utils/httpClient.js

/**
 * Shared outbound HTTP client for third-party platform integrations.
 *
 * Every external call made by Way2Code goes through here so that timeouts,
 * retry/backoff behaviour, response-size limits and error normalisation are
 * identical for every provider instead of being re-implemented per service.
 */

const axios = require("axios");

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 400;
const MAX_RETRY_DELAY_MS = 4000;

// Third-party profile payloads are small; anything larger is treated as hostile.
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const RETRYABLE_NETWORK_CODES = new Set([
    "ECONNABORTED",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ENOTFOUND",
    "EPIPE",
    "ETIMEDOUT",
    "ERR_NETWORK"
]);

const client = axios.create({
    timeout: DEFAULT_TIMEOUT_MS,
    maxContentLength: MAX_RESPONSE_BYTES,
    maxBodyLength: MAX_RESPONSE_BYTES,
    maxRedirects: 3,
    // Never follow a provider into an unexpected 3xx/4xx auth flow silently.
    validateStatus: (status) => status >= 200 && status < 300
});

const wait = (milliseconds) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

const isRetryableError = (error) => {
    if (error?.response) {
        return RETRYABLE_STATUS_CODES.has(error.response.status);
    }

    return RETRYABLE_NETWORK_CODES.has(error?.code);
};

/**
 * Honour a provider's Retry-After header when present, otherwise use
 * exponential backoff with jitter so retries do not synchronise.
 */
const getRetryDelay = (error, attempt, baseDelayMs) => {
    const retryAfterHeader = error?.response?.headers?.["retry-after"];

    if (retryAfterHeader) {
        const retryAfterSeconds = Number(retryAfterHeader);

        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
            return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
        }
    }

    const exponentialDelay = baseDelayMs * 2 ** attempt;
    const jitter = Math.random() * baseDelayMs;

    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
};

/**
 * Perform an outbound request with bounded retries.
 *
 * @param {import("axios").AxiosRequestConfig} config
 * @param {{ retries?: number, retryDelayMs?: number, timeout?: number }} [options]
 * @returns {Promise<import("axios").AxiosResponse>}
 */
const request = async (config, options = {}) => {
    const retries = Number.isInteger(options.retries) && options.retries >= 0
        ? options.retries
        : DEFAULT_RETRIES;

    const retryDelayMs = Number.isFinite(options.retryDelayMs) && options.retryDelayMs > 0
        ? options.retryDelayMs
        : DEFAULT_RETRY_DELAY_MS;

    const requestConfig = {
        ...config,
        timeout: config.timeout || options.timeout || DEFAULT_TIMEOUT_MS
    };

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await client.request(requestConfig);
        } catch (error) {
            lastError = error;

            const canRetry = attempt < retries && isRetryableError(error);

            if (!canRetry) {
                break;
            }

            await wait(getRetryDelay(error, attempt, retryDelayMs));
        }
    }

    throw lastError;
};

/**
 * Convert an arbitrary upstream failure into a message that is safe to show
 * to an end user. Provider internals and stack traces are never surfaced.
 */
const getErrorMessage = (error, fallbackMessage = "The request could not be completed.") => {
    if (error?.response) {
        const payload = error.response.data;

        const providerMessage =
            (typeof payload === "string" && payload.length <= 200 && payload) ||
            payload?.message ||
            payload?.error ||
            payload?.comment;

        if (typeof providerMessage === "string" && providerMessage.trim()) {
            return providerMessage.trim().slice(0, 200);
        }

        return fallbackMessage;
    }

    if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
        return "The provider did not respond in time.";
    }

    if (RETRYABLE_NETWORK_CODES.has(error?.code)) {
        return "The provider is currently unreachable.";
    }

    return fallbackMessage;
};

module.exports = {
    request,
    getErrorMessage,
    isRetryableError,
    MAX_RESPONSE_BYTES,
    DEFAULT_TIMEOUT_MS
};
