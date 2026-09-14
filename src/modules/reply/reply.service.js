const xss = require("xss");
const prisma = require("../../config/prisma");
const { ApiError } = require("../../utils/apiResponse");
const { moderationQueue, summaryQueue, notificationQueue } = require("../../queues/queue");
const karmaService = require("../karma/karma.service");

const clean = (str) => xss(str, { whiteList: {}, stripIgnoreTag: true });

const TRUST_ORDER = ["newcomer", "contributor", "trusted", "expert"];
const isExpertEligible = (trustLevel) => TRUST_ORDER.indexOf(trustLevel) >= TRUST_ORDER.indexOf("trusted");

async function createReply(authorId, postId, { body, parentReplyId }) {
  const [post, author] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId } }),
    prisma.user.findUnique({ where: { id: authorId } }),
  ]);

  if (!post || post.status !== "published") throw ApiError.notFound("Post not found");
  if (!author || author.isBanned) throw ApiError.forbidden("Account is not in good standing");

  if (parentReplyId) {
    const parent = await prisma.reply.findUnique({ where: { id: parentReplyId } });
    if (!parent || parent.postId !== postId) {
      throw ApiError.badRequest("Parent reply does not belong to this post");
    }
    if (parent.parentId) {
      throw ApiError.badRequest("Only one level of reply nesting is supported");
    }
  }

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.reply.create({
      data: {
        postId,
        authorId: author.id,
        parentId: parentReplyId || null,
        body: clean(body),
        authorIndustry: author.industry,
        authorJobTitle: author.jobTitle,
        authorYrsExp: author.experienceYears,
        isExpertReply: isExpertEligible(author.trustLevel),
      },
    });

    await tx.post.update({ where: { id: postId }, data: { replyCount: { increment: 1 } } });
    return created;
  });

  await moderationQueue.add("moderate", { targetType: "reply", targetId: reply.id });

  if (post.authorId && post.authorId !== author.id) {
    await notificationQueue.add("notify", {
      userId: post.authorId,
      notifType: "reply",
      title: "New reply on your post",
      body: "Someone responded to your dilemma.",
      refPostId: postId,
    });
  }

  // Re-summarize once there's enough signal — cheap to enqueue repeatedly,
  // the worker itself gates on reply count.
  await summaryQueue.add("summarize", { postId });

  return reply;
}

async function listReplies(postId, { sort = "helpful" } = {}) {
  const orderBy =
    sort === "helpful" ? [{ helpfulCount: "desc" }, { createdAt: "asc" }] : [{ createdAt: "asc" }];

  const topLevel = await prisma.reply.findMany({
    where: { postId, isRemoved: false, parentId: null },
    orderBy,
    include: {
      children: {
        where: { isRemoved: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return { postId, replies: topLevel, total: topLevel.length };
}

async function markHelpful(userId, replyId) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply || reply.isRemoved) throw ApiError.notFound("Reply not found");

  const existing = await prisma.replyHelpful.findUnique({
    where: { userId_replyId: { userId, replyId } },
  });
  if (existing) throw ApiError.conflict("You have already marked this reply as helpful");

  const [, updated] = await prisma.$transaction([
    prisma.replyHelpful.create({ data: { userId, replyId } }),
    prisma.reply.update({ where: { id: replyId }, data: { helpfulCount: { increment: 1 } } }),
  ]);

  if (reply.authorId && reply.authorId !== userId) {
    await karmaService.awardKarma(reply.authorId, "reply_helpful", { refReplyId: replyId });
    await notificationQueue.add("notify", {
      userId: reply.authorId,
      notifType: "helpful",
      title: "Your reply was marked helpful",
      body: "+5 karma awarded.",
      refReplyId: replyId,
    });
  }

  return { helpfulCount: updated.helpfulCount };
}

async function deleteReply(userId, trustLevel, replyId) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply) throw ApiError.notFound("Reply not found");

  const isOwner = reply.authorId === userId;
  const isModerator = trustLevel === "expert";
  if (!isOwner && !isModerator) throw ApiError.forbidden("You cannot delete this reply");

  await prisma.reply.update({ where: { id: replyId }, data: { isRemoved: true } });
}

module.exports = { createReply, listReplies, markHelpful, deleteReply };
