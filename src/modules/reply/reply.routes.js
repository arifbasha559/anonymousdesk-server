const router = require("express").Router();
const controller = require("./reply.controller");
const validate = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");
const { writeLimiter } = require("../../middleware/rateLimiter");
const { replyIdParamSchema } = require("./reply.validation");

router.post(
  "/:replyId/helpful",
  requireAuth,
  writeLimiter,
  validate(replyIdParamSchema, "params"),
  controller.markHelpful
);
router.delete(
  "/:replyId",
  requireAuth,
  validate(replyIdParamSchema, "params"),
  controller.remove
);

module.exports = router;
