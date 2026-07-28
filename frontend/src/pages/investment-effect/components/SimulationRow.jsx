import {
  formatGain,
  formatPrice,
  formatWon,
} from '../utils/formatters'

export default function SimulationRow({ asset }) {
  const isLoss = Number(asset.estimatedGain) < 0

  return (
    <article className="investment-result-row">
      <div className="investment-asset-left">
        <span className="investment-asset-icon" aria-hidden="true">
          {asset.icon || '📊'}
        </span>
        <div>
          <strong>{asset.label}</strong>
          <span>{asset.description || asset.market || asset.assetType}</span>
          {asset.currentPrice && (
            <small>
              현재가 {formatPrice(asset.currentPrice)}
              {asset.currentTradeDate ? ` · ${asset.currentTradeDate}` : ''}
            </small>
          )}
        </div>
      </div>
      <div className="investment-asset-right">
        <strong>{formatWon(asset.estimatedValue)}</strong>
        <span className={isLoss ? 'is-loss' : 'is-gain'}>
          {formatGain(asset.estimatedGain)}
        </span>
      </div>
    </article>
  )
}
