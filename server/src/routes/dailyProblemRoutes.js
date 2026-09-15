const express = require("express");

const dailyProblemController = require(
    "../controllers/dailyProblemController"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Daily Problem Routes
|--------------------------------------------------------------------------
*/

// Public route because no user-specific data is exposed.
router.get(
    "/",
    dailyProblemController.getDailyProblems
);

module.exports = router;