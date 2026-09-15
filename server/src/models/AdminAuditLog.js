const mongoose = require(
    "mongoose"
);

/*
|--------------------------------------------------------------------------
| Admin Audit Log Schema
|--------------------------------------------------------------------------
*/

const adminAuditLogSchema =
    new mongoose.Schema(
        {
            administrator: {
                type:
                    mongoose.Schema.Types
                        .ObjectId,

                ref: "User",

                required: true,

                immutable: true,

                index: true
            },

            targetUser: {
                type:
                    mongoose.Schema.Types
                        .ObjectId,

                ref: "User",

                required: true,

                immutable: true,

                index: true
            },

            action: {
                type: String,

                enum: [
                    "USER_BLOCKED",
                    "USER_UNBLOCKED",
                    "USER_ROLE_CHANGED"
                ],

                required: true,

                immutable: true,

                index: true
            },

            reason: {
                type: String,

                trim: true,

                maxlength: 500,

                default: "",

                immutable: true
            },

            previousValue: {
                type:
                    mongoose.Schema.Types
                        .Mixed,

                default: null,

                immutable: true
            },

            newValue: {
                type:
                    mongoose.Schema.Types
                        .Mixed,

                default: null,

                immutable: true
            },

            requestMetadata: {
                requestId: {
                    type: String,
                    default: "",
                    immutable: true
                },

                userAgent: {
                    type: String,
                    maxlength: 500,
                    default: "",
                    immutable: true
                }
            }
        },
        {
            timestamps: {
                createdAt: true,
                updatedAt: false
            },

            versionKey: false
        }
    );

/*
|--------------------------------------------------------------------------
| Query Indexes
|--------------------------------------------------------------------------
*/

adminAuditLogSchema.index({
    createdAt: -1
});

adminAuditLogSchema.index({
    administrator: 1,
    createdAt: -1
});

adminAuditLogSchema.index({
    targetUser: 1,
    createdAt: -1
});

adminAuditLogSchema.index({
    action: 1,
    createdAt: -1
});

module.exports =
    mongoose.model(
        "AdminAuditLog",
        adminAuditLogSchema
    );