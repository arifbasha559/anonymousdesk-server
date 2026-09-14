const router = require("express").Router();

router.use("/auth", require("../modules/auth/auth.routes"));
router.use("/posts", require("../modules/post/post.routes"));
router.use("/replies", require("../modules/reply/reply.routes"));
router.use("/notifications", require("../modules/notification/notification.routes"));
router.use("/users", require("../modules/karma/karma.routes"));
router.use("/", require("../modules/report/report.routes")); // /posts/:id/report, /admin/*

module.exports = router;
