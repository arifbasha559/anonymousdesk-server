const router = require("express").Router();
const controller = require("./karma.controller");
const { requireAuth } = require("../../middleware/auth");

router.get("/me/karma", requireAuth, controller.getMyKarma);
router.get("/me/profile", requireAuth, controller.getMyProfile);

module.exports = router;
