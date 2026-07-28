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
const RECENT_WINDOW_DAYS = 30;
const WEEKLY_MISSION_COUNT = 5;
const POINT_PER_MISSION = 100;
const DISCRETIONARY_CATEGORIES = new Set(["카페·간식", "배달", "쇼핑", "문화", "구독"]);

export class ChallengeError extends Error {
  constructor(message, status = 400, code = "CHALLENGE_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

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

function getKoreanRange(startDate, endDate) {
  return {
    start: new Date(`${startDate}T00:00:00.000+09:00`),
    end: new Date(`${endDate}T00:00:00.000+09:00`),
  };
}

function formatWon(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ko-KR")}원`;
}

function roundDown(value, unit) {
  return Math.floor(value / unit) * unit;
}

function getVerificationWindow(weekStart) {
  return {
    opensAt: `${addDays(weekStart, 5)}T00:00:00+09:00`,
    closesAt: `${addDays(weekStart, 7)}T00:00:00+09:00`,
  };
}

function isVerificationOpen(weekStart, today = getKoreanDateParts().date) {
  return today >= addDays(weekStart, 5) && today < addDays(weekStart, 7);
}

function periodLabel(periodKind) {
  return periodKind === "PREVIOUS_WEEK" ? "저번 주" : "최근 30일";
}

function categoryExpression(categoryName) {
  const expressions = {
    "카페·간식": { subject: "커피", countAction: "마셨네요", counter: "잔" },
    "배달": { subject: "배달 주문", countAction: "했네요", counter: "번" },
    "쇼핑": { subject: "쇼핑 결제", countAction: "했네요", counter: "번" },
    "문화": { subject: "문화생활 결제", countAction: "했네요", counter: "번" },
    "교통": { subject: "교통 결제", countAction: "했네요", counter: "번" },
    "식비": { subject: "식사 결제", countAction: "했네요", counter: "번" },
    "구독": { subject: "구독 결제", countAction: "했네요", counter: "번" },
    "통신": { subject: "통신 결제", countAction: "했네요", counter: "번" },
  };
  return expressions[categoryName] || {
    subject: `${categoryName} 결제`,
    countAction: "했네요",
    counter: "번",
  };
}

function countMissionContent(categoryName, baselineCount, targetCount, label) {
  const expression = categoryExpression(categoryName);
  return `${label}에는 ${expression.subject}를 ${baselineCount}${expression.counter} ${expression.countAction}. 이번 주에는 ${expression.subject}를 ${targetCount}${expression.counter}으로 줄여볼까요?`;
}

function spendMissionContent(categoryName, baselineAmount, targetAmount, label) {
  return `${label}에는 ${categoryName}에 ${formatWon(baselineAmount)}을 썼네요. 이번 주에는 ${formatWon(targetAmount)} 안으로 줄여볼까요?`;
}

function noSpendMissionContent(categoryName, baselineCount, label) {
  const expression = categoryExpression(categoryName);
  return `${label}에는 ${expression.subject}를 ${baselineCount}${expression.counter} ${expression.countAction}. 이번 주에는 잠시 쉬어볼까요?`;
}

export function buildMissionContent(challenge) {
  const baselineStart = challenge.baseline_period_start;
  const baselineEnd = challenge.baseline_period_end;
  const periodDays = baselineStart && baselineEnd
    ? Math.round(
      (new Date(`${baselineEnd}T12:00:00Z`) - new Date(`${baselineStart}T12:00:00Z`))
      / (24 * 60 * 60 * 1000),
    ) + 1
    : 7;
  const label = periodDays > 7 ? "최근 30일" : "지난 주";
  const categoryName = challenge.ExpenseCategory?.name || "해당 카테고리";

  if (challenge.challenge_type === "MAX_COUNT") {
    return countMissionContent(
      categoryName,
      Number(challenge.baseline_count),
      Number(challenge.target_count),
      label,
    );
  }
  if (challenge.challenge_type === "MAX_SPEND") {
    return spendMissionContent(
      categoryName,
      Number(challenge.baseline_amount),
      Number(challenge.target_amount),
      label,
    );
  }
  return noSpendMissionContent(categoryName, Number(challenge.baseline_count), label);
}

async function getGenerationContext(userId, weekStart, transaction) {
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = weekStart;
  const previousRange = getKoreanRange(previousWeekStart, previousWeekEnd);
  const previousTransactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: { [Op.gte]: previousRange.start, [Op.lt]: previousRange.end },
    },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
    transaction,
  });

  let sourceTransactions = previousTransactions;
  let periodStart = previousWeekStart;
  let periodEnd = addDays(previousWeekEnd, -1);
  let periodKind = "PREVIOUS_WEEK";

  if (!sourceTransactions.length) {
    periodStart = addDays(weekStart, -RECENT_WINDOW_DAYS);
    periodEnd = addDays(weekStart, -1);
    periodKind = "RECENT_30_DAYS";
    const fallbackRange = getKoreanRange(periodStart, weekStart);
    sourceTransactions = await TransactionHistory.findAll({
      where: {
        user_id: userId,
        trans_dtime: { [Op.gte]: fallbackRange.start, [Op.lt]: fallbackRange.end },
      },
      include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
      transaction,
    });
  }

  if (!sourceTransactions.length) return null;

  const selections = await UserExpenseCategory.findAll({
    where: { user_id: userId },
    attributes: ["expense_category_id"],
    transaction,
  });
  const selectedIds = new Set(selections.map((item) => Number(item.expense_category_id)));
  const stats = new Map();

  for (const item of sourceTransactions) {
    if (!item.expense_category_id || !item.ExpenseCategory?.name) continue;
    const categoryId = Number(item.expense_category_id);
    const current = stats.get(categoryId) || {
      categoryId,
      categoryName: item.ExpenseCategory.name,
      baselineCount: 0,
      baselineAmount: 0,
      selected: selectedIds.has(categoryId),
    };
    current.baselineCount += 1;
    current.baselineAmount += Number(item.trans_amt);
    stats.set(categoryId, current);
  }

  const categories = [...stats.values()].sort((a, b) => (
    Number(b.selected) - Number(a.selected)
    || b.baselineCount - a.baselineCount
    || b.baselineAmount - a.baselineAmount
  ));
  if (!categories.length) return null;

  return { categories, periodStart, periodEnd, periodKind };
}

