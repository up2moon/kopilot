import express from "express";
import { Op } from "sequelize";

import { requireAuth } from "../middleware/auth.js";
import { redisClient } from "../redis.js";
import {
  AiChallenge,
  AssetGoal,
  ExpenseCategory,
  InvestmentContribution,
  InvestmentPrice,
  TransactionHistory,
} from "../models/index.js";
import {
  defaultBenchmarkAssets,
  getLatestStoredPrice,
  getOrFetchCurrentStoredPrice,
  getOrFetchStoredPrice,
  upsertInvestmentAsset,
} from "../services/investmentSync.js";
import {
  getKoreanToday,
  getOrCreateWeeklyChallenges,
} from "../services/challengeService.js";

const router = express.Router();
const snpAssetCode = process.env.SNP_500_ASSET_CODE || "360750";
const opportunityCacheTtlSeconds = Math.max(
  Number(process.env.OPPORTUNITY_CACHE_TTL_SECONDS) || 60 * 60 * 24 * 2,
  60,
);

function getKstDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addMonths(date, months) {
  const result = new Date(`${date}T00:00:00+09:00`);
  result.setMonth(result.getMonth() + months);
  return getKstDate(result);
}

function normalizeTradingDate(date) {
  const result = new Date(`${date}T00:00:00Z`);

  while (result.getUTCDay() === 0 || result.getUTCDay() === 6) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result.toISOString().slice(0, 10);
}

function serializeGoal(goal) {
  if (!goal) return null;

  return {
    goalId: Number(goal.id),
    title: goal.title,
    targetAmount: Number(goal.target_amount),
    startDate: goal.start_date,
    targetDate: goal.target_date,
    assetCode: goal.asset_code,
    recommendedInvestmentRatio: Number(goal.recommended_investment_ratio),
    selectedInvestmentRatio: Number(goal.selected_investment_ratio),
    status: goal.status,
  };
}

function validateRatio(value) {
  const ratio = Number(value);
  return Number.isInteger(ratio) && ratio >= 0 && ratio <= 100;
}

async function ensureSnpAsset() {
  const fallback = defaultBenchmarkAssets.find(
    (asset) => asset.assetCode === snpAssetCode,
  ) || {
    assetCode: snpAssetCode,
    label: "TIGER 미국S&P500",
    assetType: "ETF",
    market: "ETF",
    description: "S&P 500 지수 추종 ETF",
    icon: "📈",
  };

  return upsertInvestmentAsset(fallback);
}

async function analyzeSavingCapacity(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const transactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: {
        [Op.gte]: since,
      },
    },
    include: [
      {
        model: ExpenseCategory,
        attributes: ["name"],
      },
    ],
  });
  const totals = new Map();

  for (const transaction of transactions) {
    const category = transaction.ExpenseCategory?.name || "기타";
    totals.set(
      category,
      (totals.get(category) || 0) + Number(transaction.trans_amt || 0),
    );
  }

  const reducibleRates = new Map([
    ["배달", 0.25],
    ["카페·간식", 0.22],
    ["구독", 0.3],
    ["쇼핑", 0.15],
    ["문화", 0.12],
  ]);
  const opportunities = Array.from(totals.entries())
    .filter(([category]) => reducibleRates.has(category))
    .map(([category, amount]) => {
      const monthlyAverage = Math.round(amount / 3);
      const estimatedSavingAmount = Math.round(
        monthlyAverage * reducibleRates.get(category),
      );

      return {
        category,
        monthlyAverage,
        estimatedSavingAmount,
        reason: `최근 3개월 월평균 ${monthlyAverage.toLocaleString("ko-KR")}원을 사용했어요.`,
      };
    })
    .sort((a, b) => b.estimatedSavingAmount - a.estimatedSavingAmount);

  return {
    transactionCount: transactions.length,
    opportunities,
    monthlySavingCapacity: opportunities.reduce(
      (sum, item) => sum + item.estimatedSavingAmount,
      0,
    ),
  };
}

