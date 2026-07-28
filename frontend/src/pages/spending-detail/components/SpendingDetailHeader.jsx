export default function SpendingDetailHeader({ onBack }) {
  return (
    <header className="detail-header">
      <button
        type="button"
        className="back-button-circle"
        onClick={onBack}
        aria-label="뒤로가기"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <h1>내 소비 상세</h1>
    </header>
  )
}
