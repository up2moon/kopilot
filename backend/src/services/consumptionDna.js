import { Op } from "sequelize";

import {
  ConsumptionDna,
  ExpenseCategory,
  TransactionHistory,
} from "../models/index.js";

const REQUEST_TIMEOUT_MS = 20000;
const DIMENSION_LABELS = {
  experience: ["실속형", "경험형"],
  routine: ["계획형", "즉흥형"],
  social: ["혼자형", "함께형"],
  variety: ["집중형", "탐험형"],
};

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return (data.output || [])
    .flatMap((output) => output.content || [])
    .map((content) => content.text || "")
    .join("");
}

function getMonthRange(month) {
  const normalized = /^\d{4}-\d{2}$/.test(month || "")
    ? month
    : new Date().toISOString().slice(0, 7);
  const start = new Date(`${normalized}-01T00:00:00.000Z`);
  const end = new Date(start);

  end.setUTCMonth(end.getUTCMonth() + 1);
  return { month: normalized, start, end };
}

function summarizeTransactions(transactions) {
  const categories = new Map();
  const merchants = new Map();
  let totalAmount = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.trans_amt || 0);
    const category = transaction.ExpenseCategory?.name || "기타";
    const merchant = transaction.merchant_name || "알 수 없음";

    totalAmount += amount;
    categories.set(category, {
      category,
      amount: (categories.get(category)?.amount || 0) + amount,
      count: (categories.get(category)?.count || 0) + 1,
    });
    merchants.set(merchant, {
      merchant,
      amount: (merchants.get(merchant)?.amount || 0) + amount,
      count: (merchants.get(merchant)?.count || 0) + 1,
    });
  }

  const byAmount = (a, b) => b.amount - a.amount;

  return {
    totalAmount,
    transactionCount: transactions.length,
    categories: [...categories.values()].sort(byAmount),
    frequentMerchants: [...merchants.values()].sort(byAmount).slice(0, 8),
    transactions: transactions.map((transaction) => ({
      approvedAt: transaction.trans_dtime,
      merchantName: transaction.merchant_name,
      amount: Number(transaction.trans_amt),
      category: transaction.ExpenseCategory?.name || "기타",
    })),
  };
}

function normalizeResult(result, profile) {
  const dimensions = Object.entries(DIMENSION_LABELS).map(([key, labels]) => {
    const raw = result.dimensions?.find((item) => item.key === key);
    const score = Math.max(0, Math.min(100, Number(raw?.score) || 50));

    return {
      key,
      leftLabel: labels[0],
      rightLabel: labels[1],
      score,
    };
  });

  return {
    nickname: String(result.nickname || "균형 잡힌 소비 탐험가").slice(0, 40),
    emoji: String(result.emoji || "🧬").slice(0, 8),
    summary: String(
      result.summary || "여러 카테고리를 고르게 이용하는 균형형 소비예요.",
    ).slice(0, 240),
    dimensions,
    topCategories: profile.categories.slice(0, 3).map((category) => ({
      ...category,
      ratio:
        profile.totalAmount > 0
          ? Math.round((category.amount / profile.totalAmount) * 100)
          : 0,
    })),
  };
}

async function requestConsumptionDna(profile) {
  const apiKey = process.env.OPEN_AI_KEY;

  if (!apiKey) {
    const error = new Error("소비 DNA 분석을 위한 OPEN_AI_KEY가 설정되지 않았습니다.");

    error.code = "OPENAI_NOT_CONFIGURED";
    throw error;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: `당신은 한국어 소비 성향 분석가다. 월간 결제 내역만 근거로 MBTI처럼 재미있고 긍정적인 소비 DNA를 만든다.

규칙:
- 별명은 "커피 전문가", "주말 미식 탐험가"처럼 2~12자의 친근한 명사형으로 쓴다.
- 과소비를 비난하거나 신용도, 소득, 건강, 성격 같은 민감한 특성을 추론하지 않는다.
- 네 축의 score는 오른쪽 성향의 강도를 0~100으로 표현한다.
- 근거가 약하면 50에 가깝게 평가하고, 제공되지 않은 거래를 만들지 않는다.
- summary는 실제 상위 카테고리를 언급해 두 문장 이내로 작성한다.`,
        },
        {
          role: "user",
          content: JSON.stringify(profile),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "consumption_dna",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["nickname", "emoji", "summary", "dimensions"],
            properties: {
              nickname: { type: "string" },
              emoji: { type: "string" },
              summary: { type: "string" },
              dimensions: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "score"],
                  properties: {
                    key: {
                      type: "string",
                      enum: ["experience", "routine", "social", "variety"],
                    },
                    score: { type: "integer", minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    const body = await response.text();
    const error = new Error(
      `OpenAI 소비 DNA 분석 실패: ${response.status} ${body}${requestId ? ` request_id=${requestId}` : ""}`,
    );

    error.code = "OPENAI_REQUEST_FAILED";
    throw error;
  }

  const data = await response.json();
  return {
    result: JSON.parse(extractResponseText(data)),
    model,
    responseId: data.id || null,
  };
}

function toResponse(row, cached) {
  return {
    month: row.month,
    nickname: row.nickname,
    emoji: row.emoji,
    summary: row.summary,
    dimensions: row.dimensions,
    topCategories: row.top_categories,
    generatedAt: row.updated_at,
    cached,
  };
}

export async function getConsumptionDna(userId, month, { refresh = false } = {}) {
  const range = getMonthRange(month);
  const cached = await ConsumptionDna.findOne({
    where: { user_id: userId, month: range.month },
  });

  if (cached && !refresh) {
    return toResponse(cached, true);
  }

  const transactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: { [Op.gte]: range.start, [Op.lt]: range.end },
    },
    include: [{ model: ExpenseCategory, attributes: ["name"] }],
    order: [["trans_dtime", "ASC"]],
  });

  if (transactions.length < 3) {
    const error = new Error("소비 DNA 분석에는 해당 월의 결제 내역이 3건 이상 필요합니다.");

    error.code = "INSUFFICIENT_DATA";
    throw error;
  }

  const profile = summarizeTransactions(transactions);
  const generated = await requestConsumptionDna(profile);
  const normalized = normalizeResult(generated.result, profile);
  const [row] = await ConsumptionDna.upsert({
    user_id: userId,
    month: range.month,
    nickname: normalized.nickname,
    emoji: normalized.emoji,
    summary: normalized.summary,
    dimensions: normalized.dimensions,
    top_categories: normalized.topCategories,
    model: generated.model,
    response_id: generated.responseId,
  });

  return toResponse(row, false);
}

export async function getConsumptionDnaMap(userIds, month) {
  const rows = await ConsumptionDna.findAll({
    where: {
      user_id: { [Op.in]: userIds },
      month: getMonthRange(month).month,
    },
  });

  return new Map(
    rows.map((row) => [
      Number(row.user_id),
      { nickname: row.nickname, emoji: row.emoji },
    ]),
  );
}
