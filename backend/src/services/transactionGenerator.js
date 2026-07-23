const categories = [
  "식비",
  "카페·간식",
  "쇼핑",
  "배달",
  "교통",
  "구독",
  "문화",
  "통신",
];

const merchantPools = {
  식비: ["한솥도시락", "김밥천국", "본죽", "역전우동", "이마트24"],
  "카페·간식": ["스타벅스", "메가커피", "투썸플레이스", "이디야", "배스킨라빈스"],
  쇼핑: ["무신사", "쿠팡", "올리브영", "지그재그", "다이소"],
  배달: ["배달의민족", "쿠팡이츠", "요기요", "버거킹 딜리버리", "피자스쿨"],
  교통: ["카카오택시", "티머니", "코레일", "쏘카", "버스요금"],
  구독: ["넷플릭스", "유튜브 프리미엄", "멜론", "쿠팡 와우", "디즈니플러스"],
  문화: ["CGV", "메가박스", "예스24", "교보문고", "인터파크"],
  통신: ["SK텔레콤", "KT", "LG유플러스", "알뜰폰요금", "인터넷요금"],
};

const amountRanges = {
  식비: [7000, 28000],
  "카페·간식": [2500, 13000],
  쇼핑: [12000, 120000],
  배달: [15000, 42000],
  교통: [1450, 36000],
  구독: [4900, 24000],
  문화: [9000, 68000],
  통신: [28000, 85000],
};

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomAmount(category) {
  const [min, max] = amountRanges[category];
  const unit = category === "교통" ? 100 : 500;
  const value = min + Math.floor(Math.random() * ((max - min) / unit)) * unit;

  return Math.max(unit, value);
}

function randomDateWithinLastMonth() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now);

  date.setDate(now.getDate() - daysAgo);
  date.setHours(8 + Math.floor(Math.random() * 14));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

function normalizeTransaction(raw, index) {
  const category = categories.includes(raw.category) ? raw.category : "식비";
  const amount = Number(raw.amount);
  const approvedAt = new Date(raw.approvedAt);

  return {
    paymentId:
      typeof raw.paymentId === "string" && raw.paymentId.trim()
        ? raw.paymentId.trim().slice(0, 25)
        : `AI${Date.now()}${String(index).padStart(3, "0")}`.slice(0, 25),
    approvedAt: Number.isNaN(approvedAt.getTime())
      ? randomDateWithinLastMonth().toISOString()
      : approvedAt.toISOString(),
    merchantName:
      typeof raw.merchantName === "string" && raw.merchantName.trim()
        ? raw.merchantName.trim().slice(0, 75)
        : pick(merchantPools[category]),
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : randomAmount(category),
    category,
    status: "APPROVED",
  };
}

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

export async function generateTransactionsWithOpenAI() {
  const apiKey = process.env.OPEN_AI_KEY;

  if (!apiKey) {
    throw new Error("OPEN_AI_KEY is required for mydata transaction generation");
  }

  const today = new Date().toISOString().slice(0, 10);
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You generate realistic but entirely synthetic Korean card transaction data for a finance app MVP. Never include real personal data.",
        },
        {
          role: "user",
          content: `Create 42 approved transactions for the 30 days ending ${today}. Use only these categories: ${categories.join(", ")}. Use realistic Korean merchant names, varied dates, and KRW amounts. Return JSON only.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "transaction_history_seed",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["transactions"],
            properties: {
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "paymentId",
                    "approvedAt",
                    "merchantName",
                    "amount",
                    "category",
                  ],
                  properties: {
                    paymentId: {
                      type: "string",
                    },
                    approvedAt: {
                      type: "string",
                    },
                    merchantName: {
                      type: "string",
                    },
                    amount: {
                      type: "integer",
                    },
                    category: {
                      type: "string",
                      enum: categories,
                    },
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
    const errorBody = await response.text();
    const requestId = response.headers.get("x-request-id");

    throw new Error(
      `OpenAI transaction generation failed: ${response.status} ${errorBody}${requestId ? ` request_id=${requestId}` : ""}`,
    );
  }

  const data = await response.json();
  const parsed = JSON.parse(extractResponseText(data));

  return {
    source: "openai",
    transactions: parsed.transactions.map(normalizeTransaction),
  };
}

export const expenseCategories = categories;
