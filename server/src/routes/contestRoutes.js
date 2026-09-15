const express = require("express");
const router = express.Router();

const contestController = require("../controllers/contestController");

// Fetch all upcoming contests
router.get("/", contestController.getUpcomingContests);

module.exports = router;