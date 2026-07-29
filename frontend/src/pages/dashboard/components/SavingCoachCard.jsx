import arrowIcon from '../../../assets/icons/arrow.svg'

export default function SavingCoachCard({ message, onOpenCoach }) {
  return (
    <section className="dash-blue-card">
      <div className="coach-card-copy">
        <span className="ai-coach-label">✦ AI 절약 코치</span>
        <h2 className="ai-coach-advice">{message}</h2>
        <p className="ai-coach-footer-note">
          질문하면 소비 습관과 절약 미션을 바로 추천해요.
        </p>
      </div>
      <div className="coach-robot" aria-hidden="true">
        <span className="coach-idea">✦</span>
        <span className="robot-face">⌣</span>
      </div>

      <button
        type="button"
        className="dash-white-btn"
        onClick={onOpenCoach}
      >
        <span className="coach-button-icon" aria-hidden="true">•••</span>
        <span>AI 코치와 대화하기</span>
        <img
          className="btn-arrow is-primary"
          src={arrowIcon}
          alt=""
          aria-hidden="true"
        />
      </button>
    </section>
  )
}
