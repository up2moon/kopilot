import { Op, Transaction } from "sequelize";

import { sequelize } from "../db.js";
import {
  ExternalApiLock,
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

function getKstDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getKstMonth() {
  return getKstDate().slice(0, 7);
}

function normalizeMonth(month) {
  return /^\d{4}-\d{2}$/.test(month) ? month : getKstMonth();
}

function getFirstTradingDate(month) {
  const date = new Date(`${normalizeMonth(month)}-01T00:00:00.000Z`);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

function getRecentMonths(count) {
  const maxCount = Math.min(Math.max(Number(count) || 1, 1), 24);
  const currentMonth = normalizeMonth(getKstMonth());
  const [year, month] = currentMonth.split("-").map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, 1));

  return Array.from({ length: maxCount }, (_, index) => {
    const date = new Date(baseDate);
    date.setUTCMonth(date.getUTCMonth() - index);

    return date.toISOString().slice(0, 7);
  });
}

function normalizeMonths(months) {
  if (Array.isArray(months)) {
    return Array.from(new Set(months.map(normalizeMonth)));
  }

  const rawMonths = String(months || "")
    .split(",")
    .map((month) => month.trim())
    .filter(Boolean);

  if (rawMonths.length) {
    return Array.from(new Set(rawMonths.map(normalizeMonth)));
  }

  return getRecentMonths(process.env.KOSCOM_BASE_PRICE_BACKFILL_MONTHS || 3);
}

