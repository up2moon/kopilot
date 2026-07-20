import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { db, connectMySQL } from "./db.js";
import { redisClient, connectRedis } from "./redis.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || false,
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "OK",
    server: process.env.HOSTNAME ?? "unknown",
    time: new Date().toISOString(),
    ip: req.ip,
    forwardedFor: req.headers["x-forwarded-for"] ?? null,
    host: req.headers.host,
  });
});

app.get("/api/hello", (req, res) => {
  res.status(200).json({
    message: "Hello from KoPilot backend",
  });
});

app.get("/api/test/mysql", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result, NOW() AS serverTime");

    res.status(200).json({
      success: true,
      message: "MySQL connection successful",
      data: rows[0],
    });
  } catch (error) {
    console.error("MySQL test failed:", error);

    res.status(500).json({
      success: false,
      message: "MySQL connection failed",
    });
  }
});

app.get("/api/test/redis", async (req, res) => {
  try {
    const key = "kopilot:connection-test";
    const value = new Date().toISOString();

    await redisClient.set(key, value, {
      EX: 60,
    });

    const savedValue = await redisClient.get(key);

    res.status(200).json({
      success: true,
      message: "Redis connection successful",
      data: {
        key,
        value: savedValue,
      },
    });
  } catch (error) {
    console.error("Redis test failed:", error);

    res.status(500).json({
      success: false,
      message: "Redis connection failed",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: "Not Found",
  });
});

async function startServer() {
  await connectMySQL();
  await connectRedis();

  app.listen(
    {
      port,
      host: "::",
      ipv6Only: false,
    },
    () => {
      console.log(`Backend listening on [::]:${port}`);
    },
  );
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});
