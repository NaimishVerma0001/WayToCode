// server/src/controllers/contestController.js

const ContestModel = require("../models/contestModel");
const catchAsync = require("../utils/catchAsync");
const { getLastUpdated } = require("../cache/contestCache");
const { getContestStatus, getContestCountdown } = require("../utils/dateUtils");

const DEFAULT_PAGE_SIZE = 20;
const MAXIMUM_PAGE_SIZE = 50;

/**
 * `.lean()` returns plain objects for memory efficiency, which means Mongoose
 * virtuals are not evaluated. `status` and `countdown` are therefore computed
 * here; relying on the virtuals alone left both fields undefined in every
 * response from this endpoint.
 */
const decorateContest = (contest, now) => ({
    ...contest,
    status: getContestStatus(contest.startTime, contest.duration, now),
    countdown: getContestCountdown(contest.startTime, now)
});

const getUpcomingContests = catchAsync(async (req, res) => {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 1),
        MAXIMUM_PAGE_SIZE
    );

    const now = new Date();
    const upcomingFilter = { startTime: { $gt: now } };

    // One round trip for the page, the total and the per-platform counts.
    const [contests, totalItems, platformCounts] = await Promise.all([
        ContestModel.find(upcomingFilter)
            .sort({ startTime: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),

        ContestModel.countDocuments(upcomingFilter),

        // Aggregating in the database beats loading every document to count them.
        ContestModel.aggregate([
            { $match: upcomingFilter },
            { $group: { _id: "$platform", count: { $sum: 1 } } }
        ])
    ]);

    const platforms = platformCounts.reduce((totals, entry) => {
        totals[entry._id || "Unknown"] = entry.count;
        return totals;
    }, {});

    return res.status(200).json({
        success: true,
        total: contests.length,
        cached: false,
        lastUpdated: getLastUpdated(),
        platforms,
        data: contests.map((contest) => decorateContest(contest, now)),
        meta: {
            totalItems,
            page,
            limit,
            totalPages: Math.max(Math.ceil(totalItems / limit), 1)
        }
    });
});

module.exports = {
    getUpcomingContests
};
