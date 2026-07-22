import crypto from "crypto";

import { redisClient } from "../redis.js";

const accessTokenExpiresInSeconds = Number(
  process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS,
) || 60 * 15;
const refreshTokenExpiresInSeconds = Number(
  process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
) || 60 * 60 * 24 * 14;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return "kopilot-local-development-secret";
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  return crypto
    .createHmac("sha256", getJwtSecret())
    .update(payload)
    .digest("base64url");
}

function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    JSON.stringify({
      alg: "HS256",
      typ: "JWT",
    }),
  );
  const payload = base64Url(
    JSON.stringify({
      sub: String(user.id),
      email: user.email,
      iat: now,
      exp: now + accessTokenExpiresInSeconds,
    }),
  );
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

function hashRefreshToken(refreshToken) {
  return crypto.createHash("sha256").update(refreshToken).digest("base64url");
}

function isSameValue(first, second) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

function getRefreshKey(tokenId) {
  return `refresh:${tokenId}`;
}

async function createRefreshToken(user) {
  const tokenId = crypto.randomUUID();
  const secret = crypto.randomBytes(48).toString("base64url");
  const refreshToken = `${tokenId}.${secret}`;

  await redisClient.set(
    getRefreshKey(tokenId),
    JSON.stringify({
      userId: String(user.id),
      tokenHash: hashRefreshToken(refreshToken),
      issuedAt: new Date().toISOString(),
    }),
    {
      EX: refreshTokenExpiresInSeconds,
    },
  );

  return refreshToken;
}

export async function issueTokenPair(user) {
  return {
    accessToken: createAccessToken(user),
    refreshToken: await createRefreshToken(user),
    tokenType: "Bearer",
    accessTokenExpiresInSeconds,
    refreshTokenExpiresInSeconds,
  };
}

export function verifyAccessToken(accessToken) {
  const [header, payload, signature] = accessToken.split(".");

  if (!header || !payload || !signature) {
    throw new Error("Invalid access token");
  }

  const expectedSignature = sign(`${header}.${payload}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid access token");
  }

  const parsedPayload = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  );

  if (!parsedPayload.exp || parsedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired access token");
  }

  return parsedPayload;
}

export async function consumeRefreshToken(refreshToken) {
  const [tokenId] = refreshToken.split(".");

  if (!tokenId) {
    throw new Error("Invalid refresh token");
  }

  const key = getRefreshKey(tokenId);
  const savedToken = await redisClient.get(key);

  if (!savedToken) {
    throw new Error("Invalid refresh token");
  }

  const tokenPayload = JSON.parse(savedToken);

  if (!isSameValue(tokenPayload.tokenHash, hashRefreshToken(refreshToken))) {
    throw new Error("Invalid refresh token");
  }

  await redisClient.del(key);

  return tokenPayload;
}

export async function revokeRefreshToken(refreshToken) {
  const [tokenId] = refreshToken.split(".");

  if (tokenId) {
    await redisClient.del(getRefreshKey(tokenId));
  }
}
