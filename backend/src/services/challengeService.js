import { Op } from "sequelize";

import {
  AiChallenge,
  ExpenseCategory,
  PointLedger,
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

function getKoreanDayRange(dateString) {
  const start = new Date(`${dateString}T00:00:00.000+09:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export class ChallengeError extends Error {
  constructor(message, status = 400, code = "CHALLENGE_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function getTransactionStats(challenge, transaction) {
  const { start, end } = getKoreanDayRange(challenge.challenge_date);
  const where = {
    user_id: challenge.user_id,
    trans_dtime: { [Op.gte]: start, [Op.lt]: end },
  };
  const [categoryTransactions, unclassifiedTransactions] = await Promise.all([
    TransactionHistory.findAll({
      where: { ...where, expense_category_id: challenge.expense_category_id },
      transaction,
    }),
    TransactionHistory.findAll({
      where: { ...where, expense_category_id: null },
      attributes: ["id", "merchant_name", "trans_amt", "trans_dtime"],
      transaction,
    }),
  ]);
  const spentAmount = categoryTransactions.reduce((sum, item) => sum + Number(item.trans_amt), 0);
  return {
    spentAmount,
    transactionCount: categoryTransactions.length,
    unclassifiedTransactions,
  };
}

function satisfiesChallenge(challenge, stats) {
  if (challenge.challenge_type === "NO_SPEND") return stats.transactionCount === 0;
  if (challenge.challenge_type === "MAX_SPEND") return stats.spentAmount <= Number(challenge.target_amount);
  return false;
}

export async function getChallengeProgress(userId, challenge) {
  if (Number(challenge.user_id) !== Number(userId)) {
    throw new ChallengeError("챌린지를 찾을 수 없습니다.", 404, "CHALLENGE_NOT_FOUND");
  }
  const stats = await getTransactionStats(challenge);
  const { date: today } = getKoreanDateParts();
  const targetAmount = challenge.target_amount === null ? null : Number(challenge.target_amount);
  const progressRate = challenge.challenge_type === "MAX_SPEND"
    ? Math.min(100, Math.floor((stats.spentAmount / targetAmount) * 100))
    : stats.transactionCount > 0 ? 100 : 0;
  return {
    challengeId: Number(challenge.id),
    status: challenge.status,
    challengeType: challenge.challenge_type,
    spentAmount: stats.spentAmount,
    targetAmount,
    transactionCount: stats.transactionCount,
    progressRate,
    unclassifiedTransactionCount: stats.unclassifiedTransactions.length,
    canVerify: challenge.challenge_date === addDays(today, -1) && challenge.status === "IN_PROGRESS",
    verificationOpensAt: `${addDays(challenge.challenge_date, 1)}T00:00:00+09:00`,
  };
}

export function getWeeklyProgress(challenges) {
  const successCount = challenges.filter((item) => item.status === "SUCCESS").length;
  const resolvedCount = challenges.filter((item) => ["SUCCESS", "FAIL"].includes(item.status)).length;
  return {
    totalCount: challenges.length,
    // 화면의 "N/5 완료"는 미션을 성공한 횟수만 뜻한다.
    completedCount: successCount,
    successCount,
    failedCount: resolvedCount - successCount,
    weeklyProgressRate: challenges.length ? Math.floor((successCount / challenges.length) * 100) : 0,
    successRate: resolvedCount ? Math.floor((successCount / resolvedCount) * 100) : 0,
  };
}

async function resolveChallenge(challenge, transaction) {
  const stats = await getTransactionStats(challenge, transaction);
  if (stats.unclassifiedTransactions.length) {
    throw new ChallengeError("미분류 거래를 먼저 분류해주세요.", 409, "TRANSACTION_CLASSIFICATION_REQUIRED", stats.unclassifiedTransactions);
  }

  const now = new Date();
  if (!satisfiesChallenge(challenge, stats)) {
    await challenge.update({ status: "FAIL", finalized_at: now }, { transaction });
    return challenge;
  }

  const user = await User.findByPk(challenge.user_id, { transaction, lock: transaction.LOCK.UPDATE });
  await PointLedger.create({
    user_id: challenge.user_id,
    source_type: "AI_CHALLENGE",
    source_id: challenge.id,
    amount: challenge.point,
  }, { transaction });
  await user.increment("total_points", { by: Number(challenge.point), transaction });
  await challenge.update({
    status: "SUCCESS",
    completed_at: now,
    finalized_at: now,
    rewarded_at: now,
  }, { transaction });
  return challenge;
}

export async function finalizePastChallenges() {
  const { date: today } = getKoreanDateParts();
  // 전날은 사용자가 다음 날 00:00부터 직접 판정할 수 있도록 유지한다.
  // 그 다음 날 00:00부터 미인증 미션을 미완료로 마감한다.
  await AiChallenge.update(
    { status: "IN_PROGRESS", verification_requested_at: null },
    {
      where: {
        challenge_date: { [Op.gte]: addDays(today, -1) },
        status: "PENDING_VERIFICATION",
      },
    },
  );
  await AiChallenge.update(
    { status: "FAIL", finalized_at: new Date(), verification_requested_at: null },
    {
      where: {
        challenge_date: { [Op.lte]: addDays(today, -2) },
        status: { [Op.in]: ["IN_PROGRESS", "PENDING_VERIFICATION"] },
      },
    },
  );
}

export async function verifyChallenge(userId, challengeId) {
  await finalizePastChallenges();
  return sequelize.transaction(async (transaction) => {
    const challenge = await AiChallenge.findOne({
      where: { id: challengeId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!challenge) throw new ChallengeError("챌린지를 찾을 수 없습니다.", 404, "CHALLENGE_NOT_FOUND");
    if (challenge.status !== "IN_PROGRESS") return { challenge, conditionFailed: challenge.status === "FAIL" };

    const { date: today } = getKoreanDateParts();
    const canVerifyYesterday = challenge.challenge_date === addDays(today, -1);
    if (!canVerifyYesterday) {
      throw new ChallengeError("수행 인증은 미션 다음 날 자정부터 할 수 있습니다.", 409, "CHALLENGE_VERIFICATION_NOT_OPEN");
    }
    const resolvedChallenge = await resolveChallenge(challenge, transaction);
    return { challenge: resolvedChallenge, conditionFailed: resolvedChallenge.status === "FAIL" };
  });
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

  const candidateCategories = selectedCategories.length
    ? selectedCategories.map((selection) => selection.ExpenseCategory)
    : await ExpenseCategory.findAll({
      attributes: ["id", "name"],
      transaction,
    });

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
    candidateCategories.map((category) => [category.name, {
      categoryId: Number(category.id),
      categoryName: category.name,
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

  return { categories };
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

function selectRandomCategoryPlan(categories, weekDates) {
  const available = [...categories];
  if (!available.length) {
    throw new Error("No expense categories are available for challenge generation");
  }
  const plan = [];

  while (plan.length < weekDates.length) {
    const shuffled = [...available];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    for (const category of shuffled) {
      if (plan.length === weekDates.length) break;
      if (plan.at(-1)?.categoryName === category.categoryName && shuffled.length > 1) continue;
      plan.push(category);
    }
  }

  return weekDates.map((date, index) => ({ date, categoryName: plan[index].categoryName }));
}

function validateChallenges(challenges, weekDates, categoryMap, categoryPlan) {
  if (!Array.isArray(challenges) || challenges.length !== 5) return null;
  const expectedDates = new Set(weekDates);
  const seenDates = new Set();
  const normalized = [];

  for (const item of challenges) {
    if (!expectedDates.has(item.date) || seenDates.has(item.date)) return null;
    const assignedCategory = categoryPlan.find((assignment) => assignment.date === item.date);
    if (
      !categoryMap.has(item.expenseCategoryName) ||
      assignedCategory?.categoryName !== item.expenseCategoryName ||
      !CHALLENGE_TYPES.has(item.challengeType)
    ) return null;
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

async function requestWeeklyChallengesFromOpenAI(context, weekDates, categoryPlan, retry = false) {
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
            categoryAssignments: categoryPlan,
            allowedCategories: context.categories,
            requirements: [
              "Use the exact category assigned to each date.",
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
  const validated = validateChallenges(parsed.challenges, weekDates, categoryMap, categoryPlan);
  if (validated) return { challenges: validated, categoryMap };

  if (!retry) return requestWeeklyChallengesFromOpenAI(context, weekDates, categoryPlan, true);
  throw new Error("OpenAI returned an invalid weekly challenge response");
}

export async function createWeeklyChallenges(userId, weekStart) {
  const weekDates = getWeekDates(weekStart);
  const { date: today } = getKoreanDateParts();
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

    const categoryPlan = selectRandomCategoryPlan(context.categories, weekDates);
    const { challenges, categoryMap } = await requestWeeklyChallengesFromOpenAI(
      context,
      weekDates,
      categoryPlan,
    );
    const createdAt = new Date();
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
      // 전날 미션까지는 다음 날에 사용자가 판정할 수 있게 두고,
      // 전전날 이전 미션만 이미 만료된 것으로 처리한다.
      status: challenge.date < addDays(today, -1) ? "FAIL" : "IN_PROGRESS",
      finalized_at: challenge.date < addDays(today, -1) ? createdAt : null,
    })), { transaction });

    return { created: true, onboardingRequired: false };
  });
}

export async function getOrCreateWeeklyChallenges(userId, referenceDate = getKoreanDateParts().date) {
  await finalizePastChallenges();
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

export function startChallengeFinalizationScheduler() {
  let lastRunKey = "";
  const tick = async () => {
    const { date } = getKoreanDateParts();
    const runKey = date;
    if (lastRunKey === runKey) return;
    lastRunKey = runKey;
    await finalizePastChallenges();
  };

  finalizePastChallenges().catch((error) => console.error("Challenge finalization recovery failed:", error));
  tick().catch((error) => console.error("Challenge finalization scheduler failed:", error));
  return setInterval(() => {
    tick().catch((error) => console.error("Challenge finalization scheduler failed:", error));
  }, 60_000);
}

export function getKoreanToday() {
  return getKoreanDateParts().date;
}
