import formatWon from '../utils/formatWon'

export default function ChallengeProgress({ challenge }) {
  const progress = challenge.progress

  if (!progress) return null

  const progressDescription =
    challenge.challengeType === 'MAX_SPEND'
      ? `현재 ${formatWon(progress.spentAmount)} / 목표 ${formatWon(progress.targetAmount)}`
      : progress.transactionCount
        ? `오늘 결제 ${progress.transactionCount}건 발생`
        : '현재까지 결제 없음'

  return (
    <div className="challenge-progress-box">
      <p>{progressDescription}</p>
      <span className="challenge-progress-track">
        <span style={{ width: `${progress.progressRate}%` }} />
      </span>
    </div>
  )
}
