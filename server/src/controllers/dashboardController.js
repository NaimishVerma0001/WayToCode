// server/src/controllers/dashboardController.js

const catchAsync = require("../utils/catchAsync");
const ApplicationError = require("../utils/ApplicationError");
const dashboardService = require("../services/dashboardService");
const Reminder = require("../models/Reminder");
const {
    recordSnapshot,
    ALLOWED_HISTORY_RANGES,
    getProgressHistory
} = require("../services/progressService");

/**
 * GET /api/dashboard
 *
 * Aggregates every connected coding platform for the signed-in user. Platform
 * fetches are cached and fail independently, so one slow provider can never
 * take the whole dashboard down.
 */
const getDashboard = catchAsync(async (req, res) => {
    const user = req.user;
    const forceRefresh = req.query.refresh === "true";

    const [dashboard, activeReminders] = await Promise.all([
        dashboardService.getDashboard(user, { forceRefresh }),
        Reminder.find({ userId: user._id, status: { $in: ["pending", "processing"] } })
            .select({ contestId: 1, scheduledAt: 1, offsetMinutes: 1, status: 1 })
            .lean()
    ]);

    /*
     * Snapshot recording is deliberately fire-and-forget: progress history is
     * a nice-to-have and must never delay or fail the dashboard response.
     *
     * `dashboard` is passed (not the raw user document) because
     * buildSnapshotData reads `dashboard.platforms`; passing the user document
     * previously produced a snapshot of zeroes for every platform.
     */
    recordSnapshot({
        userId: user._id,
        dashboard,
        source: forceRefresh ? "refresh" : "dashboard"
    }).catch((snapshotError) => {
        console.error("Progress snapshot error (non-fatal):", snapshotError.message);
    });

    return res.status(200).json({
        success: true,
        message: "Dashboard fetched successfully.",
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                reminderEnabled: user.reminderEnabled,
                reminderOffset: user.reminderOffset,
                potdStreak: user.potdStreak,
                badges: user.badges,
                codingProfiles: user.codingProfiles
            },
            platforms: dashboard.platforms,
            activeReminders,
            metadata: dashboard.metadata
        }
    });
});

/**
 * GET /api/dashboard/progress?days=30
 */
const getProgressHistoryHandler = catchAsync(async (req, res) => {
    const requestedDays =
        req.query.days === undefined ? 30 : Number(req.query.days);

    if (!ALLOWED_HISTORY_RANGES.includes(requestedDays)) {
        throw new ApplicationError({
            status: 400,
            code: "INVALID_PROGRESS_RANGE",
            field: "days",
            message: `Progress range must be one of: ${ALLOWED_HISTORY_RANGES.join(", ")}.`
        });
    }

    const history = await getProgressHistory({
        userId: req.user._id,
        days: requestedDays
    });

    return res.status(200).json({
        success: true,
        message: "Progress history fetched successfully.",
        data: history
    });
});

module.exports = {
    getDashboard,
    getProgressHistory: getProgressHistoryHandler
};
