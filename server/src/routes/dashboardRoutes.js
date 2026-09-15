const express = require("express");

const router = express.Router();

const dashboardController = require(
    "../controllers/dashboardController"
);

const authMiddleware = require(
    "../middlewares/authMiddleware"
);

/*
|--------------------------------------------------------------------------
| Dashboard Routes
|--------------------------------------------------------------------------
*/

// Get progress history for the logged-in user
router.get(
    "/progress",
    authMiddleware,
    dashboardController
        .getProgressHistory
);

// Get complete dashboard for the logged-in user
router.get(
    "/",
    authMiddleware,
    dashboardController
        .getDashboard
);

module.exports = router;