import crypto from "node:crypto";

import express from "express";

import {
  basicQuotePath,
  callKoscom,
  etfMasterPath,
  historyQuotePath,
  stockMasterPath,
} from "../services/koscomCheck.js";

const router = express.Router();
const allowedPaths = new Set([
  stockMasterPath,
  etfMasterPath,
  basicQuotePath,
  historyQuotePath,
]);

function safeEqual(received, expected) {
  const receivedBuffer = Buffer.from(String(received || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function requireKoscomProxyAuth(req, res, next) {
  const expectedCustId = process.env.CUST_ID;
  const expectedAuthKey = process.env.AUTH_KEY;

  if (
    !expectedCustId ||
    !expectedAuthKey ||
    !safeEqual(req.headers["x-koscom-cust-id"], expectedCustId) ||
    !safeEqual(req.headers["x-koscom-auth-key"], expectedAuthKey)
  ) {
    return res.status(401).json({
      message: "CHECK API 프록시 인증에 실패했습니다.",
      code: "KOSCOM_PROXY_UNAUTHORIZED",
    });
  }

  return next();
}

router.post("/check", requireKoscomProxyAuth, async (req, res) => {
  const path = String(req.body?.path || "");
  const params =
    req.body?.params &&
    typeof req.body.params === "object" &&
    !Array.isArray(req.body.params)
      ? req.body.params
      : {};

  if (!allowedPaths.has(path)) {
    return res.status(400).json({
      message: "허용되지 않은 CHECK API 경로입니다.",
      code: "KOSCOM_PROXY_PATH_NOT_ALLOWED",
    });
  }

  try {
    const result = await callKoscom(path, params, {
      bypassProxy: true,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Koscom proxy request failed:", error);

    return res.status(error.statusCode || 502).json({
      message: error.message || "CHECK API 프록시 요청에 실패했습니다.",
      code: error.code || "KOSCOM_PROXY_REQUEST_FAILED",
      meta: error.meta,
    });
  }
});

export default router;
