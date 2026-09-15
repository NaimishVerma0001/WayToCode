// server/src/validations/suggestionValidations.js

const { z } = require("zod");

const SUGGESTION_CATEGORIES = ["feature", "content", "ui", "other"];

const createSuggestionSchema = z
    .object({
        authorName: z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters")
            .max(50, "Name cannot exceed 50 characters"),
        title: z
            .string()
            .trim()
            .min(5, "Title must be at least 5 characters")
            .max(100, "Title cannot exceed 100 characters"),
        description: z
            .string()
            .trim()
            .min(10, "Description must be at least 10 characters")
            .max(500, "Description cannot exceed 500 characters"),
        category: z.enum(SUGGESTION_CATEGORIES).optional().default("feature")
    })
    .strict();

module.exports = {
    createSuggestionSchema,
    SUGGESTION_CATEGORIES
};
