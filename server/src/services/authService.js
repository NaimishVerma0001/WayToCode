// server/src/services/authService.js

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApplicationError = require("../utils/ApplicationError");

const MINIMUM_PASSWORD_LENGTH = 8;
const MAXIMUM_PASSWORD_LENGTH = 128;
const BCRYPT_ROUNDS = 12;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bcrypt hash of a value nobody can supply. Comparing against it when an
 * account does not exist keeps the failed-login response time roughly constant,
 * so the endpoint cannot be used to enumerate registered accounts.
 */
const DUMMY_PASSWORD_HASH =
    "$2b$12$r2rRn2VCJHVRIieYlcTKKeP8.L.3OYgGZEzSFR2PhL0ytMzOn88ly";

/**
 * Case-insensitive exact matching for usernames, so "Naimish" and "naimish"
 * resolve to the same account. Collation is used instead of a regex because it
 * can still use the username index.
 */
const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 };

const publicUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus || "active",
    createdAt: user.createdAt
});

const assertPassword = (password) => {
    if (typeof password !== "string" || !password) {
        throw new ApplicationError({
            status: 400,
            code: "PASSWORD_REQUIRED",
            field: "password",
            message: "Password is required."
        });
    }

    if (password.length < MINIMUM_PASSWORD_LENGTH) {
        throw new ApplicationError({
            status: 400,
            code: "PASSWORD_TOO_SHORT",
            field: "password",
            message: `Password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`
        });
    }

    if (password.length > MAXIMUM_PASSWORD_LENGTH) {
        throw new ApplicationError({
            status: 400,
            code: "PASSWORD_TOO_LONG",
            field: "password",
            message: `Password cannot exceed ${MAXIMUM_PASSWORD_LENGTH} characters.`
        });
    }
};

const registerUser = async (userData) => {
    const { username, email, password } = userData || {};

    if (typeof username !== "string" || !username.trim()) {
        throw new ApplicationError({
            status: 400,
            code: "USERNAME_REQUIRED",
            field: "username",
            message: "Username is required."
        });
    }

    if (typeof email !== "string" || !email.trim()) {
        throw new ApplicationError({
            status: 400,
            code: "EMAIL_REQUIRED",
            field: "email",
            message: "Email is required."
        });
    }

    assertPassword(password);

    const normalizedUsername = username.trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
        throw new ApplicationError({
            status: 400,
            code: "USERNAME_LENGTH_INVALID",
            field: "username",
            message: "Username must be between 3 and 30 characters."
        });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        throw new ApplicationError({
            status: 400,
            code: "EMAIL_INVALID",
            field: "email",
            message: "Please provide a valid email address."
        });
    }

    const [existingEmail, existingUsername] = await Promise.all([
        User.exists({ email: normalizedEmail }),
        User.findOne({ username: normalizedUsername })
            .collation(CASE_INSENSITIVE_COLLATION)
            .select("_id")
            .lean()
    ]);

    if (existingEmail) {
        throw new ApplicationError({
            status: 409,
            code: "EMAIL_ALREADY_IN_USE",
            field: "email",
            message: "Email already exists."
        });
    }

    if (existingUsername) {
        throw new ApplicationError({
            status: 409,
            code: "USERNAME_ALREADY_IN_USE",
            field: "username",
            message: "Username already exists."
        });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
        const user = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword,
            accountStatus: "active"
        });

        return publicUser(user);
    } catch (error) {
        // The unique index is the source of truth under concurrent signups.
        if (error?.code === 11000) {
            const duplicateField =
                Object.keys(error.keyPattern || {})[0] === "email" ? "email" : "username";

            throw new ApplicationError({
                status: 409,
                code:
                    duplicateField === "email"
                        ? "EMAIL_ALREADY_IN_USE"
                        : "USERNAME_ALREADY_IN_USE",
                field: duplicateField,
                message:
                    duplicateField === "email"
                        ? "Email already exists."
                        : "Username already exists."
            });
        }

        throw error;
    }
};

const loginUser = async ({ username, email, password } = {}) => {
    const identifier = username || email;

    if (typeof identifier !== "string" || !identifier.trim()) {
        throw new ApplicationError({
            status: 400,
            code: "IDENTIFIER_REQUIRED",
            field: "username",
            message: "Username or email is required."
        });
    }

    if (typeof password !== "string" || !password) {
        throw new ApplicationError({
            status: 400,
            code: "PASSWORD_REQUIRED",
            field: "password",
            message: "Password is required."
        });
    }

    const normalizedIdentifier = identifier.trim();

    /*
     * Usernames are stored with their original casing, so matching them must be
     * case-insensitive; otherwise a user who signed up as "Naimish" could never
     * sign in by typing "naimish".
     */
    const user = await User.findOne({
        $or: [
            { email: normalizedIdentifier.toLowerCase() },
            { username: normalizedIdentifier }
        ]
    })
        .collation(CASE_INSENSITIVE_COLLATION)
        .select("+password");

    const invalidCredentials = new ApplicationError({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password."
    });

    if (!user) {
        // Constant-ish work so a missing account is not measurably faster.
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        throw invalidCredentials;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw invalidCredentials;
    }

    if (user.accountStatus === "blocked") {
        throw new ApplicationError({
            status: 403,
            code: "ACCOUNT_BLOCKED",
            message: user.blockedReason
                ? `Your account has been blocked: ${user.blockedReason}`
                : "Your account has been blocked."
        });
    }

    const loginTime = new Date();

    await User.updateOne(
        { _id: user._id },
        {
            $set: { lastLoginAt: loginTime, lastSeenAt: loginTime },
            $inc: { loginCount: 1 }
        }
    );

    return { user: publicUser(user) };
};

const getCurrentUser = async (userId) => {
    const user = await User.findById(userId).select({
        username: 1,
        email: 1,
        role: 1,
        accountStatus: 1,
        blockedReason: 1,
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

    return publicUser(user);
};

/** Refresh "last seen" without blocking the response, used on authenticated reads. */
const touchLastSeen = (userId) =>
    User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } }).catch(() => {});

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser,
    touchLastSeen,
    MINIMUM_PASSWORD_LENGTH,
    MAXIMUM_PASSWORD_LENGTH
};
