import SelectedAssetResults from './SelectedAssetResults'
import SimulationRow from './SimulationRow'
import { formatGain, formatWon } from '../utils/formatters'

export default function InvestmentResults({
  children,
  data,
  isRefreshing,
  onOpenChallenges,
  selectedAssets,
  selectedResultRef,
}) {
  const primaryBenchmark = data?.benchmarks?.[0]
  const comparisons = isRefreshing ? [] : data?.comparisons || []
  const investmentAmount =
    data?.investmentAmount ?? data?.spendingAmount ?? data?.savedAmount
  const monthLabel = data?.month
    ? `${Number(data.month.slice(5, 7))}월`
    : '선택한 달'
  const sourceLabel = isNaN(Number(investmentAmount))
    ? '소비액'
    : `${monthLabel} ${data?.categoryLabel || '소비'} ${formatWon(investmentAmount)}`

  if (data?.status === 'NO_SAVINGS') {
    return (
      <>
        <section className="investment-empty-savings" role="status">
          <span aria-hidden="true">🌱</span>
          <strong>이번 달 예상 절약액이 아직 없어요</strong>
          <p>
            챌린지를 인증하면 아낀 돈의 투자효과를 확인할 수 있어요.
          </p>
          <button type="button" onClick={onOpenChallenges}>
            챌린지 보러 가기
          </button>
        </section>

        <p className="investment-disclaimer">
          본 화면은 예상 절약액의 미래 가치를 이해하기 위한 참고용
          시뮬레이션입니다. 투자 권유 또는 금융상품 추천이 아닙니다.
        </p>
      </>
    )
  }

  const isSavings = data?.category === 'savings'

  return (
    <>
      <section className="investment-hero-card">
        <div className="investment-hero-basis">
          <span>기준 금액</span>
          <p>{sourceLabel}</p>
        </div>
        {primaryBenchmark ? (
          <>
            <p className="investment-hero-scenario">
              이 돈을 <strong>{primaryBenchmark.label}</strong>에 투자했다면
            </p>
            <div className="investment-hero-value">
              <span>지금</span>
              <strong>{formatWon(primaryBenchmark.estimatedValue)}</strong>
            </div>
            <p
              className={`investment-hero-gain${
                Number(primaryBenchmark.estimatedGain) < 0
                  ? ' is-loss'
                  : ' is-gain'
              }`}
            >
              원금 대비 {formatGain(primaryBenchmark.estimatedGain)}
            </p>
          </>
        ) : (
          <p className="investment-hero-scenario">{data?.assumptionText}</p>
        )}
      </section>

      <section className="investment-section">
        <div className="investment-section-heading">
          <h2>기본 지수 비교</h2>
          <span>{data?.assumptionText}</span>
        </div>
        <div className="investment-results">
          {(data?.benchmarks || []).map((asset) => (
            <SimulationRow key={asset.assetCode} asset={asset} />
          ))}
        </div>
      </section>

      {children}

      <SelectedAssetResults
        comparisons={comparisons}
        selectedAssets={selectedAssets}
        resultRef={selectedResultRef}
      />

      <p className="investment-disclaimer">
        본 화면은 {isSavings ? '예상 절약액의 미래 가치' : '소비액의 기회비용'}을 이해하기 위한 참고용
        시뮬레이션입니다. 투자 권유 또는 금융상품 추천이 아니며, 과거
        수익률은 미래 수익을 보장하지 않습니다.
      </p>
    </>
  )
}
