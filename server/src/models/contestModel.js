const mongoose = require("mongoose");
const { getContestStatus, getContestCountdown } = require("../utils/dateUtils");

const contestSchema = new mongoose.Schema({
    contestId: { 
        type: String, 
        required: true, 
        unique: true // Prevents scraper from inserting duplicates
    },
    platform: { 
        type: String, 
        required: true 
    },
    contestName: { 
        type: String, 
        required: true 
    },
    startTime: { 
        type: Date, 
        required: true 
    },
    duration: { 
        type: Number, // in minutes
        required: true 
    },
    url: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String 
    }
}, { 
    timestamps: true,
    // Enable strict mode to drop unmapped fields protecting against payload injection
    strict: true 
});

/*
|--------------------------------------------------------------------------
| Database Indexes (OOM & CPU Protection)
|--------------------------------------------------------------------------
| These indexes force MongoDB to use B-Trees instead of scanning every 
| document in the collection.
*/

// 1. Used by getUpcomingContests() for pagination and fast sorting
contestSchema.index({ startTime: 1 });

// 2. Used by the platform aggregation pipeline to group counts instantly
contestSchema.index({ platform: 1 });

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
| These replace your ES6 constructor logic. Virtuals compute dynamically 
| when the document is requested, meaning they don't consume database space.
*/
contestSchema.virtual("status").get(function () {
    return getContestStatus(this.startTime, this.duration);
});

contestSchema.virtual("countdown").get(function () {
    return getContestCountdown(this.startTime);
});

// Ensure virtuals are included when converting the Mongoose document to JSON
contestSchema.set("toJSON", { virtuals: true });
contestSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Contest", contestSchema);