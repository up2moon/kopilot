const koscomBaseUrl = process.env.KOSCOM_BASE_URL || "https://checkapi.koscom.co.kr";
const defaultLocalProxyUrl =
  "https://kospay.p-e.kr/api/internal/koscom/check";

export const stockMasterPath = process.env.KOSCOM_STOCK_MASTER_PATH || "/stock/m001/code_info";
export const etfMasterPath = process.env.KOSCOM_ETF_MASTER_PATH || "/stock/m001/code_etf_info";
export const basicQuotePath = process.env.KOSCOM_BASIC_QUOTE_PATH || "/stock/m001/basic_info";
export const historyQuotePath = process.env.KOSCOM_HISTORY_QUOTE_PATH || "/stock/m001/hist_info";

let koscomRequestQueue = Promise.resolve();
let lastKoscomRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runWithKoscomThrottle(task) {
  const minIntervalMs = Math.max(Number(process.env.KOSCOM_REQUEST_INTERVAL_MS) || 1100, 1000);
  const queuedTask = koscomRequestQueue.then(async () => {
    const elapsedMs = Date.now() - lastKoscomRequestAt;

    if (elapsedMs < minIntervalMs) {
      await sleep(minIntervalMs - elapsedMs);
    }

    lastKoscomRequestAt = Date.now();

    return task();
  });

  koscomRequestQueue = queuedTask.catch(() => {});

  return queuedTask;
}

function assertKoscomCheckApiEnabled() {
  // CHECK API는 로컬을 포함해 기본 활성화한다. 호출을 막아야 하는 환경에서만
  // CHECK_API_ENABLED=false를 명시적으로 설정한다.
  if (process.env.CHECK_API_ENABLED === "false") {
    const error = new Error("현재 환경에서는 코스콤 CHECK API 호출이 비활성화되어 있습니다.");
    error.statusCode = 503;
    error.code = "CHECK_API_DISABLED";
    throw error;
  }
}

export function getKoscomCredentials() {
  const custId = process.env.CUST_ID;
  const authKey = process.env.AUTH_KEY;

  if (!custId || !authKey) {
    const error = new Error("코스콤 CHECK API 인증 정보가 없습니다.");
    error.statusCode = 503;
    error.code = "KOSCOM_CONFIG_MISSING";
    throw error;
  }

  return {
    custId,
    authKey,
  };
}

