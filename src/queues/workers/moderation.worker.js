const { Worker } = require("bullmq");
const redis = require("../../config/redis");
const prisma = require("../../config/prisma");
const logger = require("../../config/logger");
const gemini = require("../../services/gemini.service");
const { notificationQueue } = require("../queue");
const karmaService = require("../../modules/karma/karma.service");

/**
 * Job payload: { targetType: 'post' | 'reply', targetId: string }
 * Runs AFTER the content is already saved (status remains 'draft'/unpublished
 * conceptually via isFlagged), moderates it, then either clears it for display
 * or flags it and notifies the author.
 */
const moderationWorker = new Worker(
  "moderation",
  async (job) => {
    const { targetType, targetId } = job.data;

    if (targetType === "post") {
      const post = await prisma.post.findUnique({ where: { id: targetId } });
      if (!post) return;

      const result = await gemini.moderateContent(`${post.title}\n\n${post.body}`);

      if (!result.isSafe) {
        await prisma.post.update({
          where: { id: targetId },
          data: {
            isFlagged: true,
            flaggedReason: result.flags.join(", "),
            status: "removed",
          },
        });

        if (post.authorId) {
          await karmaService.awardKarma(post.authorId, "post_removed", { refPostId: post.id });
          await notificationQueue.add("notify", {
            userId: post.authorId,
            notifType: "moderation",
            title: "Post did not pass review",
            body: "Your post was held back by automated moderation. Please revise and avoid including identifying details.",
            refPostId: post.id,
          });
        }
        logger.info({ postId: post.id, flags: result.flags }, "Post flagged by moderation");
      }
    }

    if (targetType === "reply") {
      const reply = await prisma.reply.findUnique({ where: { id: targetId } });
      if (!reply) return;

      const result = await gemini.moderateContent(reply.body);

      if (!result.isSafe) {
        await prisma.reply.update({
          where: { id: targetId },
          data: {
            isRemoved: true,
            removedReason: result.flags.join(", "),
          },
        });

        if (reply.authorId) {
          await karmaService.awardKarma(reply.authorId, "reply_removed", { refReplyId: reply.id });
          await notificationQueue.add("notify", {
            userId: reply.authorId,
            notifType: "moderation",
            title: "Reply did not pass review",
            body: "Your reply was held back by automated moderation.",
            refReplyId: reply.id,
          });
        }
        logger.info({ replyId: reply.id, flags: result.flags }, "Reply flagged by moderation");
      }
    }
  },
  { connection: redis, concurrency: 5 }
);

moderationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Moderation job failed");
});

module.exports = moderationWorker;
