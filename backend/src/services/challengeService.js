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

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return (data.output || [])
    .flatMap((output) => output.content || [])
    .map((content) => content.text || "")
    .join("");
}

async function getGenerationContext(userId, transaction) {
  const selectedCategories = await UserExpenseCategory.findAll({
    where: { user_id: userId },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
    transaction,
  });

  if (!selectedCategories.length) {
    return null;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);
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
    selectedCategories.map((selection) => [selection.ExpenseCategory.name, {
      categoryId: Number(selection.ExpenseCategory.id),
      categoryName: selection.ExpenseCategory.name,
      totalAmount: 0,
      transactionCount: 0,
      averageAmount: 0,
    }]),
  );

  for (const item of transactions) {
    const name = item.ExpenseCategory?.name;
    const stat = statsByName.get(name);
    if (!stat) continue;
    stat.totalAmount += Number(item.trans_amt);
    stat.transactionCount += 1;
  }

  const categories = [...statsByName.values()].map((stat) => ({
    ...stat,
    averageAmount: stat.transactionCount
      ? Math.round(stat.totalAmount / stat.transactionCount)
      : 0,
  }));

  if (!categories.some((category) => category.transactionCount > 0)) {
    return null;
  }

  return { categories, selectedCategoryNames: categories.map((category) => category.categoryName) };
}

function challengeSchema() {
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
          required: [
            "date",
            "expenseCategoryName",
            "challengeType",
            "title",
            "description",
            "targetAmount",
            "estimatedSavingAmount",
            "point",
          ],
          properties: {
            date: { type: "string" },
            expenseCategoryName: { type: "string" },
            challengeType: { type: "string", enum: ["NO_SPEND", "MAX_SPEND"] },
            title: { type: "string" },
            description: { type: "string" },
            targetAmount: { type: ["integer", "null"] },
            estimatedSavingAmount: { type: "integer" },
            point: { type: "integer" },
          },
        },
      },
    },
  };
}

function validateChallenges(challenges, weekDates, categoryMap) {
  if (!Array.isArray(challenges) || challenges.length !== 5) return null;
  const expectedDates = new Set(weekDates);
  const seenDates = new Set();
  const normalized = [];

  for (const item of challenges) {
    if (!expectedDates.has(item.date) || seenDates.has(item.date)) return null;
    if (!categoryMap.has(item.expenseCategoryName) || !CHALLENGE_TYPES.has(item.challengeType)) return null;
    if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 100) return null;
    if (typeof item.description !== "string" || !item.description.trim()) return null;
    if (item.challengeType === "NO_SPEND" && item.targetAmount !== null) return null;
    if (item.challengeType === "MAX_SPEND" || item.targetAmount !== null) {
      if (!Number.isInteger(item.targetAmount) || item.targetAmount <= 0) return null;
    }
    if (!Number.isInteger(item.estimatedSavingAmount) || item.estimatedSavingAmount < 0) return null;
    seenDates.add(item.date);
    normalized.push({
      ...item,
      title: item.title.trim().slice(0, 100),
      description: item.description.trim(),
      estimatedSavingAmount: item.estimatedSavingAmount,
      point: 100,
    });
  }

  return seenDates.size === weekDates.length ? normalized : null;
}

async function requestWeeklyChallengesFromOpenAI(context, weekDates, retry = false) {
  const apiKey = process.env.OPEN_AI_KEY;
  if (!apiKey) {
    throw new Error("OPEN_AI_KEY is required for AI challenge generation");
  }

  const categoryMap = new Map(context.categories.map((category) => [category.categoryName, category]));
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
          content: "You create five concise Korean saving challenges for a finance app. Return JSON only. Every challenge must be objectively verifiable from transactions in exactly one expense category. Never create self-reported, receipt, or future-plan challenges.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Create exactly one weekday challenge for each requested date.",
            dates: weekDates,
            allowedCategories: context.categories,
            requirements: [
              "Use only allowed category names.",
              "Use NO_SPEND for zero transactions in the category, with targetAmount null.",
              "Use MAX_SPEND only when targetAmount is a positive integer.",
              "Avoid repeating a category on consecutive dates.",
              "Keep title under 100 Korean characters.",
              "Use point 100.",
            ],
            retry,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "weekly_ai_challenges",
          strict: true,
          schema: challengeSchema(),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI challenge generation failed: ${response.status}`);
  }

  const payload = await response.json();
  const parsed = JSON.parse(extractResponseText(payload));
  const validated = validateChallenges(parsed.challenges, weekDates, categoryMap);
  if (validated) return { challenges: validated, categoryMap };

  if (!retry) return requestWeeklyChallengesFromOpenAI(context, weekDates, true);
  throw new Error("OpenAI returned an invalid weekly challenge response");
}

export async function createWeeklyChallenges(userId, weekStart) {
  const weekDates = getWeekDates(weekStart);
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

    const context = await getGenerationContext(userId, transaction);
    if (!context) return { created: false, onboardingRequired: true };

    const { challenges, categoryMap } = await requestWeeklyChallengesFromOpenAI(context, weekDates);
    await AiChallenge.bulkCreate(challenges.map((challenge) => ({
      user_id: userId,
      expense_category_id: categoryMap.get(challenge.expenseCategoryName).categoryId,
      challenge_date: challenge.date,
      challenge_type: challenge.challengeType,
      title: challenge.title,
      description: challenge.description,
      target_amount: challenge.targetAmount,
      estimated_saving_amount: challenge.estimatedSavingAmount,
      point: challenge.point,
      start_date: challenge.date,
      end_date: challenge.date,
      status: "IN_PROGRESS",
    })), { transaction });

    return { created: true, onboardingRequired: false };
  });
}

export async function getOrCreateWeeklyChallenges(userId, referenceDate = getKoreanDateParts().date) {
  const currentDate = getKoreanDateParts().date;
  const weekStart = toMonday(referenceDate);
  const isCurrentWeek = weekStart === toMonday(currentDate);
  const isMonday = getKoreanDateParts().weekday === "Mon";

  let onboardingRequired = false;
  if (isCurrentWeek && isMonday) {
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
