import assert from "node:assert/strict";
import test from "node:test";

import { generateSavingBotAnswer } from "./savingBotOpenAI.js";
import {
  ANALYZE_ASSET_ALLOCATION_ACTION,
  CREATE_WEEKLY_CHALLENGE_ACTION,
  CREATE_WEEKLY_CHALLENGE_TOOL,
} from "./savingBotTools.js";

test("자산 배분 액션은 백엔드 계산 포트폴리오를 구조화 응답에 유지한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPEN_AI_KEY;
  const originalVectorStoreId = process.env.OPENAI_SAVING_VECTOR_STORE_ID;
  const assetAllocation = {
    status: "AVAILABLE",
    riskLevel: "BALANCED",
    title: "안정성과 성장을 나눈 균형형 배분",
    allocationBaseAmount: 10000,
    allocations: [
      {
        assetClass: "현금성",
        productType: "CASH",
        assetCode: null,
        label: "CMA·MMF",
        ratio: 40,
        amount: 4000,
        role: "생활비 변동과 비상 지출에 대비",
      },
      {
        assetClass: "채권",
        productType: "BOND_ETF",
        assetCode: "114260",
        label: "KODEX 국고채3년",
        ratio: 30,
        amount: 3000,
        role: "주식 변동성을 낮추는 방어 자산",
      },
    ],
    spendingTrendRate: 8.2,
    discretionaryShare: 37.5,
    overBudgetDetails: [
      {
        category: "쇼핑",
        spentAmount: 328000,
        budgetAmount: 250000,
        excessAmount: 78000,
        budgetUsageRate: 131.2,
      },
    ],
    hedgeSummary:
      "현금과 채권, 국내외 주식, 금으로 위험을 나눴습니다.",
    disclaimer: "투자 권유가 아닌 예시입니다.",
  };

  process.env.OPEN_AI_KEY = "test-key";
  delete process.env.OPENAI_SAVING_VECTOR_STORE_ID;

  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);

    assert.equal(body.tool_choice, "none");
    assert.match(
      body.input.at(-1).content,
      /KODEX 국고채3년/,
    );

    return new Response(
      JSON.stringify({
        id: "resp-asset-allocation",
        output_text: JSON.stringify({
          answer: "현금성 자산과 채권, 국내외 주식으로 나눠 변동성을 낮췄어요.",
          inScope: true,
          evidence: ["최근 소비 변동성"],
          suggestedQuestions: [],
        }),
        output: [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const result = await generateSavingBotAnswer({
      message: "소비 패턴으로 자산 배분 받기",
      recentMessages: [],
      profile: {},
      coaching: { knowledgeCategory: "budget" },
      assetAllocation,
      requestedAction: ANALYZE_ASSET_ALLOCATION_ACTION,
    });

    assert.deepEqual(result.assetAllocation, assetAllocation);
    assert.match(result.answer, /쇼핑 예산을 78,000원 초과했고/);
    assert.match(result.answer, /균형형 배분/);
    assert.doesNotMatch(result.answer, /현금성 40%/);
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) {
      delete process.env.OPEN_AI_KEY;
    } else {
      process.env.OPEN_AI_KEY = originalApiKey;
    }

    if (originalVectorStoreId === undefined) {
      delete process.env.OPENAI_SAVING_VECTOR_STORE_ID;
    } else {
      process.env.OPENAI_SAVING_VECTOR_STORE_ID = originalVectorStoreId;
    }
  }
});

