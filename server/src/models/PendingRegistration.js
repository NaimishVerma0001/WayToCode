const mongoose = require(
    "mongoose"
);

/*
|--------------------------------------------------------------------------
| Pending Registration Schema
|--------------------------------------------------------------------------
|
| Stores only temporary registration data. A real User is created only
| after the email OTP has been verified successfully.
|
*/

const pendingRegistrationSchema =
    new mongoose.Schema(
        {
            username: {
                type: String,
                required: true,
                trim: true,
                minlength: 3,
                maxlength: 30
            },

            usernameKey: {
                type: String,
                required: true,
                trim: true,
                lowercase: true
            },

            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true
            },

            passwordHash: {
                type: String,
                required: true,
                select: false
            },

            otpHash: {
                type: String,
                required: true,
                select: false
            },

            otpExpiresAt: {
                type: Date,
                required: true
            },

            otpAttempts: {
                type: Number,
                default: 0,
                min: 0
            },

            resendAvailableAt: {
                type: Date,
                required: true
            },

            expiresAt: {
                type: Date,
                required: true
            }
        },
        {
            timestamps: true
        }
    );

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

pendingRegistrationSchema.index(
    {
        email: 1
    },
    {
        unique: true
    }
);

pendingRegistrationSchema.index(
    {
        usernameKey: 1
    },
    {
        unique: true
    }
);

/*
 * MongoDB automatically removes abandoned registrations after expiresAt.
 * The registration service will still validate expiry explicitly because
 * TTL cleanup is asynchronous.
 */

pendingRegistrationSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0
    }
);

/*
|--------------------------------------------------------------------------
| Sensitive Data Protection
|--------------------------------------------------------------------------
*/

pendingRegistrationSchema.set(
    "toJSON",
    {
        transform: (
            document,
            returnedObject
        ) => {
            delete returnedObject.passwordHash;
            delete returnedObject.otpHash;
            delete returnedObject.__v;

            return returnedObject;
        }
    }
);

module.exports =
    mongoose.model(
        "PendingRegistration",
        pendingRegistrationSchema
    );