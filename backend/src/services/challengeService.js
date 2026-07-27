import { Op } from "sequelize";

import {
  AiChallenge,
  ExpenseCategory,
  TransactionHistory,
  User,
  UserExpenseCategory,
} from "../models/index.js";
import { sequelize } from "../db.js";

const KOREA_TIME_ZONE = "Asia/Seoul";
const CHALLENGE_TYPES = new Set(["NO_SPEND", "MAX_SPEND"]);

// 통신·구독은 월 1회 고정/정기 결제라 "특정 요일 무지출·한도" 챌린지가 사실상 항상
// 달성되거나 의미가 없다. 그래서 일일 챌린지 후보에서 제외한다.
const NON_DAILY_CATEGORIES = new Set(["통신", "구독"]);

// 카테고리별 일일 챌린지 성격.
// - MAX_SPEND: 거의 매일 쓰게 되는 지출이라 완전 무지출은 비현실적 → 평소보다 줄이는 한도형.
// - NO_SPEND: 간헐적 지출이라 하루 건너뛰기가 현실적이고 검증도 명확하다.
const CATEGORY_CHALLENGE_MODE = {
  식비: "MAX_SPEND",
  "카페·간식": "MAX_SPEND",
  교통: "MAX_SPEND",
  배달: "NO_SPEND",
  쇼핑: "NO_SPEND",
  문화: "NO_SPEND",
};

// 일일 챌린지로 의미가 있으려면 최근 30일 동안 어느 정도 반복된 소비 습관이어야 한다.
const RECENT_WINDOW_DAYS = 30;
const MIN_TRANSACTIONS_FOR_CHALLENGE = 3;

function getKoreanDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    weekday: values.weekday,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function getKoreanDateString(date) {
  return getKoreanDateParts(date).date;
}

function toMonday(dateString) {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekDates(weekStart) {
  return Array.from({ length: 5 }, (_, index) => addDays(weekStart, index));
}

function formatWon(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ko-KR")}원`;
}

function roundToUnit(value, unit) {
  return Math.round(value / unit) * unit;
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return (data.output || [])
    .flatMap((output) => output.content || [])
    .map((content) => content.text || "")
    .join("");
}

/**
 * 최근 30일 거래로 카테고리별 소비 통계를 구하고, 일일 챌린지로 의미 있는
 * 카테고리만 추려서 반환한다. (통신·구독 등 월 고정 카테고리 제외)
 */
async function getGenerationContext(userId, transaction) {
  const selectedCategories = await UserExpenseCategory.findAll({
    where: { user_id: userId },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
    transaction,
  });

  const candidateCategories = selectedCategories.length
    ? selectedCategories.map((selection) => selection.ExpenseCategory)
    : await ExpenseCategory.findAll({ attributes: ["id", "name"], transaction });

  const since = new Date();
  since.setDate(since.getDate() - RECENT_WINDOW_DAYS);
  const transactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: { [Op.gte]: since },
    },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
    transaction,
  });

  if (!transactions.length) {
    return null;
  }

  const statsByName = new Map(
    candidateCategories
      .filter((category) => !NON_DAILY_CATEGORIES.has(category.name))
      .map((category) => [category.name, {
        categoryId: Number(category.id),
        categoryName: category.name,
        totalAmount: 0,
        transactionCount: 0,
        activeDays: new Set(),
      }]),
  );

  for (const item of transactions) {
    const name = item.ExpenseCategory?.name;
    const stat = statsByName.get(name);
    if (!stat) continue;
    stat.totalAmount += Number(item.trans_amt);
    stat.transactionCount += 1;
    stat.activeDays.add(getKoreanDateString(item.trans_dtime));
  }

  const categories = [...statsByName.values()]
    .filter((stat) => stat.transactionCount > 0 && CATEGORY_CHALLENGE_MODE[stat.categoryName])
    .map((stat) => {
      const activeDayCount = stat.activeDays.size || 1;
      return {
        categoryId: stat.categoryId,
        categoryName: stat.categoryName,
        totalAmount: stat.totalAmount,
        transactionCount: stat.transactionCount,
        activeDayCount,
        avgPerActiveDay: Math.round(stat.totalAmount / activeDayCount),
      };
    });

  // 반복 소비 습관(3건 이상)이 있는 카테고리를 우선하고, 없으면 소비가 있는 카테고리라도 사용한다.
  const habitual = categories.filter((category) => category.transactionCount >= MIN_TRANSACTIONS_FOR_CHALLENGE);
  const usable = (habitual.length ? habitual : categories)
    .sort((a, b) => b.transactionCount - a.transactionCount);

  if (!usable.length) {
    return null;
  }

  return { categories: usable };
}

