function formatPoints(points) {
  return `${Number(points || 0).toLocaleString('ko-KR')}P`
}

export default function RewardBalanceCard({
  points,
  earnedPoints,
  spentPoints,
  pointsLoading,
  pointsError,
  giftCount,
  onOpenShop,
  onOpenWallet,
  onRetryPoints,
}) {
  return (
    <section className="reward-balance-card" aria-label="포인트 지갑">
      <div>
        <span className="reward-balance-label">
          <i aria-hidden="true">P</i>
          사용 가능한 포인트
        </span>
        <strong>
          {pointsLoading
            ? '확인 중…'
            : pointsError
              ? '조회 실패'
              : formatPoints(points)}
        </strong>
        {pointsError ? (
          <p className="reward-points-error" role="status">
            {pointsError}
            <button type="button" onClick={onRetryPoints}>
              다시 시도
            </button>
          </p>
        ) : (
          <p>
            {pointsLoading
              ? '챌린지 포인트를 확인하고 있어요.'
              : spentPoints > 0
                ? `실제 적립 ${formatPoints(earnedPoints)} · 사용 ${formatPoints(spentPoints)}`
                : '챌린지에서 실제로 적립된 포인트예요.'}
          </p>
        )}
      </div>

      <div className="reward-balance-actions">
        {onOpenShop ? (
          <button
            type="button"
            className="reward-shop-link"
            onClick={onOpenShop}
          >
            <span aria-hidden="true">🛍️</span>
            포인트샵 가기
          </button>
        ) : null}
        <button type="button" onClick={onOpenWallet}>
          <span aria-hidden="true">🎁</span>
          내 기프티콘
          {giftCount ? <b>{giftCount}</b> : null}
        </button>
      </div>
    </section>
  )
}
