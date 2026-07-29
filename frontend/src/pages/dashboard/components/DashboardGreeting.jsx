export default function DashboardGreeting({ nickname }) {
  return (
    <section className="dash-greeting-section">
      <h1 className="greeting-title">
        {nickname}님,
        <br />
        <span>이번 달 소비를 확인해 보세요.</span>
      </h1>
      <p className="greeting-subtitle">
        마이데이터 기반으로 새는 지출을 정리했어요.
      </p>
    </section>
  )
}