/**
 * 카테고리의 실제 소비 통계로 달성 가능한 챌린지(타입·한도·예상 절약액)를 산출한다.
 * 숫자를 AI가 임의로 만들지 않도록 서버가 결정한다.
 */
function buildChallengeForCategory(category) {
  const mode = CATEGORY_CHALLENGE_MODE[category.categoryName] || "NO_SPEND";
  const avg = Math.max(0, Math.round(category.avgPerActiveDay));

  if (mode === "MAX_SPEND") {
    // 평소 하루 지출의 약 70% 수준으로 한도를 잡아 "완전히 끊기"가 아닌 현실적 절감으로 만든다.
    let targetAmount = Math.max(500, roundToUnit(avg * 0.7, 500));
    if (targetAmount >= avg) {
      targetAmount = Math.max(500, Math.floor((avg - 1) / 500) * 500);
    }
    const estimatedSavingAmount = Math.max(0, avg - targetAmount);

    if (estimatedSavingAmount > 0) {
      return { challengeType: "MAX_SPEND", targetAmount, estimatedSavingAmount };
    }
    // 한도형으로 만들 만한 여지가 없으면(평균이 너무 작음) 무지출형으로 전환한다.
  }

  return { challengeType: "NO_SPEND", targetAmount: null, estimatedSavingAmount: avg };
}

/**
 * 요일마다 카테고리를 배정하고(연속 중복 회피), 카테고리 통계로 챌린지 내용을 확정한다.
 */
function buildChallengePlan(categories, weekDates) {
  if (!categories.length) {
    throw new Error("No eligible expense categories for challenge generation");
  }

  const challengeByCategory = new Map(
    categories.map((category) => [category.categoryName, {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      ...buildChallengeForCategory(category),
    }]),
  );

  const names = categories.map((category) => category.categoryName);
  const plan = [];
  let cursor = 0;

  for (const date of weekDates) {
    let name = names[cursor % names.length];
    // 카테고리가 2개 이상이면 직전 날짜와 같은 카테고리가 연속되지 않게 한다.
    if (names.length > 1 && plan.at(-1)?.categoryName === name) {
      cursor += 1;
      name = names[cursor % names.length];
    }
    cursor += 1;
    plan.push({ date, ...challengeByCategory.get(name) });
  }

  return plan;
}

function buildFallbackText(planItem) {
  const category = planItem.categoryName;
  if (planItem.challengeType === "NO_SPEND") {
    return {
      title: `${category} 지출 없는 하루 보내기`,
      description: `오늘 하루 ${category} 결제를 하지 않으면 평소 이 카테고리에서 쓰던 약 ${formatWon(planItem.estimatedSavingAmount)}을 아낄 수 있어요.`,
    };
  }
  return {
    title: `${category} 지출 ${formatWon(planItem.targetAmount)} 이하로 쓰기`,
    description: `평소보다 조금만 줄여 오늘 ${category} 지출을 ${formatWon(planItem.targetAmount)} 이하로 유지하면 약 ${formatWon(planItem.estimatedSavingAmount)}을 아낄 수 있어요.`,
  };
}

function challengeTextSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["challenges"],
    properties: {
      challenges: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "title", "description"],
          properties: {
            date: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  };
}

/**
 * 챌린지의 카테고리·타입·금액은 서버가 확정하고, AI는 자연스러운 한글 문구만 생성한다.
 * AI 호출이 실패하거나 형식이 어긋나면 템플릿 문구로 폴백한다(챌린지 자체는 유효).
 */
