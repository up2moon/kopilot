import {
  formatGain,
  formatPrice,
  formatRate,
  formatWon,
} from '../utils/formatters'

export default function SelectedAssetResults({
  comparisons,
  selectedAssets,
}) {
  if (selectedAssets.length > 0 && comparisons.length === 0) {
    return (
      <section className="investment-selected-list">
        <article className="investment-selected-card">
          <div>
            <span>계산 대상</span>
            <strong>
              {selectedAssets.map((asset) => asset.label).join(', ')}
            </strong>
            <small>선택한 종목의 시세와 수익률을 계산하고 있어요.</small>
          </div>
        </article>
      </section>
    )
  }

  if (!comparisons.length) return null

  return (
    <section className="investment-selected-list">
      {comparisons.map((comparison) => (
        <article
          className="investment-selected-card"
          key={comparison.assetCode}
        >
          <div>
            <span>내가 고른 종목</span>
            <strong>
              {comparison.label}에 투자했다면
              <br />
              현재 약 {formatWon(comparison.estimatedValue)}
            </strong>
            <small>{comparison.assumedBuyDate} 기준 매수 가정</small>
            <dl className="investment-price-meta">
              <div>
                <dt>현재가</dt>
                <dd>{formatPrice(comparison.currentPrice)}</dd>
              </div>
              <div>
                <dt>기준가</dt>
                <dd>{formatPrice(comparison.basePrice)}</dd>
              </div>
            </dl>
          </div>
          <div className="investment-selected-result">
            <strong
              className={
                comparison.estimatedGain < 0 ? 'is-loss' : 'is-gain'
              }
            >
              {formatGain(comparison.estimatedGain)}
            </strong>
            <span>{formatRate(comparison.returnRate)}</span>
          </div>
        </article>
      ))}
    </section>
  )
}
