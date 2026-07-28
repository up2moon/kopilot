import formatWon from '../utils/formatWon'

const statusLabel = {
  IN_PROGRESS: '진행중',
  SUCCESS: '성공',
  FAIL: '미완료',
}

function targetLabel(challenge) {
  if (challenge.challengeType === 'MAX_COUNT') {
    return `현재 ${challenge.currentCount}번 / 목표 ${challenge.targetCount}번`
  }
  if (challenge.challengeType === 'MAX_SPEND') {
    return `현재 ${formatWon(challenge.currentSpentAmount)} / 목표 ${formatWon(challenge.targetAmount)}`
  }
  return `현재 ${formatWon(challenge.currentSpentAmount)} / 목표 0원`
}

export default function WeeklyChallengeItem({ challenge }) {
  return (
    <article className="weekly-challenge-item">
      <div className="challenge-item-topline">
        <span className="challenge-sequence">{challenge.sequence}</span>
        <span className="challenge-category">{challenge.category}</span>
        {challenge.status !== 'IN_PROGRESS' && (
          <span
            className={`challenge-status status-${challenge.status.toLowerCase()}`}
          >
            {statusLabel[challenge.status] || challenge.status}
          </span>
        )}
      </div>

      <p className="challenge-content">{challenge.content}</p>

      <div className="challenge-target-row">
        <strong>{targetLabel(challenge)}</strong>
        {challenge.estimatedSavingAmount > 0 && (
          <span>
            예상 절약 {formatWon(challenge.estimatedSavingAmount)}
          </span>
        )}
      </div>
    </article>
  )
}
