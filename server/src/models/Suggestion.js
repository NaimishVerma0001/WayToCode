// server/src/models/Suggestion.js

const mongoose = require("mongoose");

const suggestionSchema = new mongoose.Schema({
    authorName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    category: {
        type: String,
        enum: ["feature", "content", "ui", "other"],
        default: "feature"
    },
    upvotes: {
        type: Number,
        default: 0
    },
    upvotedIPs: {
        type: [String], // Prevents spam/multiple upvotes from the same user session/IP
        default: []
    },
    status: {
        type: String,
        enum: ["under-review", "planned", "in-progress", "completed"],
        default: "under-review"
    }
}, { timestamps: true });

module.exports = mongoose.model("Suggestion", suggestionSchema);