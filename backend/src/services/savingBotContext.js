import { Op } from "sequelize";

import {
  ExpenseCategory,
  TransactionHistory,
  UserExpenseCategory,
} from "../models/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const discretionaryCategories = new Set([
  "카페·간식",
  "배달",
  "구독",
  "쇼핑",
  "문화",
]);

const categoryNameByCode = {
  "01": "카페·간식",
  "02": "식비",
  "03": "식비",
  "04": "쇼핑",
  "05": "교통",
  "06": "교통",
  "07": "쇼핑",
  "08": "문화",
  "09": "구독",
  10: "문화",
  11: "식비",
};

// 카테고리별 코칭 문구와 절약 후보 점수 계산에 사용하는 설정
const categoryConfig = {
  "카페·간식": {
    knowledgeCategory: "cafe",
    displayTerm: "커피와 간식",
    action: "평일 카페 이용",
    unitAmountCap: 15000,
    priority: 1.3,
  },
  배달: {
    knowledgeCategory: "delivery",
    displayTerm: "배달비",
    action: "배달 주문",
    unitAmountCap: 50000,
    priority: 1.25,
  },
  구독: {
    knowledgeCategory: "subscription",
    displayTerm: "구독료",
    action: "사용하지 않는 구독",
    unitAmountCap: 30000,
    priority: 1.2,
  },
  쇼핑: {
    knowledgeCategory: "shopping",
    displayTerm: "쇼핑 지출",
    action: "계획하지 않은 쇼핑",
    unitAmountCap: 100000,
    priority: 1,
  },
  식비: {
    knowledgeCategory: "dining",
    displayTerm: "외식비",
    action: "외식",
    unitAmountCap: 50000,
    priority: 0.85,
  },
  문화: {
    knowledgeCategory: "culture",
    displayTerm: "문화 생활비",
    action: "유료 문화생활",
    unitAmountCap: 70000,
    priority: 0.75,
  },
};

// 결제 금액의 대표값으로 평균보다 이상치의 영향을 덜 받는 중앙값을 사용한다.
function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle];
}

// 사용자에게 보여 줄 예상 절약 금액은 100원 단위로 정리한다.
function roundToHundred(value) {
  return Math.max(0, Math.round(value / 100) * 100);
}

// 전체 분석 기간은 최근 30일, 증감 비교 기간은 최근 14일과 그 이전 14일이다.
function getPeriod() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * DAY_MS);
  const recentStart = new Date(end.getTime() - 14 * DAY_MS);
  const previousStart = new Date(end.getTime() - 28 * DAY_MS);

  return {
    start,
    end,
    recentStart,
    previousStart,
  };
}

