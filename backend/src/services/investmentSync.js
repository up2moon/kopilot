import { Op } from "sequelize";

import {
  InvestmentAsset,
  InvestmentPrice,
} from "../models/index.js";
import {
  etfMasterPath,
  fetchKoscomMaster,
  fetchKoscomQuote,
  getKoscomCredentials,
  stockMasterPath,
} from "./koscomCheck.js";

export const defaultBenchmarkAssets = [
  {
    assetCode: "360750",
    label: "S&P500 ETF",
    assetType: "ETF",
    market: "ETF",
    description: "TIGER 미국S&P500",
    icon: "📈",
  },
  {
    assetCode: "069500",
    label: "KOSPI 200 ETF",
    assetType: "ETF",
    market: "ETF",
    description: "KODEX 200",
    icon: "🇰🇷",
  },
];

export const defaultBenchmarkCodes = defaultBenchmarkAssets.map(
  (asset) => asset.assetCode,
);

function getKstDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getKstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function parseScheduleTime(scheduleTime) {
  const [targetHour, targetMinute] = String(scheduleTime || "17:10")
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(targetHour) ||
    !Number.isInteger(targetMinute) ||
    targetHour < 0 ||
    targetHour > 23 ||
    targetMinute < 0 ||
    targetMinute > 59
  ) {
    return {
      hour: 17,
      minute: 10,
    };
  }

  return {
    hour: targetHour,
    minute: targetMinute,
  };
}

function getNextKstScheduleDelay(scheduleTime) {
  const { hour, minute } = parseScheduleTime(scheduleTime);
  const now = new Date();
  const kst = getKstParts(now);
  const nowKstUtc = Date.UTC(
    Number(kst.year),
    Number(kst.month) - 1,
    Number(kst.day),
    Number(kst.hour),
    Number(kst.minute),
    Number(kst.second),
  );
  let targetKstUtc = Date.UTC(
    Number(kst.year),
    Number(kst.month) - 1,
    Number(kst.day),
    hour,
    minute,
    0,
  );

  if (targetKstUtc <= nowKstUtc) {
    targetKstUtc += 24 * 60 * 60 * 1000;
  }

  return targetKstUtc - nowKstUtc;
}

function toAssetResponse(asset) {
  return {
    assetCode: asset.asset_code,
    label: asset.label,
    assetType: asset.asset_type,
    market: asset.market,
    description: asset.description,
    icon: asset.icon,
  };
}

async function upsertAssets(assets) {
  let count = 0;

  for (const asset of assets) {
    const existingAsset = await InvestmentAsset.findByPk(asset.asset_code);

    await InvestmentAsset.upsert({
      ...asset,
      price_sync_enabled:
        existingAsset?.price_sync_enabled ||
        defaultBenchmarkCodes.includes(asset.asset_code),
      last_synced_at: new Date(),
    });
    count += 1;
  }

  return count;
}

async function ensureDefaultBenchmarkAssets() {
  for (const asset of defaultBenchmarkAssets) {
    const existingAsset = await InvestmentAsset.findByPk(asset.assetCode);

    await InvestmentAsset.upsert({
      asset_code: asset.assetCode,
      label: existingAsset?.label || asset.label,
      asset_type: existingAsset?.asset_type || asset.assetType,
      market: existingAsset?.market || asset.market,
      description: existingAsset?.description || asset.description,
      icon: existingAsset?.icon || asset.icon,
      price_sync_enabled: true,
      last_synced_at: existingAsset?.last_synced_at || new Date(),
    });
  }
}

export async function syncKoscomAssetMasters() {
  getKoscomCredentials();

  const stockAssets = await fetchKoscomMaster(stockMasterPath, {
    assetType: "STOCK",
    market: "KOSPI",
    icon: "📌",
    description: "국내 주식",
  });
  const etfAssets = await fetchKoscomMaster(etfMasterPath, {
    assetType: "ETF",
    market: "ETF",
    icon: "📊",
    description: "국내 ETF",
  });

  return {
    stockCount: await upsertAssets(stockAssets),
    etfCount: await upsertAssets(etfAssets),
  };
}

function shouldSyncMastersOnRead() {
  if (process.env.KOSCOM_MASTER_SYNC_ON_READ !== undefined) {
    return process.env.KOSCOM_MASTER_SYNC_ON_READ === "true";
  }

  return process.env.NODE_ENV !== "production";
}

export async function ensureAssetMasters() {
  const count = await InvestmentAsset.count();

  if (count > 0) {
    return {
      skipped: true,
      count,
    };
  }

  await ensureDefaultBenchmarkAssets();

  if (!shouldSyncMastersOnRead()) {
    return {
      skipped: true,
      reason: "REMOTE_MASTER_SYNC_DISABLED_ON_READ",
      count: await InvestmentAsset.count(),
    };
  }

  return syncKoscomAssetMasters();
}

export async function searchInvestmentAssets({ keyword, type, market, limit }) {
  await ensureAssetMasters();

  const normalizedKeyword = String(keyword || "").trim();
  if (!normalizedKeyword) {
    return [];
  }

  const where = {
    [Op.or]: [
      {
        label: {
          [Op.like]: `%${normalizedKeyword}%`,
        },
      },
      {
        asset_code: {
          [Op.like]: `%${normalizedKeyword}%`,
        },
      },
    ],
  };

  if (type) {
    where.asset_type = String(type).toUpperCase();
  }

  if (market) {
    where.market = String(market).toUpperCase();
  }

  const assets = await InvestmentAsset.findAll({
    where,
    order: [
      ["price_sync_enabled", "DESC"],
      ["asset_type", "ASC"],
      ["label", "ASC"],
    ],
    limit,
  });

  return assets.map(toAssetResponse);
}

