const prisma = require("../../config/prisma");
const karmaService = require("./karma.service");
const { success } = require("../../utils/apiResponse");

async function getMyKarma(req, res, next) {
  try {
    const result = await karmaService.getKarmaHistory(req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        anonId: true,
        industry: true,
        jobTitle: true,
        experienceYears: true,
        industryVerified: true,
        karma: true,
        trustLevel: true,
        createdAt: true,
        _count: { select: { posts: true, replies: true } },
      },
    });
    return success(res, {
      ...user,
      postCount: user._count.posts,
      replyCount: user._count.replies,
      _count: undefined,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyKarma, getMyProfile };
