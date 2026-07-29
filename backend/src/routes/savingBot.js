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
import {
  ANALYZE_ASSET_ALLOCATION_ACTION,
  CREATE_WEEKLY_CHALLENGE_ACTION,
  executeSavingBotTool,
} from "../services/savingBotTools.js";

const router = express.Router();
const allowedRequestedActions = new Set([
  CREATE_WEEKLY_CHALLENGE_ACTION,
  ANALYZE_ASSET_ALLOCATION_ACTION,
]);
const ASSET_ALLOCATION_QUESTION = "소비 패턴으로 자산 배분 받기";

function toSuggestedQuestion(label, index) {
  const isChallengeCreation = label === "이번 주 미션 만들기";
  const isAssetAllocation = label === ASSET_ALLOCATION_QUESTION;

  return {
    id: isChallengeCreation
      ? "create-weekly-challenge"
      : isAssetAllocation
        ? "analyze-asset-allocation"
      : `suggestion-${index + 1}`,
    label,
    action: isChallengeCreation
      ? CREATE_WEEKLY_CHALLENGE_ACTION
      : isAssetAllocation
        ? ANALYZE_ASSET_ALLOCATION_ACTION
        : "ASK",
  };
}

async function loadRecentMessages(userId, fallbackMessages = []) {
  try {
    const history = await getSavingBotChatHistory(userId);

    return history.slice(-8);
  } catch (error) {
    console.error("Saving bot chat history load failed:", error);

    return Array.isArray(fallbackMessages) ? fallbackMessages.slice(-8) : [];
  }
}

async function saveChatExchange(userId, message, answer, metadata = {}) {
  try {
    await saveSavingBotChatExchange(userId, message, answer, metadata);
  } catch (error) {
    console.error("Saving bot chat history save failed:", error);
  }
}

router.get("/me/saving-bot/coaching", requireAuth, async (req, res) => {
  try {
    const { profile, coaching } = await getSavingBotContext(req.user.id);
    const suggestedQuestions = [
      ...coaching.suggestedQuestions,
      ASSET_ALLOCATION_QUESTION,
    ];

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
      suggestedQuestions: suggestedQuestions.map(toSuggestedQuestion),
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
  const requestedAction =
    typeof req.body.requestedAction === "string"
      ? req.body.requestedAction.trim()
      : null;
  const effectiveRequestedAction =
    requestedAction ||
    (message === ASSET_ALLOCATION_QUESTION
      ? ANALYZE_ASSET_ALLOCATION_ACTION
      : null);
  const allocationBaseAmount = Number(req.body.allocationBaseAmount);

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

  if (
    effectiveRequestedAction &&
    !allowedRequestedActions.has(effectiveRequestedAction)
  ) {
    return res.status(400).json({
      message: "지원하지 않는 채팅 액션이에요.",
      code: "INVALID_REQUESTED_ACTION",
    });
  }

  if (
    effectiveRequestedAction === ANALYZE_ASSET_ALLOCATION_ACTION &&
    (
      !Number.isInteger(allocationBaseAmount) ||
      allocationBaseAmount < 10000 ||
      allocationBaseAmount > 1000000000
    )
  ) {
    return res.status(400).json({
      message: "배분할 금액을 10,000원 이상 10억원 이하로 입력해주세요.",
      code: "ALLOCATION_AMOUNT_REQUIRED",
    });
  }

  if (isClearlyOutOfScope(message, effectiveRequestedAction)) {
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
    const { profile, coaching, assetAllocation } =
      await getSavingBotContext(req.user.id, { allocationBaseAmount });
    const answer = await generateSavingBotAnswer({
      message,
      recentMessages,
      profile,
      coaching,
      assetAllocation,
      requestedAction: effectiveRequestedAction,
      executeTool: (name, args) => executeSavingBotTool(name, {
        ...args,
        userId: req.user.id,
      }),
    });

    await saveChatExchange(req.user.id, message, answer.answer, {
      assetAllocation: answer.assetAllocation || null,
    });

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
