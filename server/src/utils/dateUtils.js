// server/src/utils/dateUtils.js

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Resolve the end of a contest from either an explicit end timestamp or a
 * duration expressed in minutes, which is what the Contest model stores.
 */
const resolveEndTime = (startTime, endTimeOrDurationMinutes) => {
    const start = new Date(startTime);

    if (Number.isNaN(start.getTime())) {
        return null;
    }

    if (
        typeof endTimeOrDurationMinutes === "number" &&
        Number.isFinite(endTimeOrDurationMinutes)
    ) {
        return new Date(start.getTime() + endTimeOrDurationMinutes * MINUTE_MS);
    }

    const end = new Date(endTimeOrDurationMinutes);

    return Number.isNaN(end.getTime()) ? null : end;
};

/**
 * @param {Date|string|number} startTime
 * @param {Date|string|number} endTimeOrDurationMinutes
 *        An end timestamp, or the contest duration in minutes.
 * @param {Date} [now]
 * @returns {"upcoming"|"ongoing"|"completed"|"unknown"}
 */
const getContestStatus = (startTime, endTimeOrDurationMinutes, now = new Date()) => {
    const start = new Date(startTime);
    const end = resolveEndTime(startTime, endTimeOrDurationMinutes);

    if (Number.isNaN(start.getTime()) || !end) {
        return "unknown";
    }

    if (now < start) return "upcoming";
    if (now <= end) return "ongoing";

    return "completed";
};

/**
 * Human-readable time remaining until a contest starts.
 * @returns {string} For example "2d 4h remaining", "35m remaining", "Started".
 */
const getContestCountdown = (startTime, now = new Date()) => {
    const start = new Date(startTime);

    if (Number.isNaN(start.getTime())) {
        return "Unknown";
    }

    const remainingMs = start.getTime() - now.getTime();

    if (remainingMs <= 0) return "Started";

    const days = Math.floor(remainingMs / DAY_MS);
    const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
    const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;

    return `${Math.max(minutes, 1)}m remaining`;
};

module.exports = {
    getContestStatus,
    getContestCountdown,
    resolveEndTime
};
