const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Platform Progress
|--------------------------------------------------------------------------
|
| A platform can expose different metrics. Problem-solving platforms use
| problemsSolved, competitive platforms can also expose ratings, and
| GitHub uses contributions.
|
*/

const platformProgressSchema =
    new mongoose.Schema(
        {
            connected: {
                type: Boolean,
                default: false
            },

            available: {
                type: Boolean,
                default: false
            },

            username: {
                type: String,
                trim: true,
                default: ""
            },

            problemsSolved: {
                type: Number,
                min: 0,
                default: 0
            },

            currentRating: {
                type: Number,
                min: 0,
                default: 0
            },

            maximumRating: {
                type: Number,
                min: 0,
                default: 0
            },

            contributions: {
                type: Number,
                min: 0,
                default: 0
            },

            contestsParticipated: {
                type: Number,
                min: 0,
                default: 0
            }
        },
        {
            _id: false
        }
    );

/*
|--------------------------------------------------------------------------
| Daily Progress Snapshot
|--------------------------------------------------------------------------
|
| Only one snapshot is stored for each user on a particular UTC day.
| Refreshing the dashboard later on the same day updates that snapshot.
|
*/

const progressSnapshotSchema =
    new mongoose.Schema(
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true
            },

            dayKey: {
                type: String,
                required: true,
                match: /^\d{4}-\d{2}-\d{2}$/
            },

            recordedAt: {
                type: Date,
                required: true,
                default: Date.now
            },

            platforms: {
                leetcode: {
                    type: platformProgressSchema,
                    default: () => ({})
                },

                codeforces: {
                    type: platformProgressSchema,
                    default: () => ({})
                },

                codechef: {
                    type: platformProgressSchema,
                    default: () => ({})
                },

                geeksforgeeks: {
                    type: platformProgressSchema,
                    default: () => ({})
                },

                hackerrank: {
                    type: platformProgressSchema,
                    default: () => ({})
                },

                atcoder: {
                    type: platformProgressSchema,
                    default: () => ({})
                },

                github: {
                    type: platformProgressSchema,
                    default: () => ({})
                }
            },

            totals: {
                problemsSolved: {
                    type: Number,
                    min: 0,
                    default: 0
                },

                contributions: {
                    type: Number,
                    min: 0,
                    default: 0
                },

                connectedPlatforms: {
                    type: Number,
                    min: 0,
                    default: 0
                },

                availablePlatforms: {
                    type: Number,
                    min: 0,
                    default: 0
                }
            },

            source: {
                type: String,
                enum: [
                    "dashboard",
                    "refresh",
                    "scheduled"
                ],
                default: "dashboard"
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

// Prevent duplicate daily snapshots for the same user.
progressSnapshotSchema.index(
    {
        user: 1,
        dayKey: 1
    },
    {
        unique: true
    }
);

// Efficient 7-day, 30-day and 90-day history queries.
progressSnapshotSchema.index({
    user: 1,
    recordedAt: -1
});

module.exports = mongoose.model(
    "ProgressSnapshot",
    progressSnapshotSchema
);