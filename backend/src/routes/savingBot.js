import express from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  getSavingBotChatHistory,
  getSavingBotChatRetentionDays,
  saveSavingBotChatExchange,
} from "../services/savingBotChatHistory.js";
import { getSavingBotContext } from "../services/savingBotContext.js";
import {
  generateSavingBotAnswer,
  getOutOfScopeAnswer,
  isClearlyOutOfScope,
} from "../services/savingBotOpenAI.js";

const router = express.Router();

async function loadRecentMessages(userId, fallbackMessages = []) {
  try {
    const history = await getSavingBotChatHistory(userId);

    return history.slice(-8);
  } catch (error) {
    console.error("Saving bot chat history load failed:", error);

    return Array.isArray(fallbackMessages) ? fallbackMessages.slice(-8) : [];
  }
}

async function saveChatExchange(userId, message, answer) {
  try {
    await saveSavingBotChatExchange(userId, message, answer);
  } catch (error) {
    console.error("Saving bot chat history save failed:", error);
  }
}

router.get("/me/saving-bot/coaching", requireAuth, async (req, res) => {
  try {
    const { profile, coaching } = await getSavingBotContext(req.user.id);

    return res.status(200).json({
      status: profile.paymentCount > 0 ? "COMPLETED" : "INSUFFICIENT_DATA",
      generatedAt: new Date().toISOString(),
      analysisPeriod: profile.period,
      coaching: {
        category: coaching.category,
        message: coaching.message,
        action: coaching.action,
        estimatedSavingAmount: coaching.estimatedSavingAmount,
        evidence: coaching.evidence,
      },
      greeting: coaching.greeting,
      suggestedQuestions: coaching.suggestedQuestions.map((label, index) => ({
        id: `suggestion-${index + 1}`,
        label,
      })),
    });
  } catch (error) {
    console.error("Saving bot coaching failed:", error);

    return res.status(500).json({
      message: "오늘의 절약 코칭을 생성하지 못했습니다.",
    });
  }
});

router.get("/me/saving-bot/chat/history", requireAuth, async (req, res) => {
  try {
    const messages = await getSavingBotChatHistory(req.user.id);

    return res.status(200).json({
      messages,
      retentionDays: getSavingBotChatRetentionDays(),
    });
  } catch (error) {
    console.error("Saving bot chat history failed:", error);

    return res.status(503).json({
      message: "이전 대화 내용을 불러오지 못했습니다.",
    });
  }
});

router.post("/me/saving-bot/chat", requireAuth, async (req, res) => {
  const message =
    typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res.status(400).json({
      message: "질문을 입력해주세요.",
    });
  }

  if (message.length > 1000) {
    return res.status(400).json({
      message: "질문은 1,000자 이내로 입력해주세요.",
    });
  }

  if (isClearlyOutOfScope(message)) {
    const answer = getOutOfScopeAnswer();

    await saveChatExchange(req.user.id, message, answer);

    return res.status(200).json({
      answer,
      inScope: false,
      evidence: [],
      suggestedQuestions: [
        "이번 주 절약 방법 알려줘",
        "구독 지출 줄이는 방법 알려줘",
        "다른 절약 항목 찾아줘",
      ],
      sources: [],
    });
  }

  try {
    const recentMessages = await loadRecentMessages(
      req.user.id,
      req.body.recentMessages,
    );
    const { profile, coaching } = await getSavingBotContext(req.user.id);
    const answer = await generateSavingBotAnswer({
      message,
      recentMessages,
      profile,
      coaching,
    });

    await saveChatExchange(req.user.id, message, answer.answer);

    return res.status(200).json(answer);
  } catch (error) {
    console.error("Saving bot chat failed:", error);

    if (
      ["OPENAI_NOT_CONFIGURED", "VECTOR_STORE_NOT_CONFIGURED"].includes(
        error.code,
      )
    ) {
      return res.status(503).json({
        message: error.message,
        code: error.code,
      });
    }

    return res.status(502).json({
      message: "AI 절약 코치의 답변을 생성하지 못했습니다.",
      code: error.code || "SAVING_BOT_FAILED",
    });
  }
});

export default router;
