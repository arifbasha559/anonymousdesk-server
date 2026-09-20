const { Worker } = require("bullmq");
const { Expo } = require("expo-server-sdk");
const redis = require("../../config/redis");
const prisma = require("../../config/prisma");
const logger = require("../../config/logger");

const expo = new Expo();

const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const { userId, notifType, title, body, refPostId, refReplyId } = job.data;

    await prisma.notification.create({
      data: {
        userId,
        notifType,
        title,
        body: body || null,
        refPostId: refPostId || null,
        refReplyId: refReplyId || null,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      await expo.sendPushNotificationsAsync([
        {
          to: user.pushToken,
          title,
          body: body || "",
          data: { refPostId, refReplyId },
        },
      ]);
    }
  },
  { connection: redis, concurrency: 10 }
);

notificationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Notification job failed");
});

module.exports = notificationWorker;