// 거래를 카테고리별로 묶어 금액, 빈도, 추세, 주요 가맹점을 집계한다.
function buildCategorySummary(transactions, budgetMap, period) {
  const grouped = new Map();

  for (const transaction of transactions) {
    const category =
      transaction.ExpenseCategory?.name ||
      categoryNameByCode[transaction.trans_category] ||
      "기타";
    const amount = Number(transaction.trans_amt);
    const approvedAt = new Date(transaction.trans_dtime);

    if (!grouped.has(category)) {
      grouped.set(category, {
        category,
        amounts: [],
        recentAmount: 0,
        previousAmount: 0,
        recentCount: 0,
        previousCount: 0,
        merchants: new Map(),
      });
    }

    const summary = grouped.get(category);

    summary.amounts.push(amount);
    summary.merchants.set(
      transaction.merchant_name,
      (summary.merchants.get(transaction.merchant_name) || 0) + amount,
    );

    if (approvedAt >= period.recentStart) {
      summary.recentAmount += amount;
      summary.recentCount += 1;
    } else if (approvedAt >= period.previousStart) {
      summary.previousAmount += amount;
      summary.previousCount += 1;
    }
  }

  return Array.from(grouped.values())
    .map((summary) => {
      const totalAmount = summary.amounts.reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const targetAmount = budgetMap.get(summary.category) || null;
      // 직전 14일 대비 최근 14일의 지출 증감률
      const trendRate =
        summary.previousAmount > 0
          ? Math.round(
              ((summary.recentAmount - summary.previousAmount) /
                summary.previousAmount) *
                1000,
            ) / 10
          : null;
      const topMerchants = Array.from(summary.merchants.entries())
        .map(([merchantName, amount]) => ({
          merchantName,
          amount,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      return {
        category: summary.category,
        totalAmount,
        paymentCount: summary.amounts.length,
        medianAmount: median(summary.amounts),
        recentAmount: summary.recentAmount,
        recentCount: summary.recentCount,
        previousAmount: summary.previousAmount,
        previousCount: summary.previousCount,
        trendRate,
        targetAmount,
        budgetUsageRate:
          targetAmount && targetAmount > 0
            ? Math.round((totalAmount / targetAmount) * 1000) / 10
            : null,
        topMerchants,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

// 한 카테고리의 지출 요약을 코칭 후보와 우선순위 점수로 변환한다.
function buildCandidate(summary, totalAmount) {
  const config = categoryConfig[summary.category];

  if (!config || summary.paymentCount < 2 || summary.totalAmount < 5000) {
    return null;
  }

  const representativeAmount = Math.min(
    summary.medianAmount,
    config.unitAmountCap,
  );
  // 최근 결제 빈도가 높을 때만 감축 횟수를 2회로 제안한다.
  const recommendedReductionCount = summary.recentCount >= 6 ? 2 : 1;
  const estimatedSavingAmount = roundToHundred(
    representativeAmount * recommendedReductionCount,
  );
  const spendingShare = totalAmount > 0 ? summary.totalAmount / totalAmount : 0;
  const budgetPressure =
    summary.budgetUsageRate === null
      ? 0
      : Math.min(summary.budgetUsageRate / 100, 1.5);
  const frequencyScore = Math.min(summary.recentCount / 6, 1.5);
  const trendScore =
    summary.trendRate === null
      ? 0
      : Math.max(0, Math.min(summary.trendRate / 100, 1));
  // 지출 비중, 예산 압박, 결제 빈도, 증가 추세를 합산한 뒤
  // 카테고리별 실천 용이도(priority)를 반영해 추천 순서를 정한다.
  const score =
    (spendingShare * 35 +
      budgetPressure * 25 +
      frequencyScore * 25 +
      trendScore * 15) *
    config.priority;

  return {
    category: summary.category,
    knowledgeCategory: config.knowledgeCategory,
    displayTerm: config.displayTerm,
    action: `${config.action} ${recommendedReductionCount}회 줄이기`,
    representativeAmount,
    recommendedReductionCount,
    estimatedSavingAmount,
    score: Math.round(score * 100) / 100,
    evidence: [
      `최근 14일 ${summary.category} 결제 ${summary.recentCount}건`,
      `최근 30일 ${summary.category} 지출 ${summary.totalAmount.toLocaleString("ko-KR")}원`,
    ],
  };
}

// 점수가 가장 높은 후보를 오늘의 코칭으로 만들고, 후보가 없으면 기본 안내를 반환한다.
function buildCoaching(profile) {
  const candidates = profile.categories
    .map((summary) => buildCandidate(summary, profile.totalAmount))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const selected = candidates[0];

  if (!selected) {
    return {
      category: null,
      knowledgeCategory: "budget",
      displayTerm: "생활비",
      action: "오늘 결제 전에 한 번 더 확인하기",
      representativeAmount: 0,
      recommendedReductionCount: 0,
      estimatedSavingAmount: 0,
      score: 0,
      evidence: ["절약 코칭을 만들 수 있는 반복 소비 데이터가 아직 부족함"],
      message:
        "소비 데이터가 조금 더 쌓이면\n실천하기 쉬운 절약 방법을 알려드릴게요.",
      greeting:
        "아직 반복 소비 패턴을 판단할 데이터가 충분하지 않아요. 결제 내역이 더 쌓이면 부담 없는 목표부터 찾아드릴게요.",
      suggestedQuestions: [
        "이번 달 소비 요약 보기",
        "예산 관리 방법 알려줘",
        "소비 기록은 어떻게 분석해?",
      ],
    };
  }

  const amountLabel = selected.estimatedSavingAmount.toLocaleString("ko-KR");

  return {
    ...selected,
    message: `${selected.action}만 실천하면\n약 ${amountLabel}원을 아낄 수 있어요.`,
    greeting: `${selected.evidence[0]}이 있었어요. 무리하지 않는 선에서 ${selected.recommendedReductionCount}번만 줄여볼까요?`,
    suggestedQuestions: [
      "이번 주 미션 만들기",
      `${selected.displayTerm} 줄이는 방법 알려줘`,
      "다른 절약 항목 찾아줘",
    ],
  };
}

// 소비 변동성과 선택 지출 비중을 바탕으로 현금·S&P 500 임시 배분 기준을 만든다.
// 투자 성향과 비상자금 정보가 없는 상태이므로 현금 비중을 최소 50%로 유지한다.
function buildAssetAllocationGuide(profile, coaching) {
  const recentAmount = profile.categories.reduce(
    (sum, category) => sum + category.recentAmount,
    0,
  );
  const previousAmount = profile.categories.reduce(
    (sum, category) => sum + category.previousAmount,
    0,
  );
  const spendingTrendRate =
    previousAmount > 0
      ? Math.round(((recentAmount - previousAmount) / previousAmount) * 1000) /
        10
      : null;
  const discretionaryAmount = profile.categories
    .filter((category) => discretionaryCategories.has(category.category))
    .reduce((sum, category) => sum + category.totalAmount, 0);
  const discretionaryShare =
    profile.totalAmount > 0
      ? Math.round((discretionaryAmount / profile.totalAmount) * 1000) / 10
      : 0;
  const overBudgetCategories = profile.categories
    .filter((category) => category.budgetUsageRate > 100)
    .map((category) => category.category);

  let cashRatio = 50;

  if (
    spendingTrendRate === null ||
    spendingTrendRate >= 15 ||
    discretionaryShare >= 45 ||
    overBudgetCategories.length >= 2
  ) {
    cashRatio = 70;
  } else if (
    spendingTrendRate >= 5 ||
    discretionaryShare >= 30 ||
    overBudgetCategories.length === 1
  ) {
    cashRatio = 60;
  }

  const allocationBaseAmount = coaching.estimatedSavingAmount;

  return {
    status: profile.paymentCount > 0 ? "AVAILABLE" : "INSUFFICIENT_DATA",
    cashRatio,
    sp500Ratio: 100 - cashRatio,
    allocationBaseAmount,
    cashAmount: Math.round((allocationBaseAmount * cashRatio) / 100),
    sp500Amount: Math.round(
      (allocationBaseAmount * (100 - cashRatio)) / 100,
    ),
    spendingTrendRate,
    discretionaryShare,
    overBudgetCategories,
    disclaimer:
      "소비 패턴만 반영한 임시 배분안이며 투자 성향과 비상자금 규모를 확인한 뒤 조정해야 합니다.",
  };
}

// 사용자 예산과 거래 내역을 결합해 Saving Bot이 사용할 개인화 컨텍스트를 만든다.
export async function getSavingBotContext(userId) {
  const period = getPeriod();
  const [transactions, budgets] = await Promise.all([
    TransactionHistory.findAll({
      where: {
        user_id: userId,
        trans_dtime: {
          [Op.gte]: period.start,
          [Op.lt]: period.end,
        },
      },
      include: [
        {
          model: ExpenseCategory,
          attributes: ["id", "name"],
        },
      ],
      order: [["trans_dtime", "DESC"]],
    }),
    UserExpenseCategory.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: ExpenseCategory,
          attributes: ["id", "name"],
        },
      ],
    }),
  ]);
  // 카테고리 이름으로 예산을 바로 조회할 수 있도록 Map으로 변환한다.
  const budgetMap = new Map(
    budgets
      .filter((budget) => budget.ExpenseCategory)
      .map((budget) => [budget.ExpenseCategory.name, Number(budget.cost)]),
  );
  const categories = buildCategorySummary(transactions, budgetMap, period);
  const totalAmount = categories.reduce(
    (sum, category) => sum + category.totalAmount,
    0,
  );
  const profile = {
    period: {
      from: period.start.toISOString(),
      to: period.end.toISOString(),
      days: 30,
    },
    totalAmount,
    paymentCount: transactions.length,
    categories,
  };

  const coaching = buildCoaching(profile);

  return {
    profile,
    coaching,
    assetAllocation: buildAssetAllocationGuide(profile, coaching),
  };
}

// 채팅·검색 계층에서도 동일한 카테고리 설정을 재사용할 수 있도록 공개한다.
export function getKnowledgeCategoryConfig() {
  return categoryConfig;
}