async function recommendInvestmentRatio() {
  const prices = await InvestmentPrice.findAll({
    where: {
      asset_code: snpAssetCode,
    },
    order: [["trade_date", "DESC"]],
    limit: 90,
  });

  if (prices.length < 2) {
    return {
      ratio: 40,
      reason: "시세 이력이 충분하지 않아 현금 비중을 높인 균형형 비중을 제안했어요.",
      priceTrendRate: null,
    };
  }

  const latest = Number(prices[0].close_price);
  const oldest = Number(prices.at(-1).close_price);
  const priceTrendRate = oldest ? (latest - oldest) / oldest : 0;
  const ratio = priceTrendRate < -0.08 ? 30 : priceTrendRate > 0.12 ? 50 : 40;

  return {
    ratio,
    reason:
      ratio === 30
        ? "최근 변동성이 커서 현금 비중을 높였어요."
        : ratio === 50
          ? "최근 흐름과 목표 기간을 고려해 절약액의 절반을 적립식으로 나누도록 제안했어요."
          : "현금 안정성과 장기 적립 효과를 함께 가져가는 균형형 비중이에요.",
    priceTrendRate,
  };
}

async function findActiveGoal(userId) {
  return AssetGoal.findOne({
    where: {
      user_id: userId,
      status: "ACTIVE",
    },
    order: [["created_at", "DESC"]],
  });
}

router.get("/me/asset-goals/analysis", requireAuth, async (req, res) => {
  try {
    await ensureSnpAsset();
    const [savingAnalysis, investmentRecommendation] = await Promise.all([
      analyzeSavingCapacity(req.user.id),
      recommendInvestmentRatio(),
    ]);

    return res.status(200).json({
      savingAnalysis,
      investmentRecommendation,
      asset: {
        assetCode: snpAssetCode,
        label: "TIGER 미국S&P500",
      },
    });
  } catch (error) {
    console.error("Asset goal analysis failed:", error);
    return res.status(500).json({
      message: "목표 달성 계획을 분석하지 못했습니다.",
      code: error.code || "ASSET_GOAL_ANALYSIS_FAILED",
    });
  }
});

router.get("/me/asset-goals/active", requireAuth, async (req, res) => {
  const goal = await findActiveGoal(req.user.id);
  return res.status(200).json({
    goal: serializeGoal(goal),
  });
});

router.post("/me/asset-goals", requireAuth, async (req, res) => {
  const targetAmount = Number(req.body.targetAmount);
  const durationMonths = Number(req.body.durationMonths);
  const startDate = getKstDate();

  if (
    !Number.isInteger(targetAmount) ||
    targetAmount < 10000 ||
    !Number.isInteger(durationMonths) ||
    durationMonths < 1 ||
    durationMonths > 600
  ) {
    return res.status(400).json({
      message: "목표 금액과 기간을 올바르게 입력해 주세요.",
      code: "INVALID_ASSET_GOAL",
    });
  }

  try {
    await ensureSnpAsset();
    const recommendation = await recommendInvestmentRatio();
    const selectedRatio =
      req.body.selectedInvestmentRatio === undefined
        ? recommendation.ratio
        : Number(req.body.selectedInvestmentRatio);

    if (!validateRatio(selectedRatio)) {
      return res.status(400).json({
        message: "투자 비중은 0부터 100 사이의 정수여야 합니다.",
        code: "INVALID_INVESTMENT_RATIO",
      });
    }

    await AssetGoal.update(
      {
        status: "PAUSED",
      },
      {
        where: {
          user_id: req.user.id,
          status: "ACTIVE",
        },
      },
    );
    const goal = await AssetGoal.create({
      user_id: req.user.id,
      title: String(req.body.title || "나의 시드머니").slice(0, 100),
      target_amount: targetAmount,
      start_date: startDate,
      target_date: addMonths(startDate, durationMonths),
      asset_code: snpAssetCode,
      recommended_investment_ratio: recommendation.ratio,
      selected_investment_ratio: selectedRatio,
      status: "ACTIVE",
    });
    await getOrCreateWeeklyChallenges(req.user.id, getKoreanToday()).catch(
      (error) => {
        console.warn("Asset goal challenge generation skipped:", error.message);
      },
    );

    return res.status(201).json({
      goal: serializeGoal(goal),
      recommendation,
    });
  } catch (error) {
    console.error("Asset goal creation failed:", error);
    return res.status(500).json({
      message: "자산 목표를 저장하지 못했습니다.",
      code: error.code || "ASSET_GOAL_CREATE_FAILED",
    });
  }
});

