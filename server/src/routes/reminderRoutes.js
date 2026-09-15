// server/src/routes/reminderRoutes.js

const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validateMiddleware");
const { setReminderSchema } = require("../validations/reminderValidations");
const {
    setReminder,
    removeReminder,
    listReminders
} = require("../controllers/reminderController");

const router = express.Router();

// Reminders are always scoped to the signed-in user.
router.use(authMiddleware);

router.get("/", listReminders);

// Validation here blocks malformed dates and injected operators before they
// reach Mongoose or the cron job.
router.post("/", validate(setReminderSchema), setReminder);

router.delete("/:contestId", removeReminder);

module.exports = router;
