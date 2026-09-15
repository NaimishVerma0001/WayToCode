// server/src/services/registrationService.js

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const ApplicationError = require("../utils/ApplicationError");
const { generateOtp, hashOtp, verifyOtp } = require("./otpService");
const { sendRegistrationOtpEmail, sendWelcomeEmail } = require("./emailService");
const {
    validateRegistrationDetails,
    validateOtpVerification,
    validateOtpResend
} = require("../validators/registrationValidator");

/*
|--------------------------------------------------------------------------
| Registration Configuration
|--------------------------------------------------------------------------
*/
const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const REGISTRATION_EXPIRY_MINUTES = 30;
const REGISTRATION_EXPIRY_MS = REGISTRATION_EXPIRY_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
const MAX_OTP_ATTEMPTS = 5;
const DEFAULT_BCRYPT_ROUNDS = 12;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
const getBcryptRounds = () => {
    const configuredRounds = Number(process.env.BCRYPT_ROUNDS);
    if (Number.isInteger(configuredRounds) && configuredRounds >= 10 && configuredRounds <= 14) {
        return configuredRounds;
    }
    return DEFAULT_BCRYPT_ROUNDS;
};

const maskEmail = (email) => {
    const [localPart, domain] = String(email).split("@");
    if (!localPart || !domain) return "";

    const visibleCharacters = localPart.length <= 2 ? 1 : 2;
    const visiblePrefix = localPart.slice(0, visibleCharacters);
    const hiddenLength = Math.max(localPart.length - visibleCharacters, 3);

    return visiblePrefix + "*".repeat(hiddenLength) + "@" + domain;
};

const createDuplicateError = (field) => {
    if (field === "email") {
        return new ApplicationError({
            status: 409,
            code: "EMAIL_ALREADY_IN_USE",
            field: "email",
            message: "This email is already registered. Sign in or reset your password."
        });
    }
    return new ApplicationError({
        status: 409,
        code: "USERNAME_ALREADY_IN_USE",
        field: "username",
        message: "This username is already in use. Choose another one."
    });
};

const mapDuplicateKeyError = (error) => {
    if (error?.code !== 11000) return null;

    const duplicateField = Object.keys(error.keyPattern || {})[0] || Object.keys(error.keyValue || {})[0] || "";
    if (duplicateField === "email") return createDuplicateError("email");
    return createDuplicateError("username");
};

const assertVerifiedAccountDoesNotExist = async ({ email, username }) => {
    const [existingEmail, existingUsername] = await Promise.all([
        User.exists({ email }),
        User.findOne({ username }).collation({ locale: "en", strength: 2 }).select("_id").lean()
    ]);

    if (existingEmail) throw createDuplicateError("email");
    if (existingUsername) throw createDuplicateError("username");
};

const createExpiredRegistrationError = () => new ApplicationError({
    status: 410,
    code: "REGISTRATION_EXPIRED",
    field: "otp",
    message: "Your registration session has expired. Start again."
});

const createOtpAttemptsError = () => new ApplicationError({
    status: 429,
    code: "OTP_ATTEMPTS_EXCEEDED",
    field: "otp",
    message: "Too many incorrect codes. Request a new verification code."
});

const createDeliveryError = (cause) => new ApplicationError({
    status: 503,
    code: "REGISTRATION_EMAIL_DELIVERY_FAILED",
    field: "email",
    message: "We could not send the verification email. Try again.",
    cause
});

/*
|--------------------------------------------------------------------------
| Request Registration OTP
|--------------------------------------------------------------------------
*/
const requestRegistrationOtp = async (registrationData) => {
    const { username, usernameKey, email, password } = validateRegistrationDetails(registrationData);

    await assertVerifiedAccountDoesNotExist({ email, username });

    const now = new Date();

    // Prevent TTL race conditions by explicitly nuking expired docs
    await PendingRegistration.deleteMany({
        expiresAt: { $lte: now },
        $or: [{ email }, { usernameKey }]
    });

    const conflictingPending = await PendingRegistration.findOne({
        usernameKey,
        email: { $ne: email },
        expiresAt: { $gt: now }
    }).select("_id").lean();

    if (conflictingPending) throw createDuplicateError("username");

    const [passwordHash, otp] = await Promise.all([
        bcrypt.hash(password, getBcryptRounds()),
        Promise.resolve(generateOtp())
    ]);

    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_MS);
    const expiresAt = new Date(now.getTime() + REGISTRATION_EXPIRY_MS);

    let pendingRegistration;
    try {
        pendingRegistration = await PendingRegistration.findOneAndUpdate(
            { email },
            {
                $set: {
                    username,
                    usernameKey,
                    email,
                    passwordHash,
                    otpHash,
                    otpExpiresAt,
                    otpAttempts: 0,
                    resendAvailableAt,
                    expiresAt
                }
            },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        const duplicateError = mapDuplicateKeyError(error);
        if (duplicateError) throw duplicateError;
        throw error;
    }

    try {
        const delivery = await sendRegistrationOtpEmail({
            to: email,
            username,
            otp,
            expiresInMinutes: OTP_EXPIRY_MINUTES
        });

        return {
            registrationId: pendingRegistration._id.toString(),
            email: maskEmail(email),
            expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
            resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
            developmentMode: Boolean(delivery?.developmentMode)
        };
    } catch (error) {
        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
        throw createDeliveryError(error);
    }
};

