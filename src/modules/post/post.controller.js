const postService = require("./post.service");
const { success, created } = require("../../utils/apiResponse");

async function create(req, res, next) {
  try {
    const post = await postService.createPost(req.user.id, req.body);
    return created(res, { status: "created", postId: post.id });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await postService.listPosts(req.query);
    return success(res, result.posts, 200, {
      total: result.total,
      page: result.page,
      hasNext: result.hasNext,
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const post = await postService.getPost(req.params.postId);
    return success(res, post);
  } catch (err) {
    next(err);
  }
}

async function upvote(req, res, next) {
  try {
    const result = await postService.upvotePost(req.user.id, req.params.postId);
    return success(res, { status: "upvoted", ...result });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await postService.deletePost(req.user.id, req.user.trustLevel, req.params.postId);
    return success(res, { status: "removed" });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, upvote, remove };
