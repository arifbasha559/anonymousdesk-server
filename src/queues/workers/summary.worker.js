const { Worker } = require("bullmq");
const redis = require("../../config/redis");
const prisma = require("../../config/prisma");
const logger = require("../../config/logger");
const gemini = require("../../services/gemini.service");

const summaryWorker = new Worker(
  "summary",
  async (job) => {
    const { postId } = job.data;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status !== "published") return;

    const topReplies = await prisma.reply.findMany({
      where: { postId, isRemoved: false },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "asc" }],
      take: 5,
      select: { body: true },
    });

    if (topReplies.length < 2) return; // not enough signal yet

    const summary = await gemini.summarizePost(
      post.body,
      topReplies.map((r) => r.body)
    );

    if (summary) {
      await prisma.post.update({
        where: { id: postId },
        data: { aiSummary: summary, aiSummaryAt: new Date() },
      });
      logger.info({ postId }, "AI summary generated");
    }
  },
  { connection: redis, concurrency: 3 }
);

summaryWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Summary job failed");
});

module.exports = summaryWorker;