/*
|--------------------------------------------------------------------------
| Verify Registration OTP
|--------------------------------------------------------------------------
*/
const verifyRegistrationOtp = async (verificationData) => {
    const { registrationId, otp } = validateOtpVerification(verificationData);
    const now = new Date();

    const pendingRegistration = await PendingRegistration.findById(registrationId).select("+otpHash");

    if (!pendingRegistration || pendingRegistration.expiresAt <= now) {
        if (pendingRegistration) {
            await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
        }
        throw createExpiredRegistrationError();
    }

    if (pendingRegistration.otpAttempts >= MAX_OTP_ATTEMPTS) {
        // Enforce hard lockout by deleting state immediately.
        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
        throw createOtpAttemptsError();
    }

    if (pendingRegistration.otpExpiresAt <= now) {
        throw new ApplicationError({
            status: 410,
            code: "OTP_EXPIRED",
            field: "otp",
            message: "This verification code has expired. Request a new code."
        });
    }

    const otpIsValid = verifyOtp(otp, pendingRegistration.otpHash);

    if (!otpIsValid) {
        const updatedRegistration = await PendingRegistration.findOneAndUpdate(
            { _id: pendingRegistration._id, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
            { $inc: { otpAttempts: 1 } },
            { returnDocument: "after" }
        );

        const attemptsUsed = updatedRegistration?.otpAttempts ?? MAX_OTP_ATTEMPTS;
        const attemptsRemaining = Math.max(MAX_OTP_ATTEMPTS - attemptsUsed, 0);

        if (attemptsRemaining === 0) {
            // Document reached max attempts, purge it to prevent DB bloat.
            await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
            throw createOtpAttemptsError();
        }

        throw new ApplicationError({
            status: 400,
            code: "OTP_INCORRECT",
            field: "otp",
            message: "The verification code is incorrect.",
            details: { attemptsRemaining }
        });
    }

    // Atomically claim and remove the valid pending registration.
    const claimedRegistration = await PendingRegistration.findOneAndDelete({
        _id: pendingRegistration._id,
        otpHash: pendingRegistration.otpHash,
        otpExpiresAt: { $gt: now },
        expiresAt: { $gt: now },
        otpAttempts: { $lt: MAX_OTP_ATTEMPTS }
    }).select("+passwordHash");

    if (!claimedRegistration) {
        throw new ApplicationError({
            status: 409,
            code: "OTP_ALREADY_USED",
            field: "otp",
            message: "This verification code has already been used."
        });
    }

    try {
        // Rely purely on MongoDB's native unique constraints to prevent race conditions. 
        // Do not query the DB via assertVerifiedAccountDoesNotExist here.
        const user = await User.create({
            username: claimedRegistration.username,
            email: claimedRegistration.email,
            password: claimedRegistration.passwordHash,
            accountStatus: "active"
        });

        // Fire-and-forget the welcome email.
        sendWelcomeEmail({ to: user.email, username: user.username }).catch((emailError) => {
            console.error("Welcome email delivery failed:", {
                userId: user._id.toString(),
                code: emailError.code || "WELCOME_EMAIL_DELIVERY_FAILED",
                message: emailError.message
            });
        });

        return {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus,
            createdAt: user.createdAt
        };
    } catch (error) {
        const duplicateError = mapDuplicateKeyError(error);
        if (duplicateError) throw duplicateError;
        throw error;
    }
};

/*
|--------------------------------------------------------------------------
| Resend Registration OTP
|--------------------------------------------------------------------------
*/
const resendRegistrationOtp = async (resendData) => {
    const { registrationId } = validateOtpResend(resendData);
    const now = new Date();

    const registration = await PendingRegistration.findById(registrationId);

    if (!registration || registration.expiresAt <= now) {
        if (registration) {
            await PendingRegistration.deleteOne({ _id: registration._id });
        }
        throw createExpiredRegistrationError();
    }

    await assertVerifiedAccountDoesNotExist({ email: registration.email, username: registration.username });

    if (registration.resendAvailableAt > now) {
        const retryAfterSeconds = Math.max(Math.ceil((registration.resendAvailableAt - now) / 1000), 1);
        throw new ApplicationError({
            status: 429,
            code: "OTP_RESEND_TOO_SOON",
            field: "otp",
            message: "Please wait before requesting another code.",
            details: { retryAfterSeconds }
        });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_MS);

    // Atomically reserve the resend to prevent concurrent dispatch logic.
    const updatedRegistration = await PendingRegistration.findOneAndUpdate(
        {
            _id: registration._id,
            resendAvailableAt: { $lte: now },
            expiresAt: { $gt: now }
        },
        {
            $set: {
                otpHash,
                otpExpiresAt,
                resendAvailableAt,
                otpAttempts: 0
            }
        },
        { returnDocument: "after" }
    );

    if (!updatedRegistration) {
        throw new ApplicationError({
            status: 409,
            code: "OTP_RESEND_CONFLICT",
            field: "otp",
            message: "A new verification code was already requested."
        });
    }

    try {
        const delivery = await sendRegistrationOtpEmail({
            to: updatedRegistration.email,
            username: updatedRegistration.username,
            otp,
            expiresInMinutes: OTP_EXPIRY_MINUTES
        });

        return {
            registrationId: updatedRegistration._id.toString(),
            email: maskEmail(updatedRegistration.email),
            expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
            resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
            developmentMode: Boolean(delivery?.developmentMode)
        };
    } catch (error) {
        await PendingRegistration.updateOne(
            { _id: updatedRegistration._id },
            { $set: { resendAvailableAt: new Date() } }
        );
        throw createDeliveryError(error);
    }
};

module.exports = {
    requestRegistrationOtp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    OTP_EXPIRY_MINUTES,
    RESEND_COOLDOWN_SECONDS,
    MAX_OTP_ATTEMPTS
};