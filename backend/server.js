import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/api/hello", (req, res) => {
  res.status(200).json({
    message: "Hello from KoPilot backend",
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Not Found",
  });
});

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