function buildCountMission(category, context) {
  const targetCount = Math.max(0, category.baselineCount - 1);
  const averageAmount = Math.round(category.baselineAmount / Math.max(1, category.baselineCount));
  const label = periodLabel(context.periodKind);
  const content = countMissionContent(
    category.categoryName,
    category.baselineCount,
    targetCount,
    label,
  );
  return {
    challengeType: "MAX_COUNT",
    targetCount,
    targetAmount: null,
    estimatedSavingAmount: averageAmount,
    content,
  };
}

function buildSpendMission(category, context) {
  const rawTarget = category.baselineAmount * 0.85;
  let targetAmount = Math.max(1000, roundDown(rawTarget, 1000));
  if (targetAmount >= category.baselineAmount) {
    targetAmount = Math.max(0, category.baselineAmount - 1000);
  }
  const label = periodLabel(context.periodKind);
  const content = spendMissionContent(
    category.categoryName,
    category.baselineAmount,
    targetAmount,
    label,
  );
  return {
    challengeType: "MAX_SPEND",
    targetCount: null,
    targetAmount,
    estimatedSavingAmount: Math.max(0, category.baselineAmount - targetAmount),
    content,
  };
}

function buildNoSpendMission(category, context) {
  const label = periodLabel(context.periodKind);
  const content = noSpendMissionContent(
    category.categoryName,
    category.baselineCount,
    label,
  );
  return {
    challengeType: "NO_SPEND",
    targetCount: 0,
    targetAmount: null,
    estimatedSavingAmount: category.baselineAmount,
    content,
  };
}

function buildChallengePlan(context, weekStart) {
  const plan = [];
  for (let index = 0; index < WEEKLY_MISSION_COUNT; index += 1) {
    const category = context.categories[index % context.categories.length];
    const categoryUseCount = Math.floor(index / context.categories.length);
    let mission;
    if (category.baselineCount >= 2 && categoryUseCount % 2 === 0) {
      mission = buildCountMission(category, context);
    } else if (
      category.baselineCount === 1
      && DISCRETIONARY_CATEGORIES.has(category.categoryName)
      && categoryUseCount % 2 === 0
    ) {
      mission = buildNoSpendMission(category, context);
    } else {
      mission = buildSpendMission(category, context);
    }

    plan.push({
      ...mission,
      sequence: index + 1,
      challengeDate: addDays(weekStart, index),
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      baselineCount: category.baselineCount,
      baselineAmount: category.baselineAmount,
    });
  }
  return plan;
}

