const router = require("express").Router();
const controller = require("./post.controller");
const validate = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");
const { writeLimiter } = require("../../middleware/rateLimiter");
const {
  createPostSchema,
  listPostsQuerySchema,
  postIdParamSchema,
} = require("./post.validation");

router.get("/", validate(listPostsQuerySchema, "query"), controller.list);
router.post("/", requireAuth, writeLimiter, validate(createPostSchema), controller.create);
router.get("/:postId", validate(postIdParamSchema, "params"), controller.getOne);
router.post(
  "/:postId/upvote",
  requireAuth,
  writeLimiter,
  validate(postIdParamSchema, "params"),
  controller.upvote
);
router.delete(
  "/:postId",
  requireAuth,
  validate(postIdParamSchema, "params"),
  controller.remove
);

// Reply routes nested under a post — mounted here for /posts/:postId/replies
const replyController = require("../reply/reply.controller");
const { createReplySchema } = require("../reply/reply.validation");

router.get(
  "/:postId/replies",
  validate(postIdParamSchema, "params"),
  replyController.list
);
router.post(
  "/:postId/replies",
  requireAuth,
  writeLimiter,
  validate(postIdParamSchema, "params"),
  validate(createReplySchema),
  replyController.create
);

module.exports = router;
