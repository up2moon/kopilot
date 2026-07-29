function formatPoints(points) {
  return `${points.toLocaleString('ko-KR')}P`
}

function formatGiftCode(code) {
  return code?.replace(/(\d{4})(?=\d)/g, '$1 ') || ''
}

export default function RewardPurchaseSheet({
  product,
  currentPoints,
  purchasedGift,
  onPurchase,
  onClose,
  onOpenWallet,
}) {
  if (!product) return null

  const remainingPoints = currentPoints - product.points
  const canPurchase = remainingPoints >= 0

  return (
    <div
      className="reward-sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="reward-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-purchase-title"
      >
        <div className="reward-sheet-handle" aria-hidden="true" />
        <button
          type="button"
          className="reward-sheet-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        {purchasedGift ? (
          <div className="reward-purchase-complete" aria-live="polite">
            <span className="reward-complete-icon" aria-hidden="true">
              ✓
            </span>
            <p className="reward-sheet-eyebrow">구매 완료</p>
            <h2 id="reward-purchase-title">기프티콘이 도착했어요</h2>
            <p>
              내 기프티콘에서 언제든지
              <br />
              바코드를 다시 확인할 수 있어요.
            </p>
            <div className="reward-gift-code">
              <span>교환권 번호</span>
              <strong>{formatGiftCode(purchasedGift.giftCode)}</strong>
            </div>
            <button
              type="button"
              className="reward-primary-button"
              onClick={onOpenWallet}
            >
              내 기프티콘 보기
            </button>
          </div>
        ) : (
          <>
            <div className="reward-sheet-product">
              <span
                className="reward-sheet-product-visual"
                style={{ backgroundColor: product.color }}
                aria-hidden="true"
              >
                {product.emoji}
              </span>
              <div>
                <span>{product.brand}</span>
                <h2 id="reward-purchase-title">{product.name}</h2>
                <p>{product.description}</p>
              </div>
            </div>

            <dl className="reward-payment-summary">
              <div>
                <dt>보유 포인트</dt>
                <dd>{formatPoints(currentPoints)}</dd>
              </div>
              <div>
                <dt>사용 포인트</dt>
                <dd>- {formatPoints(product.points)}</dd>
              </div>
              <div className="reward-payment-total">
                <dt>구매 후 포인트</dt>
                <dd>{formatPoints(Math.max(remainingPoints, 0))}</dd>
              </div>
            </dl>

            {!canPurchase ? (
              <p className="reward-insufficient-message" role="status">
                {formatPoints(Math.abs(remainingPoints))}가 더 필요해요
              </p>
            ) : null}

            <button
              type="button"
              className="reward-primary-button"
              onClick={() => onPurchase(product)}
              disabled={!canPurchase}
            >
              {canPurchase
                ? `${formatPoints(product.points)}로 구매하기`
                : '포인트가 부족해요'}
            </button>
            <p className="reward-sheet-notice">
              구매 후에는 취소하거나 포인트로 되돌릴 수 없어요.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
