const mongoose = require("mongoose");

const blacklistedTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    // The expires: 0 index tells MongoDB to automatically delete this document 
    // when the current time reaches the expiresAt Date.
    expiresAt: {
        type: Date,
        required: true,
        expires: 0 
    }
});

module.exports = mongoose.model("BlacklistedToken", blacklistedTokenSchema);