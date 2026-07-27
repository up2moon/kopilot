import { useEffect, useState } from 'react'
import { getWeeklyChallenges } from '../services/challenges.js'
import './ChallengePage.css'

const statusLabel = {
  IN_PROGRESS: '진행중',
  SUCCESS: '완료',
  FAIL: '미완료',
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}

export default function ChallengePage({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadChallenges = async () => {
    try {
      setLoading(true)
      setError('')
      setData(await getWeeklyChallenges(token))
    } catch (err) {
      setError(err.message || '챌린지 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadChallenges()
  }, [token])

  const todayChallenge = data?.todayChallenge

  return (
    <div className="challenge-page">
      <header className="challenge-header">
        <h1>챌린지</h1>
        <p>AI가 이번 주 수행할 절약 미션을 배정해요.</p>
      </header>

      {loading ? (
        <div className="challenge-state-card"><span className="challenge-spinner" />챌린지를 준비하고 있어요.</div>
      ) : error ? (
        <div className="challenge-state-card challenge-error">
          <p>{error}</p>
          <button type="button" onClick={loadChallenges}>다시 시도하기</button>
        </div>
      ) : data?.onboardingRequired ? (
        <div className="challenge-state-card">
          <strong>챌린지를 만들기 위한 소비 정보가 필요해요.</strong>
          <p>마이데이터를 연결하면 최근 소비 내역을 바탕으로 AI 미션을 받을 수 있어요.</p>
        </div>
      ) : !todayChallenge ? (
        <div className="challenge-state-card">
          <strong>이번 주 미션을 준비하고 있어요.</strong>
          <p>AI 챌린지는 월요일 또는 이번 주 첫 조회 시 생성됩니다.</p>
        </div>
      ) : (
        <>
          <section className="today-challenge-card" aria-label="오늘의 랜덤 미션">
            <span className="today-challenge-label">오늘의 랜덤 미션</span>
            <p className="today-challenge-category">{todayChallenge.category}</p>
            <h2>{todayChallenge.title}</h2>
            <p className="today-challenge-description">{todayChallenge.description}</p>
            {todayChallenge.estimatedSavingAmount > 0 && (
              <p className="today-challenge-saving">예상 절약 {formatWon(todayChallenge.estimatedSavingAmount)}</p>
            )}
            <button type="button" className="challenge-verify-button" disabled>
              수행 인증하기
            </button>
            <p className="challenge-verify-notice">인증 및 포인트 지급 기능은 준비 중이에요.</p>
          </section>

          <section className="weekly-challenge-section">
            <h2>이번 주 미션</h2>
            <div className="weekly-challenge-list">
              {data.weeklyChallenges.map((challenge) => (
                <article className="weekly-challenge-item" key={challenge.id}>
                  <span className="challenge-weekday">{challenge.weekday}</span>
                  <div className="challenge-item-copy">
                    <strong>{challenge.title}</strong>
                    <small>{challenge.category}</small>
                  </div>
                  <span className={`challenge-status status-${challenge.status.toLowerCase()}`}>
                    {statusLabel[challenge.status] || challenge.status}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