router.patch("/me/asset-goals/:goalId/ratio", requireAuth, async (req, res) => {
  const ratio = Number(req.body.selectedInvestmentRatio);

  if (!validateRatio(ratio)) {
    return res.status(400).json({
      message: "투자 비중은 0부터 100 사이의 정수여야 합니다.",
      code: "INVALID_INVESTMENT_RATIO",
    });
  }

  const goal = await AssetGoal.findOne({
    where: {
      id: req.params.goalId,
      user_id: req.user.id,
    },
  });

  if (!goal) {
    return res.status(404).json({
      message: "자산 목표를 찾을 수 없습니다.",
      code: "ASSET_GOAL_NOT_FOUND",
    });
  }

  await goal.update({
    selected_investment_ratio: ratio,
  });

  return res.status(200).json({
    goal: serializeGoal(goal),
  });
});

router.post(
  "/me/asset-goals/:goalId/contributions",
  requireAuth,
  async (req, res) => {
    const goal = await AssetGoal.findOne({
      where: {
        id: req.params.goalId,
        user_id: req.user.id,
      },
    });

    if (!goal) {
      return res.status(404).json({
        message: "자산 목표를 찾을 수 없습니다.",
        code: "ASSET_GOAL_NOT_FOUND",
      });
    }

    const challengeId = req.body.challengeId
      ? Number(req.body.challengeId)
      : null;
    let savingAmount = Number(req.body.savingAmount);
    let contributedAt = req.body.contributedAt
      ? new Date(req.body.contributedAt)
      : new Date();

    if (challengeId) {
      const challenge = await AiChallenge.findOne({
        where: {
          id: challengeId,
          user_id: req.user.id,
          status: "SUCCESS",
        },
      });

      if (!challenge) {
        return res.status(400).json({
          message: "성공한 챌린지만 적립에 반영할 수 있습니다.",
          code: "INVALID_CONTRIBUTION_CHALLENGE",
        });
      }

      savingAmount = Number(challenge.estimated_saving_amount);
      contributedAt = challenge.completed_at || contributedAt;
    }

    if (!Number.isInteger(savingAmount) || savingAmount <= 0) {
      return res.status(400).json({
        message: "확정 절약액을 올바르게 입력해 주세요.",
        code: "INVALID_SAVING_AMOUNT",
      });
    }

    try {
      const ratio = Number(goal.selected_investment_ratio);
      const investmentAmount = Math.round(savingAmount * (ratio / 100));
      const cashAmount = savingAmount - investmentAmount;
      const requestedDate = normalizeTradingDate(getKstDate(contributedAt));
      const price =
        (await getOrFetchStoredPrice(goal.asset_code, requestedDate)) ||
        (await getLatestStoredPrice(goal.asset_code));
      const purchasePrice = Number(price?.close_price || 0);

      if (!purchasePrice) {
        return res.status(409).json({
          message: "매수 기준일의 S&P 500 ETF 가격이 없습니다.",
          code: "CONTRIBUTION_PRICE_MISSING",
        });
      }

      const contribution = await InvestmentContribution.create({
        goal_id: goal.id,
        challenge_id: challengeId,
        saving_amount: savingAmount,
        investment_amount: investmentAmount,
        cash_amount: cashAmount,
        asset_code: goal.asset_code,
        price_trade_date: price.trade_date,
        purchase_price: purchasePrice,
        quantity: investmentAmount / purchasePrice,
        contributed_at: contributedAt,
      });

      return res.status(201).json({
        contribution: {
          contributionId: Number(contribution.id),
          savingAmount,
          investmentAmount,
          cashAmount,
          purchasePrice,
          quantity: Number(contribution.quantity),
          priceTradeDate: contribution.price_trade_date,
        },
      });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          message: "이미 적립에 반영된 챌린지입니다.",
          code: "CONTRIBUTION_ALREADY_EXISTS",
        });
      }

      console.error("Investment contribution failed:", error);
      return res.status(500).json({
        message: "절약액을 적립 시뮬레이션에 반영하지 못했습니다.",
        code: error.code || "CONTRIBUTION_CREATE_FAILED",
      });
    }
  },
);

