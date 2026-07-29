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
  CREATE_WEEKLY_CHALLENGE_ACTION,
  executeSavingBotTool,
} from "../services/savingBotTools.js";
import { runInvestmentAnalysis } from "../services/investmentAgents.js";

const router = express.Router();
const allowedRequestedActions = new Set([CREATE_WEEKLY_CHALLENGE_ACTION]);

function parseInvestmentAnalysisRequest(body = {}) {
  const assetCode =
    typeof body.assetCode === "string" ? body.assetCode.trim() : "";
  const assetName =
    typeof body.assetName === "string"
      ? body.assetName.trim().slice(0, 80)
      : "";
  const month =
    typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month)
      ? body.month
      : null;
  const monthlyAmount = Math.round(Number(body.monthlyAmount));
  const question =
    typeof body.question === "string"
      ? body.question.trim().slice(0, 1000)
      : "";

  if (!/^[A-Za-z0-9_-]{1,30}$/.test(assetCode)) {
    const error = new Error("분석할 종목 코드를 확인해주세요.");
    error.code = "INVALID_ASSET_CODE";
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isFinite(monthlyAmount) ||
    monthlyAmount <= 0 ||
    monthlyAmount > 1_000_000_000
  ) {
    const error = new Error("분석 기준 절약액을 확인해주세요.");
    error.code = "INVALID_MONTHLY_AMOUNT";
    error.statusCode = 400;
    throw error;
  }

  return {
    assetCode,
    assetName,
    month,
    monthlyAmount,
    question:
      question || `${assetName || assetCode} 종목을 장기 관점에서 분석해줘`,
  };
}

function writeServerSentEvent(res, event) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function toSuggestedQuestion(label, index) {
  const isChallengeCreation = label === "이번 주 미션 만들기";

  return {
    id: isChallengeCreation
      ? "create-weekly-challenge"
      : `suggestion-${index + 1}`,
    label,
    action: isChallengeCreation ? CREATE_WEEKLY_CHALLENGE_ACTION : "ASK",
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
      suggestedQuestions: coaching.suggestedQuestions.map(toSuggestedQuestion),
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

  if (requestedAction && !allowedRequestedActions.has(requestedAction)) {
    return res.status(400).json({
      message: "지원하지 않는 채팅 액션이에요.",
      code: "INVALID_REQUESTED_ACTION",
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
      requestedAction,
      executeTool: (name, args) => executeSavingBotTool(name, {
        ...args,
        userId: req.user.id,
      }),
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

router.post(
  "/me/saving-bot/investment-analysis",
  requireAuth,
  async (req, res) => {
    try {
      const input = parseInvestmentAnalysisRequest(req.body);
      const investmentAnalysis = await runInvestmentAnalysis({
        ...input,
      });
      const answer = investmentAnalysis.report.summary;

      await saveChatExchange(req.user.id, input.question, answer);

      return res.status(200).json({
        answer,
        inScope: true,
        investmentAnalysis,
        evidence: [
          `코스콤 시세 기준: ${
            investmentAnalysis.information.koscom.quote?.tradeDate ||
            "시세 없음"
          }`,
          `검색 뉴스 ${
            investmentAnalysis.information.news.results.length
          }건`,
        ],
        suggestedQuestions: [],
      });
    } catch (error) {
      console.error("Investment agent analysis failed:", error);

      if (error.code === "OPENAI_NOT_CONFIGURED") {
        return res.status(503).json({
          code: error.code,
          message: error.message,
        });
      }

      return res.status(502).json({
        code: error.code || "INVESTMENT_AGENT_FAILED",
        message: "종목 분석 리포트를 생성하지 못했습니다.",
      });
    }
  },
);

router.post(
  "/me/saving-bot/investment-analysis/stream",
  requireAuth,
  async (req, res) => {
    let input;

    try {
      input = parseInvestmentAnalysisRequest(req.body);
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        code: error.code,
        message: error.message,
      });
    }

    res.status(200);
    res.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    try {
      const investmentAnalysis = await runInvestmentAnalysis({
        ...input,
        onEvent: (event) => writeServerSentEvent(res, event),
      });

      await saveChatExchange(
        req.user.id,
        input.question,
        investmentAnalysis.report.summary,
      );
    } catch (error) {
      console.error("Investment agent stream failed:", error);
      writeServerSentEvent(res, {
        type: "analysis.error",
        code: error.code || "INVESTMENT_AGENT_FAILED",
        message:
          error.code === "OPENAI_NOT_CONFIGURED"
            ? error.message
            : "종목 분석 리포트를 생성하지 못했습니다.",
      });
    } finally {
      res.end();
    }
  },
);

export default router;
