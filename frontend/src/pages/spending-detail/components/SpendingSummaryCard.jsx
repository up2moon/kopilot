import { formatWon } from '../utils/formatters'

const defaultSummary = {
  totalSpendingAmount: 0,
  monthlyChangeRate: 0,
  paymentCount: 0,
  averagePaymentAmount: 0,
}

export default function SpendingSummaryCard({ summary = defaultSummary }) {
  const changeRate = summary.monthlyChangeRate

  return (
    <section className="detail-card summary-card">
      <span className="card-sub">총소비</span>
      <div className="summary-amount">
        {formatWon(summary.totalSpendingAmount)}
      </div>
      <div className="summary-badges">
        {changeRate !== 0 ? (
          <span
            className={`change-badge ${
              changeRate > 0 ? 'is-up' : 'is-down'
            }`}
          >
            지난달보다 {Math.abs(changeRate)}%{' '}
            {changeRate > 0 ? '증가' : '감소'}
          </span>
        ) : (
          <span className="change-badge is-neutral">분석 완료</span>
        )}
        <span className="count-badge">총 {summary.paymentCount}건</span>
      </div>
      {summary.averagePaymentAmount > 0 && (
        <p className="summary-avg">
          평균 결제액 {formatWon(summary.averagePaymentAmount)}
        </p>
      )}
    </section>
  )
}