function getNumber(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  const value = Number(String(raw).replaceAll(",", "").replace("%", ""));

  return Number.isFinite(value) ? value : null;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pick(raw, keys) {
  for (const key of keys) {
    if (raw && raw[key] !== undefined && raw[key] !== null && raw[key] !== "") {
      return raw[key];
    }
  }

  return null;
}

function hasAnyKey(raw, keys) {
  return keys.some((key) => raw?.[key] !== undefined && raw?.[key] !== null);
}

function decodeXmlEntities(value) {
  return String(value).replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

function stripCdata(value) {
  return String(value)
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "");
}

function parseXmlObject(xml) {
  const trimmed = String(xml || "").trim();

  if (!trimmed.startsWith("<")) {
    return null;
  }

  const withoutDeclaration = trimmed.replace(/^<\?xml[^>]*>\s*/i, "");
  if (/<!doctype html/i.test(withoutDeclaration) || /<html[\s>]/i.test(withoutDeclaration)) {
    return {
      __html: true,
      script: extractTagText(withoutDeclaration, "script"),
      title: extractTagText(withoutDeclaration, "title"),
      body: extractTagText(withoutDeclaration, "body"),
    };
  }

  const rowMatches = Array.from(withoutDeclaration.matchAll(/<((?:row|item|record|list|output|OutBlock|OutBlock_1|outBlock|outBlock1)[^>\s]*)[^>]*>([\s\S]*?)<\/\1>/gi));
  const leafTagPattern = /<([A-Za-z_가-힣][\w가-힣.-]*)[^>]*>([^<>]*)<\/\1>/g;
  const toObject = (body) => {
    const record = {};

    for (const match of body.matchAll(leafTagPattern)) {
      record[match[1]] = decodeXmlEntities(stripCdata(match[2]).trim());
    }

    return record;
  };
  const records = rowMatches.map((match) => toObject(match[2])).filter((record) => Object.keys(record).length > 0);

  if (records.length > 1) {
    return {
      items: records,
    };
  }

  if (records.length === 1) {
    return records[0];
  }

  const rootObject = toObject(withoutDeclaration);

  return Object.keys(rootObject).length ? rootObject : null;
}

function extractTagText(html, tagName) {
  const match = String(html).match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  if (!match) {
    return "";
  }

  return decodeXmlEntities(
    match[1]
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function parseDelimitedText(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const delimiter = ["\t", "|", ","].find((candidate) => lines[0].includes(candidate));

  if (!delimiter) {
    return null;
  }

  const headers = lines[0].split(delimiter).map((header) => header.trim());

  if (headers.length < 2) {
    return null;
  }

  return {
    items: lines.slice(1).map((line) => {
      const values = line.split(delimiter);

      return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
    }),
  };
}

function parseTextPayload(text) {
  const trimmed = String(text || "").trim();

  if (!trimmed) {
    return {};
  }

  const jsonpMatch = trimmed.match(/^[\w$.]+\(([\s\S]*)\);?$/);

  if (jsonpMatch) {
    try {
      return JSON.parse(jsonpMatch[1]);
    } catch {
      // Continue with other text parsers.
    }
  }

  return (
    parseXmlObject(trimmed) ||
    parseDelimitedText(trimmed) || {
      raw: text,
    }
  );
}

function collectArrays(value, arrays = []) {
  if (Array.isArray(value)) {
    arrays.push(value);
    return arrays;
  }

  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectArrays(child, arrays);
    }
  }

  return arrays;
}

export function getRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const preferredKeys = ["items", "list", "lists", "data", "result", "results", "output", "output1", "output2", "OutBlock", "OutBlock_1", "outBlock", "outBlock1"];

  for (const key of preferredKeys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }

    if (isObject(payload?.[key])) {
      const nestedRecords = getRecords(payload[key]);

      return nestedRecords.length ? nestedRecords : [payload[key]];
    }
  }

  const arrays = collectArrays(payload);

  if (arrays.length) {
    return arrays.sort((a, b) => b.length - a.length)[0];
  }

  const recordKeys = [
    "isuSrtCd",
    "isu_srt_cd",
    "isuCd",
    "isu_cd",
    "issuecode",
    "issueCode",
    "code",
    "stkCd",
    "stCode",
    "nowPrc",
    "trdPrc",
    "curPrc",
    "closePrice",
    "clsprc",
    "tddClsprc",
    "stckPrpr",
    "현재가",
    "종가",
  ];

  return isObject(payload) && hasAnyKey(payload, recordKeys) ? [payload] : [];
}

export function normalizeKoscomAsset(raw, fallback = {}) {
  const assetCode = String(
    pick(raw, ["isuSrtCd", "isu_srt_cd", "isuCd", "isu_cd", "issuecode", "issueCode", "code", "F16013", "stkCd", "stk_cd", "stCode", "shortCode", "short_code", "단축코드", "종목코드"]) || "",
  ).trim();
  const label = String(
    pick(raw, ["isuKorNm", "isu_kor_nm", "isuKorAbbrv", "isu_kor_abbrv", "korName", "name", "isuNm", "stockName", "stock_name", "F16002", "shortName", "short_name", "종목명", "한글종목명"]) ||
      assetCode,
  ).trim();

  if (!assetCode || !label) {
    return null;
  }

  return {
    asset_code: assetCode,
    label,
    asset_type: fallback.assetType || "STOCK",
    market: fallback.market || "KOSPI",
    description: fallback.description || "",
    icon: fallback.icon || (fallback.assetType === "ETF" ? "📊" : "📌"),
  };
}

