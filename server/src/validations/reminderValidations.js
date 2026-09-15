const { z } = require("zod");

const setReminderSchema = z.object({
    contestId: z.string().min(1, "Contest ID is required"),
    // Ensures the date is a valid ISO 8601 string, preventing database casting errors
    contestStartTime: z.string().datetime({ message: "Invalid ISO datetime string" }),
    // Prevents attackers from sending negative offsets or strings that crash the cron job
    offsetMinutes: z.number().int().min(1).max(1440).optional().default(10)
}).strict();

module.exports = {
    setReminderSchema
};