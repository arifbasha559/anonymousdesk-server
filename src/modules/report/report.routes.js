const router = require("express").Router();
const controller = require("./report.controller");
const validate = require("../../middleware/validate");
const { requireAuth, requireFreshUser, requireTrustLevel } = require("../../middleware/auth");
const { postIdParamSchema } = require("../post/post.validation");
const { replyIdParamSchema } = require("../reply/reply.validation");
const {
  createReportSchema,
  resolveReportSchema,
  reportIdParamSchema,
  banUserSchema,
  anonIdParamSchema,
  listReportsQuerySchema,
} = require("./report.validation");

// ── User-facing ──
router.post(
  "/posts/:postId/report",
  requireAuth,
  validate(postIdParamSchema, "params"),
  validate(createReportSchema),
  controller.reportPost
);
router.post(
  "/replies/:replyId/report",
  requireAuth,
  validate(replyIdParamSchema, "params"),
  validate(createReportSchema),
  controller.reportReply
);

// ── Admin-only (Expert trust level, freshly verified) ──
const adminGuard = [requireAuth, requireFreshUser, requireTrustLevel("expert")];

router.get(
  "/admin/reports",
  ...adminGuard,
  validate(listReportsQuerySchema, "query"),
  controller.list
);
router.patch(
  "/admin/reports/:reportId/resolve",
  ...adminGuard,
  validate(reportIdParamSchema, "params"),
  validate(resolveReportSchema),
  controller.resolve
);
router.post(
  "/admin/users/:anonId/ban",
  ...adminGuard,
  validate(anonIdParamSchema, "params"),
  validate(banUserSchema),
  controller.ban
);

module.exports = router;