export function normalizeKoscomQuote(raw) {
  const closePrice = getNumber(
    pick(raw, [
      "nowPrc",
      "now_prc",
      "trdPrc",
      "trd_prc",
      "curPrc",
      "cur_prc",
      "curprc",
      "closePrice",
      "close_price",
      "clsprc",
      "tddClsprc",
      "tdd_clsprc",
      "clpr",
      "close",
      "price",
      "F15001",
      "stckPrpr",
      "stck_prpr",
      "prpr",
      "lastPrice",
      "last_price",
      "현재가",
      "종가",
    ]),
  );
  const rawDiffRate = pick(raw, ["diffRate", "diff_rate", "cmpprevddRate", "cmpprevdd_rate", "updnRate", "updn_rate", "rate", "F15004"]);
  let diffRate = getNumber(rawDiffRate);
  const tradeDate = String(pick(raw, ["trdDd", "trd_dd", "tradeDate", "trade_date", "basDt", "baseDate", "tdd", "date", "F12506", "기준일", "거래일"]) || "").replace(
    /^(\d{4})(\d{2})(\d{2})$/,
    "$1-$2-$3",
  );

  if (diffRate !== null && (raw?.F15004 !== undefined || Math.abs(diffRate) > 1)) {
    diffRate /= 100;
  }

  return {
    closePrice,
    diffRate,
    tradeDate: /^\d{4}-\d{2}-\d{2}$/.test(tradeDate) ? tradeDate : null,
    raw,
  };
}

export async function callKoscom(path, params = {}, options = {}) {
  assertKoscomCheckApiEnabled();
  const { custId, authKey } = getKoscomCredentials();
  const proxyUrl =
    process.env.KOSCOM_PROXY_URL ||
    (process.env.NODE_ENV !== "production" ? defaultLocalProxyUrl : "");
  const useProxy = Boolean(proxyUrl) && options.bypassProxy !== true;
  const url = useProxy ? new URL(proxyUrl) : new URL(path, koscomBaseUrl);
  const requestPayload = {
    ...(useProxy
      ? {
          path,
          params,
        }
      : {
          cust_id: custId,
          auth_key: authKey,
        }),
  };

  if (!useProxy) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        requestPayload[key] = value;
      }
    }
  }

  const response = await runWithKoscomThrottle(() =>
    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(useProxy
          ? {
              "X-Koscom-Cust-Id": custId,
              "X-Koscom-Auth-Key": authKey,
            }
          : {}),
      },
      body: JSON.stringify(requestPayload),
    }),
  );
  const text = await response.text();
  let responsePayload = null;

  try {
    responsePayload = text ? JSON.parse(text) : {};
  } catch {
    responsePayload = parseTextPayload(text);
  }
  responsePayload = attachKoscomResponseMeta(responsePayload, response);

  if (!response.ok) {
    const error = new Error("코스콤 CHECK API 호출에 실패했습니다.");
    error.statusCode = 502;
    error.code = "KOSCOM_REQUEST_FAILED";
    error.payload = responsePayload;
    throw error;
  }

  if (responsePayload.__html === true) {
    const error = new Error("코스콤 CHECK API가 데이터 대신 HTML 응답을 반환했습니다.");
    error.statusCode = 502;
    error.code = "KOSCOM_HTML_RESPONSE";
    error.meta = {
      path,
      summary: summarizeKoscomPayload(responsePayload),
    };
    throw error;
  }

  if (responsePayload.success === false) {
    const error = new Error("코스콤 CHECK API가 실패 응답을 반환했습니다.");
    error.statusCode = 502;
    error.code = "KOSCOM_BUSINESS_ERROR";
    error.meta = {
      path,
      summary: summarizeKoscomPayload(responsePayload),
    };
    throw error;
  }

  return responsePayload;
}

function attachKoscomResponseMeta(payload, response) {
  if (!isObject(payload)) {
    return payload;
  }

  return {
    ...payload,
    __koscomResponse: {
      status: response.status,
      contentType: response.headers.get("content-type") || null,
    },
  };
}

