import express from "express";
import { UniqueConstraintError } from "sequelize";

import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/index.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import {
  consumeRefreshToken,
  issueTokenPair,
  revokeRefreshToken,
} from "../services/tokens.js";

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toAuthUser(user) {
  return {
    id: Number(user.id),
    email: user.email,
    nickname: user.nickname,
    firstLoginCompleted: !user.is_first_login,
  };
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function sendValidationError(res, message) {
  return res.status(400).json({
    message,
  });
}

router.post("/signup", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword ?? req.body.passwordConfirm;
    const nickname = String(req.body.nickname || req.body.name || "").trim();

    if (!nickname) {
      return sendValidationError(res, "이름을 입력해주세요.");
    }

    if (!email) {
      return sendValidationError(res, "이메일을 입력해주세요.");
    }

    if (!isValidPassword(password)) {
      return sendValidationError(
        res,
        "비밀번호는 8자 이상으로 입력해주세요.",
      );
    }

    if (password !== confirmPassword) {
      return sendValidationError(res, "비밀번호가 일치하지 않습니다.");
    }

    const user = await User.create({
      email,
      password: await hashPassword(password),
      nickname,
      is_first_login: false,
    });
    const tokens = await issueTokenPair(user);

    return res.status(201).json({
      user: toAuthUser(user),
      ...tokens,
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message: "이미 가입된 이메일입니다.",
      });
    }

    console.error("Signup failed:", error);

    return res.status(500).json({
      message: "회원가입 처리 중 오류가 발생했습니다.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return sendValidationError(res, "이메일과 비밀번호를 입력해주세요.");
    }

    const user = await User.findOne({
      where: {
        email,
      },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const tokens = await issueTokenPair(user);

    return res.status(200).json({
      user: toAuthUser(user),
      ...tokens,
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      message: "로그인 처리 중 오류가 발생했습니다.",
    });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return sendValidationError(res, "리프레시 토큰이 필요합니다.");
    }

    const tokenPayload = await consumeRefreshToken(refreshToken);
    const user = await User.findByPk(tokenPayload.userId);

    if (!user) {
      return res.status(401).json({
        message: "인증이 필요합니다.",
      });
    }

    const tokens = await issueTokenPair(user);

    return res.status(200).json({
      user: toAuthUser(user),
      ...tokens,
    });
  } catch (error) {
    return res.status(401).json({
      message: "인증이 필요합니다.",
    });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  return res.status(204).send();
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: toAuthUser(req.user),
  });
});

export default router;
