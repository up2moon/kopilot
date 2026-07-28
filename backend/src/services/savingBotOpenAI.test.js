import assert from "node:assert/strict";
import test from "node:test";

import { generateSavingBotAnswer } from "./savingBotOpenAI.js";
import {
  CREATE_WEEKLY_CHALLENGE_ACTION,
  CREATE_WEEKLY_CHALLENGE_TOOL,
} from "./savingBotTools.js";

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
