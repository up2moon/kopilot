import './FloatingChatbot.css'

export default function FloatingChatbot({ onNavigate }) {
  return (
    <button
      type="button"
      className="floating-chatbot-btn"
      onClick={() => onNavigate('/coach')}
      aria-label="AI 절약 챗봇 열기"
      title="AI 절약 코치와 대화하기"
    >
      <span className="chatbot-speech-icon" aria-hidden="true">
        💬
      </span>
    </button>
  )
}
