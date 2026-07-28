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

// 통신·구독은 월 1회 고정/정기 결제라 "특정 요일 무지출·한도" 챌린지가 사실상 항상
// 달성되거나 의미가 없다. 그래서 일일 챌린지 후보에서 제외한다.
const NON_DAILY_CATEGORIES = new Set(["통신", "구독"]);

// 일일 챌린지로 낼 수 있는 카테고리(통신·구독 등 월 고정 결제 제외).
const DAILY_CHALLENGE_CATEGORIES = new Set([
  "식비",
  "카페·간식",
  "교통",
  "배달",
  "쇼핑",
  "문화",
]);

// 식비·교통은 매일 필요한 지출이라 완전 무지출이 비현실적 → 항상 한도형(MAX_SPEND).
const ESSENTIAL_DAILY_CATEGORIES = new Set(["식비", "교통"]);

// 무지출(NO_SPEND)은 자주 쓰는 카테고리에만 배정해야 실제 도전이 된다. 가끔 쓰는
// 카테고리(쇼핑·문화 등)는 원래 그날 안 쓸 확률이 높아 무지출이 시시하므로 한도형으로 만든다.
// 최근 30일 중 이 일수 이상 결제한 카테고리만 무지출 챌린지 후보로 본다.
const FREQUENT_ACTIVE_DAYS = 8;

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

function roundToUnit(value, unit) {
  return Math.round(value / unit) * unit;
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
    .filter((stat) => stat.transactionCount > 0 && DAILY_CHALLENGE_CATEGORIES.has(stat.categoryName))
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
function decideChallengeType(category) {
  // 식비·교통은 완전 무지출이 비현실적이라 항상 한도형.
  if (ESSENTIAL_DAILY_CATEGORIES.has(category.categoryName)) return "MAX_SPEND";
  // 자주 쓰는 카테고리만 무지출이 진짜 도전이 된다. 그 외는 한도형.
  return category.activeDayCount >= FREQUENT_ACTIVE_DAYS ? "NO_SPEND" : "MAX_SPEND";
}

function buildChallengeForCategory(category) {
  const avg = Math.max(0, Math.round(category.avgPerActiveDay));

  if (decideChallengeType(category) === "MAX_SPEND") {
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

// (카테고리, 날짜)로 고정된 인덱스를 뽑아, 문구가 매번 같지 않으면서도 재생성 시엔
// 동일하게 나오도록 한다(멱등). 카테고리 뒤에는 항상 `지출`을 붙여 조사 오류를 피한다.
function pickVariant(variants, seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index)) % 100000;
  }
  return variants[hash % variants.length];
}

/**
 * 챌린지 문구를 서버에서 결정론적으로 생성한다. "~해요" 톤으로 통일하되, 절약 금액을
 * 함께 노출하고 타입별로 여러 문구를 돌려 "대충 찍어낸" 느낌을 줄인다.
 */
function buildChallengeText(planItem) {
  const category = planItem.categoryName;
  const saving = formatWon(planItem.estimatedSavingAmount);
  const seed = `${planItem.date}-${category}`;

  if (planItem.challengeType === "NO_SPEND") {
    return {
      title: pickVariant([
        `${category} 무지출 챌린지에 도전해요`,
        `${category} 결제 없이 지갑을 지켜요`,
        `${category} 지출 없이 하루를 보내요`,
      ], seed),
      description: pickVariant([
        `${category} 결제를 하루만 쉬면 평소 이만큼 쓰던 약 ${saving}을 아낄 수 있어요.`,
        `${category} 무지출에 성공하면 약 ${saving}이 그대로 남아요.`,
      ], seed),
    };
  }

  const target = formatWon(planItem.targetAmount);
  return {
    title: pickVariant([
      `${category} 지출 ${target} 이하로 아껴 써요`,
      `${category} 지출을 ${target}까지만 써요`,
      `${category} 지출은 ${target} 안에서 해결해요`,
    ], seed),
    description: pickVariant([
      `평소보다 조금만 줄여서 ${category} 지출을 ${target} 이하로 유지하면 약 ${saving}을 아낄 수 있어요.`,
      `${category} 지출을 ${target} 안에서 마무리하면 약 ${saving}이 남아요.`,
    ], seed),
  };
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

    const challengePlan = buildChallengePlan(context.categories, weekDates);
    const createdAt = new Date();
    await AiChallenge.bulkCreate(challengePlan.map((challenge) => {
      const text = buildChallengeText(challenge);
      const isExpired = challenge.date < addDays(today, -1);
      return {
        user_id: userId,
        expense_category_id: challenge.categoryId,
        challenge_date: challenge.date,
        challenge_type: challenge.challengeType,
        title: text.title,
        description: text.description,
        target_amount: challenge.targetAmount,
        estimated_saving_amount: challenge.estimatedSavingAmount,
        point: 100,
        start_date: challenge.date,
        end_date: challenge.date,
        // 전날 미션까지는 다음 날에 사용자가 판정할 수 있게 두고,
        // 전전날 이전 미션만 이미 만료된 것으로 처리한다.
        status: isExpired ? "FAIL" : "IN_PROGRESS",
        finalized_at: isExpired ? createdAt : null,
      };
    }), { transaction });

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
