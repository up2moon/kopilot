const SEARCH_TIMEOUT_MS = 30000;
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_MAX_RESULTS = 24;
const DEFAULT_NAVER_DISPLAY = 30;
const DEFAULT_FIRECRAWL_LIMIT = 15;
const FIRECRAWL_CONCURRENCY = 2;

const INVESTMENT_KEYWORDS = [
  "실적",
  "매출",
  "영업익",
  "영업이익",
  "순이익",
  "적자",
  "흑자",
  "주가",
  "목표가",
  "증권",
  "증시",
  "상승",
  "하락",
  "급등",
  "급락",
  "배당",
  "공시",
  "전망",
  "투자",
  "수주",
  "계약",
  "인수",
  "합병",
  "출시",
  "판매",
  "생산",
  "점유율",
  "사업",
  "성장",
  "규제",
  "리스크",
  "반도체",
  "호재",
  "악재",
  "경쟁",
  "업황",
  "시장",
  "기술",
  "제품",
];

const DIRECT_EVIDENCE_KEYWORDS = [
  "실적",
  "매출",
  "영업익",
  "영업이익",
  "순이익",
  "적자",
  "흑자",
  "주가",
  "목표가",
  "배당",
  "공시",
  "전망",
  "투자",
  "수주",
  "계약",
  "인수",
  "합병",
  "판매",
  "생산",
  "점유율",
  "성장",
  "규제",
  "리스크",
  "업황",
];

const EXCLUDED_TOPIC_KEYWORDS = [
  "아파트",
  "오피스텔",
  "분양",
  "부동산",
  "맛집",
  "여행",
  "공연",
  "신도시",
  "상가",
  "주택",
  "입주",
  "청약",
];

const DEFAULT_TRUSTED_DOMAINS = [
  "yna.co.kr",
  "news1.kr",
  "newsis.com",
  "sedaily.com",
  "hankyung.com",
  "mk.co.kr",
  "edaily.co.kr",
  "fnnews.com",
  "mt.co.kr",
  "asiae.co.kr",
  "etnews.com",
  "chosun.com",
  "donga.com",
  "joongang.co.kr",
  "hani.co.kr",
  "khan.co.kr",
  "kmib.co.kr",
  "heraldcorp.com",
  "sbs.co.kr",
  "kbs.co.kr",
  "mbc.co.kr",
  "ytn.co.kr",
  "zdnet.co.kr",
  "bloter.net",
  "businesspost.co.kr",
  "fntimes.com",
];

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&quot;", "\"")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[\s·.,()[\]{}'"]/g, "");
}

function parseHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));

    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function toIsoDate(value) {
  if (!value) return null;

  const text = String(value).trim();
  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) return date.toISOString();

  const englishMatch = text
    .toLowerCase()
    .match(/^(\d+)\s*(minute|hour|day|week|month|year)s?\s+ago$/);
  const koreanMatch = text.match(
    /^(\d+)\s*(분|시간|일|주|개월|달|년)\s*전$/,
  );
  const match = englishMatch || koreanMatch;

  if (!match) return null;

  const unitMilliseconds = {
    minute: 60 * 1000,
    분: 60 * 1000,
    hour: 60 * 60 * 1000,
    시간: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    일: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    주: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    개월: 30 * 24 * 60 * 60 * 1000,
    달: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    년: 365 * 24 * 60 * 60 * 1000,
  };

  return new Date(
    Date.now() - Number(match[1]) * unitMilliseconds[match[2]],
  ).toISOString();
}

function normalizeNewsItem({
  title,
  url,
  content,
  publishedAt,
  provider,
}) {
  const parsedUrl = parseHttpUrl(url);

  if (!parsedUrl || !publishedAt) return null;

  return {
    title: stripHtml(title || "제목 없음"),
    url: parsedUrl.toString(),
    content: stripHtml(content).slice(0, 500),
    publishedAt,
    source: parsedUrl.hostname.replace(/^www\./, ""),
    provider,
  };
}

function getTrustedDomains() {
  const configured = String(
    process.env.INVESTMENT_NEWS_ALLOWED_DOMAINS || "",
  )
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_TRUSTED_DOMAINS;
}

