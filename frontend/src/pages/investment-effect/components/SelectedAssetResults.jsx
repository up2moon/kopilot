import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import closeIcon from '../../../assets/icons/close-icon.svg'
import {
  formatGain,
  formatPrice,
  formatRate,
  formatWon,
} from '../utils/formatters'

export default function SelectedAssetResults({
  comparisons,
  onAnalyzeAsset,
  onClose,
  selectedAssets,
}) {
  const [isClosing, setIsClosing] = useState(false)
  const portalTarget =
    typeof document === 'undefined'
      ? null
      : document.querySelector('.phone-frame')

  useEffect(() => {
    setIsClosing(false)
  }, [selectedAssets[0]?.assetCode])

  useEffect(() => {
    if (!selectedAssets.length) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsClosing(true)
        window.setTimeout(onClose, 280)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, selectedAssets.length])

  const handleDismiss = () => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(onClose, 280)
  }

  if (!portalTarget) return null

  if (selectedAssets.length > 0 && comparisons.length === 0) {
    return createPortal(
      <>
        <button
          className={`investment-selected-backdrop ${isClosing ? 'is-closing' : ''}`}
          type="button"
          onClick={handleDismiss}
          aria-label="선택 결과 닫기"
        />
        <section
          key={selectedAssets[0]?.assetCode}
          className={`investment-selected-sheet is-loading ${isClosing ? 'is-closing' : ''}`}
          aria-live="polite"
        >
          <article className="investment-selected-card">
            <button className="investment-selected-close" type="button" onClick={handleDismiss} aria-label="선택 결과 닫기">
              <img src={closeIcon} alt="" />
            </button>
            <div>
              <span>계산 대상</span>
              <strong>
                {selectedAssets.map((asset) => asset.label).join(', ')}
              </strong>
              <small>선택한 종목의 시세와 수익률을 계산하고 있어요.</small>
            </div>
          </article>
        </section>
      </>,
      portalTarget,
    )
  }

  if (!comparisons.length) return null

  return createPortal(
    <>
      <button
        className={`investment-selected-backdrop ${isClosing ? 'is-closing' : ''}`}
        type="button"
        onClick={handleDismiss}
        aria-label="선택 결과 닫기"
      />
      <section
        key={selectedAssets[0]?.assetCode}
        className={`investment-selected-sheet ${isClosing ? 'is-closing' : ''}`}
        aria-live="polite"
      >
        {comparisons.map((comparison) => (
          <article
            className="investment-selected-card"
            key={comparison.assetCode}
          >
            <button className="investment-selected-close" type="button" onClick={handleDismiss} aria-label="선택 결과 닫기">
              <img src={closeIcon} alt="" />
            </button>
            <div>
              <strong className="investment-selected-title">
                <span className="investment-selected-name">
                  {comparison.label}
                </span>
                {'에 투자했다면'}
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
            <button
              className="investment-analyze-button"
              type="button"
              onClick={() => onAnalyzeAsset(comparison)}
            >
              이 종목 분석하기
            </button>
          </article>
        ))}
      </section>
    </>,
    portalTarget,
  )
}
