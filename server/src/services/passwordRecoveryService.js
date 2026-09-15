const crypto = require(
    "crypto"
);

const bcrypt = require(
    "bcryptjs"
);

const User = require(
    "../models/User"
);

const {
    sendPasswordResetEmail
} = require(
    "./emailService"
);

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const RESET_TOKEN_DURATION =
    15 * 60 * 1000;

const RESET_TOKEN_BYTES = 32;

/*
|--------------------------------------------------------------------------
| Error Helper
|--------------------------------------------------------------------------
*/

const createRecoveryError = (
    message,
    status = 400,
    code =
        "PASSWORD_RECOVERY_FAILED"
) => {
    const error =
        new Error(message);

    error.status = status;
    error.code = code;

    return error;
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeEmail = (
    email
) => {
    if (
        typeof email !== "string" ||
        !email.trim()
    ) {
        throw createRecoveryError(
            "Email address is required.",
            400,
            "EMAIL_REQUIRED"
        );
    }

    const normalizedEmail =
        email
            .toLowerCase()
            .trim();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !emailPattern.test(
            normalizedEmail
        )
    ) {
        throw createRecoveryError(
            "Please provide a valid email address.",
            400,
            "INVALID_EMAIL"
        );
    }

    return normalizedEmail;
};

const validatePassword = (
    password
) => {
    if (
        typeof password !== "string" ||
        !password
    ) {
        throw createRecoveryError(
            "A new password is required.",
            400,
            "PASSWORD_REQUIRED"
        );
    }

    if (password.length < 8) {
        throw createRecoveryError(
            "Password must contain at least 8 characters.",
            400,
            "PASSWORD_TOO_SHORT"
        );
    }

    if (password.length > 128) {
        throw createRecoveryError(
            "Password cannot exceed 128 characters.",
            400,
            "PASSWORD_TOO_LONG"
        );
    }
};

const hashResetToken = (
    token
) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

const createResetUrl = (
    rawToken
) => {
    const clientUrl = (
        process.env.CLIENT_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");

    return (
        `${clientUrl}/reset-password` +
        `?token=${encodeURIComponent(
            rawToken
        )}`
    );
};

/*
|--------------------------------------------------------------------------
| Request Password Reset
|--------------------------------------------------------------------------
*/

const requestPasswordReset =
    async (
        email
    ) => {
        const normalizedEmail =
            normalizeEmail(email);

        const user =
            await User.findOne({
                email:
                    normalizedEmail
            }).select({
                username: 1,
                email: 1,
                accountStatus: 1
            });

        /*
        |--------------------------------------------------------------------------
        | Email Enumeration Protection
        |--------------------------------------------------------------------------
        |
        | The same successful result is returned whether the account exists
        | or not. The controller must keep the response message generic.
        |
        */

        if (!user) {
            /*
             * Perform a small cryptographic operation so missing accounts do
             * not return significantly faster than existing accounts.
             */

            crypto
                .createHash("sha256")
                .update(
                    normalizedEmail
                )
                .digest("hex");

            return {
                requested: true
            };
        }

        /*
         * Do not issue reset links for blocked accounts, but preserve the
         * same public response to avoid exposing the account status.
         */

        if (
            user.accountStatus ===
            "blocked"
        ) {
            return {
                requested: true
            };
        }

        const rawToken =
            crypto
                .randomBytes(
                    RESET_TOKEN_BYTES
                )
                .toString("hex");

        const hashedToken =
            hashResetToken(
                rawToken
            );

        const expiresAt =
            new Date(
                Date.now() +
                RESET_TOKEN_DURATION
            );

        await User.updateOne(
            {
                _id: user._id
            },
            {
                $set: {
                    resetPasswordToken:
                        hashedToken,

                    resetPasswordExpiresAt:
                        expiresAt
                }
            }
        );

        const resetUrl =
            createResetUrl(
                rawToken
            );

        try {
            await sendPasswordResetEmail({
                to: user.email,

                username:
                    user.username,

                resetUrl,

                expiresInMinutes:
                    RESET_TOKEN_DURATION /
                    60000
            });
        } catch (error) {
            /*
             * Remove the token if delivery fails so an undelivered reset
             * credential is never left active in the database.
             */

            await User.updateOne(
                {
                    _id: user._id,

                    resetPasswordToken:
                        hashedToken
                },
                {
                    $set: {
                        resetPasswordToken:
                            null,

                        resetPasswordExpiresAt:
                            null
                    }
                }
            );

            console.error(
                "Password reset email failed:",
                error.message
            );

            throw createRecoveryError(
                "Password recovery is temporarily unavailable. Please try again later.",
                503,
                "RESET_EMAIL_FAILED"
            );
        }

        return {
            requested: true
        };
    };

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

const resetPassword =
    async ({
        token,
        password
    } = {}) => {
        if (
            typeof token !== "string" ||
            !token.trim()
        ) {
            throw createRecoveryError(
                "The password reset token is required.",
                400,
                "RESET_TOKEN_REQUIRED"
            );
        }

        validatePassword(
            password
        );

        const normalizedToken =
            token.trim();

        /*
         * A 32-byte token encoded as hexadecimal contains 64 characters.
         */

        if (
            !/^[a-f0-9]{64}$/i.test(
                normalizedToken
            )
        ) {
            throw createRecoveryError(
                "This password reset link is invalid or has expired.",
                400,
                "INVALID_RESET_TOKEN"
            );
        }

        const hashedToken =
            hashResetToken(
                normalizedToken
            );

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        const passwordChangedAt =
            new Date();

        /*
        |--------------------------------------------------------------------------
        | Atomic Single-Use Update
        |--------------------------------------------------------------------------
        |
        | Matching and clearing the reset token in one query prevents the same
        | reset link from succeeding twice during concurrent requests.
        |
        */

        const updatedUser =
            await User.findOneAndUpdate(
                {
                    resetPasswordToken:
                        hashedToken,

                    resetPasswordExpiresAt: {
                        $gt: new Date()
                    },

                    accountStatus: {
                        $ne: "blocked"
                    }
                },
                {
                    $set: {
                        password:
                            hashedPassword,

                        passwordChangedAt,

                        resetPasswordToken:
                            null,

                        resetPasswordExpiresAt:
                            null,

                        lastLoginAt: null
                    }
                },
                {
                    returnDocument:
                        "after",

                    runValidators: true
                }
            ).select({
                username: 1,
                email: 1,
                passwordChangedAt: 1
            });

        if (!updatedUser) {
            throw createRecoveryError(
                "This password reset link is invalid or has expired.",
                400,
                "INVALID_RESET_TOKEN"
            );
        }

        return {
            reset: true,

            passwordChangedAt:
                updatedUser
                    .passwordChangedAt
        };
    };

module.exports = {
    requestPasswordReset,   
    resetPassword
};