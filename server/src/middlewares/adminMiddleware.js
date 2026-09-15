// server/src/middlewares/adminMiddleware.js

/**
 * Authorisation guard for administrator-only routes.
 * Must run after `authMiddleware`, which is what populates `req.user`.
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication is required."
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            code: "ADMIN_REQUIRED",
            message: "Access denied. Administrator privileges required."
        });
    }

    return next();
};

module.exports = { requireAdmin };
module.exports.requireAdmin = requireAdmin;
