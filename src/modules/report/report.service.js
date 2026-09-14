const prisma = require("../../config/prisma");
const { ApiError } = require("../../utils/apiResponse");
const { moderationQueue, notificationQueue } = require("../../queues/queue");
const karmaService = require("../karma/karma.service");

async function fileReport(reporterId, { postId, replyId, reason, details }) {
  if (!postId && !replyId) throw ApiError.badRequest("Either postId or replyId is required");

  const report = await prisma.report.create({
    data: { reporterId, postId: postId || null, replyId: replyId || null, reason, details },
  });

  // Kick off an automated re-check in parallel with the human queue —
  // gives moderators AI context (flags/confidence) alongside the report.
  await moderationQueue.add("moderate", {
    targetType: postId ? "post" : "reply",
    targetId: postId || replyId,
  });

  return report;
}

async function listReports({ status, page, limit }) {
  const where = { status };
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        post: { select: { id: true, title: true, isFlagged: true, flaggedReason: true } },
        reply: { select: { id: true, body: true, isRemoved: true, removedReason: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  const pendingCount = status === "pending" ? total : await prisma.report.count({ where: { status: "pending" } });

  return { reports, total, pendingCount };
}

async function resolveReport(reportId, { action, note }) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw ApiError.notFound("Report not found");
  if (report.status !== "pending") throw ApiError.conflict("Report has already been resolved");

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: action === "dismiss" ? "dismissed" : "resolved",
      resolvedAt: new Date(),
    },
  });

  if (action === "remove") {
    if (report.postId) {
      const post = await prisma.post.update({
        where: { id: report.postId },
        data: { status: "removed" },
      });
      if (post.authorId) {
        await karmaService.awardKarma(post.authorId, "post_removed", { refPostId: post.id });
        await notificationQueue.add("notify", {
          userId: post.authorId,
          notifType: "moderation",
          title: "Your post was removed",
          body: note || "Your post was removed for violating community guidelines.",
          refPostId: post.id,
        });
      }
    } else if (report.replyId) {
      const reply = await prisma.reply.update({
        where: { id: report.replyId },
        data: { isRemoved: true },
      });
      if (reply.authorId) {
        await karmaService.awardKarma(reply.authorId, "reply_removed", { refReplyId: reply.id });
        await notificationQueue.add("notify", {
          userId: reply.authorId,
          notifType: "moderation",
          title: "Your reply was removed",
          body: note || "Your reply was removed for violating community guidelines.",
          refReplyId: reply.id,
        });
      }
    }
  } else if (action === "warn") {
    const authorId = await resolveAuthorId(report);
    if (authorId) {
      await notificationQueue.add("notify", {
        userId: authorId,
        notifType: "moderation",
        title: "Content warning",
        body: note || "Your content was flagged. Please review our community guidelines.",
      });
    }
  }

  return { status: report.status === "dismissed" ? "dismissed" : "resolved", actionTaken: action };
}

async function resolveAuthorId(report) {
  if (report.postId) {
    const post = await prisma.post.findUnique({ where: { id: report.postId }, select: { authorId: true } });
    return post?.authorId;
  }
  if (report.replyId) {
    const reply = await prisma.reply.findUnique({ where: { id: report.replyId }, select: { authorId: true } });
    return reply?.authorId;
  }
  return null;
}

async function banUser(anonId, { reason, durationDays }) {
  const user = await prisma.user.findUnique({ where: { anonId } });
  if (!user) throw ApiError.notFound("User not found");

  const bannedUntil = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null; // null = permanent

  await prisma.user.update({
    where: { anonId },
    data: { isBanned: true, banReason: reason, bannedUntil },
  });

  return { status: "banned", expiresAt: bannedUntil?.toISOString() || null };
}

module.exports = { fileReport, listReports, resolveReport, banUser };
