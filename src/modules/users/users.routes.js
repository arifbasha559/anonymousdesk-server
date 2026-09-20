const router = require("express").Router();
const prisma = require("../../config/prisma");
const { requireAuth } = require("../../middleware/auth");
const { success } = require("../../utils/apiResponse");

router.post("/me/push-token", requireAuth, async (req, res, next) => {
  try {
    const { pushToken } = req.body || {};
    if (!pushToken) return success(res, { status: "missing_push_token" }, 400);
    await prisma.user.update({ where: { id: req.user.id }, data: { pushToken } });
    return success(res, { status: "ok" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
