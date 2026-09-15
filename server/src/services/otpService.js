const crypto = require(
    "crypto"
);

const ApplicationError = require(
    "../utils/ApplicationError"
);

const {
    OTP_LENGTH
} = require(
    "../validators/registrationValidator"
);

/*
|--------------------------------------------------------------------------
| OTP Configuration
|--------------------------------------------------------------------------
*/

const OTP_MINIMUM =
    10 ** (OTP_LENGTH - 1);

const OTP_MAXIMUM =
    10 ** OTP_LENGTH;

/*
|--------------------------------------------------------------------------
| OTP Secret
|--------------------------------------------------------------------------
*/

const getOtpSecret = () => {
    const secret =
        process.env
            .REGISTRATION_OTP_SECRET;

    if (
        typeof secret !== "string" ||
        secret.length < 32
    ) {
        throw new ApplicationError({
            status: 500,

            code:
                "OTP_CONFIGURATION_MISSING",

            message:
                (
                    "Registration verification " +
                    "is temporarily unavailable."
                )
        });
    }

    return secret;
};

/*
|--------------------------------------------------------------------------
| Generate OTP
|--------------------------------------------------------------------------
*/

const generateOtp = () => {
    /*
     * crypto.randomInt() avoids the predictability and modulo bias of
     * Math.random(). The first digit is never zero.
     */

    return crypto
        .randomInt(
            OTP_MINIMUM,
            OTP_MAXIMUM
        )
        .toString();
};

/*
|--------------------------------------------------------------------------
| Hash OTP
|--------------------------------------------------------------------------
*/

const hashOtp = (
    otp
) => {
    if (
        typeof otp !== "string" ||
        !new RegExp(
            `^\\d{${OTP_LENGTH}}$`
        ).test(otp)
    ) {
        throw new ApplicationError({
            status: 500,

            code:
                "OTP_GENERATION_FAILED",

            message:
                (
                    "Registration verification " +
                    "could not be prepared."
                )
        });
    }

    return crypto
        .createHmac(
            "sha256",
            getOtpSecret()
        )
        .update(otp, "utf8")
        .digest("hex");
};

/*
|--------------------------------------------------------------------------
| Constant-Time OTP Comparison
|--------------------------------------------------------------------------
*/

const verifyOtp = (
    candidateOtp,
    storedOtpHash
) => {
    if (
        typeof candidateOtp !==
            "string" ||
        typeof storedOtpHash !==
            "string"
    ) {
        return false;
    }

    let candidateHash;

    try {
        candidateHash =
            hashOtp(candidateOtp);
    } catch {
        return false;
    }

    const candidateBuffer =
        Buffer.from(
            candidateHash,
            "hex"
        );

    const storedBuffer =
        Buffer.from(
            storedOtpHash,
            "hex"
        );

    if (
        candidateBuffer.length === 0 ||
        candidateBuffer.length !==
            storedBuffer.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        candidateBuffer,
        storedBuffer
    );
};

module.exports = {
    generateOtp,
    hashOtp,
    verifyOtp
};