const dailyProblemService = require(
    "../services/dailyProblemService"
);

/*
|--------------------------------------------------------------------------
| Get Daily Problems
|--------------------------------------------------------------------------
|
| GET /api/daily-problems
| GET /api/daily-problems?refresh=true
|
*/

const getDailyProblems = async (
    req,
    res,
    next
) => {
    try {
        const forceRefresh =
            req.query.refresh === "true";

        const result =
            await dailyProblemService
                .getDailyProblems({
                    forceRefresh
                });

        return res.status(200).json({
            success: true,

            message:
                "Daily problems fetched successfully.",

            total: result.total,

            date: result.date,

            cached: result.cached,

            partialFailure:
                result.partialFailure,

            failedProviders:
                result.failedProviders,

            updatedAt:
                result.updatedAt,

            data: result.problems
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getDailyProblems
};