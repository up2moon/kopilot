import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from KoPilot backend",
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Not Found",
  });
});

app.listen(port, "::", () => {
  console.log(`Backend listening on port ${port}`);
});
