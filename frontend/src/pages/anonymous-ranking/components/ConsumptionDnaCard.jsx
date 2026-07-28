export default function ConsumptionDnaCard({
  consumptionDna,
  error,
  loading,
  onRefresh,
}) {
  const title = loading
    ? '소비 성향을 분석하고 있어요...'
    : consumptionDna
      ? `${consumptionDna.emoji} ${consumptionDna.nickname}`
      : '아직 분석하지 못했어요'

  return (
    <section className="dna-card" aria-live="polite">
      <div className="dna-card-heading">
        <div>
          <span className="dna-eyebrow">이번 달 소비 DNA</span>
          <h2>{title}</h2>
        </div>
        {consumptionDna && (
          <button
            type="button"
            className="dna-refresh-button"
            onClick={onRefresh}
          >
            다시 분석
          </button>
        )}
      </div>

      {consumptionDna ? (
        <>
          <p className="dna-summary">{consumptionDna.summary}</p>
          <div className="dna-dimensions">
            {consumptionDna.dimensions.map((dimension) => (
              <div className="dna-dimension" key={dimension.key}>
                <div className="dna-labels">
                  <span>{dimension.leftLabel}</span>
                  <span>{dimension.rightLabel}</span>
                </div>
                <div className="dna-track">
                  <span style={{ left: `${dimension.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : error ? (
        <div className="dna-error">
          <p>{error}</p>
          <button type="button" onClick={onRefresh}>
            분석 다시 시도
          </button>
        </div>
      ) : null}
    </section>
  )
}
