const express = require("express");

const router = express.Router();

const profileController = require(
    "../controllers/profileController"
);

const authMiddleware = require(
    "../middlewares/authMiddleware"
);

/*
|--------------------------------------------------------------------------
| Profile Routes
|--------------------------------------------------------------------------
*/

// Get the logged-in user's profile
router.get(
    "/",
    authMiddleware,
    profileController.getProfile
);

// Update general profile information
router.put(
    "/",
    authMiddleware,
    profileController.updateProfile
);

// Update coding-platform usernames
router.put(
    "/coding-profiles",
    authMiddleware,
    profileController.updateCodingProfiles
);

module.exports = router;