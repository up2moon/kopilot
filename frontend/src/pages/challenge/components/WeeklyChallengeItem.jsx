import { useEffect, useRef } from 'react'

import formatWon from '../utils/formatWon'

const statusLabel = {
  IN_PROGRESS: '진행중',
  SUCCESS: '성공',
  FAIL: '미완료',
}

const difficultyLabel = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
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

export default function WeeklyChallengeItem({ challenge, highlighted = false }) {
  const itemRef = useRef(null)

  useEffect(() => {
    if (!highlighted || !itemRef.current) return

    itemRef.current.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'center',
    })
  }, [highlighted])

  return (
    <article
      className={`weekly-challenge-item${highlighted ? ' is-newly-added' : ''}`}
      ref={itemRef}
    >
      <div className="challenge-item-topline">
        <span className="challenge-sequence">{challenge.sequence}</span>
        <span className="challenge-category">{challenge.category}</span>
        {highlighted && (
          <span className="challenge-new-badge">방금 추가됨</span>
        )}
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
        <span className={`challenge-reward difficulty-${challenge.difficulty.toLowerCase()}`}>
          {difficultyLabel[challenge.difficulty]} · {challenge.point}P
        </span>
      </div>
      {challenge.estimatedSavingAmount > 0 && (
        <small className="challenge-estimated-saving">
          예상 절약 {formatWon(challenge.estimatedSavingAmount)}
        </small>
      )}
    </article>
  )
}