export async function createWeeklyChallenges(userId, weekStart) {
  return sequelize.transaction(async (transaction) => {
    await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    const existingChallenges = await AiChallenge.findAll({
      where: { user_id: userId, week_start_date: weekStart },
      order: [["sequence", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const isReplaceableLegacySet = existingChallenges.length === WEEKLY_MISSION_COUNT
      && existingChallenges.every((item) => item.status === "IN_PROGRESS")
      && existingChallenges.every((item) => !item.baseline_period_start);
    if (isReplaceableLegacySet) {
      await AiChallenge.destroy({
        where: { id: { [Op.in]: existingChallenges.map((item) => item.id) } },
        transaction,
      });
    } else if (existingChallenges.length === WEEKLY_MISSION_COUNT) {
      return { created: false, onboardingRequired: false };
    }
    if (existingChallenges.length > 0 && !isReplaceableLegacySet) {
      throw new Error("A partial weekly challenge set already exists");
    }

    const context = await getGenerationContext(userId, weekStart, transaction);
    if (!context) return { created: false, onboardingRequired: true };

    const weekEnd = addDays(weekStart, 4);
    const plan = buildChallengePlan(context, weekStart);
    await AiChallenge.bulkCreate(plan.map((challenge) => ({
      user_id: userId,
      week_start_date: weekStart,
      sequence: challenge.sequence,
      challenge_date: challenge.challengeDate,
      expense_category_id: challenge.categoryId,
      challenge_type: challenge.challengeType,
      title: challenge.content,
      description: null,
      baseline_period_start: context.periodStart,
      baseline_period_end: context.periodEnd,
      baseline_count: challenge.baselineCount,
      baseline_amount: challenge.baselineAmount,
      target_count: challenge.targetCount,
      target_amount: challenge.targetAmount,
      estimated_saving_amount: challenge.estimatedSavingAmount,
      point: POINT_PER_MISSION,
      start_date: weekStart,
      end_date: weekEnd,
      status: "IN_PROGRESS",
    })), { transaction });

    return { created: true, onboardingRequired: false };
  });
}

export async function finalizePastChallenges() {
  const currentWeekStart = toMonday(getKoreanDateParts().date);
  await AiChallenge.update(
    { status: "IN_PROGRESS", verification_requested_at: null },
    {
      where: {
        week_start_date: { [Op.gte]: currentWeekStart },
        status: "PENDING_VERIFICATION",
      },
    },
  );
  await AiChallenge.update(
    { status: "FAIL", finalized_at: new Date(), verification_requested_at: null },
    {
      where: {
        week_start_date: { [Op.lt]: currentWeekStart },
        status: { [Op.in]: ["IN_PROGRESS", "PENDING_VERIFICATION"] },
      },
    },
  );
}

export function getWeeklyProgress(challenges) {
  const successfulCount = challenges.filter((item) => item.status === "SUCCESS").length;
  const failedCount = challenges.filter((item) => item.status === "FAIL").length;
  return {
    totalCount: challenges.length,
    completedCount: successfulCount,
    successCount: successfulCount,
    failedCount,
    weeklyProgressRate: challenges.length
      ? Math.floor((successfulCount / challenges.length) * 100)
      : 0,
  };
}

export async function getWeeklyCurrentStats(userId, weekStart, challenges) {
  const transactions = await getVerificationTransactions(userId, weekStart);
  return new Map(challenges.map((challenge) => {
    const stats = getMissionStats(challenge, transactions);
    return [Number(challenge.id), stats];
  }));
}

async function getVerificationTransactions(userId, weekStart, transaction) {
  const range = getKoreanRange(weekStart, addDays(weekStart, 5));
  return TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: { [Op.gte]: range.start, [Op.lt]: range.end },
    },
    transaction,
  });
}

function getMissionStats(challenge, transactions) {
  const categoryTransactions = transactions.filter(
    (item) => Number(item.expense_category_id) === Number(challenge.expense_category_id),
  );
  return {
    transactionCount: categoryTransactions.length,
    spentAmount: categoryTransactions.reduce((sum, item) => sum + Number(item.trans_amt), 0),
  };
}

function satisfiesChallenge(challenge, stats) {
  if (challenge.challenge_type === "NO_SPEND") return stats.transactionCount === 0;
  if (challenge.challenge_type === "MAX_COUNT") {
    return stats.transactionCount <= Number(challenge.target_count);
  }
  if (challenge.challenge_type === "MAX_SPEND") {
    return stats.spentAmount <= Number(challenge.target_amount);
  }
  return false;
}

async function rewardSuccessfulChallenge(challenge, user, transaction, now) {
  const [ledger, created] = await PointLedger.findOrCreate({
    where: { source_type: "AI_CHALLENGE", source_id: challenge.id },
    defaults: {
      user_id: challenge.user_id,
      amount: challenge.point,
    },
    transaction,
  });
  if (created) {
    await user.increment("total_points", { by: Number(ledger.amount), transaction });
  }
  await challenge.update({
    status: "SUCCESS",
    completed_at: now,
    finalized_at: now,
    rewarded_at: challenge.rewarded_at || now,
  }, { transaction });
}

export async function verifyWeeklyChallenges(userId) {
  await finalizePastChallenges();
  const today = getKoreanDateParts().date;
  const weekStart = toMonday(today);
  if (!isVerificationOpen(weekStart, today)) {
    throw new ChallengeError(
      "주간 미션은 토요일 00:00부터 인증할 수 있습니다.",
      409,
      "CHALLENGE_VERIFICATION_NOT_OPEN",
    );
  }

  return sequelize.transaction(async (transaction) => {
    const challenges = await AiChallenge.findAll({
      where: { user_id: userId, week_start_date: weekStart },
      order: [["sequence", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (challenges.length !== WEEKLY_MISSION_COUNT) {
      throw new ChallengeError("이번 주 챌린지를 찾을 수 없습니다.", 404, "CHALLENGE_NOT_FOUND");
    }

    const alreadyResolved = challenges.every((item) => ["SUCCESS", "FAIL"].includes(item.status));
    if (!alreadyResolved) {
      const transactions = await getVerificationTransactions(userId, weekStart, transaction);
      const unclassified = transactions
        .filter((item) => !item.expense_category_id)
        .map((item) => ({
          id: Number(item.id),
          merchantName: item.merchant_name,
          amount: Number(item.trans_amt),
          approvedAt: item.trans_dtime,
        }));
      if (unclassified.length) {
        throw new ChallengeError(
          "미분류 거래를 먼저 분류해주세요.",
          409,
          "TRANSACTION_CLASSIFICATION_REQUIRED",
          unclassified,
        );
      }

      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const now = new Date();
      for (const challenge of challenges) {
        if (["SUCCESS", "FAIL"].includes(challenge.status)) continue;
        const stats = getMissionStats(challenge, transactions);
        if (satisfiesChallenge(challenge, stats)) {
          await rewardSuccessfulChallenge(challenge, user, transaction, now);
        } else {
          await challenge.update({ status: "FAIL", finalized_at: now }, { transaction });
        }
      }
    }

    const successfulCount = challenges.filter((item) => item.status === "SUCCESS").length;
    return {
      weekStart,
      challenges,
      successfulCount,
      totalCount: challenges.length,
      earnedPoints: challenges
        .filter((item) => item.status === "SUCCESS")
        .reduce((sum, item) => sum + Number(item.point), 0),
      showCelebration: !alreadyResolved && successfulCount > 0,
    };
  });
}

export async function getOrCreateWeeklyChallenges(
  userId,
  referenceDate = getKoreanDateParts().date,
) {
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
    where: { user_id: userId, week_start_date: weekStart },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
    order: [["sequence", "ASC"]],
  });
  const verification = getVerificationWindow(weekStart);
  const allResolved = challenges.length > 0
    && challenges.every((item) => ["SUCCESS", "FAIL"].includes(item.status));

  return {
    weekStart,
    weekEnd: addDays(weekStart, 4),
    currentDate,
    onboardingRequired,
    challenges,
    verificationOpensAt: verification.opensAt,
    verificationClosesAt: verification.closesAt,
    canVerify: isCurrentWeek
      && isVerificationOpen(weekStart, currentDate)
      && !allResolved
      && challenges.length === WEEKLY_MISSION_COUNT,
  };
}

export async function generateCurrentWeekChallengesForEligibleUsers() {
  const { date, weekday } = getKoreanDateParts();
  if (weekday !== "Mon") return;
  const users = await User.findAll({
    where: { mydata_connected: true },
    attributes: ["id"],
  });
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
    const isScheduledWindow = hour > 0 || (hour === 0 && minute >= 10);
    if (weekday !== "Mon" || !isScheduledWindow || lastRunKey === date) return;
    lastRunKey = date;
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
    if (lastRunKey === date) return;
    lastRunKey = date;
    await finalizePastChallenges();
  };
  finalizePastChallenges().catch((error) => {
    console.error("Challenge finalization recovery failed:", error);
  });
  tick().catch((error) => console.error("Challenge finalization scheduler failed:", error));
  return setInterval(() => {
    tick().catch((error) => console.error("Challenge finalization scheduler failed:", error));
  }, 60_000);
}

export function getKoreanToday() {
  return getKoreanDateParts().date;
}
