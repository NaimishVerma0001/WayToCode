// server/src/controllers/suggestionController.js

const crypto = require("crypto");
const mongoose = require("mongoose");
const Suggestion = require("../models/Suggestion");
const catchAsync = require("../utils/catchAsync");
const ApplicationError = require("../utils/ApplicationError");

const PUBLIC_FIELDS = {
    authorName: 1,
    title: 1,
    description: 1,
    category: 1,
    upvotes: 1,
    status: 1,
    createdAt: 1,
    updatedAt: 1
};

/**
 * Upvote de-duplication key.
 *
 * The raw address is never stored: it is salted with JWT_SECRET and hashed, so
 * the collection holds no personal data while still blocking repeat votes.
 * `req.ip` is used rather than a raw X-Forwarded-For header because Express
 * resolves it against the configured trust-proxy hop count.
 */
const createVoterKey = (req) => {
    const address = req.ip || req.socket?.remoteAddress || "unknown-client";

    return crypto
        .createHmac("sha256", process.env.JWT_SECRET || "way2code-suggestions")
        .update(String(address))
        .digest("hex");
};

// @desc    List public suggestions
// @route   GET /api/suggestions
// @access  Public
const getSuggestions = catchAsync(async (req, res) => {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);

    const query = {};

    if (["feature", "content", "ui", "other"].includes(req.query.category)) {
        query.category = req.query.category;
    }

    const [suggestions, total] = await Promise.all([
        Suggestion.find(query, PUBLIC_FIELDS)
            .sort({ upvotes: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Suggestion.countDocuments(query)
    ]);

    return res.status(200).json({
        success: true,
        data: suggestions,
        meta: {
            totalItems: total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        }
    });
});

// @desc    Submit a public suggestion
// @route   POST /api/suggestions
// @access  Public
const createSuggestion = catchAsync(async (req, res) => {
    // Only whitelisted fields are forwarded: `upvotes` and `status` must never
    // be settable from a public request body.
    const { authorName, title, description, category } = req.body;

    const created = await Suggestion.create({
        authorName,
        title,
        description,
        category: category || "feature"
    });

    return res.status(201).json({
        success: true,
        data: {
            id: created._id,
            authorName: created.authorName,
            title: created.title,
            description: created.description,
            category: created.category,
            upvotes: created.upvotes,
            status: created.status,
            createdAt: created.createdAt
        }
    });
});

// @desc    Upvote a suggestion
// @route   PUT /api/suggestions/:id/upvote
// @access  Public
const upvoteSuggestion = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApplicationError({
            status: 404,
            code: "SUGGESTION_NOT_FOUND",
            message: "Suggestion not found."
        });
    }

    const voterKey = createVoterKey(req);

    /*
     * One conditional update does the duplicate check and the increment
     * together, so concurrent clicks cannot both pass a read-then-write check.
     */
    const updated = await Suggestion.findOneAndUpdate(
        { _id: id, upvotedIPs: { $ne: voterKey } },
        { $inc: { upvotes: 1 }, $addToSet: { upvotedIPs: voterKey } },
        { returnDocument: "after", projection: PUBLIC_FIELDS }
    ).lean();

    if (!updated) {
        const exists = await Suggestion.exists({ _id: id });

        if (!exists) {
            throw new ApplicationError({
                status: 404,
                code: "SUGGESTION_NOT_FOUND",
                message: "Suggestion not found."
            });
        }

        throw new ApplicationError({
            status: 409,
            code: "ALREADY_UPVOTED",
            message: "You have already upvoted this suggestion."
        });
    }

    return res.status(200).json({ success: true, data: updated });
});

module.exports = {
    getSuggestions,
    createSuggestion,
    upvoteSuggestion
};