router.get("/me/asset-goals/:goalId/roadmap", requireAuth, async (req, res) => {
  const goal = await AssetGoal.findOne({
    where: {
      id: req.params.goalId,
      user_id: req.user.id,
    },
  });

  if (!goal) {
    return res.status(404).json({
      message: "자산 목표를 찾을 수 없습니다.",
      code: "ASSET_GOAL_NOT_FOUND",
    });
  }

  const contributions = await InvestmentContribution.findAll({
    where: {
      goal_id: goal.id,
    },
    order: [["contributed_at", "ASC"]],
  });
  let latestPrice = await getLatestStoredPrice(goal.asset_code);

  // 로드맵 첫 화면은 저장된 최근 시세로 즉시 응답한다. 사용자가 명시적으로
  // 새로고침한 경우에만 CHECK API를 호출해 외부 응답 대기 시간을 감수한다.
  if (req.query.refreshQuote === "true") {
    try {
      latestPrice = await getOrFetchCurrentStoredPrice(goal.asset_code);
    } catch {
      // 외부 시세 조회가 실패해도 저장된 가격으로 로드맵은 계속 제공한다.
    }
  }

  const currentPrice = Number(latestPrice?.close_price || 0);
  let cumulativeSaving = 0;
  let cumulativeCash = 0;
  let cumulativeInvestmentPrincipal = 0;
  let cumulativeQuantity = 0;
  const chart = contributions.map((contribution) => {
    cumulativeSaving += Number(contribution.saving_amount);
    cumulativeCash += Number(contribution.cash_amount);
    cumulativeInvestmentPrincipal += Number(contribution.investment_amount);
    cumulativeQuantity += Number(contribution.quantity);

    return {
      date: contribution.price_trade_date,
      savingAmount: Number(contribution.saving_amount),
      cashOnlyValue: cumulativeSaving,
      mixedCashValue: cumulativeCash,
      investmentPrincipal: cumulativeInvestmentPrincipal,
      investmentValue:
        cumulativeQuantity * Number(contribution.purchase_price),
      purchasePrice: Number(contribution.purchase_price),
      purchasedQuantity: Number(contribution.quantity),
    };
  });
  const investmentValue = cumulativeQuantity * currentPrice;
  const mixedCurrentValue = cumulativeCash + investmentValue;

  return res.status(200).json({
    goal: serializeGoal(goal),
    progress: {
      confirmedSavingAmount: cumulativeSaving,
      cashAmount: cumulativeCash,
      investmentPrincipal: cumulativeInvestmentPrincipal,
      investmentValue,
      mixedCurrentValue,
      cashOnlyValue: cumulativeSaving,
      profit: investmentValue - cumulativeInvestmentPrincipal,
      differenceFromCashOnly: mixedCurrentValue - cumulativeSaving,
      achievementRate: goal.target_amount
        ? Math.min(mixedCurrentValue / Number(goal.target_amount), 1)
        : 0,
    },
    quote: {
      assetCode: goal.asset_code,
      currentPrice,
      tradeDate: latestPrice?.trade_date || null,
      source: latestPrice?.source || "KOSCOM_CHECK_DB",
    },
    chart,
    contributions: contributions.map((contribution) => ({
      contributionId: Number(contribution.id),
      challengeId: contribution.challenge_id
        ? Number(contribution.challenge_id)
        : null,
      savingAmount: Number(contribution.saving_amount),
      investmentAmount: Number(contribution.investment_amount),
      cashAmount: Number(contribution.cash_amount),
      purchasePrice: Number(contribution.purchase_price),
      purchasedQuantity: Number(contribution.quantity),
      priceTradeDate: contribution.price_trade_date,
      contributedAt: contribution.contributed_at,
    })),
  });
});