function isTrustedDomain(hostname) {
  const normalized = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");

  return getTrustedDomains().some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

function getFirecrawlApiKey() {
  return (
    process.env.FIRECRAWL_API_KEY ||
    process.env.FIRECRALW_API_KEY ||
    ""
  );
}

function getLookbackDays() {
  return (
    Number(process.env.INVESTMENT_NEWS_LOOKBACK_DAYS) ||
    DEFAULT_LOOKBACK_DAYS
  );
}

function getFirecrawlTimeFilter(lookbackDays) {
  const end = new Date();
  const start = new Date(
    end.getTime() - Math.max(1, lookbackDays) * 24 * 60 * 60 * 1000,
  );
  const format = (date) =>
    [
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
      date.getUTCFullYear(),
    ].join("/");

  return `cdr:1,cd_min:${format(start)},cd_max:${format(end)},sbd:1`;
}

export async function naverSearchTool(query, display = 10) {
  const missing = [
    "NAVER_API_CLIENT_ID",
    "NAVER_API_SECRET_KEY",
  ].filter((key) => !process.env[key]);

  if (missing.length) {
    return {
      provider: "NAVER",
      status: "NOT_CONFIGURED",
      missing,
      results: [],
    };
  }

  const url = new URL("https://openapi.naver.com/v1/search/news.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(Math.min(Math.max(display, 1), 100)));
  url.searchParams.set("sort", "date");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_API_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_API_SECRET_KEY,
    },
  });

  if (!response.ok) {
    const error = new Error(`Naver news search failed: ${response.status}`);
    error.code = "NAVER_SEARCH_FAILED";
    throw error;
  }

  const data = await response.json();

  return {
    provider: "NAVER",
    status: "OK",
    total: Number(data.total || 0),
    results: (data.items || [])
      .map((item) =>
        normalizeNewsItem({
          title: item.title,
          url: item.originallink || item.link,
          content: item.description,
          publishedAt: toIsoDate(item.pubDate),
          provider: "NAVER",
        }),
      )
      .filter(Boolean),
  };
}

export function normalizeFirecrawlNews(data) {
  return (data?.data?.news || [])
    .map((item) =>
      normalizeNewsItem({
        title: item.title,
        url: item.url,
        content:
          item.snippet ||
          item.markdown ||
          item.metadata?.description,
        publishedAt: toIsoDate(item.date),
        provider: "FIRECRAWL",
      }),
    )
    .filter(Boolean);
}

export async function firecrawlSearchTool(query, limit = 10) {
  const apiKey = getFirecrawlApiKey();

  if (!apiKey) {
    return {
      provider: "FIRECRAWL",
      status: "NOT_CONFIGURED",
      missing: ["FIRECRAWL_API_KEY"],
      results: [],
    };
  }

  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: Math.min(Math.max(limit, 1), 100),
      sources: ["news"],
      tbs: getFirecrawlTimeFilter(getLookbackDays()),
      location: "Seoul, South Korea",
      country: "KR",
      timeout: SEARCH_TIMEOUT_MS - 2000,
      ignoreInvalidURLs: true,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(
      `Firecrawl news search failed: ${response.status}`,
    );
    const statusCodeMap = {
      401: "FIRECRAWL_UNAUTHORIZED",
      402: "FIRECRAWL_PAYMENT_REQUIRED",
      408: "FIRECRAWL_TIMEOUT",
      429: "FIRECRAWL_RATE_LIMITED",
    };
    error.code =
      data?.code || statusCodeMap[response.status] || "FIRECRAWL_SEARCH_FAILED";
    throw error;
  }

  const data = await response.json();

  if (data.success === false) {
    const error = new Error(data.error || "Firecrawl news search failed");
    error.code = data.code || "FIRECRAWL_SEARCH_FAILED";
    throw error;
  }

  return {
    provider: "FIRECRAWL",
    status: "OK",
    total: (data.data?.news || []).length,
    creditsUsed: Number(data.creditsUsed || 0),
    results: normalizeFirecrawlNews(data),
  };
}

function includesAnyKeyword(value, keywords) {
  const normalized = normalizeText(value);

  return keywords.some((keyword) =>
    normalized.includes(normalizeText(keyword)),
  );
}

function includesAsset(value, asset) {
  const normalized = normalizeText(value);
  const label = normalizeText(asset.label);
  const code = normalizeText(asset.assetCode);

  return Boolean(
    (label.length >= 2 && normalized.includes(label)) ||
      (code && normalized.includes(code)),
  );
}

