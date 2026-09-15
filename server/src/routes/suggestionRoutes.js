// server/src/routes/suggestionRoutes.js

const express = require("express");

const validate = require("../middlewares/validateMiddleware");
const { createSuggestionSchema } = require("../validations/suggestionValidations");
const {
    getSuggestions,
    createSuggestion,
    upvoteSuggestion
} = require("../controllers/suggestionController");

const router = express.Router();

router
    .route("/")
    .get(getSuggestions)
    .post(validate(createSuggestionSchema), createSuggestion);

router.put("/:id/upvote", upvoteSuggestion);

module.exports = router;
