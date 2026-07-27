const outOfScopeAnswer =
  "저는 지출과 절약을 돕는 AI 코치예요. 커피값, 배달비, 구독료처럼 줄이고 싶은 지출을 알려주세요.";
const OPENAI_REQUEST_TIMEOUT_MS = 60000;

const clearlyOutOfScopePatterns = [
  /주식|코인|종목|매수|매도|수익률|투자\s*추천/i,
  /코드\s*(작성|짜)|프로그래밍|자바스크립트|파이썬/i,
  /요리법|레시피|날씨|번역/i,
];

const knowledgeCategoryPatterns = [
  {
    category: "cafe",
    pattern: /카페|커피|아메리카노|라테|간식|디저트|빵/i,
  },
  {
    category: "delivery",
    pattern: /배달|배민|요기요|쿠팡이츠/i,
  },
  {
    category: "subscription",
    pattern: /구독|정기\s*결제|넷플릭스|유튜브\s*프리미엄|멤버십/i,
  },
  {
    category: "shopping",
    pattern: /쇼핑|충동\s*구매|옷|의류|잡화|온라인\s*구매/i,
  },
  {
    category: "dining",
    pattern: /식비|외식|점심|저녁|식사|음식점/i,
  },
  {
    category: "culture",
    pattern: /문화|영화|공연|전시|취미/i,
  },
  {
    category: "budget",
    pattern: /예산|생활비|가계부|소비\s*계획|지출\s*한도/i,
  },
];

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const chunks = [];

  for (const output of data.output || []) {
    for (const content of output.content || []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("");
}

function sanitizeRecentMessages(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (message) =>
        ["user", "assistant"].includes(message?.role) &&
        typeof message?.content === "string",
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1000),
    }))
    .filter((message) => message.content);
}

function resolveKnowledgeCategories(message, coaching) {
  const matched = knowledgeCategoryPatterns
    .filter(({ pattern }) => pattern.test(message))
    .map(({ category }) => category);

  return Array.from(
    new Set([
      ...(matched.length
        ? matched
        : [coaching.knowledgeCategory || "budget"]),
      "common",
    ]),
  );
}

function buildInput({ message, recentMessages, profile, coaching }) {
  const system = `당신은 KoPilot의 개인 소비 절약 코치다.

역할:
- 제공된 사용자 소비 통계와 계산된 코칭 사실을 설명한다.
- File Search에서 검색한 검수된 절약 가이드를 활용해 구체적인 실천 방법을 제안한다.

절대 규칙:
1. 제공된 USER_FACTS에 없는 거래, 금액, 횟수, 가맹점을 만들지 않는다.
2. CALCULATED_COACHING의 금액과 횟수를 변경하거나 다시 계산하지 않는다.
3. File Search 지식은 행동 방법에만 사용하고 사용자 개인 사실처럼 표현하지 않는다.
4. 사용자를 비난하거나 소비의 전면 중단을 권하지 않는다.
5. 한 번에 최대 두 가지 행동만 제안한다.
6. 투자, 대출, 금융상품을 추천하지 않는다.
7. 소비와 절약 범위 밖 질문에는 정해진 거절 문구로 답한다.
8. 한국어 존댓말로 최대 3문장 이내로 답한다.
9. 답변에 사용한 개인 데이터 근거를 evidence 배열에 넣는다.`;
  const context = {
    USER_FACTS: profile,
    CALCULATED_COACHING: coaching,
    OUT_OF_SCOPE_ANSWER: outOfScopeAnswer,
  };

  return [
    {
      role: "system",
      content: system,
    },
    ...sanitizeRecentMessages(recentMessages),
    {
      role: "user",
      content: `CONTEXT:\n${JSON.stringify(context)}\n\nUSER_QUESTION:\n${message}`,
    },
  ];
}

export function isClearlyOutOfScope(message) {
  return clearlyOutOfScopePatterns.some((pattern) => pattern.test(message));
}

export function getOutOfScopeAnswer() {
  return outOfScopeAnswer;
}

export async function generateSavingBotAnswer({
  message,
  recentMessages,
  profile,
  coaching,
}) {
  const apiKey = process.env.OPEN_AI_KEY;
  const vectorStoreId = process.env.OPENAI_SAVING_VECTOR_STORE_ID;

  if (!apiKey) {
    const error = new Error("OPEN_AI_KEY is required for saving bot chat");

    error.code = "OPENAI_NOT_CONFIGURED";
    throw error;
  }

  if (!vectorStoreId) {
    const error = new Error(
      "OPENAI_SAVING_VECTOR_STORE_ID is required for saving bot File Search",
    );

    error.code = "VECTOR_STORE_NOT_CONFIGURED";
    throw error;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const filters = {
    type: "in",
    key: "category",
    value: resolveKnowledgeCategories(message, coaching),
  };
  const fileSearchTool = {
    type: "file_search",
    vector_store_ids: [vectorStoreId],
    max_num_results: 4,
    filters,
  };
  let response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: buildInput({
          message,
          recentMessages,
          profile,
          coaching,
        }),
        tools: [fileSearchTool],
        include: ["file_search_call.results"],
        text: {
          format: {
            type: "json_schema",
            name: "saving_bot_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "answer",
                "inScope",
                "evidence",
                "suggestedQuestions",
              ],
              properties: {
                answer: {
                  type: "string",
                },
                inScope: {
                  type: "boolean",
                },
                evidence: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                suggestedQuestions: {
                  type: "array",
                  maxItems: 3,
                  items: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      }),
    });
  } catch (cause) {
    if (cause?.name === "TimeoutError") {
      const error = new Error(
        `OpenAI saving bot request timed out after ${OPENAI_REQUEST_TIMEOUT_MS}ms`,
        { cause },
      );

      error.code = "OPENAI_REQUEST_TIMEOUT";
      throw error;
    }

    throw cause;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const requestId = response.headers.get("x-request-id");
    const error = new Error(
      `OpenAI saving bot failed: ${response.status} ${errorBody}${requestId ? ` request_id=${requestId}` : ""}`,
    );

    error.code = "OPENAI_REQUEST_FAILED";
    throw error;
  }

  const data = await response.json();
  const responseText = extractResponseText(data);

  if (!responseText) {
    const error = new Error("OpenAI saving bot returned an empty response");

    error.code = "OPENAI_EMPTY_RESPONSE";
    throw error;
  }

  let parsed;

  try {
    parsed = JSON.parse(responseText);
  } catch (cause) {
    const error = new Error("OpenAI saving bot returned invalid JSON", {
      cause,
    });

    error.code = "OPENAI_INVALID_RESPONSE";
    throw error;
  }
  const fileSearchCall = (data.output || []).find(
    (output) => output.type === "file_search_call",
  );
  const sources = (fileSearchCall?.results || []).map((result) => ({
    fileId: result.file_id || null,
    filename: result.filename || null,
    score: result.score ?? null,
  }));

  return {
    ...parsed,
    sources,
    model,
    responseId: data.id,
  };
}
