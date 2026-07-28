export default function ChallengeStateCard({
  data,
  error,
  loading,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="challenge-state-card">
        <span className="challenge-spinner" />
        챌린지를 준비하고 있어요.
      </div>
    )
  }

  if (error) {
    return (
      <div className="challenge-state-card challenge-error">
        <p>{error}</p>
        <button type="button" onClick={() => onRetry()}>
          다시 시도하기
        </button>
      </div>
    )
  }

  if (data?.onboardingRequired) {
    return (
      <div className="challenge-state-card">
        <strong>챌린지를 만들기 위한 소비 정보가 필요해요.</strong>
        <p>
          마이데이터를 연결하면 최근 소비 내역을 바탕으로 AI 미션을 받을
          수 있어요.
        </p>
      </div>
    )
  }

  if (!data?.weeklyChallenges?.length) {
    return (
      <div className="challenge-state-card">
        <strong>이번 주 미션을 준비하고 있어요.</strong>
        <p>AI 챌린지는 월요일 또는 이번 주 첫 조회 시 생성됩니다.</p>
      </div>
    )
  }

  return null
}
