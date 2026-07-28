import WeeklyChallengeItem from './WeeklyChallengeItem'

export default function WeeklyChallengeSection({
  challenges,
  progress,
  verifyMessage,
  verifyingChallengeId,
  onVerify,
}) {
  return (
    <section className="weekly-challenge-section">
      <div className="weekly-challenge-heading">
        <h2>이번 주 미션</h2>
        {progress && (
          <span>
            {progress.completedCount}/{progress.totalCount} 완료
          </span>
        )}
      </div>

      {progress && (
        <span className="weekly-progress-track">
          <span style={{ width: `${progress.weeklyProgressRate}%` }} />
        </span>
      )}

      <div className="weekly-challenge-list">
        {challenges.map((challenge) => (
          <WeeklyChallengeItem
            challenge={challenge}
            isAnyVerifying={verifyingChallengeId !== null}
            isVerifying={verifyingChallengeId === challenge.id}
            key={challenge.id}
            onVerify={onVerify}
          />
        ))}
      </div>

      {verifyMessage && (
        <p className="challenge-verify-message">{verifyMessage}</p>
      )}
    </section>
  )
}
