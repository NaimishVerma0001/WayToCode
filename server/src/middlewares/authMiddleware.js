// server/src/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");

/** Fields the request handlers need. Heavy blobs stay out of every request. */
const AUTHENTICATED_USER_FIELDS = {
    username: 1,
    email: 1,
    role: 1,
    accountStatus: 1,
    blockedReason: 1,
    codingProfiles: 1,
    favouritePlatforms: 1,
    reminderEnabled: 1,
    reminderOffset: 1,
    passwordChangedAt: 1,
    potdStreak: 1,
    lastPotdCompletedDate: 1,
    badges: 1,
    createdAt: 1,
    updatedAt: 1
};

const deny = (res, status, code, message) =>
    res.status(status).json({ success: false, code, message });

const extractToken = (req) => {
    const authorizationHeader = req.headers.authorization;

    let token = null;

    if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
        token = authorizationHeader.slice(7);
    } else if (typeof req.headers["x-auth-token"] === "string") {
        token = req.headers["x-auth-token"];
    } else if (typeof req.headers.token === "string") {
        token = req.headers.token;
    }

    if (typeof token !== "string") return null;

    // Tolerate clients that persist the token as a JSON string.
    return token.trim().replace(/^"(.*)"$/, "$1") || null;
};

const authMiddleware = async (req, res, next) => {
    if (req.method === "OPTIONS") return next();

    const token = extractToken(req);

    if (!token) {
        return deny(res, 401, "NO_TOKEN", "Access denied. No token provided.");
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return deny(res, 401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again.");
        }

        return deny(res, 401, "INVALID_TOKEN", "Invalid token.");
    }

    // Refresh tokens must never be accepted as access tokens.
    if (decoded.type && decoded.type !== "access") {
        return deny(res, 401, "INVALID_TOKEN", "Invalid token.");
    }

    const isRevoked = await BlacklistedToken.exists({ token });

    if (isRevoked) {
        return deny(
            res,
            401,
            "TOKEN_REVOKED",
            "This session has been terminated. Please log in again."
        );
    }

    const userId = decoded.id || decoded._id;

    // A forged subject must be rejected as an auth failure, not surface as a
    // Mongoose CastError further down the stack.
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return deny(res, 401, "INVALID_TOKEN", "Invalid token.");
    }

    const user = await User.findById(userId).select(AUTHENTICATED_USER_FIELDS);

    if (!user) {
        return deny(res, 401, "USER_NOT_FOUND", "User not found.");
    }

    /*
     * A password reset must invalidate every token issued beforehand,
     * otherwise a stolen token survives the reset that was meant to stop it.
     */
    if (user.passwordChangedAt && decoded.iat) {
        const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);

        if (decoded.iat < changedAtSeconds) {
            return deny(
                res,
                401,
                "PASSWORD_CHANGED",
                "Your password was changed. Please sign in again."
            );
        }
    }

    // A blocked account must lose API access immediately, not at token expiry.
    if (user.accountStatus === "blocked") {
        return deny(
            res,
            403,
            "ACCOUNT_BLOCKED",
            user.blockedReason
                ? `Your account has been blocked: ${user.blockedReason}`
                : "Your account has been blocked."
        );
    }

    req.user = user;
    req.userId = user._id;
    req.token = token;
    req.tokenExpiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;

    return next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.AUTHENTICATED_USER_FIELDS = AUTHENTICATED_USER_FIELDS;
