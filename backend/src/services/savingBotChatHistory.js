import { redisClient } from "../redis.js";

function getPositiveInteger(value, fallback) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

const chatHistoryTtlSeconds = getPositiveInteger(
  process.env.SAVING_BOT_CHAT_TTL_SECONDS,
  60 * 60 * 24 * 3,
);
const maxStoredMessages = getPositiveInteger(
  process.env.SAVING_BOT_CHAT_MAX_MESSAGES,
  100,
);

function getChatHistoryKey(userId) {
  return `saving-bot:chat:${userId}`;
}

function parseMessage(rawMessage) {
  try {
    const message = JSON.parse(rawMessage);

    if (
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string"
    ) {
      return null;
    }

    return {
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      assetAllocation:
        message.role === "assistant" &&
        message.assetAllocation &&
        typeof message.assetAllocation === "object"
          ? message.assetAllocation
          : null,
    };
  } catch {
    return null;
  }
}

export async function getSavingBotChatHistory(userId) {
  const messages = await redisClient.lRange(getChatHistoryKey(userId), 0, -1);

  return messages.map(parseMessage).filter(Boolean);
}

export async function saveSavingBotChatExchange(
  userId,
  userMessage,
  assistantMessage,
  metadata = {},
) {
  const key = getChatHistoryKey(userId);
  const createdAt = new Date().toISOString();
  const serializedMessages = [
    JSON.stringify({ role: "user", content: userMessage, createdAt }),
    JSON.stringify({
      role: "assistant",
      content: assistantMessage,
      createdAt,
      ...(metadata.assetAllocation
        ? { assetAllocation: metadata.assetAllocation }
        : {}),
    }),
  ];

  await redisClient
    .multi()
    .rPush(key, serializedMessages)
    .lTrim(key, -maxStoredMessages, -1)
    .expire(key, chatHistoryTtlSeconds)
    .exec();
}

export function getSavingBotChatRetentionDays() {
  return Math.ceil(chatHistoryTtlSeconds / (60 * 60 * 24));
}
