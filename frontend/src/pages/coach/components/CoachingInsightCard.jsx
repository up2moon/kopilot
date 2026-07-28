export default function CoachingInsightCard({
  coaching,
  isLoading,
  onRetry,
}) {
  const coachingMessage = isLoading
    ? "소비 데이터를 분석하고 있어요."
    : coaching?.coaching?.message || "오늘의 코칭을 불러오지 못했어요.";

  return (
    <section className="coach-insight-card" aria-labelledby="today-coaching">
      <span id="today-coaching">오늘의 코칭</span>
      <strong>{coachingMessage}</strong>
      {!isLoading && !coaching ? (
        <button type="button" onClick={onRetry}>
          다시 불러오기
        </button>
      ) : null}
      <p className="coach-insight-disclaimer">
        AI 코칭은 참고용이며 투자 권유가 아닙니다.
      </p>
    </section>
  );
}
