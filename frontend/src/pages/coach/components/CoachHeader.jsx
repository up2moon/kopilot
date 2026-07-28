function getCoachStatus(coaching, errorMessage, isLoading) {
  if (isLoading) {
    return { label: "분석 중", tone: "loading" };
  }

  if (errorMessage && !coaching) {
    return { label: "연결 오류", tone: "error" };
  }

  if (coaching?.status === "INSUFFICIENT_DATA") {
    return { label: "데이터 부족", tone: "insufficient" };
  }

  return { label: "분석 완료", tone: "completed" };
}

export default function CoachHeader({
  coaching,
  errorMessage,
  isLoading,
  onBack,
}) {
  const status = getCoachStatus(coaching, errorMessage, isLoading);

  return (
    <header className="coach-header">
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
      <h1>AI 절약 챗봇</h1>
      <span className={`coach-status coach-status-${status.tone}`}>
        {status.label}
      </span>
    </header>
  );
}
