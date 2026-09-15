const registrationService = require(
    "../services/registrationService"
);

/*
|--------------------------------------------------------------------------
| Operational Error Response
|--------------------------------------------------------------------------
*/

const sendOperationalError = (
    error,
    res,
    next
) => {
    /*
     * Unexpected programming or infrastructure errors are delegated to the
     * global error handler. Only explicitly operational errors are converted
     * into detailed client responses here.
     */

    if (!error?.isOperational) {
        return next(error);
    }

    const responseBody = {
        success: false,

        code:
            error.code ||
            "REGISTRATION_FAILED",

        message:
            error.message
    };

    if (error.field) {
        responseBody.field =
            error.field;
    }

    if (error.details) {
        responseBody.details =
            error.details;
    }

    return res
        .status(
            error.status || 400
        )
        .json(responseBody);
};

/*
|--------------------------------------------------------------------------
| Request Registration OTP
|--------------------------------------------------------------------------
*/

const requestOtp = async (
    req,
    res,
    next
) => {
    try {
        const registration =
            await registrationService
                .requestRegistrationOtp(
                    req.body
                );

        return res
            .status(202)
            .json({
                success: true,

                code:
                    "REGISTRATION_OTP_SENT",

                message:
                    (
                        "A verification code " +
                        "has been sent to your " +
                        "email address."
                    ),

                data:
                    registration
            });
    } catch (error) {
        return sendOperationalError(
            error,
            res,
            next
        );
    }
};

/*
|--------------------------------------------------------------------------
| Verify Registration OTP
|--------------------------------------------------------------------------
*/

const verifyOtp = async (
    req,
    res,
    next
) => {
    try {
        const user =
            await registrationService
                .verifyRegistrationOtp(
                    req.body
                );

        return res
            .status(201)
            .json({
                success: true,

                code:
                    "REGISTRATION_COMPLETED",

                message:
                    (
                        "Email verified. Your " +
                        "Way2Code account has " +
                        "been created successfully."
                    ),

                data: user
            });
    } catch (error) {
        return sendOperationalError(
            error,
            res,
            next
        );
    }
};

/*
|--------------------------------------------------------------------------
| Resend Registration OTP
|--------------------------------------------------------------------------
*/

const resendOtp = async (
    req,
    res,
    next
) => {
    try {
        const registration =
            await registrationService
                .resendRegistrationOtp(
                    req.body
                );

        return res
            .status(200)
            .json({
                success: true,

                code:
                    "REGISTRATION_OTP_RESENT",

                message:
                    (
                        "A new verification " +
                        "code has been sent."
                    ),

                data:
                    registration
            });
    } catch (error) {
        return sendOperationalError(
            error,
            res,
            next
        );
    }
};

module.exports = {
    requestOtp,
    verifyOtp,
    resendOtp
};