function getEvidence(item, asset) {
  const titleHasAsset = includesAsset(item.title, asset);
  const contentHasAsset = includesAsset(item.content, asset);
  const titleHasInvestment = includesAnyKeyword(
    item.title,
    INVESTMENT_KEYWORDS,
  );
  const contentHasInvestment = includesAnyKeyword(
    item.content,
    INVESTMENT_KEYWORDS,
  );
  const titleHasDirectEvidence = includesAnyKeyword(
    item.title,
    DIRECT_EVIDENCE_KEYWORDS,
  );
  const hasExcludedTopic = includesAnyKeyword(
    `${item.title} ${item.content}`,
    EXCLUDED_TOPIC_KEYWORDS,
  );

  if (hasExcludedTopic && !titleHasDirectEvidence) return null;

  if (titleHasAsset && titleHasDirectEvidence) {
    return {
      evidenceTier: "DIRECT",
      relevanceScore: 100,
      matchedBy: "TITLE_ASSET_AND_DIRECT_EVIDENCE",
    };
  }

  if (titleHasAsset && (titleHasInvestment || contentHasInvestment)) {
    return {
      evidenceTier: "COMPANY",
      relevanceScore: 75,
      matchedBy: "TITLE_ASSET",
    };
  }

  if (
    contentHasAsset &&
    (titleHasDirectEvidence ||
      titleHasInvestment ||
      contentHasInvestment)
  ) {
    return {
      evidenceTier: "SUPPORTING",
      relevanceScore: 55,
      matchedBy: "CONTENT_ASSET",
    };
  }

  if (
    item.theme &&
    item.theme !== "LATEST" &&
    (titleHasInvestment || contentHasInvestment)
  ) {
    return {
      evidenceTier: "INDUSTRY",
      relevanceScore: 30,
      matchedBy: "QUERY_CONTEXT",
    };
  }

  return null;
}

function deduplicateNews(items) {
  const seenUrls = new Set();
  const seenTitles = [];

  return (items || []).filter((item) => {
    const canonicalUrl = item.url.replace(/[?#].*$/, "");
    const normalizedTitle = normalizeText(item.title);
    const hasSimilarTitle = seenTitles.some((seenTitle) => {
      const shorterLength = Math.min(
        seenTitle.length,
        normalizedTitle.length,
      );

      return (
        seenTitle === normalizedTitle ||
        (shorterLength >= 16 &&
          (seenTitle.includes(normalizedTitle) ||
            normalizedTitle.includes(seenTitle)))
      );
    });

    if (seenUrls.has(canonicalUrl) || hasSimilarTitle) return false;

    seenUrls.add(canonicalUrl);
    if (normalizedTitle) seenTitles.push(normalizedTitle);
    return true;
  });
}

function isRecent(publishedAt, lookbackDays) {
  const publishedTime = new Date(publishedAt).getTime();
  const oldestTime = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const futureTolerance = Date.now() + 24 * 60 * 60 * 1000;

  return publishedTime >= oldestTime && publishedTime <= futureTolerance;
}

export function filterVerifiedStockNews(
  items,
  asset,
  { lookbackDays = getLookbackDays() } = {},
) {
  return deduplicateNews(
    (items || []).flatMap((item) => {
      if (
        !item.publishedAt ||
        !isRecent(item.publishedAt, lookbackDays) ||
        !isTrustedDomain(item.source)
      ) {
        return [];
      }

      const evidence = getEvidence(item, asset);

      return evidence ? [{ ...item, ...evidence }] : [];
    }),
  ).sort((left, right) => {
    const scoreDifference = right.relevanceScore - left.relevanceScore;

    return (
      scoreDifference ||
      new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime()
    );
  });
}

function buildSearchQueries(asset) {
  const label = stripHtml(asset.label || asset.assetCode);

  return [
    { theme: "LATEST", query: label },
    { theme: "EARNINGS", query: `${label} 실적` },
    { theme: "OUTLOOK", query: `${label} 주가 전망` },
    { theme: "GROWTH", query: `${label} 성장 투자` },
    { theme: "RISK", query: `${label} 리스크 악재` },
  ];
}

async function runSearchTasks(tasks, concurrency, onProgress) {
  const attempts = new Array(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      const task = tasks[index];

      try {
        const value = await task.run();
        attempts[index] = {
          ...task,
          status: "fulfilled",
          value: {
            ...value,
            results: (value.results || []).map((item) => ({
              ...item,
              query: task.query,
              theme: task.theme,
            })),
          },
        };
      } catch (reason) {
        attempts[index] = {
          ...task,
          status: "rejected",
          reason,
        };
      }

      onProgress?.();
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(concurrency, 1), tasks.length) },
      () => worker(),
    ),
  );

  return attempts;
}

