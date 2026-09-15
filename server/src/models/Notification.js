// server/src/models/Notification.js

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["reminder", "system"],
            default: "reminder"
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true
        },
        relatedId: {
            type: String, // e.g., the contestId
            default: null
        }
    },
    { timestamps: true }
);

// High-performance index for retrieving a user's unread notifications
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);