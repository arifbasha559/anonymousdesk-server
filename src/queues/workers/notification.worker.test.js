const mockWorker = { on: jest.fn() };

jest.mock("bullmq", () => ({
  Worker: jest.fn().mockImplementation((_name, handler) => {
    mockWorker.handler = handler;
    return mockWorker;
  }),
}));

jest.mock("../../config/redis", () => ({}));

jest.mock("../../config/prisma", () => ({
  notification: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}));

jest.mock("../../config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { Expo } = require("expo-server-sdk");
const prisma = require("../../config/prisma");

jest.mock("expo-server-sdk", () => {
  const sendPushNotificationsAsync = jest.fn();
  const ExpoMock = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync,
  }));
  ExpoMock.isExpoPushToken = jest.fn(() => true);
  ExpoMock.__sendPushNotificationsAsync = sendPushNotificationsAsync;
  return { Expo: ExpoMock };
});

const notificationWorker = require("./notification.worker");

describe("notification worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ pushToken: "ExponentPushToken[abc123]" });
  });

  it("sends a generic notification body instead of the related message", async () => {
    await mockWorker.handler({
      data: {
        userId: "user-1",
        notifType: "reply",
        title: "New reply",
        body: "Someone replied to your post.",
        refPostId: "post-1",
      },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        notifType: "reply",
        title: "New reply",
        body: "u have a notification",
        refPostId: "post-1",
        refReplyId: null,
      },
    });

    expect(Expo.isExpoPushToken).toHaveBeenCalledWith("ExponentPushToken[abc123]");
    expect(Expo.__sendPushNotificationsAsync).toHaveBeenCalledWith([
      {
        to: "ExponentPushToken[abc123]",
        title: "New reply",
        body: "u have a notification",
        data: { refPostId: "post-1", refReplyId: undefined },
      },
    ]);
  });
});

module.exports = { notificationWorker };
