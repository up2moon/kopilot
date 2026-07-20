import { createClient } from "redis";

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
    tls: process.env.REDIS_TLS === "true",
  },
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  const result = await redisClient.ping();
  console.log(`Redis connected: ${result}`);
}
