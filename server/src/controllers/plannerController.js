// server/src/controllers/plannerController.js

const mongoose = require("mongoose");
const PlannerItem = require("../models/PlannerItem");
const catchAsync = require("../utils/catchAsync");
const ApplicationError = require("../utils/ApplicationError");

const notFound = () =>
    new ApplicationError({
        status: 404,
        code: "PLANNER_ITEM_NOT_FOUND",
        message: "Planner item not found."
    });

const assertValidId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw notFound();
    }
};

// @desc    List the signed-in user's planner items
// @route   GET /api/planner
// @access  Private
const getPlannerItems = catchAsync(async (req, res) => {
    const { category, status, page, limit } = req.validatedQuery;

    const query = { user: req.user._id };

    if (category) query.category = category;
    if (status) query.status = status;

    const [items, total] = await Promise.all([
        PlannerItem.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        PlannerItem.countDocuments(query)
    ]);

    return res.status(200).json({
        success: true,
        data: items,
        meta: {
            totalItems: total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        }
    });
});

// @desc    Create a planner item
// @route   POST /api/planner
// @access  Private
const createPlannerItem = catchAsync(async (req, res) => {
    const newItem = await PlannerItem.create({
        ...req.body,
        // The owner always comes from the session, never from the payload.
        user: req.user._id
    });

    return res.status(201).json({ success: true, data: newItem });
});

// @desc    Update a planner item
// @route   PUT /api/planner/:id
// @access  Private
const updatePlannerItem = catchAsync(async (req, res) => {
    assertValidId(req.params.id);

    // Scoping the filter by user makes this both the lookup and the
    // authorisation check, so one user can never edit another user's item.
    const updated = await PlannerItem.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { $set: req.body },
        { returnDocument: "after", runValidators: true }
    );

    if (!updated) throw notFound();

    return res.status(200).json({ success: true, data: updated });
});

// @desc    Delete a planner item
// @route   DELETE /api/planner/:id
// @access  Private
const deletePlannerItem = catchAsync(async (req, res) => {
    assertValidId(req.params.id);

    const deleted = await PlannerItem.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
    });

    if (!deleted) throw notFound();

    return res.status(200).json({
        success: true,
        message: "Item deleted successfully."
    });
});

module.exports = {
    getPlannerItems,
    createPlannerItem,
    updatePlannerItem,
    deletePlannerItem
};