function getMaterialComparison(value) {
  const comparisons = [
    { amount: 5000, label: "커피 한 잔" },
    { amount: 25000, label: "치킨 한 마리" },
    { amount: 60000, label: "외식 한 번" },
    { amount: 150000, label: "공연 티켓 한 장" },
    { amount: 300000, label: "국내 여행 경비" },
    { amount: 1000000, label: "노트북 구매 자금" },
  ];
  const selected =
    [...comparisons].reverse().find((item) => value >= item.amount) ||
    comparisons[0];

  return {
    label: selected.label,
    unitAmount: selected.amount,
    quantity: Math.floor((value / selected.amount) * 10) / 10,
  };
}

function selectComparisonMonths(amount) {
  if (amount >= 300000) return 36;
  if (amount >= 100000) return 24;
  if (amount >= 30000) return 12;
  return 6;
}

function getOpportunityCacheKey(userId, transactionId) {
  return [
    "transaction-opportunity",
    "v2",
    userId,
    transactionId,
    snpAssetCode,
    getKstDate(),
  ].join(":");
}

async function getCachedOpportunity(key) {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Transaction opportunity cache read failed:", error);
    return null;
  }
}

async function cacheOpportunity(key, result) {
  try {
    await redisClient.set(key, JSON.stringify(result), {
      EX: opportunityCacheTtlSeconds,
    });
  } catch (error) {
    // Redis 장애가 기회비용 계산 자체를 막지 않도록 캐시 실패만 기록한다.
    console.error("Transaction opportunity cache write failed:", error);
  }
}

router.get(
  "/me/transactions/:transactionId/opportunity",
  requireAuth,
  async (req, res) => {
    const transaction = await TransactionHistory.findOne({
      where: {
        id: req.params.transactionId,
        user_id: req.user.id,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "소비 내역을 찾을 수 없습니다.",
        code: "TRANSACTION_NOT_FOUND",
      });
    }

    const cacheKey = getOpportunityCacheKey(req.user.id, transaction.id);
    const cachedOpportunity = await getCachedOpportunity(cacheKey);

    if (cachedOpportunity) {
      return res.status(200).json(cachedOpportunity);
    }

    await ensureSnpAsset();
    const amount = Number(transaction.trans_amt);
    const comparisonMonths = selectComparisonMonths(amount);
    const hypotheticalDate = new Date();
    hypotheticalDate.setMonth(hypotheticalDate.getMonth() - comparisonMonths);
    const requestedDate = normalizeTradingDate(getKstDate(hypotheticalDate));

    try {
      const [pastPrice, currentPrice] = await Promise.all([
        getOrFetchStoredPrice(snpAssetCode, requestedDate),
        getOrFetchCurrentStoredPrice(snpAssetCode),
      ]);
      const purchasePrice = Number(pastPrice?.close_price || 0);
      const latestPrice = Number(currentPrice?.close_price || 0);

      if (!purchasePrice || !latestPrice) {
        return res.status(409).json({
          message: "비교에 필요한 S&P 500 ETF 시세가 없습니다.",
          code: "OPPORTUNITY_PRICE_MISSING",
        });
      }

      const quantity = amount / purchasePrice;
      const currentValue = quantity * latestPrice;

      const result = {
        transaction: {
          transactionId: Number(transaction.id),
          merchantName: transaction.merchant_name,
          amount,
          transactedAt: transaction.trans_dtime,
        },
        simulation: {
          comparisonMonths,
          hypotheticalPurchaseDate: pastPrice.trade_date,
          purchasePrice,
          currentPrice: latestPrice,
          quantity,
          currentValue,
          gain: currentValue - amount,
          returnRate: (latestPrice - purchasePrice) / purchasePrice,
          assetCode: snpAssetCode,
          source: "KOSCOM_CHECK",
        },
        materialComparison: getMaterialComparison(currentValue),
        disclaimer:
          "과거 수익률을 이용한 가상 비교이며 실제 수익이나 미래 성과를 보장하지 않습니다.",
      };

      await cacheOpportunity(cacheKey, result);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Transaction opportunity simulation failed:", error);
      return res.status(500).json({
        message: "소비의 기회비용을 계산하지 못했습니다.",
        code: error.code || "OPPORTUNITY_SIMULATION_FAILED",
      });
    }
  },
);

export default router;
