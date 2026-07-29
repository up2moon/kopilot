import arrowIcon from '../../../assets/icons/arrow.svg'
import formatWon from '../utils/formatWon'

export default function SpendingSummaryCard({ onOpenDetails, summary }) {
  const changeDirection = summary.monthlyChangeRate >= 0 ? '증가' : '감소'

  return (
    <section className="dash-white-card">
      <span className="card-subhead">이번 달 소비</span>
      <div className="spending-main-amount">
        {formatWon(summary.totalSpendingAmount)}
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
