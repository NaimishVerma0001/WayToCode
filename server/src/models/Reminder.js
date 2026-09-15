const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    contestId: { 
        type: String, 
        required: true 
    },
    scheduledAt: { 
        type: Date, 
        required: true 
    },
    offsetMinutes: { 
        type: Number, 
        default: 10 
    },
    status: { 
        type: String, 
        enum: ["pending", "processing", "sent", "failed"], 
        default: "pending" 
    }
}, { timestamps: true });

/*
|--------------------------------------------------------------------------
| Database Indexes
|--------------------------------------------------------------------------
*/

// 1. Highly optimized index for the cron job polling to execute instantly
reminderSchema.index({ status: 1, scheduledAt: 1 });

// 2. Ensure a user can only have one active reminder per contest
reminderSchema.index({ userId: 1, contestId: 1 }, { unique: true });

// 3. CRITICAL NEW INDEX: Used by the Dashboard's $lookup aggregation
// Without this, the dashboard will cause a 100% CPU spike on large datasets
reminderSchema.index({ userId: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);