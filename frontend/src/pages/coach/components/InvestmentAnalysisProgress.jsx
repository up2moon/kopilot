const stageLabels = {
  information: "자료 수집",
  risk: "반대 근거",
  opportunity: "찬성 근거",
  report: "최종 리포트",
};

function StageStatus({ label, status }) {
  return (
    <div className={`investment-agent-stage is-${status}`}>
      <i aria-hidden="true" />
      <span>{label}</span>
      <small>
        {status === "completed"
          ? "완료"
          : status === "running"
            ? "진행 중"
            : "대기"}
      </small>
    </div>
  );
}

function PartialPerspective({ preview, title, result, tone }) {
  if (!result && !preview) return null;

  return (
    <section className={`investment-agent-partial is-${tone}`}>
      <strong>{title}</strong>
      {result ? (
        <>
          <p>{result.summary}</p>
          <ul>
            {(result.points || []).map((point) => (
              <li key={`${point.title}-${point.detail}`}>
                <b>{point.title}</b>
                <span>{point.detail}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="investment-agent-stream-preview">
          {preview}
          <i aria-hidden="true" />
        </p>
      )}
    </section>
  );
}

export default function InvestmentAnalysisProgress({ progress }) {
  if (!progress) return null;
  const hasFailedSearch = (progress.information?.providers || []).some(
    (provider) => provider.status !== "OK",
  );

  return (
    <article className="investment-agent-progress" aria-live="polite">
      <header>
        <span className="investment-agent-pulse" aria-hidden="true" />
        <div>
          <strong>에이전트가 분석하고 있어요</strong>
          <p>{progress.message}</p>
        </div>
      </header>
      <div className="investment-agent-stages">
        {Object.entries(stageLabels).map(([key, label]) => (
          <StageStatus
            key={key}
            label={label}
            status={progress.stages[key]}
          />
        ))}
      </div>
      {progress.information ? (
        <>
          <p className="investment-agent-information">
            news_agent · 코스콤 시세{" "}
            {progress.information.quote ? "확인 완료" : "확인 불가"} · 검색{" "}
            {progress.information.newsQueryCount}회 · 후보{" "}
            {progress.information.newsCandidateCount}건 중 근거{" "}
            {progress.information.newsCount}건 정리
          </p>
          {hasFailedSearch ? (
            <p className="investment-agent-source-warning">
              일부 뉴스 검색은 실패했지만 성공한 결과로 분석했어요.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="investment-agent-partials">
        <PartialPerspective
          preview={progress.streamPreviews.risk}
          result={progress.perspectives.risk}
          title="신중해야 하는 근거"
          tone="risk"
        />
        <PartialPerspective
          preview={progress.streamPreviews.opportunity}
          result={progress.perspectives.opportunity}
          title="기회로 보는 근거"
          tone="opportunity"
        />
      </div>
    </article>
  );
}
