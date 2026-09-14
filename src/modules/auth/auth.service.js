const prisma = require("../../config/prisma");
const redis = require("../../config/redis");
const {
  deriveAnonId,
  hashEmail,
  hashPassword,
  verifyPassword,
  hashToken,
  randomToken,
} = require("../../utils/crypto");
const { signAccessToken, verifyAccessToken } = require("../../utils/jwt");
const { ApiError } = require("../../utils/apiResponse");
const env = require("../../config/env");
const logger = require("../../config/logger");

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

async function issueTokenPair(user, deviceFingerprint) {
  const accessToken = signAccessToken(user);

  const rawRefreshToken = randomToken();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawRefreshToken),
      deviceFingerprint: deviceFingerprint || null,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: rawRefreshToken, expiresAt };
}

async function register({ email, password, industry, jobTitle, yearsExp, deviceFingerprint }) {
  const emailHash = hashEmail(email);

  const existing = await prisma.user.findUnique({ where: { emailHash } });
  if (existing) {
    // Deliberately generic — do not confirm/deny account existence in the
    // error message beyond what's necessary for UX.
    throw ApiError.conflict("An account with this email already exists");
  }

  const anonId = deriveAnonId(email, password);
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      anonId,
      emailHash,
      passwordHash,
      industry,
      jobTitle,
      experienceYears: yearsExp,
    },
  });

  logger.info({ anonId: user.anonId }, "New user registered");

  const tokens = await issueTokenPair(user, deviceFingerprint);
  return { user, tokens, isNewUser: true };
}

async function login({ email, password, deviceFingerprint }) {
  const emailHash = hashEmail(email);
  const user = await prisma.user.findUnique({ where: { emailHash } });

  // Constant-shape response whether or not the account exists, to avoid
  // user-enumeration via response timing/content differences.
  const genericError = () => ApiError.unauthorized("Invalid email or password");

  if (!user) {
    // Still run a bcrypt compare against a dummy hash so response time
    // doesn't leak whether the email exists.
    await verifyPassword(password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalid");
    throw genericError();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw ApiError.forbidden(
      `Account temporarily locked due to failed login attempts. Try again later.`
    );
  }

  if (user.isBanned) {
    throw ApiError.forbidden("This account has been suspended");
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const failedCount = user.failedLoginCount + 1;
    const shouldLock = failedCount >= MAX_FAILED_LOGINS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failedCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : user.lockedUntil,
      },
    });

    throw genericError();
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  const tokens = await issueTokenPair(user, deviceFingerprint);
  return { user, tokens, isNewUser: false };
}

async function refresh({ refreshToken }) {
  const tokenHash = hashToken(refreshToken);

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.isRevoked || record.expiresAt < new Date()) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  if (record.user.isBanned || !record.user.isActive) {
    throw ApiError.forbidden("Account is not in good standing");
  }

  // Rotate: revoke the used refresh token and issue a brand new pair.
  // Prevents replay of a stolen-but-already-used refresh token.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { isRevoked: true, lastUsedAt: new Date() },
  });

  const tokens = await issueTokenPair(record.user, record.deviceFingerprint);
  return { user: record.user, tokens };
}

async function revoke({ refreshToken, accessToken }) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  if (accessToken) {
    // Denylist the still-valid access token in Redis until its natural
    // expiry, so logout takes effect immediately rather than waiting
    // up to JWT_ACCESS_TTL.
    try {
      const payload = verifyAccessToken(accessToken);
      const ttlSeconds = payload.exp - Math.floor(Date.now() / 1000);
      if (ttlSeconds > 0) {
        await redis.set(`denylist:${accessToken}`, "1", "EX", ttlSeconds);
      }
    } catch {
      // Token already invalid/expired — nothing to denylist.
    }
  }
}

async function updateIndustry(userId, { industry, jobTitle, yearsExp }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      industry,
      jobTitle,
      experienceYears: yearsExp,
      industryVerified: false, // self-declared change resets verification
    },
  });
}

module.exports = { register, login, refresh, revoke, updateIndustry };
