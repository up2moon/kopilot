import WeeklyChallengeItem from './WeeklyChallengeItem'

function formatDateRange(start, end) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  })
  return `${formatter.format(new Date(`${start}T00:00:00+09:00`))} – ${formatter.format(new Date(`${end}T00:00:00+09:00`))}`
}

export default function WeeklyChallengeSection({
  canVerify,
  challenges,
  highlightedChallengeId,
  progress,
  verificationResult,
  verifyMessage,
  verifying,
  weekEndDate,
  weekStartDate,
  onVerify,
  onViewInvestment,
}) {
  const resolved = progress
    && progress.successCount + progress.failedCount === progress.totalCount
  const dateRange = formatDateRange(weekStartDate, weekEndDate)

  return (
    <section className="weekly-challenge-section">
      {highlightedChallengeId && (
        <div className="new-challenge-notice" role="status" aria-live="polite">
          <span aria-hidden="true">✦</span>
          새로운 챌린지가 추가됐어요!
        </div>
      )}

      <div className="challenge-week-summary">
        <span>이번 주 챌린지</span>
        <strong>{dateRange}</strong>
        <p>
          {resolved
            ? `${progress.successCount}/${progress.totalCount} 챌린지에 성공했어요`
            : `금요일까지 ${progress.totalCount}개의 챌린지를 함께 진행해요`}
        </p>
      </div>

      <div className="weekly-challenge-heading">
        <h2>나의 챌린지 {progress.totalCount}개</h2>
        <span>
          {progress.successCount}/{progress.totalCount} 성공
        </span>
      </div>

      <span className="weekly-progress-track">
        <span style={{ width: `${progress.weeklyProgressRate}%` }} />
      </span>

      <div className="weekly-challenge-list">
        {challenges.map((challenge) => (
          <WeeklyChallengeItem
            challenge={challenge}
            highlighted={Number(challenge.id) === highlightedChallengeId}
            key={challenge.id}
          />
        ))}
      </div>

      {verificationResult && (
        <div className="challenge-verification-result" role="status">
          <div>
            <strong>
              {verificationResult.successfulCount}/
              {verificationResult.totalCount} 성공
            </strong>
            <span>{verificationResult.earnedPoints}P를 받았어요</span>
          </div>
          <div className="challenge-saving-reward">
            <span>예상 절약액</span>
            <strong>
              {Number(
                verificationResult.successfulSavingAmount || 0,
              ).toLocaleString('ko-KR')}원
            </strong>
          </div>
          {Number(verificationResult.successfulSavingAmount || 0) > 0 && (
            <button type="button" onClick={onViewInvestment}>
              투자효과 보기
            </button>
          )}
        </div>
      )}

      <div className="challenge-verification-panel">
        <button
          type="button"
          className="weekly-verify-button"
          disabled={!canVerify || verifying}
          onClick={onVerify}
        >
          {verifying ? (
            <>
              <span className="verify-spinner" />
              챌린지 결과 확인 중
            </>
          ) : resolved ? (
            '인증 완료'
          ) : (
            '인증하기'
          )}
        </button>
        {canVerify && !resolved && (
          <p>이번 주 챌린지 결과를 바로 확인해 보세요</p>
        )}
        {verifyMessage && (
          <p className="challenge-verify-message">{verifyMessage}</p>
        )}
      </div>

      {verifying && (
        <div className="weekly-verifying-overlay" role="status" aria-live="polite">
          <span className="challenge-spinner" />
          <strong>이번 주 챌린지 결과를 확인하고 있어요</strong>
        </div>
      )}
    </section>
  )
}
