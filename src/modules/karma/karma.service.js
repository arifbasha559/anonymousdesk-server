const prisma = require("../../config/prisma");
const { notificationQueue } = require("../../queues/queue");

const KARMA_RULES = {
  post_upvoted: 2,
  reply_helpful: 5,
  expert_accepted: 10,
  milestone_bonus: 50,
  post_removed: -5,
  reply_removed: -3,
};

const TRUST_THRESHOLDS = [
  { min: 5000, level: "expert" },
  { min: 1000, level: "trusted" },
  { min: 100, level: "contributor" },
  { min: 0, level: "newcomer" },
];

function computeTrustLevel(karma) {
  return TRUST_THRESHOLDS.find((t) => karma >= t.min).level;
}

/**
 * Awards (or deducts) karma atomically and recalculates trust level.
 * Runs inside a transaction so the KarmaEvent ledger entry and the
 * cached User.karma total can never drift apart.
 */
async function awardKarma(userId, eventType, { refPostId, refReplyId } = {}) {
  const delta = KARMA_RULES[eventType];
  if (delta === undefined) throw new Error(`Unknown karma event type: ${eventType}`);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const newBalance = Math.max(0, user.karma + delta);
    const newTrustLevel = computeTrustLevel(newBalance);
    const trustChanged = newTrustLevel !== user.trustLevel;

    await tx.user.update({
      where: { id: userId },
      data: { karma: newBalance, trustLevel: newTrustLevel },
    });

    await tx.karmaEvent.create({
      data: {
        userId,
        eventType,
        delta,
        balance: newBalance,
        refPostId: refPostId || null,
        refReplyId: refReplyId || null,
      },
    });

    if (trustChanged) {
      await notificationQueue.add("notify", {
        userId,
        notifType: "trust",
        title: "Trust level upgraded",
        body: `You've been promoted to ${newTrustLevel}.`,
      });
    }

    return { balance: newBalance, trustLevel: newTrustLevel };
  });
}

async function getKarmaHistory(userId, { limit = 20 } = {}) {
  const [user, events] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { karma: true, trustLevel: true } }),
    prisma.karmaEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return { karma: user?.karma ?? 0, trustLevel: user?.trustLevel ?? "newcomer", events };
}

module.exports = { awardKarma, getKarmaHistory, computeTrustLevel, KARMA_RULES };
