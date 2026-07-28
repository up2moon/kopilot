const statusLabel = {
  IN_PROGRESS: '진행중',
  SUCCESS: '완료',
  FAIL: '미완료',
}

export default function WeeklyChallengeItem({
  challenge,
  isAnyVerifying,
  isVerifying,
  onVerify,
}) {
  return (
    <article
      className="weekly-challenge-item"
      aria-busy={isVerifying}
    >
      <span className="challenge-weekday">{challenge.weekday}</span>
      <div className="challenge-item-copy">
        <strong>{challenge.title}</strong>
        <small>{challenge.category}</small>
      </div>

      {challenge.canVerify ? (
        <button
          type="button"
          className="weekly-verify-button"
          disabled={isAnyVerifying}
          onClick={() => onVerify(challenge)}
        >
          {isVerifying ? (
            <>
              <span className="verify-spinner" />
              확인 중
            </>
          ) : (
            '인증하기'
          )}
        </button>
      ) : (
        <span
          className={`challenge-status status-${challenge.status.toLowerCase()}`}
        >
          {statusLabel[challenge.status] || challenge.status}
        </span>
      )}

      {isVerifying && (
        <div
          className="weekly-verifying-overlay"
          role="status"
          aria-live="polite"
        >
          <span className="challenge-spinner" />
          <strong>거래내역 확인 중</strong>
        </div>
      )}
    </article>
  )
}
