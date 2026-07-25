import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../services/dashboard'
import './SpendingDetailPage.css'

function formatWon(value) {
  return `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`
}

function formatDateTime(value) {
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '-'
  }
}

export default function SpendingDetailPage({ auth, onBack }) {
  const token = auth?.accessToken
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadData() {
      if (!token) return
      setIsLoading(true)
      setErrorMessage('')
      try {
        const result = await getDashboardSummary(token, period)
        if (!ignore) {
          setData(result)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err.message)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [token, period])

  const summary = data?.summary || {
    totalSpendingAmount: 0,
    monthlyChangeRate: 0,
    paymentCount: 0,
    averagePaymentAmount: 0,
  }

  const categories = data?.categories || []
  const frequentMerchants = data?.frequentMerchants || []
  const recentTransactions = data?.recentTransactions || []
  const trend = data?.trend || []
  const insights = data?.insights || []

  // 1. 일자별 소비 추이: 최근 7일 데이터만 추출
  const recentTrend = trend.slice(-7)
  const maxTrendAmount = Math.max(...recentTrend.map((t) => t.amount), 1)

  // 2. 카테고리별 소비: 지출액 기준 TOP 3 카테고리만 추출
  const top3Categories = categories.slice(0, 3)

  // 3. 결제 내역: 최근 3개 항목만 추출
  const recent3Transactions = recentTransactions.slice(0, 3)

  return (
    <div className="spending-detail-page">
      <header className="detail-header">
        <button type="button" className="back-button" onClick={onBack} aria-label="뒤로가기">
          &lt;
        </button>
        <h1>내 소비 상세</h1>
      </header>

      {/* Period Filter */}
      <div className="detail-period-tabs">
        <button
          type="button"
          className={`period-tab${period === 'month' ? ' is-active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          이번 달
        </button>
        <button
          type="button"
          className={`period-tab${period === '3months' ? ' is-active' : ''}`}
          onClick={() => setPeriod('3months')}
        >
          최근 3개월
        </button>
        <button
          type="button"
          className={`period-tab${period === '6months' ? ' is-active' : ''}`}
          onClick={() => setPeriod('6months')}
        >
          최근 6개월
        </button>
      </div>

      {isLoading ? (
        <div className="detail-loading">
          <span className="loading-dots">
            <span />
            <span />
            <span />
          </span>
          <p>소비 상세 데이터를 불러오는 중...</p>
        </div>
      ) : errorMessage ? (
        <div className="detail-error">
          <p className="form-message">{errorMessage}</p>
        </div>
      ) : (
        <main className="detail-content">
          {/* Summary Card */}
          <section className="detail-card summary-card">
            <span className="card-sub">총소비</span>
            <div className="summary-amount">{formatWon(summary.totalSpendingAmount)}</div>
            <div className="summary-badges">
              {summary.monthlyChangeRate !== 0 ? (
                <span className={`change-badge ${summary.monthlyChangeRate > 0 ? 'is-up' : 'is-down'}`}>
                  지난달보다 {Math.abs(summary.monthlyChangeRate)}% {summary.monthlyChangeRate > 0 ? '증가' : '감소'}
                </span>
              ) : (
                <span className="change-badge is-neutral">분석 완료</span>
              )}
              <span className="count-badge">총 {summary.paymentCount}건</span>
            </div>
            {summary.averagePaymentAmount > 0 && (
              <p className="summary-avg">평균 결제액 {formatWon(summary.averagePaymentAmount)}</p>
            )}
          </section>

          {/* Trend Chart: 최근 7일 지출 추이 */}
          {recentTrend.length > 0 && (
            <section className="detail-card trend-card">
              <div className="card-head">
                <h2>일자별 소비</h2>
                <span className="card-sub">단위: 천원</span>
              </div>
              <div className="bar-chart">
                {recentTrend.map((item) => {
                  const heightPercent = Math.max(12, Math.round((item.amount / maxTrendAmount) * 100))
                  const thousandVal = Math.round(item.amount / 1000)
                  return (
                    <div className="chart-col" key={item.date} title={`${item.date}: ${formatWon(item.amount)}`}>
                      <span className="bar-val">{item.amount > 0 ? thousandVal.toLocaleString('ko-KR') : ''}</span>
                      <div className="bar-wrapper">
                        <div className="bar-fill" style={{ height: `${heightPercent}%` }} />
                      </div>
                      <span className="bar-label">{item.date}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Categories: 지출 TOP 3 카테고리 */}
          {top3Categories.length > 0 && (
            <section className="detail-card categories-card">
              <h2>카테고리별 소비 </h2>
              <div className="category-list">
                {top3Categories.map((cat) => (
                  <div className="category-item" key={cat.category}>
                    <div className="cat-icon-col">{cat.icon}</div>
                    <div className="cat-info-col">
                      <div className="cat-info-top">
                        <strong>{cat.category}</strong>
                        <span>{formatWon(cat.amount)}</span>
                      </div>
                      <div className="cat-bar-track">
                        <div className="cat-bar-fill" style={{ width: `${Math.min(100, cat.percentage)}%` }} />
                      </div>
                      <div className="cat-info-sub">
                        <small>전체 소비의 {cat.percentage}%</small>
                        <small>{cat.count}건</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Transactions: 최근 3개 결제 내역 */}
          <section className="detail-card tx-card">
            <h2> 결제 내역 </h2>
            <div className="tx-list">
              {recent3Transactions.map((tx) => (
                <article className="tx-item" key={tx.id}>
                  <div className="tx-icon">{tx.icon}</div>
                  <div className="tx-details">
                    <strong>{tx.merchantName}</strong>
                    <p>
                      {tx.category} · {formatDateTime(tx.approvedAt)}
                    </p>
                  </div>
                  <div className="tx-amount">-{formatWon(tx.amount)}</div>
                </article>
              ))}
            </div>
          </section>

          {/* 소비 인사이트 (팀원 상의 후 노출 결정을 위한 주석 처리)
          {insights.length > 0 && (
            <section className="detail-card insights-card">
              <h2>소비 인사이트</h2>
              <div className="insights-grid">
                {insights.map((item) => (
                  <div className="insight-box" key={item.id}>
                    <span className="insight-box-icon">
                      {item.type === 'top_category' ? '💡' : item.type === 'weekend' ? '📅' : '📊'}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          */}

          {/* 자주 이용한 가맹점 (팀원 상의 후 노출 결정을 위한 주석 처리)
          {frequentMerchants.length > 0 && (
            <section className="detail-card merchant-card-section">
              <h2>자주 이용한 가맹점</h2>
              <div className="merchant-grid">
                {frequentMerchants.map((m) => (
                  <div className="merchant-card" key={m.merchantName}>
                    <span className="merchant-icon">{m.icon}</span>
                    <div className="merchant-info">
                      <strong>{m.merchantName}</strong>
                      <p>{m.count}회 이용</p>
                      <em>총 {formatWon(m.totalAmount)}</em>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          */}
        </main>
      )}
    </div>
  )
}
