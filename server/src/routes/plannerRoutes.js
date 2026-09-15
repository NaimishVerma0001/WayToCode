// server/src/routes/plannerRoutes.js

const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validateMiddleware");

const {
    createPlannerItemSchema,
    updatePlannerItemSchema,
    plannerQuerySchema
} = require("../validations/plannerValidations");

const {
    getPlannerItems,
    createPlannerItem,
    updatePlannerItem,
    deletePlannerItem
} = require("../controllers/plannerController");

const router = express.Router();

// Every planner item belongs to exactly one user, so nothing here is public.
router.use(authMiddleware);

router
    .route("/")
    .get(validate(plannerQuerySchema, "query"), getPlannerItems)
    .post(validate(createPlannerItemSchema), createPlannerItem);

router
    .route("/:id")
    .put(validate(updatePlannerItemSchema), updatePlannerItem)
    .delete(deletePlannerItem);

module.exports = router;