export async function fetchKoscomMaster(path, fallback) {
  const payload = await callKoscom(path, {
    data_list: "F16013,F16002",
  });
  const records = getRecords(payload);
  const assets = records.map((record) => normalizeKoscomAsset(record, fallback)).filter(Boolean);

  if (!assets.length) {
    console.warn("Koscom master response shape unsupported", {
      path,
      fallback,
      summary: summarizeKoscomPayload(payload),
    });
  }

  return assets;
}

function toCompactDate(date) {
  return String(date).replaceAll("-", "");
}

export async function fetchKoscomQuote(assetCode, tradeDate = null) {
  const compactDate = tradeDate ? toCompactDate(tradeDate) : null;
  const quoteType = compactDate ? "HISTORICAL_CLOSE" : "CURRENT";
  const path = compactDate ? historyQuotePath : basicQuotePath;

  console.log("Koscom quote request started", {
    assetCode,
    quoteType,
    path,
    tradeDate,
  });

  let payload;

  try {
    payload = compactDate
      ? await callKoscom(path, {
          data_list: "F12506,F16013,F15001,F15004",
          jcode: assetCode,
          sdate: compactDate,
          edate: compactDate,
        })
      : await callKoscom(path, {
          data_list: "F16013,F16002,F15001,F15004",
          jcode: assetCode,
        });
  } catch (error) {
    console.error("Koscom quote request failed", {
      assetCode,
      quoteType,
      path,
      tradeDate,
      code: error.code || null,
      message: error.message,
      meta: error.meta || null,
    });
    throw error;
  }

  const records = getRecords(payload);
  const quote = normalizeKoscomQuote(records[0] || payload);

  if (!quote.closePrice) {
    const error = new Error("코스콤 CHECK API 응답에서 종가를 확인할 수 없습니다.");
    error.statusCode = 502;
    error.code = "KOSCOM_QUOTE_SHAPE_UNSUPPORTED";
    error.meta = {
      assetCode,
      tradeDate,
      summary: summarizeKoscomPayload(payload),
    };
    throw error;
  }

  console.log("Koscom quote request completed", {
    assetCode,
    quoteType,
    path,
    requestedTradeDate: tradeDate,
    responseTradeDate: quote.tradeDate,
  });

  return quote;
}

function summarizeKoscomPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      type: "array",
      length: payload.length,
      sampleKeys: isObject(payload[0]) ? Object.keys(payload[0]).slice(0, 20) : [],
    };
  }

  if (!isObject(payload)) {
    return {
      type: typeof payload,
    };
  }

  const records = getRecords(payload);
  const results = payload.results;
  const raw = typeof payload.raw === "string" ? payload.raw : "";
  const textPreview = ["title", "body", "script"]
    .map((key) => {
      const value = typeof payload[key] === "string" ? payload[key] : "";

      return value ? `${key}: ${value}` : "";
    })
    .filter(Boolean)
    .join(" | ");

  return {
    type: "object",
    keys: Object.keys(payload).slice(0, 20),
    httpStatus: payload.__koscomResponse?.status || null,
    contentType: payload.__koscomResponse?.contentType || null,
    isHtml: payload.__html === true || null,
    recordCount: records.length,
    recordKeys: isObject(records[0]) ? Object.keys(records[0]).slice(0, 30) : [],
    resultsType: Array.isArray(results) ? "array" : typeof results,
    resultsLength: Array.isArray(results) ? results.length : null,
    resultsKeys: isObject(results) ? Object.keys(results).slice(0, 20) : [],
    rawLength: raw.length || null,
    rawPreview: raw ? sanitizeKoscomText(raw).slice(0, 240) : null,
    textPreview: textPreview ? sanitizeKoscomText(textPreview).slice(0, 360) : null,
    message: pick(payload, ["message", "msg", "errorMessage", "error_message", "return_msg", "rsp_msg", "body", "title"]) || null,
    code: pick(payload, ["code", "errorCode", "error_code", "return_code", "rsp_cd", "status"]) || null,
  };
}

function sanitizeKoscomText(text) {
  const { custId, authKey } = getKoscomCredentials();

  return String(text).replaceAll(custId, "[CUST_ID]").replaceAll(authKey, "[AUTH_KEY]").replace(/\s+/g, " ").trim();
}
