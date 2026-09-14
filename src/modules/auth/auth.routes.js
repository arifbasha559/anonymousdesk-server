const router = require("express").Router();
const controller = require("./auth.controller");
const validate = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateIndustrySchema,
} = require("./auth.validation");

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/token/refresh", authLimiter, validate(refreshSchema), controller.refresh);
router.post("/token/revoke", requireAuth, controller.revoke);
router.patch(
  "/profile/industry",
  requireAuth,
  validate(updateIndustrySchema),
  controller.updateIndustry
);

module.exports = router;