test("명시적인 챌린지 액션은 Function Tool을 실행하고 화면 이동을 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPEN_AI_KEY;
  const originalVectorStoreId = process.env.OPENAI_SAVING_VECTOR_STORE_ID;
  const requestBodies = [];
  const executedTools = [];

  process.env.OPEN_AI_KEY = "test-key";
  delete process.env.OPENAI_SAVING_VECTOR_STORE_ID;

  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);

    requestBodies.push(body);

    if (requestBodies.length === 1) {
      return new Response(
        JSON.stringify({
          id: "resp-tool-call",
          output: [
            {
              type: "function_call",
              name: CREATE_WEEKLY_CHALLENGE_TOOL,
              call_id: "call-challenge-1",
              arguments: "{}",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        id: "resp-final",
        output_text: JSON.stringify({
          answer: "새로운 절약 챌린지를 추가했어요.",
          inScope: true,
          evidence: [],
          suggestedQuestions: [],
        }),
        output: [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const result = await generateSavingBotAnswer({
      message: "이번 주 미션 만들기",
      recentMessages: [],
      profile: {},
      coaching: { knowledgeCategory: "budget" },
      requestedAction: CREATE_WEEKLY_CHALLENGE_ACTION,
      executeTool: async (name, args) => {
        executedTools.push({ name, args });
        return {
          status: "CREATED",
          weekStartDate: "2026-07-27",
          weekEndDate: "2026-07-31",
          challengeId: 77,
          challengeCount: 6,
          estimatedSavingAmount: 9500,
          challenge: {
            id: 77,
            content:
              "지난 주에는 카페·간식 결제를 3번 했네요. 이번 주에는 카페·간식 결제를 2번으로 줄여볼까요?",
            type: "MAX_COUNT",
            targetCount: 2,
            targetAmount: null,
            point: 50,
          },
          destination: "/challenge",
        };
      },
    });

    assert.deepEqual(executedTools, [
      {
        name: CREATE_WEEKLY_CHALLENGE_TOOL,
        args: {},
      },
    ]);
    assert.deepEqual(requestBodies[0].tool_choice, {
      type: "function",
      name: CREATE_WEEKLY_CHALLENGE_TOOL,
    });
    assert.equal(requestBodies[1].tool_choice, "none");
    assert.deepEqual(requestBodies[1].input.at(-1), {
      type: "function_call_output",
      call_id: "call-challenge-1",
      output: JSON.stringify({
        status: "CREATED",
        weekStartDate: "2026-07-27",
        weekEndDate: "2026-07-31",
        challengeId: 77,
        challengeCount: 6,
        estimatedSavingAmount: 9500,
        challenge: {
          id: 77,
          content:
            "지난 주에는 카페·간식 결제를 3번 했네요. 이번 주에는 카페·간식 결제를 2번으로 줄여볼까요?",
          type: "MAX_COUNT",
          targetCount: 2,
          targetAmount: null,
          point: 50,
        },
        destination: "/challenge",
      }),
    });
    assert.deepEqual(result.toolResult, {
      name: CREATE_WEEKLY_CHALLENGE_TOOL,
      status: "CREATED",
      weekStartDate: "2026-07-27",
      weekEndDate: "2026-07-31",
      challengeId: 77,
      challengeCount: 6,
      estimatedSavingAmount: 9500,
      challenge: {
        id: 77,
        content:
          "지난 주에는 카페·간식 결제를 3번 했네요. 이번 주에는 카페·간식 결제를 2번으로 줄여볼까요?",
        type: "MAX_COUNT",
        targetCount: 2,
        targetAmount: null,
        point: 50,
      },
      destination: "/challenge",
    });
    assert.equal(
      result.answer,
      "새로운 절약 챌린지를 추가했어요!\n\n"
        + "지난 주에는 카페·간식 결제를 3번 했네요. 이번 주에는 카페·간식 결제를 2번으로 줄여볼까요?\n\n"
        + "챌린지 화면에서 바로 확인해보세요.",
    );
    assert.deepEqual(result.clientAction, {
      type: "NAVIGATE",
      path: "/challenge",
      highlightChallengeId: 77,
    });
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) {
      delete process.env.OPEN_AI_KEY;
    } else {
      process.env.OPEN_AI_KEY = originalApiKey;
    }

    if (originalVectorStoreId === undefined) {
      delete process.env.OPENAI_SAVING_VECTOR_STORE_ID;
    } else {
      process.env.OPENAI_SAVING_VECTOR_STORE_ID = originalVectorStoreId;
    }
  }
});