async function requestChallengeTexts(plan) {
  const apiKey = process.env.OPEN_AI_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You write short, friendly Korean copy for daily saving challenges in a finance app. The category, challenge type, and amounts are already fixed by the server; only write the title and description for each date and never change the numbers. Return JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Write a title and description for each challenge in Korean.",
              rules: [
                "각 챌린지의 카테고리·타입·금액은 그대로 반영하고 다른 숫자를 지어내지 마세요.",
                "NO_SPEND는 해당 카테고리 지출을 하루 쉬는 미션입니다.",
                "MAX_SPEND는 targetAmount 이하로 지출을 줄이는 미션입니다.",
                "제목은 40자 이내, 부담 주지 않는 응원 톤으로 작성하세요.",
              ],
              challenges: plan.map((item) => ({
                date: item.date,
                category: item.categoryName,
                challengeType: item.challengeType,
                targetAmount: item.targetAmount,
                estimatedSavingAmount: item.estimatedSavingAmount,
              })),
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "challenge_texts",
            strict: true,
            schema: challengeTextSchema(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI challenge text generation failed: ${response.status}`);
    }

    const payload = await response.json();
    const parsed = JSON.parse(extractResponseText(payload));
    if (!Array.isArray(parsed.challenges)) return null;

    const byDate = new Map();
    for (const item of parsed.challenges) {
      if (typeof item?.date !== "string") continue;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";
      if (!title || !description) continue;
      byDate.set(item.date, { title: title.slice(0, 100), description });
    }
    return byDate;
  } catch (error) {
    console.error("AI challenge text generation failed, using fallback copy:", error.message);
    return null;
  }
}

export async function createWeeklyChallenges(userId, weekStart) {
  const weekDates = getWeekDates(weekStart);
  const context = await getGenerationContext(userId);
  if (!context) return { created: false, onboardingRequired: true };

  const plan = buildChallengePlan(context.categories, weekDates);
  const aiTexts = await requestChallengeTexts(plan);

  return sequelize.transaction(async (transaction) => {
    await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    const existing = await AiChallenge.count({
      where: { user_id: userId, challenge_date: { [Op.in]: weekDates } },
      transaction,
    });
    if (existing === weekDates.length) return { created: false, onboardingRequired: false };
    if (existing > 0) {
      throw new Error("A partial weekly challenge set already exists");
    }

    await AiChallenge.bulkCreate(plan.map((item) => {
      const text = aiTexts?.get(item.date) || buildFallbackText(item);
      return {
        user_id: userId,
        expense_category_id: item.categoryId,
        challenge_date: item.date,
        challenge_type: item.challengeType,
        title: text.title,
        description: text.description,
        target_amount: item.targetAmount,
        estimated_saving_amount: item.estimatedSavingAmount,
        point: 100,
        start_date: item.date,
        end_date: item.date,
        status: "IN_PROGRESS",
      };
    }), { transaction });

    return { created: true, onboardingRequired: false };
  });
}

export async function getOrCreateWeeklyChallenges(userId, referenceDate = getKoreanDateParts().date) {
  const currentDate = getKoreanDateParts().date;
  const weekStart = toMonday(referenceDate);
  const isCurrentWeek = weekStart === toMonday(currentDate);

  let onboardingRequired = false;
  if (isCurrentWeek) {
    const result = await createWeeklyChallenges(userId, weekStart);
    onboardingRequired = result.onboardingRequired;
  }

  const challenges = await AiChallenge.findAll({
    where: { user_id: userId, challenge_date: { [Op.in]: getWeekDates(weekStart) } },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
    order: [["challenge_date", "ASC"]],
  });

  return { weekStart, currentDate, onboardingRequired, challenges };
}

export async function generateCurrentWeekChallengesForEligibleUsers() {
  const { date, weekday } = getKoreanDateParts();
  if (weekday !== "Mon") return;

  const users = await User.findAll({ where: { mydata_connected: true }, attributes: ["id"] });
  for (const user of users) {
    try {
      await createWeeklyChallenges(user.id, toMonday(date));
    } catch (error) {
      console.error(`AI challenge generation failed for user ${user.id}:`, error.message);
    }
  }
}

export function startChallengeGenerationScheduler() {
  let lastRunKey = "";
  const tick = async () => {
    const { date, weekday, hour, minute } = getKoreanDateParts();
    const runKey = date;
    const isScheduledWindow = hour > 0 || (hour === 0 && minute >= 10);
    if (weekday !== "Mon" || !isScheduledWindow || lastRunKey === runKey) return;
    lastRunKey = runKey;
    await generateCurrentWeekChallengesForEligibleUsers();
  };

  tick().catch((error) => console.error("AI challenge scheduler failed:", error));
  return setInterval(() => {
    tick().catch((error) => console.error("AI challenge scheduler failed:", error));
  }, 60_000);
}

export function getKoreanToday() {
  return getKoreanDateParts().date;
}