function aggregateProvider(attempts, provider) {
  const providerAttempts = attempts.filter(
    (attempt) => attempt.provider === provider,
  );
  const fulfilled = providerAttempts.filter(
    (attempt) => attempt.status === "fulfilled",
  );
  const successful = fulfilled.filter(
    (attempt) => attempt.value.status === "OK",
  );
  const notConfigured = fulfilled.filter(
    (attempt) => attempt.value.status === "NOT_CONFIGURED",
  );
  const failed = providerAttempts.filter(
    (attempt) => attempt.status === "rejected",
  );
  let status = "FAILED";

  if (successful.length === providerAttempts.length) {
    status = "OK";
  } else if (successful.length) {
    status = "PARTIAL";
  } else if (notConfigured.length === providerAttempts.length) {
    status = "NOT_CONFIGURED";
  }

  return {
    provider,
    status,
    code: failed[0]?.reason?.code || null,
    missing: notConfigured[0]?.value?.missing || [],
    queryCount: providerAttempts.length,
    completedQueryCount: successful.length,
    candidateCount: successful.reduce(
      (sum, attempt) => sum + (attempt.value.results?.length || 0),
      0,
    ),
    creditsUsed: successful.reduce(
      (sum, attempt) => sum + (attempt.value.creditsUsed || 0),
      0,
    ),
    results: successful.flatMap(
      (attempt) => attempt.value.results || [],
    ),
  };
}

export async function searchStockNews(asset, { onProgress } = {}) {
  const queries = buildSearchQueries(asset);
  const naverDisplay =
    Number(process.env.INVESTMENT_NEWS_NAVER_DISPLAY) ||
    DEFAULT_NAVER_DISPLAY;
  const firecrawlLimit =
    Number(process.env.INVESTMENT_NEWS_FIRECRAWL_LIMIT) ||
    DEFAULT_FIRECRAWL_LIMIT;
  const maxResults =
    Number(process.env.INVESTMENT_NEWS_MAX_RESULTS) ||
    DEFAULT_MAX_RESULTS;
  const lookbackDays = getLookbackDays();
  const naverTasks = queries.map(({ query, theme }) => ({
    provider: "NAVER",
    query,
    theme,
    run: () => naverSearchTool(query, naverDisplay),
  }));
  const firecrawlTasks = queries.map(({ query, theme }) => ({
    provider: "FIRECRAWL",
    query,
    theme,
    run: () => firecrawlSearchTool(query, firecrawlLimit),
  }));
  let completed = 0;
  const reportProgress = () => {
    completed += 1;
    onProgress?.({
      completed,
      total: naverTasks.length + firecrawlTasks.length,
    });
  };
  const [naverAttempts, firecrawlAttempts] = await Promise.all([
    runSearchTasks(naverTasks, naverTasks.length, reportProgress),
    runSearchTasks(
      firecrawlTasks,
      FIRECRAWL_CONCURRENCY,
      reportProgress,
    ),
  ]);
  const attempts = [...naverAttempts, ...firecrawlAttempts];
  const providers = [
    aggregateProvider(attempts, "NAVER"),
    aggregateProvider(attempts, "FIRECRAWL"),
  ];
  const candidates = providers.flatMap(
    (provider) => provider.results || [],
  );
  const uniqueCandidates = deduplicateNews(candidates);
  const results = filterVerifiedStockNews(uniqueCandidates, asset, {
    lookbackDays,
  }).slice(0, Math.min(Math.max(maxResults, 1), 50));
  const evidenceCounts = results.reduce(
    (counts, item) => ({
      ...counts,
      [item.evidenceTier]: (counts[item.evidenceTier] || 0) + 1,
    }),
    {},
  );

  return {
    implementation: "news_agent/tools.mjs",
    query: queries[0].query,
    queries,
    queryCount: queries.length * 2,
    lookbackDays,
    candidateCount: candidates.length,
    uniqueCandidateCount: uniqueCandidates.length,
    verifiedCount: results.length,
    evidenceCounts,
    providers: providers.map(
      ({
        provider,
        status,
        code,
        missing,
        queryCount,
        completedQueryCount,
        candidateCount,
        creditsUsed,
      }) => ({
        provider,
        status,
        code,
        missing,
        queryCount,
        completedQueryCount,
        candidateCount,
        creditsUsed,
      }),
    ),
    results,
  };
}
