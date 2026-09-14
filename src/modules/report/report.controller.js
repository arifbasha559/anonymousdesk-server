const reportService = require("./report.service");
const { success, created } = require("../../utils/apiResponse");

async function reportPost(req, res, next) {
  try {
    const report = await reportService.fileReport(req.user.id, {
      postId: req.params.postId,
      ...req.body,
    });
    return created(res, { status: "submitted", reportId: report.id });
  } catch (err) {
    next(err);
  }
}

async function reportReply(req, res, next) {
  try {
    const report = await reportService.fileReport(req.user.id, {
      replyId: req.params.replyId,
      ...req.body,
    });
    return created(res, { status: "submitted", reportId: report.id });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await reportService.listReports(req.query);
    return success(res, result.reports, 200, {
      total: result.total,
      pendingCount: result.pendingCount,
    });
  } catch (err) {
    next(err);
  }
}

async function resolve(req, res, next) {
  try {
    const result = await reportService.resolveReport(req.params.reportId, req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function ban(req, res, next) {
  try {
    const result = await reportService.banUser(req.params.anonId, req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { reportPost, reportReply, list, resolve, ban };
