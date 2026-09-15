const validator = require(
    "validator"
);

const ApplicationError = require(
    "../utils/ApplicationError"
);

/*
|--------------------------------------------------------------------------
| Registration Rules
|--------------------------------------------------------------------------
*/

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const OTP_LENGTH = 6;

/*
 * Allows letters, numbers, underscores and hyphens.
 * Allows one optional single space between two username parts.
 */

const USERNAME_PATTERN =
    /^[a-zA-Z0-9_-]+(?: [a-zA-Z0-9_-]+)?$/;

const OTP_PATTERN =
    new RegExp(
        `^\\d{${OTP_LENGTH}}$`
    );

const MONGO_OBJECT_ID_PATTERN =
    /^[a-fA-F0-9]{24}$/;

/*
|--------------------------------------------------------------------------
| Error Factory
|--------------------------------------------------------------------------
*/

const throwValidationError = ({
    code,
    field,
    message
}) => {
    throw new ApplicationError({
        status: 400,
        code,
        field,
        message
    });
};

/*
|--------------------------------------------------------------------------
| Registration Details Validation
|--------------------------------------------------------------------------
*/

const validateRegistrationDetails = (
    input
) => {
    const data =
        input &&
        typeof input === "object" &&
        !Array.isArray(input)
            ? input
            : {};

    const username =
        typeof data.username ===
        "string"
            ? data.username.trim()
            : "";

    const email =
        typeof data.email ===
        "string"
            ? data.email
                .trim()
                .toLowerCase()
            : "";

    const password =
        typeof data.password ===
        "string"
            ? data.password
            : "";

    const confirmPassword =
        typeof data.confirmPassword ===
        "string"
            ? data.confirmPassword
            : "";

    /*
    |--------------------------------------------------------------------------
    | Username
    |--------------------------------------------------------------------------
    */

    if (!username) {
        throwValidationError({
            code:
                "USERNAME_REQUIRED",
            field: "username",
            message:
                "Username is required."
        });
    }

    if (
        username.length <
            USERNAME_MIN_LENGTH ||
        username.length >
            USERNAME_MAX_LENGTH
    ) {
        throwValidationError({
            code:
                "USERNAME_LENGTH_INVALID",
            field: "username",
            message:
                (
                    "Username must be " +
                    `between ${USERNAME_MIN_LENGTH} ` +
                    `and ${USERNAME_MAX_LENGTH} ` +
                    "characters."
                )
        });
    }

    if (
        !USERNAME_PATTERN.test(
            username
        )
    ) {
        throwValidationError({
            code:
                "USERNAME_FORMAT_INVALID",
            field: "username",
            message:
                (
                    "Username may contain letters, " +
                    "numbers, underscores and hyphens, " +
                    "with one optional single space " +
                    "between two parts."
                )
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Email
    |--------------------------------------------------------------------------
    */

    if (!email) {
        throwValidationError({
            code:
                "EMAIL_REQUIRED",
            field: "email",
            message:
                "Email address is required."
        });
    }

    if (
        email.length > 254 ||
        !validator.isEmail(email, {
            allow_utf8_local_part:
                false,
            require_tld: true
        })
    ) {
        throwValidationError({
            code:
                "EMAIL_FORMAT_INVALID",
            field: "email",
            message:
                "Enter a valid email address."
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Password
    |--------------------------------------------------------------------------
    */

    if (!password) {
        throwValidationError({
            code:
                "PASSWORD_REQUIRED",
            field: "password",
            message:
                "Password is required."
        });
    }

    if (
        password.length <
        PASSWORD_MIN_LENGTH
    ) {
        throwValidationError({
            code:
                "PASSWORD_TOO_SHORT",
            field: "password",
            message:
                (
                    "Password must contain at " +
                    `least ${PASSWORD_MIN_LENGTH} ` +
                    "characters."
                )
        });
    }

    if (
        Buffer.byteLength(
            password,
            "utf8"
        ) > PASSWORD_MAX_BYTES
    ) {
        throwValidationError({
            code:
                "PASSWORD_TOO_LONG",
            field: "password",
            message:
                (
                    "Password cannot exceed " +
                    `${PASSWORD_MAX_BYTES} bytes.`
                )
        });
    }

    if (!/[a-z]/.test(password)) {
        throwValidationError({
            code:
                "PASSWORD_LOWERCASE_REQUIRED",
            field: "password",
            message:
                (
                    "Password must contain at " +
                    "least one lowercase letter."
                )
        });
    }

    if (!/[A-Z]/.test(password)) {
        throwValidationError({
            code:
                "PASSWORD_UPPERCASE_REQUIRED",
            field: "password",
            message:
                (
                    "Password must contain at " +
                    "least one uppercase letter."
                )
        });
    }

    if (!/\d/.test(password)) {
        throwValidationError({
            code:
                "PASSWORD_NUMBER_REQUIRED",
            field: "password",
            message:
                (
                    "Password must contain at " +
                    "least one number."
                )
        });
    }

    if (
        !/[^a-zA-Z0-9\s]/.test(
            password
        )
    ) {
        throwValidationError({
            code:
                "PASSWORD_SPECIAL_REQUIRED",
            field: "password",
            message:
                (
                    "Password must contain at " +
                    "least one special character."
                )
        });
    }

    if (/\s/.test(password)) {
        throwValidationError({
            code:
                "PASSWORD_WHITESPACE_INVALID",
            field: "password",
            message:
                "Password cannot contain spaces."
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Confirm Password
    |--------------------------------------------------------------------------
    */

    if (!confirmPassword) {
        throwValidationError({
            code:
                "CONFIRM_PASSWORD_REQUIRED",
            field:
                "confirmPassword",
            message:
                "Confirm your password."
        });
    }

    if (
        password !==
        confirmPassword
    ) {
        throwValidationError({
            code:
                "PASSWORDS_DO_NOT_MATCH",
            field:
                "confirmPassword",
            message:
                "Passwords do not match."
        });
    }

    return {
        username,
        usernameKey:
            username.toLocaleLowerCase(
                "en-US"
            ),
        email,
        password
    };
};

/*
|--------------------------------------------------------------------------
| OTP Verification Validation
|--------------------------------------------------------------------------
*/

const validateOtpVerification = (
    input
) => {
    const data =
        input &&
        typeof input === "object" &&
        !Array.isArray(input)
            ? input
            : {};

    const registrationId =
        typeof data.registrationId ===
        "string"
            ? data.registrationId.trim()
            : "";

    const otp =
        typeof data.otp === "string"
            ? data.otp.trim()
            : "";

    if (
        !MONGO_OBJECT_ID_PATTERN.test(
            registrationId
        )
    ) {
        throwValidationError({
            code:
                "REGISTRATION_ID_INVALID",
            field: "otp",
            message:
                (
                    "The registration session " +
                    "is invalid. Start again."
                )
        });
    }

    if (!OTP_PATTERN.test(otp)) {
        throwValidationError({
            code:
                "OTP_FORMAT_INVALID",
            field: "otp",
            message:
                (
                    `Enter the ${OTP_LENGTH}-digit ` +
                    "verification code."
                )
        });
    }

    return {
        registrationId,
        otp
    };
};

/*
|--------------------------------------------------------------------------
| OTP Resend Validation
|--------------------------------------------------------------------------
*/

const validateOtpResend = (
    input
) => {
    const data =
        input &&
        typeof input === "object" &&
        !Array.isArray(input)
            ? input
            : {};

    const registrationId =
        typeof data.registrationId ===
        "string"
            ? data.registrationId.trim()
            : "";

    if (
        !MONGO_OBJECT_ID_PATTERN.test(
            registrationId
        )
    ) {
        throwValidationError({
            code:
                "REGISTRATION_ID_INVALID",
            field: "otp",
            message:
                (
                    "The registration session " +
                    "is invalid. Start again."
                )
        });
    }

    return {
        registrationId
    };
};

module.exports = {
    validateRegistrationDetails,
    validateOtpVerification,
    validateOtpResend,

    USERNAME_PATTERN,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_BYTES,
    OTP_LENGTH
};