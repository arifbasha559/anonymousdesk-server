const authService = require("./auth.service");
const { success, created } = require("../../utils/apiResponse");

function serializeUser(user) {
  return {
    anonId: user.anonId,
    industry: user.industry,
    jobTitle: user.jobTitle,
    experienceYears: user.experienceYears,
    industryVerified: user.industryVerified,
    karma: user.karma,
    trustLevel: user.trustLevel,
  };
}

function serializeTokens(tokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
  };
}

async function register(req, res, next) {
  try {
    const { user, tokens, isNewUser } = await authService.register(req.body);
    return created(res, { ...serializeUser(user), ...serializeTokens(tokens), isNewUser });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, tokens, isNewUser } = await authService.login(req.body);
    return success(res, { ...serializeUser(user), ...serializeTokens(tokens), isNewUser });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { tokens } = await authService.refresh(req.body);
    return success(res, serializeTokens(tokens));
  } catch (err) {
    next(err);
  }
}

async function revoke(req, res, next) {
  try {
    await authService.revoke({
      refreshToken: req.body?.refreshToken,
      accessToken: req.accessToken,
    });
    return success(res, { status: "revoked" });
  } catch (err) {
    next(err);
  }
}

async function updateIndustry(req, res, next) {
  try {
    const user = await authService.updateIndustry(req.user.id, req.body);
    return success(res, serializeUser(user));
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, revoke, updateIndustry };
