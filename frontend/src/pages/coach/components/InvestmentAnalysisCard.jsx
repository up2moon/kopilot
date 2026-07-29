function formatWon(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ko-KR")}원`;
}

function formatPublishedDate(value) {
  if (!value) return "발행일 확인 불가";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "발행일 확인 불가";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getEvidenceTierLabel(tier) {
  const labels = {
    DIRECT: "직접 근거",
    COMPANY: "기업 관련",
    SUPPORTING: "보조 근거",
    INDUSTRY: "산업 참고",
  };

  return labels[tier] || "참고 근거";
}

function getChartPoints(points, key, maxValue) {
  const width = 292;
  const height = 112;

  return points
    .map((point, index) => {
      const x =
        points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      const y = height - ((Number(point[key]) || 0) / maxValue) * height;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ProjectionChart({ projection }) {
  const points = projection?.points || [];

  if (!points.length) return null;

  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [
      point.conservative,
      point.base,
      point.optimistic,
    ]),
  );
  const series = [
    { key: "conservative", label: "보수적 -5%", color: "#e5484d" },
    { key: "base", label: "기준 6%", color: "#3182f6" },
    { key: "optimistic", label: "낙관적 12%", color: "#00a661" },
  ];

  return (
    <section className="investment-analysis-chart">
      <div className="investment-analysis-section-title">
        <strong>장기 자산 시나리오</strong>
        <span>매월 같은 절약액을 투자할 경우</span>
      </div>
      <svg
        role="img"
        aria-label="1년, 3년, 5년, 10년 장기 자산 시나리오 차트"
        viewBox="0 0 292 132"
      >
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2="292"
            y1={112 - ratio * 112}
            y2={112 - ratio * 112}
            className="investment-analysis-grid-line"
          />
        ))}
        {series.map((item) => (
          <polyline
            key={item.key}
            points={getChartPoints(points, item.key, maxValue)}
            fill="none"
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ))}
        {points.map((point, index) => (
          <text
            key={point.year}
            x={(index / (points.length - 1)) * 292}
            y="130"
            textAnchor={
              index === 0
                ? "start"
                : index === points.length - 1
                  ? "end"
                  : "middle"
            }
          >
            {point.year === 0 ? "현재" : `${point.year}년`}
          </text>
        ))}
      </svg>
      <div className="investment-analysis-legend">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="investment-analysis-values">
        {points.slice(-1).map((point) => (
          <div key={point.year}>
            <span>10년 기준 시나리오</span>
            <strong>{formatWon(point.base)}</strong>
            <small>총 납입 {formatWon(point.contributedAmount)}</small>
          </div>
        ))}
      </div>
      <p>{projection.assumption}</p>
    </section>
  );
}

function Perspective({ title, tone, data, newsByUrl }) {
  return (
    <section className={`investment-analysis-perspective is-${tone}`}>
      <div className="investment-analysis-section-title">
        <strong>{title}</strong>
        <span>{data?.agent}</span>
      </div>
      <p>{data?.summary}</p>
      <ul>
        {(data?.points || []).map((point) => {
          const evidence = newsByUrl.get(point.evidenceUrl);

          return (
            <li key={`${point.title}-${point.detail}`}>
              <strong>{point.title}</strong>
              <span>{point.detail}</span>
              {evidence ? (
                <a
                  className="investment-analysis-evidence-link"
                  href={evidence.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  근거 기사 · {evidence.source}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function InvestmentAnalysisCard({ analysis }) {
  if (!analysis) return null;

  const news = analysis.information?.news?.results || [];
  const evidenceCounts =
    analysis.information?.news?.evidenceCounts || {};
  const quote = analysis.information?.koscom?.quote;
  const newsByUrl = new Map(news.map((item) => [item.url, item]));
  const lookbackDays =
    analysis.information?.news?.lookbackDays || 90;
  const evidenceSummary = Object.entries(evidenceCounts)
    .filter(([, count]) => count)
    .map(([tier, count]) => `${getEvidenceTierLabel(tier)} ${count}`)
    .join(" · ");

  return (
    <article className="investment-analysis-card">
      <header>
        <span>AI 종목 분석 리포트</span>
        <strong>{analysis.report?.title || analysis.asset?.label}</strong>
        <p>{analysis.report?.keyTakeaway}</p>
        <div className="investment-analysis-quote">
          <span>월 절약액 {formatWon(analysis.monthlyAmount)}</span>
          {quote?.currentPrice ? (
            <span>
              현재가 {formatWon(quote.currentPrice)} · {quote.tradeDate}
            </span>
          ) : (
            <span>현재 시세 확인 불가</span>
          )}
        </div>
      </header>

      <div className="investment-analysis-perspectives">
        <Perspective
          data={analysis.perspectives?.risk}
          newsByUrl={newsByUrl}
          title="신중해야 하는 이유"
          tone="risk"
        />
        <Perspective
          data={analysis.perspectives?.opportunity}
          newsByUrl={newsByUrl}
          title="기회로 보는 이유"
          tone="opportunity"
        />
      </div>

      <ProjectionChart projection={analysis.projection} />

      <section className="investment-analysis-sources">
        <div className="investment-analysis-section-title">
          <strong>수집한 투자 근거</strong>
          <span>news_agent · {news.length}건</span>
        </div>
        {evidenceSummary ? (
          <p className="investment-analysis-source-summary">
            {evidenceSummary}
          </p>
        ) : null}
        {news.length ? (
          <ul>
            {news.map((item) => (
              <li key={item.url || item.title}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <strong>{item.title}</strong>
                  <span>
                    {getEvidenceTierLabel(item.evidenceTier)} · {item.source} ·{" "}
                    {formatPublishedDate(item.publishedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="investment-analysis-no-sources">
            최근 {lookbackDays}일 내 발행일과 언론사를 확인한 관련 기사가
            없어요. 부정확한 검색 결과는 표시하지 않았습니다.
          </p>
        )}
      </section>

      <p className="investment-analysis-disclaimer">
        {analysis.disclaimer}
      </p>
    </article>
  );
}
