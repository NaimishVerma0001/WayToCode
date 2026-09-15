// server/src/controllers/adminController.js

const adminService = require("../services/adminService");
const catchAsync = require("../utils/catchAsync");

/**
 * Metadata recorded on every privileged action so the audit trail can answer
 * "who did this, from where, and which request was it".
 */
const buildRequestMetadata = (req) => ({
    requestId: req.id || "",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500)
});

// @route  GET /api/admin/overview
const getOverview = catchAsync(async (req, res) => {
    const overview = await adminService.getOverview({
        forceRefresh: req.query.refresh === "true"
    });

    return res.status(200).json({ success: true, data: overview });
});

// @route  GET /api/admin/users
const getUsers = catchAsync(async (req, res) => {
    const result = await adminService.getUsers({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        status: req.query.status,
        role: req.query.role,
        activity: req.query.activity,
        sort: req.query.sort
    });

    return res.status(200).json({ success: true, data: result });
});

// @route  GET /api/admin/users/:userId
const getUserById = catchAsync(async (req, res) => {
    const user = await adminService.getUserById(req.params.userId);

    return res.status(200).json({ success: true, data: user });
});

// @route  PATCH /api/admin/users/:userId/block
const blockUser = catchAsync(async (req, res) => {
    const result = await adminService.blockUser({
        administratorId: req.user._id,
        targetUserId: req.params.userId,
        reason: req.body?.reason,
        requestMetadata: buildRequestMetadata(req)
    });

    return res.status(200).json({
        success: true,
        message: "The account has been blocked.",
        data: result
    });
});

// @route  PATCH /api/admin/users/:userId/unblock
const unblockUser = catchAsync(async (req, res) => {
    const result = await adminService.unblockUser({
        administratorId: req.user._id,
        targetUserId: req.params.userId,
        reason: req.body?.reason,
        requestMetadata: buildRequestMetadata(req)
    });

    return res.status(200).json({
        success: true,
        message: "The account has been unblocked.",
        data: result
    });
});

// @route  GET /api/admin/audit-logs
const getAuditLogs = catchAsync(async (req, res) => {
    const result = await adminService.getAuditLogs({
        page: req.query.page,
        limit: req.query.limit,
        action: req.query.action,
        targetUserId: req.query.targetUserId || null
    });

    return res.status(200).json({ success: true, data: result });
});

module.exports = {
    getOverview,
    getUsers,
    getUserById,
    blockUser,
    unblockUser,
    getAuditLogs
};
