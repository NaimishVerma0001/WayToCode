// server/src/models/PlannerItem.js

const mongoose = require("mongoose");

const plannerItemSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        index: true 
    },
    category: { 
        type: String, 
        enum: ["task", "potd", "blocker", "link"], 
        required: true 
    },
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    description: { 
        type: String, 
        trim: true 
    },
    status: { 
        type: String, 
        enum: ["pending", "in-progress", "completed", "revision"], 
        default: "pending" 
    },
    priority: { 
        type: String, 
        enum: ["low", "medium", "high"], 
        default: "medium" 
    },
    url: { 
        type: String, 
        trim: true 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model("PlannerItem", plannerItemSchema);