import { useEffect, useState } from 'react'
import arrowIcon from '../../../assets/icons/arrow.svg'
import formatWon from '../utils/formatWon'

export default function SpendingSummaryCard({ onOpenDetails, summary }) {
  const totalSpendingAmount = Number(summary.totalSpendingAmount) || 0
  const [displayAmount, setDisplayAmount] = useState(0)
  const changeDirection = summary.monthlyChangeRate >= 0 ? '증가' : '감소'

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion || totalSpendingAmount <= 0) {
      setDisplayAmount(totalSpendingAmount)
      return undefined
    }

    const duration = 650
    let animationFrame = 0
    let startTime = null

    const updateAmount = (currentTime) => {
      if (startTime === null) startTime = currentTime

      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easedProgress = 1 - (1 - progress) ** 3

      setDisplayAmount(Math.round(totalSpendingAmount * easedProgress))

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(updateAmount)
      }
    }

    setDisplayAmount(0)
    animationFrame = window.requestAnimationFrame(updateAmount)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [totalSpendingAmount])

  return (
    <section className="dash-white-card">
      <span className="card-subhead">이번 달 소비</span>
      <div
        className="spending-main-amount"
        aria-label={formatWon(totalSpendingAmount)}
      >
        {formatWon(displayAmount)}
      </div>

      <div className="spending-meta-row">
        <span className="change-rate-pill">
          지난달보다 {Math.abs(summary.monthlyChangeRate)}% {changeDirection}
        </span>
        <div className="payment-count-col">
          <span className="count-label">총 결제</span>
          <strong className="count-value">{summary.paymentCount}건</strong>
        </div>
      </div>

      <button
        type="button"
        className="dash-blue-btn"
        onClick={onOpenDetails}
      >
        <span className="detail-button-icon" aria-hidden="true">▤</span>
        <span>소비 상세 보기</span>
        <img
          className="btn-arrow is-light"
          src={arrowIcon}
          alt=""
          aria-hidden="true"
        />
      </button>
    </section>
  )
}
