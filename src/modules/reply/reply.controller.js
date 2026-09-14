const replyService = require("./reply.service");
const { success, created } = require("../../utils/apiResponse");

async function create(req, res, next) {
  try {
    const reply = await replyService.createReply(req.user.id, req.params.postId, req.body);
    return created(res, { status: "submitted", replyId: reply.id });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await replyService.listReplies(req.params.postId, {
      sort: req.query.sort,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function markHelpful(req, res, next) {
  try {
    const result = await replyService.markHelpful(req.user.id, req.params.replyId);
    return success(res, { status: "marked", ...result });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await replyService.deleteReply(req.user.id, req.user.trustLevel, req.params.replyId);
    return success(res, { status: "removed" });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, markHelpful, remove };