async function upsertPrice(asset, tradeDate) {
  const quote = await fetchKoscomQuote(asset.asset_code, tradeDate);
  const priceDate = quote.tradeDate || tradeDate || getKstDate();

  await InvestmentPrice.upsert({
    asset_code: asset.asset_code,
    trade_date: priceDate,
    close_price: quote.closePrice,
    diff_rate: quote.diffRate,
    raw_response: quote.raw,
    source: "KOSCOM_CHECK",
    synced_at: new Date(),
  });

  await asset.update({
    price_sync_enabled: true,
    last_synced_at: new Date(),
  });

  return {
    assetCode: asset.asset_code,
    tradeDate: priceDate,
    closePrice: quote.closePrice,
  };
}

export async function enablePriceSync(assetCodes) {
  const codes = Array.from(new Set(assetCodes.filter(Boolean)));

  if (!codes.length) {
    return [];
  }

  await InvestmentAsset.update(
    {
      price_sync_enabled: true,
    },
    {
      where: {
        asset_code: codes,
      },
    },
  );

  return InvestmentAsset.findAll({
    where: {
      asset_code: codes,
    },
  });
}

export async function refreshInvestmentAssetPrice(assetCode, tradeDate = null) {
  getKoscomCredentials();

  const asset = await InvestmentAsset.findByPk(assetCode);

  if (!asset) {
    return null;
  }

  return upsertPrice(asset, tradeDate);
}

export async function syncKoscomClosingPrices({ limit } = {}) {
  getKoscomCredentials();

  const maxItems = Math.min(
    Math.max(Number(limit) || Number(process.env.KOSCOM_PRICE_SYNC_LIMIT) || 200, 1),
    1000,
  );
  const assets = await InvestmentAsset.findAll({
    where: {
      price_sync_enabled: true,
    },
    order: [["last_synced_at", "ASC"]],
    limit: maxItems,
  });
  const tradeDate = getKstDate();
  const results = [];

  for (const asset of assets) {
    try {
      results.push(await upsertPrice(asset));
    } catch (error) {
      console.error(
        `Koscom price sync failed for ${asset.asset_code}:`,
        error.message,
        error.meta || {},
      );
    }
  }

  return {
    tradeDate: results[0]?.tradeDate || tradeDate,
    requestedCount: assets.length,
    successCount: results.length,
    results,
  };
}

export async function syncKoscomInvestmentData() {
  await ensureDefaultBenchmarkAssets();
  await enablePriceSync(defaultBenchmarkCodes);

  let masters;

  try {
    masters = await syncKoscomAssetMasters();
  } catch (error) {
    console.error("Koscom master sync failed:", error.message, error.meta || {});
    masters = {
      stockCount: 0,
      etfCount: 0,
      failed: true,
      code: error.code || "KOSCOM_MASTER_SYNC_FAILED",
      message: error.message,
    };
  }

  const prices = await syncKoscomClosingPrices();

  return {
    masters,
    prices,
  };
}

export async function syncKoscomInvestmentDataIfPriceTableEmpty() {
  getKoscomCredentials();

  const priceCount = await InvestmentPrice.count();

  if (priceCount > 0) {
    return {
      skipped: true,
      reason: "PRICE_TABLE_NOT_EMPTY",
      priceCount,
    };
  }

  return {
    skipped: false,
    reason: "PRICE_TABLE_EMPTY",
    result: await syncKoscomInvestmentData(),
  };
}

export function startKoscomSyncScheduler() {
  if (process.env.KOSCOM_SYNC_DISABLED === "true") {
    console.log("Koscom investment sync scheduler disabled");
    return;
  }

  const scheduleTime = process.env.KOSCOM_SYNC_TIME || "17:10";
  const run = async () => {
    try {
      console.log(`Koscom investment sync started (${new Date().toISOString()})`);
      const result = await syncKoscomInvestmentData();
      console.log("Koscom investment sync completed", result);
    } catch (error) {
      console.error("Koscom investment sync failed:", error.message);
    }
  };
  const scheduleNext = () => {
    const delay = getNextKstScheduleDelay(scheduleTime);

    setTimeout(async () => {
      await run();
      scheduleNext();
    }, delay);
  };

  scheduleNext();

  setTimeout(async () => {
    try {
      const initialResult =
        process.env.KOSCOM_SYNC_ON_START === "true"
          ? await syncKoscomInvestmentData()
          : await syncKoscomInvestmentDataIfPriceTableEmpty();

      console.log("Koscom investment initial sync checked", initialResult);
    } catch (error) {
      console.error("Koscom investment initial sync failed:", error.message);
    }
  }, 5000);

  console.log(`Koscom investment sync scheduled daily at ${scheduleTime} Asia/Seoul`);
}

export async function getAssetByCode(assetCode) {
  const asset = await InvestmentAsset.findByPk(assetCode);

  return asset ? toAssetResponse(asset) : null;
}

export async function upsertInvestmentAsset(asset) {
  await InvestmentAsset.upsert({
    asset_code: asset.assetCode,
    label: asset.label,
    asset_type: asset.assetType,
    market: asset.market || "KOSPI",
    description: asset.description || "",
    icon: asset.icon || (asset.assetType === "ETF" ? "📊" : "📌"),
    price_sync_enabled: true,
    last_synced_at: new Date(),
  });

  return getAssetByCode(asset.assetCode);
}

export async function getStoredPrice(assetCode, tradeDate) {
  return InvestmentPrice.findOne({
    where: {
      asset_code: assetCode,
      trade_date: tradeDate,
    },
  });
}

export async function getLatestStoredPrice(assetCode) {
  return InvestmentPrice.findOne({
    where: {
      asset_code: assetCode,
    },
    order: [["trade_date", "DESC"]],
  });
}
