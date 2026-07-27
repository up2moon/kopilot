import { useEffect, useState } from 'react'
import { getWeeklyChallenges, verifyChallenge } from '../services/challenges.js'
import './ChallengePage.css'

const statusLabel = {
  IN_PROGRESS: '진행중',
  SUCCESS: '완료',
  FAIL: '미완료',
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function ChallengePage({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [verifyingChallengeId, setVerifyingChallengeId] = useState(null)

  const loadChallenges = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError('')
      setData(await getWeeklyChallenges(token))
    } catch (err) {
      setError(err.message || '챌린지 정보를 불러오지 못했습니다.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadChallenges()
  }, [token])

  const todayChallenge = data?.todayChallenge
  const progress = todayChallenge?.progress

  const handleVerify = async (challenge) => {
    if (!challenge || verifyingChallengeId) return
    try {
      setVerifyingChallengeId(challenge.id)
      setVerifyMessage('')
      const [result] = await Promise.all([verifyChallenge(token, challenge.id), wait(550)])
      setVerifyMessage(result.message)
      await loadChallenges(false)
    } catch (err) {
      setVerifyMessage(err.message || '챌린지 인증에 실패했습니다.')
    } finally {
      setVerifyingChallengeId(null)
    }
  }

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
          <section className="today-challenge-card" aria-label="오늘의 미션">
            <span className="today-challenge-label">오늘의 랜덤 미션</span>
            <p className="today-challenge-category">{todayChallenge.category}</p>
            <h2>{todayChallenge.title}</h2>
            <p className="today-challenge-description">{todayChallenge.description}</p>
            {todayChallenge.estimatedSavingAmount > 0 && (
              <p className="today-challenge-saving">예상 절약 {formatWon(todayChallenge.estimatedSavingAmount)}</p>
            )}
            {progress && (
              <div className="challenge-progress-box">
                {todayChallenge.challengeType === 'MAX_SPEND' ? (
                  <p>현재 {formatWon(progress.spentAmount)} / 목표 {formatWon(progress.targetAmount)}</p>
                ) : (
                  <p>{progress.transactionCount ? `오늘 결제 ${progress.transactionCount}건 발생` : '현재까지 결제 없음'}</p>
                )}
                <span className="challenge-progress-track"><span style={{ width: `${progress.progressRate}%` }} /></span>
              </div>
            )}
            {todayChallenge.status === 'IN_PROGRESS' && <p className="challenge-verify-notice">미션 인증은 다음 날 자정부터 이번 주 미션 목록에서 할 수 있어요.</p>}
            {todayChallenge.status === 'SUCCESS' && <p className="challenge-result-notice success">미션 완료! {todayChallenge.point}P를 받았어요.</p>}
            {todayChallenge.status === 'FAIL' && <p className="challenge-result-notice fail">이번 미션은 미완료예요.</p>}
          </section>

          <section className="weekly-challenge-section">
            <div className="weekly-challenge-heading">
              <h2>이번 주 미션</h2>
              {data.weeklyProgress && <span>{data.weeklyProgress.completedCount}/{data.weeklyProgress.totalCount} 완료</span>}
            </div>
            {data.weeklyProgress && <span className="weekly-progress-track"><span style={{ width: `${data.weeklyProgress.weeklyProgressRate}%` }} /></span>}
            <div className="weekly-challenge-list">
              {data.weeklyChallenges.map((challenge) => (
                <article className="weekly-challenge-item" key={challenge.id} aria-busy={verifyingChallengeId === challenge.id}>
                  <span className="challenge-weekday">{challenge.weekday}</span>
                  <div className="challenge-item-copy">
                    <strong>{challenge.title}</strong>
                    <small>{challenge.category}</small>
                  </div>
                  {challenge.canVerify ? (
                    <button
                      type="button"
                      className="weekly-verify-button"
                      disabled={verifyingChallengeId !== null}
                      onClick={() => handleVerify(challenge)}
                    >
                      {verifyingChallengeId === challenge.id ? <><span className="verify-spinner" />확인 중</> : '인증하기'}
                    </button>
                  ) : (
                    <span className={`challenge-status status-${challenge.status.toLowerCase()}`}>
                      {statusLabel[challenge.status] || challenge.status}
                    </span>
                  )}
                  {verifyingChallengeId === challenge.id && (
                    <div className="weekly-verifying-overlay" role="status" aria-live="polite">
                      <span className="challenge-spinner" />
                      <strong>거래내역 확인 중</strong>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {verifyMessage && <p className="challenge-verify-message">{verifyMessage}</p>}
          </section>
        </>
      )}
    </div>
  )
}
