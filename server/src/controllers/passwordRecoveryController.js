const passwordRecoveryService =
    require(
        "../services/passwordRecoveryService"
    );

/*
|--------------------------------------------------------------------------
| Request Password Reset
|--------------------------------------------------------------------------
|
| POST /api/auth/forgot-password
|
*/

const forgotPassword = async (
    req,
    res,
    next
) => {
    try {
        await passwordRecoveryService
            .requestPasswordReset(
                req.body?.email
            );

        /*
         * Prevent browsers and proxies from caching recovery responses.
         */

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        return res
            .status(202)
            .json({
                success: true,

                message:
                    "If an account exists for that email address, password reset instructions have been sent."
            });
    } catch (error) {
        return next(error);
    }
};

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
|
| POST /api/auth/reset-password
|
*/

const resetPassword = async (
    req,
    res,
    next
) => {
    try {
        const {
            token,
            password,
            confirmPassword
        } = req.body || {};

        if (
            confirmPassword !==
                undefined &&
            password !==
                confirmPassword
        ) {
            const mismatchError =
                new Error(
                    "Password confirmation does not match."
                );

            mismatchError.status = 400;
            mismatchError.code =
                "PASSWORD_MISMATCH";

            throw mismatchError;
        }

        const result =
            await passwordRecoveryService
                .resetPassword({
                    token,
                    password
                });

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        return res
            .status(200)
            .json({
                success: true,

                message:
                    "Password reset successfully. You can now sign in with your new password.",

                data: result
            });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    forgotPassword,
    resetPassword
};