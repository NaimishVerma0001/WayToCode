// server/src/validations/plannerValidations.js

const { z } = require("zod");

const PLANNER_CATEGORIES = ["task", "potd", "blocker", "link"];
const PLANNER_STATUSES = ["pending", "in-progress", "completed", "revision"];
const PLANNER_PRIORITIES = ["low", "medium", "high"];

/**
 * Only http(s) links are accepted. Allowing arbitrary schemes would let a user
 * store `javascript:` or `data:` URLs that the client renders as anchors.
 */
const safeUrl = z
    .string()
    .trim()
    .max(2048, "URL cannot exceed 2048 characters")
    .refine(
        (value) => value === "" || /^https?:\/\//i.test(value),
        "URL must start with http:// or https://"
    );

const createPlannerItemSchema = z
    .object({
        category: z.enum(PLANNER_CATEGORIES),
        title: z.string().trim().min(1, "Title is required").max(200),
        description: z.string().trim().max(2000).optional().default(""),
        status: z.enum(PLANNER_STATUSES).optional().default("pending"),
        priority: z.enum(PLANNER_PRIORITIES).optional().default("medium"),
        url: safeUrl.optional().default(""),
        date: z.coerce.date().optional()
    })
    .strict();

const updatePlannerItemSchema = z
    .object({
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).optional(),
        status: z.enum(PLANNER_STATUSES).optional(),
        priority: z.enum(PLANNER_PRIORITIES).optional(),
        url: safeUrl.optional()
    })
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        "Provide at least one field to update."
    );

const plannerQuerySchema = z
    .object({
        category: z.enum(PLANNER_CATEGORIES).optional(),
        status: z.enum(PLANNER_STATUSES).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50)
    })
    .strict();

module.exports = {
    createPlannerItemSchema,
    updatePlannerItemSchema,
    plannerQuerySchema,
    PLANNER_CATEGORIES,
    PLANNER_STATUSES,
    PLANNER_PRIORITIES
};
