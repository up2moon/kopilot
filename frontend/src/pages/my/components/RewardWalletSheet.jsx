function formatDate(dateString) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString))
}

function formatGiftCode(code) {
  return code.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export default function RewardWalletSheet({ gifts, onClose }) {
  return (
    <div
      className="reward-sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="reward-sheet reward-wallet-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-wallet-title"
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
        <p className="reward-sheet-eyebrow">MY GIFTS</p>
        <h2 id="reward-wallet-title">내 기프티콘</h2>
        <p className="reward-wallet-description">
          구매한 모바일 교환권을 한곳에서 확인해요.
        </p>

        {gifts.length ? (
          <div className="reward-wallet-list">
            {gifts.map((gift) => (
              <article className="reward-wallet-item" key={gift.id}>
                <span
                  className="reward-wallet-visual"
                  style={{ backgroundColor: gift.product.color }}
                  aria-hidden="true"
                >
                  {gift.product.emoji}
                </span>
                <div>
                  <span>{gift.product.brand}</span>
                  <strong>{gift.product.name}</strong>
                  <small>{formatDate(gift.purchasedAt)} 구매</small>
                </div>
                <div className="reward-wallet-code">
                  <span aria-hidden="true">▌▐▌▌▐▌▐</span>
                  <strong>{formatGiftCode(gift.giftCode)}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="reward-wallet-empty">
            <span aria-hidden="true">🎁</span>
            <strong>아직 구매한 기프티콘이 없어요</strong>
            <p>챌린지 포인트로 첫 리워드를 골라보세요.</p>
          </div>
        )}
      </section>
    </div>
  )
}
