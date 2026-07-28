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
