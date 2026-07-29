import assert from "node:assert/strict";
import test from "node:test";

import {
  createLongTermProjection,
  getPerspectiveStreamPreview,
} from "./investmentAgents.js";
import {
  filterVerifiedStockNews,
  normalizeFirecrawlNews,
} from "../../../news_agent/tools.mjs";

test("createLongTermProjection creates ordered recurring-investment scenarios", () => {
  const points = createLongTermProjection(100000);

  assert.deepEqual(
    points.map((point) => point.year),
    [0, 1, 3, 5, 10],
  );
  assert.equal(points[0].base, 0);
  assert.equal(points[1].contributedAmount, 1200000);
  assert.ok(points[4].optimistic > points[4].base);
  assert.ok(points[4].base > points[4].conservative);
});

test("createLongTermProjection normalizes invalid amounts", () => {
  const points = createLongTermProjection(-100);

  assert.ok(
    points.every(
      (point) =>
        point.contributedAmount === 0 &&
        point.conservative === 0 &&
        point.base === 0 &&
        point.optimistic === 0,
    ),
  );
});

test("getPerspectiveStreamPreview converts partial structured output to readable text", () => {
  const preview = getPerspectiveStreamPreview(
    '{"summary":"변동성이 커질 수 있어요.","points":[{"title":"실적 둔화","detail":"매출 성장률을 확인해야',
  );

  assert.match(preview, /변동성이 커질 수 있어요/);
  assert.match(preview, /• 실적 둔화/);
  assert.match(preview, /매출 성장률을 확인해야/);
});

test("filterVerifiedStockNews keeps only recent trusted asset-related articles", () => {
  const recent = new Date().toISOString();
  const results = filterVerifiedStockNews(
    [
      {
        title: "삼성전자, 신규 반도체 투자 발표",
        content: "삼성전자 실적과 투자 계획",
        url: "https://www.yna.co.kr/view/example",
        source: "yna.co.kr",
        publishedAt: recent,
        provider: "NAVER",
      },
      {
        title: "삼성전자 전망",
        content: "검증되지 않은 블로그",
        url: "https://example.com/post",
        source: "example.com",
        publishedAt: recent,
        provider: "FIRECRAWL",
      },
      {
        title: "다른 기업 뉴스",
        content: "관련 없는 기사",
        url: "https://www.yna.co.kr/view/other",
        source: "yna.co.kr",
        publishedAt: recent,
        provider: "NAVER",
      },
      {
        title: "삼성전자 평택캠퍼스 인접 아파트 분양",
        content: "부동산 홍보 기사",
        url: "https://www.chosun.com/special/real-estate-ad",
        source: "chosun.com",
        publishedAt: recent,
        provider: "FIRECRAWL",
      },
    ],
    {
      assetCode: "005930",
      label: "삼성전자",
    },
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].source, "yna.co.kr");
  assert.equal(results[0].evidenceTier, "DIRECT");
});

test("filterVerifiedStockNews includes graded company and industry evidence", () => {
  const recent = new Date().toISOString();
  const results = filterVerifiedStockNews(
    [
      {
        title: "삼성전자, 2분기 영업이익 전망 상향",
        content: "실적 개선 전망",
        url: "https://www.yna.co.kr/view/direct",
        source: "yna.co.kr",
        publishedAt: recent,
        provider: "NAVER",
        theme: "EARNINGS",
      },
      {
        title: "삼성전자 갤럭시 언팩 현장",
        content: "신제품을 공개했다.",
        url: "https://www.etnews.com/company",
        source: "etnews.com",
        publishedAt: recent,
        provider: "FIRECRAWL",
        theme: "LATEST",
      },
      {
        title: "반도체 업황 회복 전망",
        content: "삼성전자 매출에도 영향을 줄 수 있다.",
        url: "https://www.hankyung.com/supporting",
        source: "hankyung.com",
        publishedAt: recent,
        provider: "NAVER",
        theme: "OUTLOOK",
      },
      {
        title: "반도체 시장 투자 확대",
        content: "관련 기업 전반의 성장 가능성을 다룬다.",
        url: "https://www.mk.co.kr/industry",
        source: "mk.co.kr",
        publishedAt: recent,
        provider: "FIRECRAWL",
        theme: "GROWTH",
      },
    ],
    {
      assetCode: "005930",
      label: "삼성전자",
    },
  );

  assert.deepEqual(
    results.map((item) => item.evidenceTier),
    ["DIRECT", "COMPANY", "SUPPORTING", "INDUSTRY"],
  );
});

test("normalizeFirecrawlNews maps news results and rejects missing dates", () => {
  const results = normalizeFirecrawlNews({
    data: {
      news: [
        {
          title: "삼성전자, 반도체 투자 확대",
          snippet: "실적 전망과 투자 계획을 발표했다.",
          url: "https://www.yna.co.kr/view/firecrawl-example",
          date: new Date().toISOString(),
        },
        {
          title: "발행일 없는 기사",
          snippet: "검증에서 제외되어야 한다.",
          url: "https://www.yna.co.kr/view/no-date",
        },
      ],
    },
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].provider, "FIRECRAWL");
  assert.equal(results[0].source, "yna.co.kr");
});
