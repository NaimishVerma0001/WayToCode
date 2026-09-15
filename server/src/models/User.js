// server/src/models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            trim: true,
            minlength: 3,
            maxlength: 30,
            // `unique` already creates the index; adding `index: true` would
            // declare it twice and trigger a Mongoose duplicate-index warning.
            unique: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            unique: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
            select: false
        },
        codingProfiles: {
            leetcode: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            },
            codeforces: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            },
            codechef: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            },
            atcoder: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            },
            geeksforgeeks: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            },
            hackerrank: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            },
            github: {
                username: { type: String, default: "" },
                connected: { type: Boolean, default: false },
                success: { type: Boolean, default: false },
                lastFetched: { type: Date, default: null },
                error: { type: String, default: "" },
                data: { type: mongoose.Schema.Types.Mixed, default: null }
            }
        },
        favouritePlatforms: {
            type: [String],
            default: []
        },
        reminderEnabled: {
            type: Boolean,
            default: true
        },
        reminderOffset: {
            type: Number,
            enum: [10, 60, 1440],
            default: 10
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true
        },
        accountStatus: {
            type: String,
            enum: ["active", "blocked"],
            default: "active",
            index: true
        },
        blockedAt: {
            type: Date,
            default: null
        },
        blockedReason: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },
        blockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        lastLoginAt: {
            type: Date,
            default: null
        },
        lastSeenAt: {
            type: Date,
            default: null,
            index: true
        },
        /*
         * Reset tokens are stored hashed and are never selected by default, so
         * they cannot leak through a generic user lookup.
         */
        loginCount: {
            type: Number,
            default: 0,
            min: 0
        },
        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
            index: true
        },
        resetPasswordExpiresAt: {
            type: Date,
            default: null,
            select: false
        },
        passwordChangedAt: {
            type: Date,
            default: null
        },
        potdStreak: { 
            type: Number, 
            default: 0 
        },
        lastPotdCompletedDate: { 
            type: Date, 
            default: null 
        },
        badges: [{
            badgeId: { type: String, required: true },
            unlockedAt: { type: Date, default: Date.now }
        }]
    },
    {
        timestamps: true
    }
);

userSchema.index({ accountStatus: 1, createdAt: -1 });
userSchema.index({ role: 1, accountStatus: 1 });

userSchema.set("toJSON", {
    transform: (document, returnedObject) => {
        delete returnedObject.password;
        delete returnedObject.__v;
        return returnedObject;
    }
});

module.exports = mongoose.model("User", userSchema);