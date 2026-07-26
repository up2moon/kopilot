import express from "express";
import { Op } from "sequelize";

import { requireAuth } from "../middleware/auth.js";
import {
  ExpenseCategory,
  TransactionHistory,
} from "../models/index.js";
import {
  defaultBenchmarkAssets,
  defaultBenchmarkCodes,
  enablePriceSync,
  getAssetByCode,
  getLatestStoredPrice,
  getStoredPrice,
  refreshInvestmentAssetPrice,
  syncKoscomBasePrices,
  searchInvestmentAssets,
  syncKoscomClosingPrices,
  syncKoscomInvestmentData,
  upsertInvestmentAsset,
} from "../services/investmentSync.js";

const router = express.Router();

const benchmarkFallbacks = new Map(
  defaultBenchmarkAssets.map((asset) => [asset.assetCode, asset]),
);

const depositBenchmark = {
  assetCode: "TERM_DEPOSIT",
  label: "정기예금/CMA",
  assetType: "DEPOSIT",
  market: "DEPOSIT",
  description: "안정형 비교 기준",
  icon: "🏦",
  annualInterestRate: 0.032,
};

function getCurrentMonth() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  });

  return formatter.format(new Date());
}

function normalizeMonth(month) {
  return /^\d{4}-\d{2}$/.test(month) ? month : getCurrentMonth();
}

