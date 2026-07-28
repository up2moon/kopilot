import { formatWon } from '../utils/formatters'

export default function SpendingTrendCard({ trend }) {
  const recentTrend = trend.slice(-7)

  if (!recentTrend.length) return null

  const maxAmount = Math.max(
    ...recentTrend.map((item) => item.amount),
    1,
  )

  return (
    <section className="detail-card trend-card">
      <div className="card-head">
        <h2>일자별 소비</h2>
        <span className="card-sub">단위: 천원</span>
      </div>
      <div className="bar-chart">
        {recentTrend.map((item) => {
          const heightPercent = Math.max(
            12,
            Math.round((item.amount / maxAmount) * 100),
          )
          const thousandValue = Math.round(item.amount / 1000)

          return (
            <div
              className="chart-col"
              key={item.date}
              title={`${item.date}: ${formatWon(item.amount)}`}
            >
              <span className="bar-val">
                {item.amount > 0
                  ? thousandValue.toLocaleString('ko-KR')
                  : ''}
              </span>
              <div className="bar-wrapper">
                <div
                  className="bar-fill"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className="bar-label">{item.date}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
