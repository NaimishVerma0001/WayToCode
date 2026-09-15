// server/src/utils/platformResponse.js

/**
 * Canonical response envelope for every coding-platform integration.
 *
 * Consumers (dashboardService, progressService, the dashboard controller and
 * the React client) all rely on this exact shape, so platform services must
 * never invent their own:
 *
 *   { platform, connected, username, success, data, error, metadata }
 */

const createMetadata = (metadata = {}) => {
    // `connected` belongs on the envelope, not inside metadata, so it is
    // deliberately dropped here.
    const { connected: _connected, ...rest } = metadata;

    return {
        fetchedAt: new Date().toISOString(),
        ...rest
    };
};

const createPlatformSuccess = (platform, username, data, metadata = {}) => {
    return {
        platform,
        connected: metadata.connected !== false,
        username: username || "",
        success: true,
        data: data ?? null,
        error: "",
        metadata: createMetadata(metadata)
    };
};

const createPlatformFailure = (platform, username, error, metadata = {}) => {
    return {
        platform,
        connected: metadata.connected !== false,
        username: username || "",
        success: false,
        data: null,
        error:
            typeof error === "string" && error.trim()
                ? error.trim()
                : "This platform is temporarily unavailable.",
        metadata: createMetadata(metadata)
    };
};

const createDisconnectedPlatformResponse = (platform, message) => {
    return {
        platform,
        connected: false,
        username: "",
        success: false,
        data: null,
        error: message || `No ${platform} username is connected.`,
        metadata: createMetadata()
    };
};

module.exports = {
    createPlatformSuccess,
    createPlatformFailure,
    createDisconnectedPlatformResponse
};
