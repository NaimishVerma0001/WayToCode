// server/src/controllers/authController.js

const jwt = require("jsonwebtoken");
const authService = require("../services/authService");
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");
const catchAsync = require("../utils/catchAsync");
const ApplicationError = require("../utils/ApplicationError");

const REFRESH_COOKIE_NAME = "refreshToken";

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookie flags are resolved per request rather than once at module load so the
 * behaviour is correct in tests, in local development and behind Render's proxy.
 */
const getCookieOptions = () => {
    const isSecureContext =
        process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

    return {
        httpOnly: true,
        secure: isSecureContext,
        // The SPA is served from a different origin in production, which
        // requires SameSite=None; that in turn requires Secure.
        sameSite: isSecureContext ? "none" : "lax",
        path: "/",
        maxAge: REFRESH_COOKIE_MAX_AGE_MS
    };
};

const signAccessToken = (user) =>
    jwt.sign(
        { id: String(user.id || user._id), role: user.role, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

const signRefreshToken = (user) =>
    jwt.sign(
        { id: String(user.id || user._id), type: "refresh" },
        process.env.JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_TTL }
    );

/**
 * Record a token as revoked until its natural expiry. The TTL index on
 * `expiresAt` removes the row automatically, so the collection stays small.
 */
const revokeToken = async (token) => {
    if (!token) return;

    let expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);

    try {
        const decoded = jwt.decode(token);

        if (decoded?.exp) {
            expiresAt = new Date(decoded.exp * 1000);
        }
    } catch {
        // A token we cannot decode is still worth blacklisting defensively.
    }

    await BlacklistedToken.updateOne(
        { token },
        { $setOnInsert: { token, expiresAt } },
        { upsert: true }
    ).catch((error) => {
        // Never fail a logout because the blacklist write raced with itself.
        if (error?.code !== 11000) throw error;
    });
};

const register = catchAsync(async (req, res) => {
    const user = await authService.registerUser(req.body);

    return res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: user
    });
});

const login = catchAsync(async (req, res) => {
    const { user } = await authService.loginUser(req.body);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

    return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: { token: accessToken, user }
    });
});

const refreshToken = catchAsync(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
        throw new ApplicationError({
            status: 401,
            code: "NO_REFRESH_TOKEN",
            message: "No refresh token provided."
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOptions(), maxAge: undefined });

        throw new ApplicationError({
            status: 401,
            code: "INVALID_REFRESH_TOKEN",
            message: "Your session has expired. Please sign in again."
        });
    }

    // An access token must never be redeemable as a refresh token.
    if (decoded.type !== "refresh") {
        throw new ApplicationError({
            status: 401,
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid refresh token."
        });
    }

    if (await BlacklistedToken.exists({ token })) {
        throw new ApplicationError({
            status: 401,
            code: "TOKEN_REVOKED",
            message: "This session has been terminated. Please log in again."
        });
    }

    const user = await User.findById(decoded.id).select({
        username: 1,
        email: 1,
        role: 1,
        accountStatus: 1,
        passwordChangedAt: 1,
        createdAt: 1
    });

    if (!user) {
        throw new ApplicationError({
            status: 401,
            code: "USER_NOT_FOUND",
            message: "User not found."
        });
    }

    if (user.accountStatus === "blocked") {
        throw new ApplicationError({
            status: 403,
            code: "ACCOUNT_BLOCKED",
            message: "Your account has been blocked."
        });
    }

    // A password reset invalidates refresh tokens issued before it.
    if (
        user.passwordChangedAt &&
        decoded.iat &&
        decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
        throw new ApplicationError({
            status: 401,
            code: "PASSWORD_CHANGED",
            message: "Your password was changed. Please sign in again."
        });
    }

    return res.status(200).json({
        success: true,
        data: { token: signAccessToken(user) }
    });
});

const logout = catchAsync(async (req, res) => {
    /*
     * A logout that only clears client state is not a logout: the access token
     * stays valid until expiry. Both tokens are revoked server-side here.
     */
    await Promise.all([
        revokeToken(req.token),
        revokeToken(req.cookies?.[REFRESH_COOKIE_NAME])
    ]);

    res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOptions(), maxAge: undefined });

    return res.status(200).json({
        success: true,
        message: "Logged out securely."
    });
});

const getCurrentUser = catchAsync(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);

    authService.touchLastSeen(req.user._id);

    return res.status(200).json({ success: true, data: user });
});

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getCurrentUser,
    revokeToken,
    signAccessToken,
    signRefreshToken,
    REFRESH_COOKIE_NAME
};
