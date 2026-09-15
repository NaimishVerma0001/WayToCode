// server/src/controllers/reminderController.js

const reminderService = require("../services/reminderService");
const catchAsync = require("../utils/catchAsync");

// @desc    Schedule (or reschedule) a contest reminder
// @route   POST /api/reminders
// @access  Private
const setReminder = catchAsync(async (req, res) => {
    const { contestId, contestStartTime, offsetMinutes } = req.body;

    const reminder = await reminderService.scheduleReminder(
        req.user._id,
        contestId,
        contestStartTime,
        offsetMinutes
    );

    return res.status(200).json({
        success: true,
        message: "Reminder scheduled successfully.",
        data: reminder
    });
});

// @desc    Cancel a contest reminder
// @route   DELETE /api/reminders/:contestId
// @access  Private
const removeReminder = catchAsync(async (req, res) => {
    const removed = await reminderService.cancelReminder(
        req.user._id,
        req.params.contestId
    );

    return res.status(200).json({
        success: true,
        message: removed
            ? "Reminder cancelled successfully."
            : "No reminder was scheduled for this contest.",
        data: { removed }
    });
});

// @desc    List the signed-in user's reminders
// @route   GET /api/reminders
// @access  Private
const listReminders = catchAsync(async (req, res) => {
    const reminders = await reminderService.listReminders(req.user._id);

    return res.status(200).json({ success: true, data: reminders });
});

module.exports = {
    setReminder,
    removeReminder,
    listReminders
};
