jest.mock("bullmq", () => ({
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

jest.mock("../../config/redis", () => ({}));
jest.mock("../../config/prisma", () => ({
  post: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  reply: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock("../../config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../services/gemini.service", () => ({
  moderateContent: jest.fn(),
}));
jest.mock("../queue", () => ({
  notificationQueue: { add: jest.fn() },
}));
jest.mock("../../modules/karma/karma.service", () => ({
  awardKarma: jest.fn(),
}));

const prisma = require("../../config/prisma");
const gemini = require("../../services/gemini.service");
const { moderatePostJob } = require("./moderation.worker");

describe("moderation worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not remove a post when moderation is unavailable", async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: "post-123",
      authorId: "user-1",
      title: "Test title",
      body: "Test body",
    });
    gemini.moderateContent.mockResolvedValue({
      isSafe: false,
      flags: ["moderation_unavailable"],
      confidence: 0,
    });

    await moderatePostJob({ data: { targetType: "post", targetId: "post-123" } });

    expect(prisma.post.update).not.toHaveBeenCalled();
  });
});
