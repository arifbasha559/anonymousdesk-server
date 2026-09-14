const { z } = require("zod");
const prisma = require("../../config/prisma");
const { success } = require("../../utils/apiResponse");

const listNotifQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

const notifIdParamSchema = z.object({ notificationId: z.string().uuid() });

async function list(userId, { page, limit, unreadOnly }) {
  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { notifications, unreadCount };
}

async function markRead(userId, notificationId) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

async function markAllRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return result.count;
}

// ── Controller ──
const controller = {
  async list(req, res, next) {
    try {
      const result = await list(req.user.id, req.query);
      return success(res, result.notifications, 200, { unreadCount: result.unreadCount });
    } catch (err) {
      next(err);
    }
  },
  async markRead(req, res, next) {
    try {
      await markRead(req.user.id, req.params.notificationId);
      return success(res, { status: "read" });
    } catch (err) {
      next(err);
    }
  },
  async markAllRead(req, res, next) {
    try {
      const count = await markAllRead(req.user.id);
      return success(res, { status: "all_read", count });
    } catch (err) {
      next(err);
    }
  },
};

// ── Routes ──
const router = require("express").Router();
const validate = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");

router.get("/", requireAuth, validate(listNotifQuerySchema, "query"), controller.list);
router.patch(
  "/:notificationId/read",
  requireAuth,
  validate(notifIdParamSchema, "params"),
  controller.markRead
);
router.patch("/read-all", requireAuth, controller.markAllRead);

module.exports = router;
