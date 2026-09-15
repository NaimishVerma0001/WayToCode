// server/src/services/reminderService.js

const Reminder = require("../models/Reminder");
const ApplicationError = require("../utils/ApplicationError");

const DEFAULT_OFFSET_MINUTES = 10;
const MAX_REMINDERS_PER_USER = 100;

/**
 * Schedule or reschedule a reminder for a contest.
 * Upserted on (userId, contestId), which the unique index guarantees.
 */
const scheduleReminder = async (
    userId,
    contestId,
    contestStartTime,
    offsetMinutes = DEFAULT_OFFSET_MINUTES
) => {
    const startTimeDate = new Date(contestStartTime);

    if (Number.isNaN(startTimeDate.getTime())) {
        throw new ApplicationError({
            status: 400,
            code: "INVALID_CONTEST_START_TIME",
            field: "contestStartTime",
            message: "Invalid contest start time."
        });
    }

    const normalizedOffset = Number(offsetMinutes) || DEFAULT_OFFSET_MINUTES;

    const scheduledAt = new Date(startTimeDate.getTime() - normalizedOffset * 60 * 1000);

    if (scheduledAt <= new Date()) {
        throw new ApplicationError({
            status: 400,
            code: "REMINDER_TOO_LATE",
            field: "offsetMinutes",
            message:
                "It is too close to the contest start time to schedule this reminder."
        });
    }

    /*
     * Bound how many reminders a single account can hold so the collection and
     * the per-minute cron scan cannot be grown without limit.
     */
    const existing = await Reminder.findOne({ userId, contestId }).select("_id").lean();

    if (!existing) {
        const reminderCount = await Reminder.countDocuments({ userId });

        if (reminderCount >= MAX_REMINDERS_PER_USER) {
            throw new ApplicationError({
                status: 409,
                code: "REMINDER_LIMIT_REACHED",
                message: `You can hold at most ${MAX_REMINDERS_PER_USER} reminders at a time.`
            });
        }
    }

    try {
        return await Reminder.findOneAndUpdate(
            { userId, contestId },
            {
                $set: {
                    scheduledAt,
                    offsetMinutes: normalizedOffset,
                    status: "pending"
                }
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
        );
    } catch (error) {
        // Two concurrent upserts can race the unique index; re-read the winner.
        if (error?.code === 11000) {
            return Reminder.findOne({ userId, contestId });
        }

        throw error;
    }
};

const cancelReminder = async (userId, contestId) => {
    const result = await Reminder.deleteOne({ userId, contestId });

    return result.deletedCount > 0;
};

const listReminders = async (userId) => {
    return Reminder.find({ userId })
        .select({ contestId: 1, scheduledAt: 1, offsetMinutes: 1, status: 1, createdAt: 1 })
        .sort({ scheduledAt: 1 })
        .lean();
};

module.exports = {
    scheduleReminder,
    cancelReminder,
    listReminders,
    DEFAULT_OFFSET_MINUTES,
    MAX_REMINDERS_PER_USER
};
