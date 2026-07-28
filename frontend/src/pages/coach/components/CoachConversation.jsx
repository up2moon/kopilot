export default function CoachConversation({
  expanded,
  isSending,
  messageListRef,
  messages,
}) {
  return (
    <main
      className={`coach-conversation${expanded ? " is-expanded" : ""}`}
      aria-live="polite"
    >
      <p className="coach-date">오늘</p>
      <div className="coach-message-list" ref={messageListRef}>
        {messages.map((message) => (
          <p
            className={`coach-message coach-message-${message.role}`}
            key={message.id}
          >
            {message.text}
          </p>
        ))}
        {isSending ? (
          <p className="coach-message coach-message-assistant coach-message-loading">
            답변을 생각하고 있어요…
          </p>
        ) : null}
      </div>
    </main>
  );
}