function getFirstTradingDate(month) {
  const date = new Date(`${normalizeMonth(month)}-01T00:00:00.000Z`);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

function getMonthRange(month) {
  const normalizedMonth = normalizeMonth(month);
  const start = new Date(`${normalizedMonth}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return {
    month: normalizedMonth,
    start,
    end,
  };
}

function normalizeAssetCodes(rawAssetCodes) {
  if (!rawAssetCodes) {
    return [];
  }

  return Array.from(
    new Set(
      String(rawAssetCodes)
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  );
}

function categoryToKorean(category) {
  const map = {
    coffee: "카페·간식",
    delivery: "배달",
    transport: "교통",
    subscription: "구독",
    food: "식비",
    shopping: "쇼핑",
    culture: "문화",
    communication: "통신",
    all: "전체",
  };

  return map[category] || category || "카페·간식";
}

function toPriceNumber(price) {
  return Number(price?.close_price || 0);
}

function toRoundedRate(rate) {
  return Math.round(rate * 1000) / 1000;
}

async function getSpendingAmount(userId, month, category) {
  const { month: normalizedMonth, start, end } = getMonthRange(month);
  const requestedCategory = categoryToKorean(category);
  const transactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
    include: [
      {
        model: ExpenseCategory,
        attributes: ["id", "name"],
      },
    ],
  });

  const spendingByCategory = new Map();
  let totalSpendingAmount = 0;
  for (const transaction of transactions) {
    const categoryName = transaction.ExpenseCategory?.name || "기타";
    const amount = Number(transaction.trans_amt);
    totalSpendingAmount += amount;
    spendingByCategory.set(
      categoryName,
      (spendingByCategory.get(categoryName) || 0) + amount,
    );
  }

  const spendingAmount =
    requestedCategory === "전체"
      ? totalSpendingAmount
      : spendingByCategory.get(requestedCategory) || 0;

  return {
    spendingAmount,
    month: normalizedMonth,
    categoryLabel: requestedCategory,
    source: "CATEGORY_SPENDING_AMOUNT",
  };
}

async function resolveAsset(assetCode) {
  const storedAsset = await getAssetByCode(assetCode);

  if (storedAsset) {
    return storedAsset;
  }

  const [searchedAsset] = await searchInvestmentAssets({
    keyword: assetCode,
    limit: 1,
  });

  if (searchedAsset?.assetCode === assetCode) {
    return upsertInvestmentAsset(searchedAsset);
  }

  const fallbackAsset = benchmarkFallbacks.get(assetCode);

  if (fallbackAsset) {
    return upsertInvestmentAsset(fallbackAsset);
  }

  const error = new Error("검색된 종목을 찾을 수 없습니다.");
  error.statusCode = 404;
  error.code = "INVESTMENT_ASSET_NOT_FOUND";
  error.meta = {
    assetCode,
  };
  throw error;
}

function createPriceHistoryMissingError(asset, tradeDate) {
  const error = new Error(
    `${asset.label}의 ${tradeDate} 종가가 DB에 없어 투자효과를 계산할 수 없습니다.`,
  );
  error.statusCode = 409;
  error.code = "PRICE_HISTORY_MISSING";
  error.meta = {
    assetCode: asset.assetCode,
    label: asset.label,
    tradeDate,
  };

  return error;
}

function createCurrentPriceMissingError(asset, assumedBuyDate, latestPrice = null) {
  const error = new Error(
    `${asset.label}의 현재 시세가 없어 투자효과를 계산할 수 없습니다.`,
  );
  error.statusCode = 409;
  error.code = "CURRENT_PRICE_MISSING";
  error.meta = {
    assetCode: asset.assetCode,
    label: asset.label,
    assumedBuyDate,
    latestTradeDate: latestPrice?.trade_date || null,
  };

  return error;
}

function isKoscomPriceFetchError(error) {
  return [
    "KOSCOM_QUOTE_SHAPE_UNSUPPORTED",
    "KOSCOM_REQUEST_FAILED",
    "KOSCOM_HTML_RESPONSE",
    "KOSCOM_BUSINESS_ERROR",
  ].includes(error?.code);
}

function shouldRefreshKoscomPriceOnRead() {
  if (process.env.KOSCOM_LIVE_REFRESH_ON_READ !== undefined) {
    return process.env.KOSCOM_LIVE_REFRESH_ON_READ === "true";
  }

  return process.env.NODE_ENV !== "production";
}

async function getLatestPrice(asset, assumedBuyDate) {
  let latestPrice = await getLatestStoredPrice(asset.assetCode);

  if (shouldRefreshKoscomPriceOnRead()) {
    try {
      await refreshInvestmentAssetPrice(asset.assetCode);
      const refreshedPrice = await getLatestStoredPrice(asset.assetCode);

      if (refreshedPrice) {
        latestPrice = refreshedPrice;
      }
    } catch (error) {
      if (!isKoscomPriceFetchError(error)) {
        throw error;
      }

      if (!latestPrice || latestPrice.trade_date <= assumedBuyDate) {
        throw createCurrentPriceMissingError(asset, assumedBuyDate, latestPrice);
      }

      console.warn("Koscom current price refresh failed; using stored latest price", {
        assetCode: asset.assetCode,
        latestTradeDate: latestPrice.trade_date,
        code: error.code,
        meta: error.meta,
      });
    }
  }

  if (!latestPrice) {
    return null;
  }

  if (latestPrice.trade_date <= assumedBuyDate) {
    throw createCurrentPriceMissingError(asset, assumedBuyDate, latestPrice);
  }

  return latestPrice;
}

async function calculateMarketSimulation(asset, investmentAmount, month) {
  const assumedBuyDate = getFirstTradingDate(month);
  let basePrice = await getStoredPrice(asset.assetCode, assumedBuyDate);

  if (!basePrice && shouldRefreshKoscomPriceOnRead()) {
    try {
      await refreshInvestmentAssetPrice(asset.assetCode, assumedBuyDate);
    } catch (error) {
      if (!isKoscomPriceFetchError(error)) {
        throw error;
      }

      console.warn("Koscom base price refresh failed", {
        assetCode: asset.assetCode,
        tradeDate: assumedBuyDate,
        code: error.code,
        meta: error.meta,
      });
      throw createPriceHistoryMissingError(asset, assumedBuyDate);
    }

    basePrice = await getStoredPrice(asset.assetCode, assumedBuyDate);
  }

  if (!basePrice) {
    throw createPriceHistoryMissingError(asset, assumedBuyDate);
  }

  const latestPrice = await getLatestPrice(asset, assumedBuyDate);

  if (!latestPrice) {
    throw createPriceHistoryMissingError(asset, assumedBuyDate);
  }

  const baseClosePrice = toPriceNumber(basePrice);
  const currentPrice = toPriceNumber(latestPrice);

  if (!baseClosePrice || !currentPrice) {
    throw createPriceHistoryMissingError(asset, assumedBuyDate);
  }

  const returnRate = (currentPrice - baseClosePrice) / baseClosePrice;
  const estimatedValue = Math.round(investmentAmount * (1 + returnRate));

  return {
    assetCode: asset.assetCode,
    label: asset.label,
    assetType: asset.assetType,
    market: asset.market,
    icon: asset.icon,
    description: asset.description,
    assumedBuyDate,
    baseTradeDate: basePrice.trade_date,
    basePrice: baseClosePrice,
    currentTradeDate: latestPrice.trade_date,
    currentPrice,
    returnRate: toRoundedRate(returnRate),
    estimatedValue,
    estimatedGain: estimatedValue - investmentAmount,
    quotedAt: latestPrice.synced_at?.toISOString?.() || new Date().toISOString(),
    tradeDate: latestPrice.trade_date,
    source: latestPrice.source || "KOSCOM_CHECK",
  };
}

function calculateDepositSimulation(investmentAmount, month) {
  const assumedBuyDate = getFirstTradingDate(month);
  const buyDate = new Date(`${assumedBuyDate}T00:00:00+09:00`);
  const elapsedDays = Math.max(
    0,
    Math.ceil((Date.now() - buyDate.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const returnRate = depositBenchmark.annualInterestRate * (elapsedDays / 365);
  const estimatedGain = Math.round(investmentAmount * returnRate);

  return {
    ...depositBenchmark,
    assumedBuyDate,
    returnRate: toRoundedRate(returnRate),
    estimatedValue: investmentAmount + estimatedGain,
    estimatedGain,
    source: "INTERNAL_RATE_TABLE",
  };
}

router.get("/assets/search", requireAuth, async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const type = String(req.query.type || "").trim().toUpperCase();
    const market = String(req.query.market || "").trim().toUpperCase();
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    if (!keyword) {
      return res.status(200).json({
        items: [],
      });
    }

    const assets = await searchInvestmentAssets({
      keyword,
      type,
      market,
      limit,
    });

    return res.status(200).json({
      items: assets.map((asset) => ({
        ...asset,
        source: "KOSCOM_CHECK_DB",
      })),
    });
  } catch (error) {
    return handleInvestmentError(res, error, "종목 검색에 실패했습니다.");
  }
});

router.get("/quotes", requireAuth, async (req, res) => {
  try {
    const codes = normalizeAssetCodes(req.query.assetCodes);
    await enablePriceSync(codes);

    const items = await Promise.all(
      codes.map(async (assetCode) => {
        const asset = await resolveAsset(assetCode);
        let latestPrice = await getLatestStoredPrice(assetCode);

        if (!latestPrice && shouldRefreshKoscomPriceOnRead()) {
          await refreshInvestmentAssetPrice(assetCode);
          latestPrice = await getLatestStoredPrice(assetCode);
        }

        if (!latestPrice) {
          throw createPriceHistoryMissingError(asset, "LATEST");
        }

        return {
          ...asset,
          currentPrice: toPriceNumber(latestPrice),
          diffRate:
            latestPrice?.diff_rate === null || latestPrice?.diff_rate === undefined
              ? null
              : Number(latestPrice.diff_rate),
          tradeDate: latestPrice?.trade_date || null,
          quotedAt: latestPrice?.synced_at?.toISOString?.() || null,
          source: latestPrice?.source || "KOSCOM_CHECK",
        };
      }),
    );

    return res.status(200).json({
      items,
    });
  } catch (error) {
    return handleInvestmentError(res, error, "시세 조회에 실패했습니다.");
  }
});

router.post("/sync", requireAuth, async (req, res) => {
  try {
    const mode = String(req.query.mode || req.body?.mode || "all").toLowerCase();
    const limit = req.query.limit || req.body?.limit;
    const months = req.query.months || req.body?.months || req.query.month || req.body?.month;
    const assetCodes = req.query.assetCodes || req.body?.assetCodes;
    const allAssets = req.query.allAssets || req.body?.allAssets;
    const result =
      mode === "prices"
        ? await syncKoscomClosingPrices({ limit, assetCodes, allAssets })
        : mode === "base-prices"
          ? await syncKoscomBasePrices({ months, limit, assetCodes, allAssets })
          : await syncKoscomInvestmentData();

    return res.status(200).json({
      status: "OK",
      mode,
      result,
    });
  } catch (error) {
    return handleInvestmentError(res, error, "투자효과 데이터 동기화에 실패했습니다.");
  }
});

export async function simulationHandler(req, res) {
  try {
    const month = normalizeMonth(req.query.month);
    const category = String(req.query.category || "coffee");
    const assetCodes = normalizeAssetCodes(req.query.assetCodes);
    const spending = await getSpendingAmount(req.user.id, month, category);
    const investmentAmount = spending.spendingAmount;
    const assumedBuyDate = getFirstTradingDate(month);
    const monthLabel = `${Number(month.slice(5, 7))}월`;
    const categoryLabel =
      spending.categoryLabel === "카페·간식" ? "카페·간식" : spending.categoryLabel;

    if (investmentAmount <= 0) {
      return res.status(200).json({
        month,
        category,
        categoryLabel: spending.categoryLabel,
        spendingAmount: investmentAmount,
        investmentAmount,
        savedAmount: investmentAmount,
        assumedBuyDate,
        summaryText: `${monthLabel} ${categoryLabel} 소비가 없어 시뮬레이션할 금액이 없어요.`,
        assumptionText: `${monthLabel} 소비액을 ${monthLabel} 첫 거래일에 투자했다면으로 계산합니다.`,
        benchmarks: [],
        comparisons: [],
        status: "NO_SPENDING",
        disclaimer: "투자 권유가 아닌 참고용 시뮬레이션입니다.",
      });
    }

    await enablePriceSync([...defaultBenchmarkCodes, ...assetCodes]);

    const benchmarkAssets = await Promise.all(defaultBenchmarkCodes.map(resolveAsset));
    const selectedAssets = await Promise.all(assetCodes.map(resolveAsset));
    const [benchmarks, comparisons] = await Promise.all([
      Promise.all(
        benchmarkAssets.map((asset) =>
          calculateMarketSimulation(asset, investmentAmount, month),
        ),
      ),
      Promise.all(
        selectedAssets.map((asset) =>
          calculateMarketSimulation(asset, investmentAmount, month),
        ),
      ),
    ]);

    benchmarks.push(calculateDepositSimulation(investmentAmount, month));

    return res.status(200).json({
      month,
      category,
      categoryLabel: spending.categoryLabel,
      spendingAmount: investmentAmount,
      investmentAmount,
      savedAmount: investmentAmount,
      amountSource: spending.source,
      savedAmountSource: spending.source,
      assumedBuyDate,
      summaryText: `${monthLabel} ${categoryLabel} 소비액 ${investmentAmount.toLocaleString("ko-KR")}원을 기준으로 계산했어요.`,
      assumptionText: `${monthLabel}에 쓴 돈을 ${monthLabel} 첫 거래일에 투자했다면으로 계산했어요.`,
      benchmarks,
      comparisons,
      status: "OK",
      disclaimer: "투자 권유가 아닌 참고용 시뮬레이션입니다.",
    });
  } catch (error) {
    return handleInvestmentError(res, error, "투자효과 시뮬레이션 조회 실패");
  }
}

function handleInvestmentError(res, error, fallbackMessage) {
  if (error.statusCode === 503 || error.code === "KOSCOM_CONFIG_MISSING") {
    return res.status(503).json({
      code: "KOSCOM_CONFIG_MISSING",
      message: "투자효과 시세 조회 설정이 아직 완료되지 않았습니다.",
    });
  }

  if (error.code === "PRICE_HISTORY_MISSING") {
    return res.status(409).json({
      code: "PRICE_HISTORY_MISSING",
      message: error.message,
      meta: error.meta,
    });
  }

  if (error.code === "CURRENT_PRICE_MISSING") {
    return res.status(409).json({
      code: "CURRENT_PRICE_MISSING",
      message: error.message,
      meta: error.meta,
    });
  }

  if (error.code === "INVESTMENT_ASSET_NOT_FOUND") {
    return res.status(404).json({
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
  }

  if (String(error.code || "").startsWith("KOSCOM_")) {
    console.error(fallbackMessage, error.message, error.meta || {});

    return res.status(error.statusCode || 502).json({
      code: error.code,
      message: error.message || "코스콤 CHECK API 시세 응답을 처리하지 못했습니다.",
      meta: error.meta,
    });
  }

  console.error(fallbackMessage, error);

  return res.status(error.statusCode || 502).json({
    code: error.code || "KOSCOM_REQUEST_FAILED",
    message: fallbackMessage,
  });
}

export default router;