function normalizeAssetCodes(assetCodes) {
  if (Array.isArray(assetCodes)) {
    return Array.from(
      new Set(assetCodes.map((code) => String(code).trim()).filter(Boolean)),
    );
  }

  return Array.from(
    new Set(
      String(assetCodes || "")
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  );
}

function isEnabled(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withKoscomPriceRequestLock(task) {
  const lockTimeoutSeconds = Math.min(
    Math.max(Number(process.env.KOSCOM_DB_LOCK_TIMEOUT_SECONDS) || 10, 1),
    30,
  );

  await ExternalApiLock.findOrCreate({
    where: {
      lock_name: "koscom-price-request",
    },
    defaults: {
      lock_name: "koscom-price-request",
    },
  });

  try {
    return await sequelize.transaction(
      {
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      },
      async (transaction) => {
        await sequelize.query(
          `SET SESSION innodb_lock_wait_timeout = ${lockTimeoutSeconds}`,
          {
            transaction,
          },
        );
        await ExternalApiLock.findByPk("koscom-price-request", {
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        return task(transaction);
      },
    );
  } catch (error) {
    if (error?.original?.code === "ER_LOCK_WAIT_TIMEOUT") {
      const lockError = new Error(
        "코스콤 CHECK API 호출 대기 시간이 초과되었습니다.",
      );
      lockError.statusCode = 503;
      lockError.code = "KOSCOM_REQUEST_LOCK_TIMEOUT";
      lockError.cause = error;
      throw lockError;
    }

    throw error;
  }
}

async function runKoscomPriceRequest(task) {
  const startedAt = Date.now();
  const minIntervalMs = Math.max(
    Number(process.env.KOSCOM_REQUEST_INTERVAL_MS) || 1100,
    1000,
  );

  try {
    return await task();
  } finally {
    const remainingMs = minIntervalMs - (Date.now() - startedAt);

    if (remainingMs > 0) {
      await sleep(remainingMs);
    }
  }
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

async function upsertPrice(asset, tradeDate, transaction = null) {
  const quote = await fetchKoscomQuote(asset.asset_code, tradeDate);
  const priceDate = quote.tradeDate || tradeDate || getKstDate();

  await InvestmentPrice.upsert(
    {
      asset_code: asset.asset_code,
      trade_date: priceDate,
      close_price: quote.closePrice,
      diff_rate: quote.diffRate,
      raw_response: quote.raw,
      source: "KOSCOM_CHECK",
      synced_at: new Date(),
    },
    {
      transaction,
    },
  );

  await asset.update(
    {
      price_sync_enabled: true,
      last_synced_at: new Date(),
    },
    {
      transaction,
    },
  );

  return {
    assetCode: asset.asset_code,
    tradeDate: priceDate,
    closePrice: quote.closePrice,
  };
}

async function refreshAssetPrice(asset, tradeDate = null) {
  return withKoscomPriceRequestLock((transaction) =>
    runKoscomPriceRequest(() => upsertPrice(asset, tradeDate, transaction)),
  );
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

  return refreshAssetPrice(asset, tradeDate);
}

async function getPriceSyncAssets(limit, assetCodes = [], { allAssets = false } = {}) {
  const maxItems = Math.min(Math.max(Number(limit) || 200, 1), 5000);
  const requestedAssetCodes = normalizeAssetCodes(assetCodes);
  const priorityAssetCodes = Array.from(
    new Set([...defaultBenchmarkCodes, ...requestedAssetCodes]),
  );
  const defaultAssets = await InvestmentAsset.findAll({
    where: {
      asset_code: priorityAssetCodes,
    },
    order: [["asset_code", "ASC"]],
  });
  const remainingLimit = Math.max(maxItems - defaultAssets.length, 0);
  const extraAssets = remainingLimit
    ? await InvestmentAsset.findAll({
        where: allAssets
          ? {
              asset_code: {
                [Op.notIn]: priorityAssetCodes,
              },
            }
          : {
              price_sync_enabled: true,
              asset_code: {
                [Op.notIn]: priorityAssetCodes,
              },
            },
        order: [["last_synced_at", "ASC"]],
        limit: remainingLimit,
      })
    : [];

  return [...defaultAssets, ...extraAssets];
}

export async function syncKoscomClosingPrices({
  limit,
  assetCodes,
  allAssets = process.env.KOSCOM_PRICE_SYNC_ALL_ASSETS,
} = {}) {
  getKoscomCredentials();
  await enablePriceSync(normalizeAssetCodes(assetCodes));

  const assets = await getPriceSyncAssets(
    limit || process.env.KOSCOM_PRICE_SYNC_LIMIT || 200,
    assetCodes,
    {
      allAssets: isEnabled(allAssets),
    },
  );
  const tradeDate = getKstDate();
  const results = [];

  for (const asset of assets) {
    try {
      results.push(await refreshAssetPrice(asset));
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

export async function syncKoscomBasePrices({
  months,
  limit,
  assetCodes,
  allAssets = process.env.KOSCOM_BASE_PRICE_SYNC_ALL_ASSETS,
} = {}) {
  getKoscomCredentials();
  await ensureDefaultBenchmarkAssets();
  await enablePriceSync([...defaultBenchmarkCodes, ...normalizeAssetCodes(assetCodes)]);

  const targetMonths = normalizeMonths(months);
  const tradeDates = Array.from(new Set(targetMonths.map(getFirstTradingDate)));
  const syncAllAssets = isEnabled(allAssets);
  const assets = await getPriceSyncAssets(
    limit || process.env.KOSCOM_BASE_PRICE_SYNC_LIMIT || 50,
    assetCodes,
    {
      allAssets: syncAllAssets,
    },
  );
  const results = [];
  const failures = [];

  for (const asset of assets) {
    for (const tradeDate of tradeDates) {
      try {
        results.push(await refreshAssetPrice(asset, tradeDate));
      } catch (error) {
        const failure = {
          assetCode: asset.asset_code,
          tradeDate,
          code: error.code || "KOSCOM_BASE_PRICE_SYNC_FAILED",
          message: error.message,
          meta: error.meta || null,
        };

        failures.push(failure);
        console.error(
          `Koscom base price sync failed for ${asset.asset_code} ${tradeDate}:`,
          error.message,
          error.meta || {},
        );
      }
    }
  }

  return {
    months: targetMonths,
    tradeDates,
    allAssets: syncAllAssets,
    requestedAssetCount: assets.length,
    requestedPriceCount: assets.length * tradeDates.length,
    successCount: results.length,
    failureCount: failures.length,
    results,
    failures,
  };
}

export async function syncMissingKoscomBasePrices({
  months,
  assetCodes,
  limit = process.env.KOSCOM_MISSING_BASE_PRICE_SYNC_LIMIT ||
    process.env.KOSCOM_BASE_PRICE_SYNC_LIMIT ||
    60,
} = {}) {
  getKoscomCredentials();
  await ensureDefaultBenchmarkAssets();

  const targetMonths = normalizeMonths(months);
  const tradeDates = Array.from(new Set(targetMonths.map(getFirstTradingDate)));
  const maxMissingPrices = Math.min(Math.max(Number(limit) || 60, 1), 1000);
  const requestedAssetCodes = normalizeAssetCodes(assetCodes);

  if (requestedAssetCodes.length) {
    await enablePriceSync(requestedAssetCodes);
  }

  const assets = await InvestmentAsset.findAll({
    where: requestedAssetCodes.length
      ? {
          asset_code: requestedAssetCodes,
        }
      : {
          price_sync_enabled: true,
        },
    order: [
      ["last_synced_at", "ASC"],
      ["asset_code", "ASC"],
    ],
    limit: 5000,
  });
  const syncedAssetCodes = assets.map((asset) => asset.asset_code);

  if (!syncedAssetCodes.length) {
    return {
      months: targetMonths,
      tradeDates,
      requestedPriceCount: 0,
      successCount: 0,
      failureCount: 0,
      skipped: true,
      reason: "NO_PRICE_SYNC_ENABLED_ASSETS",
      results: [],
      failures: [],
    };
  }

  const existingPrices = await InvestmentPrice.findAll({
    attributes: ["asset_code", "trade_date"],
    where: {
      asset_code: syncedAssetCodes,
      trade_date: tradeDates,
    },
  });
  const existingPriceKeys = new Set(
    existingPrices.map((price) => `${price.asset_code}:${price.trade_date}`),
  );
  const allMissingRequests = [];

  for (const asset of assets) {
    for (const tradeDate of tradeDates) {
      if (!existingPriceKeys.has(`${asset.asset_code}:${tradeDate}`)) {
        allMissingRequests.push({
          asset,
          tradeDate,
        });
      }
    }
  }

  const missingRequests = allMissingRequests.slice(0, maxMissingPrices);
  const results = [];
  const failures = [];

  for (const request of missingRequests) {
    try {
      results.push(
        await refreshAssetPrice(request.asset, request.tradeDate),
      );
    } catch (error) {
      const failure = {
        assetCode: request.asset.asset_code,
        tradeDate: request.tradeDate,
        code: error.code || "KOSCOM_MISSING_BASE_PRICE_SYNC_FAILED",
        message: error.message,
        meta: error.meta || null,
      };

      failures.push(failure);
      console.error(
        `Koscom missing base price sync failed for ${request.asset.asset_code} ${request.tradeDate}:`,
        error.message,
        error.meta || {},
      );
    }
  }

  return {
    months: targetMonths,
    tradeDates,
    totalMissingPriceCount: allMissingRequests.length,
    requestedPriceCount: missingRequests.length,
    successCount: results.length,
    failureCount: failures.length,
    remainingMissingPriceCount: Math.max(
      allMissingRequests.length - missingRequests.length,
      0,
    ),
    results,
    failures,
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
  const basePrices = await syncKoscomBasePrices();

  return {
    masters,
    prices,
    basePrices,
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
  const basePriceRepairIntervalMs = Math.max(
    Number(process.env.KOSCOM_MISSING_BASE_PRICE_SYNC_INTERVAL_MS) ||
      60 * 60 * 1000,
    60 * 1000,
  );
  let missingBasePriceSyncRunning = false;
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

  const runMissingBasePriceSync = async () => {
    if (missingBasePriceSyncRunning) {
      return;
    }

    missingBasePriceSyncRunning = true;

    try {
      const result = await syncMissingKoscomBasePrices();
      console.log("Koscom missing base price sync completed", result);
    } catch (error) {
      console.error("Koscom missing base price sync failed:", error.message);
    } finally {
      missingBasePriceSyncRunning = false;
    }
  };

  setTimeout(runMissingBasePriceSync, 60 * 1000);
  setInterval(runMissingBasePriceSync, basePriceRepairIntervalMs);

  console.log(`Koscom investment sync scheduled daily at ${scheduleTime} Asia/Seoul`);
  console.log(
    `Koscom missing base price sync scheduled every ${Math.round(
      basePriceRepairIntervalMs / 60000,
    )} minutes`,
  );
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

export async function getStoredPrice(assetCode, tradeDate, transaction = null) {
  return InvestmentPrice.findOne({
    where: {
      asset_code: assetCode,
      trade_date: tradeDate,
    },
    transaction,
  });
}

export async function getLatestStoredPrice(assetCode, transaction = null) {
  return InvestmentPrice.findOne({
    where: {
      asset_code: assetCode,
    },
    order: [["trade_date", "DESC"]],
    transaction,
  });
}

export async function getOrFetchStoredPrice(assetCode, tradeDate) {
  const storedPrice = await getStoredPrice(assetCode, tradeDate);

  if (storedPrice) {
    return storedPrice;
  }

  console.log("Koscom price fallback started", {
    assetCode,
    tradeDate,
    priceType: "HISTORICAL",
  });

  try {
    getKoscomCredentials();

    const asset = await InvestmentAsset.findByPk(assetCode);

    if (!asset) {
      return null;
    }

    const fetchedPrice = await withKoscomPriceRequestLock(
      async (transaction) => {
        const recheckedPrice = await getStoredPrice(
          assetCode,
          tradeDate,
          transaction,
        );

        if (recheckedPrice) {
          return recheckedPrice;
        }

        const result = await runKoscomPriceRequest(() =>
          upsertPrice(asset, tradeDate, transaction),
        );

        return getStoredPrice(assetCode, result.tradeDate, transaction);
      },
    );

    console.log("Koscom price fallback completed", {
      assetCode,
      requestedTradeDate: tradeDate,
      savedTradeDate: fetchedPrice?.trade_date || null,
      priceType: "HISTORICAL",
    });

    return fetchedPrice;
  } catch (error) {
    console.error("Koscom price fallback failed", {
      assetCode,
      tradeDate,
      priceType: "HISTORICAL",
      code: error.code || null,
      message: error.message,
      meta: error.meta || null,
    });
    throw error;
  }
}

export async function getOrFetchLatestStoredPrice(assetCode) {
  const storedPrice = await getLatestStoredPrice(assetCode);
  const syncedDate = storedPrice?.synced_at
    ? getKstDate(storedPrice.synced_at)
    : null;

  if (storedPrice && syncedDate === getKstDate()) {
    return storedPrice;
  }

  console.log("Koscom price fallback started", {
    assetCode,
    storedTradeDate: storedPrice?.trade_date || null,
    storedSyncedDate: syncedDate,
    priceType: "LATEST",
  });

  try {
    getKoscomCredentials();

    const asset = await InvestmentAsset.findByPk(assetCode);

    if (!asset) {
      return null;
    }

    const fetchedPrice = await withKoscomPriceRequestLock(
      async (transaction) => {
        const recheckedPrice = await getLatestStoredPrice(
          assetCode,
          transaction,
        );
        const recheckedSyncedDate = recheckedPrice?.synced_at
          ? getKstDate(recheckedPrice.synced_at)
          : null;

        if (recheckedPrice && recheckedSyncedDate === getKstDate()) {
          return recheckedPrice;
        }

        await runKoscomPriceRequest(() =>
          upsertPrice(asset, null, transaction),
        );

        return getLatestStoredPrice(assetCode, transaction);
      },
    );

    console.log("Koscom price fallback completed", {
      assetCode,
      savedTradeDate: fetchedPrice?.trade_date || null,
      priceType: "LATEST",
    });

    return fetchedPrice;
  } catch (error) {
    console.error("Koscom price fallback failed", {
      assetCode,
      priceType: "LATEST",
      code: error.code || null,
      message: error.message,
      meta: error.meta || null,
    });
    throw error;
  }
}
