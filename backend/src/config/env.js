import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, "../..");
const projectRoot = path.resolve(backendDir, "..");

dotenv.config({
  path: path.join(projectRoot, ".env"),
});

dotenv.config({
  path: path.join(backendDir, ".env"),
});
