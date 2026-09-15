// server/src/routes/adminRoutes.js

const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/adminMiddleware");
const adminActionRateLimit = require("../middlewares/adminActionRateLimit");
const adminController = require("../controllers/adminController");

const router = express.Router();

// Authentication first, then authorisation: both apply to every route below.
router.use(authMiddleware, requireAdmin);

router.get("/overview", adminController.getOverview);
router.get("/users", adminController.getUsers);
router.get("/users/:userId", adminController.getUserById);
router.get("/audit-logs", adminController.getAuditLogs);

// Account-state changes are audited and additionally throttled per administrator.
router.patch("/users/:userId/block", adminActionRateLimit, adminController.blockUser);
router.patch("/users/:userId/unblock", adminActionRateLimit, adminController.unblockUser);

module.exports = router;
