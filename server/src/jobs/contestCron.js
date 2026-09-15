// server/src/jobs/contestCron.js

const cron = require("node-cron");
const mongoose = require("mongoose");

const ContestModel = require("../models/contestModel");
const Reminder = require("../models/Reminder");
const Notification = require("../models/Notification");
const socketService = require("../services/socketService");
const { sendReminderEmail } = require("../services/emailService");
const leetcodeService = require("../services/platforms/leetcodeService");
const codeforcesService = require("../services/platforms/codeforcesService");

const SYNC_SCHEDULE = "*/15 * * * *";
const REMINDER_SCHEDULE = "* * * * *";
const REMINDER_BATCH_SIZE = 50;

// A reminder stuck in "processing" is re-eligible after this long, so a crash
// mid-dispatch cannot strand it forever.
const PROCESSING_LEASE_MS = 5 * 60 * 1000;

const scheduledTasks = [];
let isSyncRunning = false;
let isReminderRunRunning = false;

const isDatabaseReady = () => mongoose.connection.readyState === 1;

/*
|--------------------------------------------------------------------------
| Contest Synchronisation
|--------------------------------------------------------------------------
| Pulls upcoming contests from every provider and upserts them, then prunes
| contests that have already finished so the collection cannot grow forever.
*/
const syncContestsToDatabase = async () => {
    if (isSyncRunning) {
        console.log("⏭️  Contest sync already running, skipping this tick.");
        return { skipped: true };
    }

    if (!isDatabaseReady()) {
        console.warn("⏭️  Contest sync skipped: database is not connected.");
        return { skipped: true };
    }

    isSyncRunning = true;

    try {
        const results = await Promise.allSettled([
            leetcodeService.getUpcomingContests(),
            codeforcesService.getUpcomingContests()
        ]);

        const allContests = results.flatMap((result) =>
            result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []
        );

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(
                    `⚠️  Contest provider ${index} failed:`,
                    result.reason?.message || result.reason
                );
            }
        });

        if (allContests.length === 0) {
            console.log("⚠️  No upcoming contests fetched from any platform.");
            return { upserted: 0, updated: 0, removed: 0 };
        }

        const bulkOperations = allContests
            .filter((contest) => contest?.contestId && contest?.startTime)
            .map((contest) => ({
                updateOne: {
                    filter: { contestId: contest.contestId },
                    update: { $set: contest },
                    upsert: true
                }
            }));

        const result = await ContestModel.bulkWrite(bulkOperations, { ordered: false });

        // Keep finished contests around briefly so an in-flight reminder can
        // still resolve its contest name.
        const cleanupResult = await ContestModel.deleteMany({
            startTime: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        console.log(
            `✅ Contest sync complete. Inserted: ${result.upsertedCount}, ` +
                `updated: ${result.modifiedCount}, removed: ${cleanupResult.deletedCount}`
        );

        return {
            upserted: result.upsertedCount,
            updated: result.modifiedCount,
            removed: cleanupResult.deletedCount
        };
    } catch (error) {
        console.error("❌ Contest synchronisation failed:", error.message);
        return { failed: true, error: error.message };
    } finally {
        isSyncRunning = false;
    }
};

/*
|--------------------------------------------------------------------------
| Reminder Dispatch
|--------------------------------------------------------------------------
| Each reminder is claimed with a conditional update, so two instances racing
| on the same document can never both send it.
*/
const dispatchReminder = async (reminder) => {
    const user = reminder.userId;

    if (!user?.email) {
        throw new Error("User email not found.");
    }

    const contest = await ContestModel.findOne({ contestId: reminder.contestId })
        .select({ contestName: 1, url: 1, startTime: 1 })
        .lean();

    const contestName = contest?.contestName || reminder.contestId;
    const offsetMinutes = reminder.offsetMinutes || 10;

    const notification = await Notification.create({
        userId: user._id,
        title: "Contest starting soon!",
        message: `Get ready — ${contestName} starts in ${offsetMinutes} minutes.`,
        type: "reminder",
        relatedId: reminder.contestId
    });

    socketService.sendToUser(user._id, "new_notification", {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        contestId: reminder.contestId,
        createdAt: notification.createdAt
    });

    // Email delivery is best-effort: the in-app notification has already been
    // created, so a mail outage must not mark the reminder as failed.
    try {
        await sendReminderEmail({
            to: user.email,
            username: user.username,
            contestName,
            contestUrl: contest?.url,
            startsInMinutes: offsetMinutes
        });
    } catch (emailError) {
        console.error(
            `✉️  Reminder email failed for ${reminder._id}:`,
            emailError.message
        );
    }
};

const processDueReminders = async () => {
    if (isReminderRunRunning) return { skipped: true };
    if (!isDatabaseReady()) return { skipped: true };

    isReminderRunRunning = true;

    try {
        const now = new Date();
        const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);

        const candidates = await Reminder.find({
            scheduledAt: { $lte: now },
            $or: [
                { status: "pending" },
                { status: "processing", updatedAt: { $lte: staleBefore } }
            ]
        })
            .limit(REMINDER_BATCH_SIZE)
            .select({ _id: 1, status: 1 })
            .lean();

        if (candidates.length === 0) return { sent: 0, failed: 0 };

        let sent = 0;
        let failed = 0;

        for (const candidate of candidates) {
            // Claim atomically: only the instance whose update matches proceeds.
            const claimed = await Reminder.findOneAndUpdate(
                { _id: candidate._id, status: candidate.status },
                { $set: { status: "processing" } },
                { returnDocument: "after" }
            ).populate("userId", "email username reminderEnabled");

            if (!claimed) continue;

            try {
                if (claimed.userId?.reminderEnabled === false) {
                    await Reminder.updateOne({ _id: claimed._id }, { $set: { status: "sent" } });
                    continue;
                }

                await dispatchReminder(claimed);
                await Reminder.updateOne({ _id: claimed._id }, { $set: { status: "sent" } });
                sent += 1;
            } catch (error) {
                console.error(`❌ Reminder ${claimed._id} failed:`, error.message);
                await Reminder.updateOne({ _id: claimed._id }, { $set: { status: "failed" } });
                failed += 1;
            }
        }

        return { sent, failed };
    } catch (error) {
        console.error("❌ Reminder processing failed:", error.message);
        return { failed: true, error: error.message };
    } finally {
        isReminderRunRunning = false;
    }
};

/**
 * Register the scheduled jobs.
 *
 * Nothing runs on import: importing a module must never start background work,
 * which previously fired a database sync before the connection existed and made
 * the module unusable from tests.
 */
const start = ({ runImmediately = true } = {}) => {
    if (scheduledTasks.length > 0) {
        return scheduledTasks;
    }

    scheduledTasks.push(
        cron.schedule(SYNC_SCHEDULE, syncContestsToDatabase),
        cron.schedule(REMINDER_SCHEDULE, processDueReminders)
    );

    if (runImmediately) {
        syncContestsToDatabase().catch((error) => {
            console.error("❌ Initial contest sync failed:", error.message);
        });
    }

    console.log("⏱️  Contest cron jobs (sync & reminders) initialised.");

    return scheduledTasks;
};

const stop = async () => {
    await Promise.all(scheduledTasks.map((task) => task.stop()));
    scheduledTasks.length = 0;
};

module.exports = {
    start,
    stop,
    syncContestsToDatabase,
    processDueReminders,
    SYNC_SCHEDULE,
    REMINDER_SCHEDULE
};
