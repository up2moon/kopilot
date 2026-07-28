import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../services/dashboard'
import { getSavingBotCoaching } from '../services/savingBot'
import arrowIcon from '../assets/icons/arrow.svg'
import './DashboardPage.css'

function formatWon(value) {
  return `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`
}

export default function DashboardPage({ auth, onNavigate, onLogout }) {
  const token = auth?.accessToken
  const user = auth?.user
  const [data, setData] = useState(null)
  const [coaching, setCoaching] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    async function loadData() {
      if (!token) return
      setIsLoading(true)
      setErrorMessage('')
      const [dashboardResult, coachingResult] = await Promise.allSettled([
        getDashboardSummary(token, 'month', controller.signal),
        getSavingBotCoaching(token, controller.signal),
      ])

      if (!ignore) {
        if (dashboardResult.status === 'fulfilled') {
          setData(dashboardResult.value)
        } else if (dashboardResult.reason.name !== 'AbortError') {
          setErrorMessage(dashboardResult.reason.message)
        }

        if (coachingResult.status === 'fulfilled') {
          setCoaching(coachingResult.value)
        }

        setIsLoading(false)
      }
    }

    loadData()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [token])

  const nickname = user?.nickname || user?.name || '진원'
  const initialChar = nickname.charAt(0)

  const summary = data?.summary || {
    totalSpendingAmount: 1245000,
    monthlyChangeRate: 8.3,
    paymentCount: 42,
  }

  const coachMessage =
    coaching?.coaching?.message ||
    data?.savingCoachPreview?.message ||
    '오늘의 코칭을 불러오지 못했어요.'

  return (
    <div className="dashboard-page">
      {/* Top Header Bar */}
      <header className="dash-top-bar">
        <div className="brand-lockup">
          <img
            className="logo-mark"
            src="/favicon-256x256.png"
            alt=""
            aria-hidden="true"
          />
        </div>

        <button className="user-profile-pill" type="button" onClick={() => onNavigate('/my')} title="마이페이지">
          <div className="user-avatar-circle">{initialChar}</div>
          <span className="user-name">{nickname}님</span>
        </button>
      </header>

      {/* Main Greeting */}
      <section className="dash-greeting-section">
        <h1 className="greeting-title">
          {nickname}님, 이번 달 소비를
          <br />
          확인해 보세요.
        </h1>
        <p className="greeting-subtitle">마이데이터 기반으로 새는 지출을 정리했어요.</p>
      </section>

      {isLoading ? (
        <div className="dashboard-loading">
          <span className="loading-dots">
            <span />
            <span />
            <span />
          </span>
        </div>
      ) : errorMessage ? (
        <div className="dashboard-error">
          <p className="form-message">{errorMessage}</p>
        </div>
      ) : (
        <main className="dash-cards-container">
          {/* Card 1: 이번 달 소비 */}
          <section className="dash-white-card">
            <span className="card-subhead">이번 달 소비</span>
            <div className="spending-main-amount">{formatWon(summary.totalSpendingAmount)}</div>

            <div className="spending-meta-row">
              <span className="change-rate-pill">
                지난달보다 {Math.abs(summary.monthlyChangeRate)}% {summary.monthlyChangeRate >= 0 ? '증가' : '감소'}
              </span>
              <div className="payment-count-col">
                <span className="count-label">총 결제</span>
                <strong className="count-value">{summary.paymentCount}건</strong>
              </div>
            </div>

            <button
              type="button"
              className="dash-blue-btn"
              onClick={() => onNavigate('/spending')}
            >
              <span>소비 상세 보기</span>
              <img className="btn-arrow is-light" src={arrowIcon} alt="" aria-hidden="true" />
            </button>
          </section>

          {/* Card 2: AI 절약 코치 */}
          <section className="dash-blue-card">
            <span className="ai-coach-label">AI 절약 코치</span>

            <h2 className="ai-coach-advice">
              {coachMessage}
            </h2>

            <button
              type="button"
              className="dash-white-btn"
              onClick={() => onNavigate('/coach')}
            >
              <span>AI 코치와 대화하기</span>
              <img className="btn-arrow is-primary" src={arrowIcon} alt="" aria-hidden="true" />
            </button>

            <p className="ai-coach-footer-note">질문하면 소비 습관과 절약 미션을 바로 추천해요.</p>
          </section>
        </main>
      )}
    </div>
  )
}
