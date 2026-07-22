import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, keyLength);

  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password, hashedPassword) {
  const [algorithm, salt, storedHash] = hashedPassword.split("$");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, keyLength);
  const storedBuffer = Buffer.from(storedHash, "base64url");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}
