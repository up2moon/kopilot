function formatAmount(amount) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

function AssetAllocationCard({ allocation }) {
  if (!allocation?.allocations?.length) {
    return null;
  }

  return (
    <section className="coach-allocation" aria-label="추천 자산 배분">
      <div className="coach-allocation-header">
        <div>
          <span className="coach-allocation-eyebrow">추천 배분</span>
          <strong>{allocation.title}</strong>
        </div>
        <span className="coach-allocation-total">
          {formatAmount(allocation.allocationBaseAmount)}
        </span>
      </div>

      <div className="coach-allocation-list">
        {allocation.allocations.map((asset) => (
          <article
            className="coach-allocation-asset"
            key={`${asset.productType}-${asset.assetCode || asset.label}`}
          >
            <div className="coach-allocation-asset-heading">
              <span className="coach-allocation-class">
                {asset.assetClass}
              </span>
              <strong>{asset.label}</strong>
            </div>
            <div className="coach-allocation-value">
              <strong>{asset.ratio}%</strong>
              <span>
                {asset.quantity ? `${asset.quantity}주 · ` : ""}
                {formatAmount(asset.amount)}
              </span>
            </div>
          </article>
        ))}
      </div>

      <p className="coach-allocation-disclaimer">{allocation.disclaimer}</p>
    </section>
  );
}

export default function CoachConversation({
  expanded,
  isSending,
  loadingMessage,
  messageListRef,
  messages,
  onMessageAction,
}) {
  return (
    <main
      className={`coach-conversation${expanded ? " is-expanded" : ""}`}
      aria-live="polite"
    >
      <p className="coach-date">오늘</p>
      <div className="coach-message-list" ref={messageListRef}>
        {messages.map((message) => (
          <div
            className={`coach-message coach-message-${message.role}`}
            key={message.id}
          >
            <span>{message.text}</span>
            {message.assetAllocation ? (
              <AssetAllocationCard allocation={message.assetAllocation} />
            ) : null}
            {message.action ? (
              <button
                className="coach-message-action"
                type="button"
                onClick={() => onMessageAction(message.action)}
              >
                {message.action.label}
              </button>
            ) : null}
          </div>
        ))}
        {isSending ? (
          <p className="coach-message coach-message-assistant coach-message-loading">
            {loadingMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
